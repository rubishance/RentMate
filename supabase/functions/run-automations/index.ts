// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Channels Interfaces ---

interface ChannelProvider {
    send(userId: string, contactInfo: string, message: { title: string; body: string }): Promise<boolean>;
}

class EmailProvider implements ChannelProvider {
    constructor(private supabase: any) { }
    async send(userId: string, email: string, message: { title: string; body: string }): Promise<boolean> {
        const { error } = await this.supabase.functions.invoke('send-notification-email', {
            body: { email, notification: { title: message.title, message: message.body } }
        });
        if (error) {
            console.error("Failed to send email:", error);
            return false;
        }
        return true;
    }
}

class SMSProvider implements ChannelProvider {
    async send(userId: string, phone: string, message: any): Promise<boolean> {
        console.log(`[SMS Stub] Skipping SMS to user ${userId}: ${message.title}`);
        return true;
    }
}

class VoiceProvider implements ChannelProvider {
    async send(userId: string, phone: string, message: any): Promise<boolean> {
        console.log(`[Voice Stub] Voice capture disabled. Would call user ${userId}: ${message.title}`);
        return true;
    }
}

class NotificationDispatcher {
    private emailProvider: EmailProvider;
    private smsProvider: SMSProvider;
    private voiceProvider: VoiceProvider;

    constructor(
        private supabase: any,
        private user: any,
        private settings: any
    ) {
        this.emailProvider = new EmailProvider(supabase);
        this.smsProvider = new SMSProvider();
        this.voiceProvider = new VoiceProvider();
    }

    async dispatch(type: 'info' | 'warning' | 'error', title: string, message: string, metadata: any = {}) {
        const saved = await this.createInAppNotification(type, title, message, metadata);
        if (!saved) return false;

        const isCritical = type === 'error' || type === 'warning';
        const forceEmail = metadata?.channels?.email === true;
        const emailGloballyEnabled = (this.settings.globalSettings || []).find(s => s.key === 'email_notifications_enabled')?.value !== false;

        if ((isCritical || forceEmail) && emailGloballyEnabled && this.user.email) {
            await this.emailProvider.send(this.user.id, this.user.email, { title, body: message });
        }

        if (this.settings.sms_notifications_enabled === true) {
            await this.smsProvider.send(this.user.id, "000-0000", { title, body: message });
        }

        // Voice Stub Logic
        const voiceEnabled = (this.settings.globalSettings || []).find(s => s.key === 'voice_capture_enabled')?.value === true;
        if (voiceEnabled) {
            await this.voiceProvider.send(this.user.id, "000-0000", { title, body: message });
        }
        return true;
    }

    private async createInAppNotification(type: string, title: string, message: string, metadata: any): Promise<boolean> {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await this.supabase
            .from('notifications')
            .select('id')
            .eq('user_id', this.user.id)
            .eq('title', title)
            .gt('created_at', dayAgo)
            .limit(1);

        if (recent && recent.length > 0) return false;

        await this.supabase.from('notifications').insert({
            user_id: this.user.id,
            type,
            title,
            message,
            metadata
        });
        return true;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let logs = [];

        const { data: systemSettings } = await adminClient.from('system_settings').select('key, value');
        const getSetting = (key) => systemSettings?.find(s => s.key === key)?.value;

        if (getSetting('auto_autopilot_master_enabled') !== true) {
            return new Response(JSON.stringify({ success: true, message: "Autopilot is disabled" }), { headers: corsHeaders });
        }

        const { data: users, error: userError } = await adminClient
            .from('user_profiles')
            .select(`
                id, email, full_name, created_at, subscription_plan,
                user_automation_settings (
                    lease_expiry_days, extension_notice_days, rent_overdue_days, 
                    email_notifications_enabled, sms_notifications_enabled
                )
            `)
            .eq('is_active', true);

        if (userError) throw userError;

        const today = new Date();
        const currentMonth = today.getMonth();

        for (const user of users) {
            const settings = {
                ...(user.user_automation_settings?.[0] || {}),
                globalSettings: systemSettings
            };
            const dispatcher = new NotificationDispatcher(adminClient, user, settings);

            const { data: activeContracts } = await adminClient
                .from('contracts')
                .select('id, end_date, property_id, properties(address, status), notice_period_days, option_notice_days, option_periods, base_rent, linkage_type, base_index_value')
                .eq('user_id', user.id)
                .eq('status', 'active');

            const { data: userProperties } = await adminClient.from('properties').select('id, address').eq('user_id', user.id);

            // --- A & B. LEASE & EXTENSION CHECKS ---
            if (activeContracts && getSetting('auto_renew_reminders_enabled') === true) {
                for (const contract of activeContracts) {
                    const address = contract.properties?.address || 'property';
                    const leaseThreshold = contract.notice_period_days || settings.lease_expiry_days || 100;
                    const expiryTarget = new Date();
                    expiryTarget.setDate(expiryTarget.getDate() + leaseThreshold);
                    if (contract.end_date === expiryTarget.toISOString().split('T')[0]) {
                        await dispatcher.dispatch('warning', 'Lease Ending Soon', `Contract for ${address} ends in ${leaseThreshold} days.`, { contract_id: contract.id, action: 'renew' });
                    }
                }
            }

            // --- C. RENT OVERDUE CHECK ---
            if (getSetting('auto_rent_overdue_alerts_enabled') === true) {
                const overdueTargetDate = new Date();
                overdueTargetDate.setDate(overdueTargetDate.getDate() - (settings.rent_overdue_days || 5));
                const { data: latePayments } = await adminClient
                    .from('payments')
                    .select('id, amount, currency, contracts!inner(properties(address))')
                    .eq('contracts.user_id', user.id)
                    .eq('status', 'pending')
                    .eq('due_date', overdueTargetDate.toISOString().split('T')[0]);

                if (latePayments) {
                    for (const payment of latePayments) {
                        await dispatcher.dispatch('error', 'Rent Overdue Alert', `Payment for ${payment.contracts?.properties?.address} is late.`, { payment_id: payment.id, action: 'collect' });
                    }
                }
            }

            // --- G. INDEX LINKAGE (CPI) MONITOR ---
            if (getSetting('auto_cpi_adjustment_proposals_enabled') === true) {
                const contractsWithLinkage = activeContracts?.filter(c => c.linkage_type && c.linkage_type !== 'none' && c.base_index_value);
                if (contractsWithLinkage?.length) {
                    const { data: latestIndices } = await adminClient.from('index_data').select('index_type, date, value').order('date', { ascending: false }).limit(10);
                    for (const contract of contractsWithLinkage) {
                        const targetIndex = latestIndices?.find(idx => idx.index_type === contract.linkage_type);
                        if (targetIndex) {
                            const newRent = Math.round(contract.base_rent * (targetIndex.value / contract.base_index_value));
                            if (Math.abs(newRent - contract.base_rent) > 10) {
                                await dispatcher.dispatch('info', 'Rent Adjustment Calculated', `New rent for ${contract.properties?.address || 'property'} should be ${newRent} ILS.`, { contract_id: contract.id, action: 'update_rent', new_rent: newRent });
                            }
                        }
                    }
                }
            }

            // --- H. LEAD SCORING & UPSELL (GROWTH ENGINE) ---
            if (getSetting('auto_growth_engine_enabled') === true) {
                const propertyCount = userProperties?.length || 0;
                if (user.subscription_plan === 'free_forever' && propertyCount >= 3) {
                    await dispatcher.dispatch('info', 'Upsell Opportunity: Power User', `${user.full_name} has ${propertyCount} properties on a Free plan.`, { action: 'sales_lead', is_lead: true, lead_type: 'upsell', current_properties: propertyCount, channels: { dashboard: true } });
                }

                const daysSinceJoined = Math.floor((today.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceJoined > 5 && propertyCount > 0 && (!activeContracts || activeContracts.length === 0)) {
                    await dispatcher.dispatch('warning', 'Concierge: Onboarding Stalled', `${user.full_name} added properties but no contracts.`, { action: 'sales_lead', is_lead: true, lead_type: 'onboarding_help', channels: { dashboard: true } });
                }
            }
        }

        // --- I. STAGNANT TICKETS ---
        if (getSetting('auto_stagnant_ticket_drafting_enabled') === true) {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: stagnantTickets } = await adminClient.from('support_tickets').select('id, title, user_profiles(full_name)').eq('status', 'open').lt('updated_at', oneDayAgo);
            if (stagnantTickets) {
                for (const ticket of stagnantTickets) {
                    const draft = `Hi ${ticket.user_profiles?.full_name || 'there'}, just checking in on "${ticket.title}". Need help?`;
                    await adminClient.from('support_tickets').update({ auto_reply_draft: draft, updated_at: new Date().toISOString() }).eq('id', ticket.id).is('auto_reply_draft', null);
                }
            }
        }

        // --- K. MONTHLY PERFORMANCE REPORTS ---
        const isFirstDayOfMonth = today.getDate() === 1;
        if (isFirstDayOfMonth && getSetting('auto_monthly_reports_enabled') === true) {
            for (const user of users) {
                const { data: userProps } = await adminClient.from('properties').select('id, address').eq('user_id', user.id);
                if (userProps) {
                    for (const prop of userProps) {
                        const dispatcher = new NotificationDispatcher(adminClient, user, user.user_automation_settings?.[0] || {});
                        await dispatcher.dispatch('info',
                            'Monthly Performance Report Ready',
                            `Your financial report for ${prop.address} is now available.`,
                            { action: 'view_report', property_id: prop.id, period: today.toISOString().slice(0, 7), channels: { email: true } }
                        );
                    }
                }
            }
        }

        // --- J. STORAGE CLEANUP ---
        try { await adminClient.functions.invoke('cleanup-storage-queue'); } catch (e) { console.error(e); }

        return new Response(JSON.stringify({ success: true, processed: users.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { headers: corsHeaders, status: 500 });
    }
});
