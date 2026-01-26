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
        // Call the edge function 'send-notification-email'
        // Using global fetch to ensure proper headers if client invoke fails in this context
        // But client.functions.invoke is cleaner if available. Let's try invoke first.
        const { error } = await this.supabase.functions.invoke('send-notification-email', {
            body: { email, notification: { title: message.title, message: message.body } }
        });

        if (error) {
            console.error("Failed to send email:", error);
            try {
                // Fallback: direct fetch if invoke acts up in local dev or specific envs
                // (Optional, omitted for brevity unless needed)
            } catch (e) {
                console.error("Email Fallback failed", e);
            }
            return false;
        }
        return true;
    }
}

class SMSProvider implements ChannelProvider {
    // Stub implementation as requested
    async send(userId: string, phone: string, message: any): Promise<boolean> {
        console.log(`[SMS Stub] Skipping SMS to user ${userId}: ${message.title}`);
        return true;
    }
}

class NotificationDispatcher {
    private emailProvider: EmailProvider;
    private smsProvider: SMSProvider;

    constructor(
        private supabase: any,
        private user: any,
        private settings: any
    ) {
        this.emailProvider = new EmailProvider(supabase);
        this.smsProvider = new SMSProvider();
    }

    async dispatch(type: 'info' | 'warning' | 'error', title: string, message: string, metadata: any = {}) {
        // 1. In-App Notification (Always, with De-bounce)
        const saved = await this.createInAppNotification(type, title, message, metadata);
        if (!saved) {
            // If duplicate was detected and we didn't save, we usually SHOULD NOT email either 
            // to prevent spamming the same warning every execution.
            return false;
        }

        // 2. Email Channel logic
        // Rule: Critical/Error/Warning = Email By Default (unless disabled). 
        // Rule: Info = No Email (unless forced).
        const isCritical = type === 'error' || type === 'warning';
        const forceEmail = metadata?.channels?.email === true;
        const emailGloballyEnabled = this.settings.email_notifications_enabled !== false; // Default true

        if ((isCritical || forceEmail) && emailGloballyEnabled && this.user.email) {
            await this.emailProvider.send(this.user.id, this.user.email, { title, body: message });
            console.log(`[Dispatcher] Email sent to ${this.user.email}`);
        }

        // 3. SMS Channel (Stub)
        if (this.settings.sms_notifications_enabled === true) {
            await this.smsProvider.send(this.user.id, "000-0000", { title, body: message });
        }

        return true;
    }

    private async createInAppNotification(type: string, title: string, message: string, metadata: any): Promise<boolean> {
        // Check for duplicate (24h debounce)
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
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");

        // Create Client
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let logs = [];

        // 0. Check if Autopilot is enabled globally
        const { data: autopilotSetting } = await adminClient
            .from('system_settings')
            .select('value')
            .eq('key', 'crm_autopilot_enabled')
            .single();

        const isEnabled = autopilotSetting?.value === true;

        if (!isEnabled) {
            console.log("CRM Autopilot is currently DISABLED globally.");
            return new Response(JSON.stringify({ success: true, message: "Autopilot is disabled" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Fetch All Users with NEW Settings Columns
        const { data: users, error: userError } = await adminClient
            .from('user_profiles')
            .select(`
                id, 
                email, 
                full_name,
                created_at,
                user_automation_settings (
                    lease_expiry_days,
                    extension_notice_days,
                    rent_overdue_days,
                    auto_reply_enabled,
                    email_notifications_enabled,
                    sms_notifications_enabled,
                    whatsapp_notifications_enabled,
                    push_notifications_enabled
                )
            `)
            .eq('is_active', true);

        if (userError) throw userError;

        console.log(`Processing automation for ${users.length} users...`);

        // --- GLOBAL DATE CONTEXT ---
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-indexed

        // 2. Iterate Per User
        for (const user of users) {
            const settings = user.user_automation_settings?.[0] || {};

            // Instantiate Dispatcher
            const dispatcher = new NotificationDispatcher(adminClient, user, settings);

            const globalLeaseDays = settings.lease_expiry_days || 100;
            const globalExtDays = settings.extension_notice_days || 60;
            const rentOverdueDays = settings.rent_overdue_days || 5;

            // --- A & B. LEASE & EXTENSION CHECKS ---
            const { data: activeContracts } = await adminClient
                .from('contracts')
                .select('id, end_date, property_id, properties(address, status), notice_period_days, option_notice_days, option_periods')
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (activeContracts) {
                for (const contract of activeContracts) {
                    const address = contract.properties?.address || 'property';

                    // 1. Lease Expiry Check
                    const leaseThreshold = contract.notice_period_days || globalLeaseDays;
                    const expiryTarget = new Date();
                    expiryTarget.setDate(expiryTarget.getDate() + leaseThreshold);
                    const expiryTargetStr = expiryTarget.toISOString().split('T')[0];

                    if (contract.end_date === expiryTargetStr) {
                        const sent = await dispatcher.dispatch('warning',
                            'Lease Ending Soon',
                            `Contract for ${address} ends in ${leaseThreshold} days. Time to renew or find a tenant.`,
                            { contract_id: contract.id, action: 'renew' }
                        );
                        if (sent) logs.push(`Notified ${user.email} re: expiry (contract ${contract.id})`);
                    }

                    // 2. Extension Option Check
                    if (Array.isArray(contract.option_periods) && contract.option_periods.length > 0) {
                        const extThreshold = contract.option_notice_days || globalExtDays;
                        const extTarget = new Date();
                        extTarget.setDate(extTarget.getDate() + extThreshold);
                        const extTargetStr = extTarget.toISOString().split('T')[0];

                        if (contract.end_date === extTargetStr) {
                            const sent = await dispatcher.dispatch('info',
                                'Extension Deadline Approaching',
                                `You have ${extThreshold} days left to decide on the extension option for ${address}.`,
                                { contract_id: contract.id, action: 'extension', channels: { email: true } }
                            );
                            if (sent) logs.push(`Notified ${user.email} re: extension (contract ${contract.id})`);
                        }
                    }
                }
            }

            // --- C. RENT OVERDUE CHECK ---
            const overdueTargetDate = new Date();
            overdueTargetDate.setDate(overdueTargetDate.getDate() - rentOverdueDays);
            const overdueDateStr = overdueTargetDate.toISOString().split('T')[0];

            const { data: latePayments } = await adminClient
                .from('payments')
                .select('id, amount, currency, contracts!inner(user_id, properties(address))')
                .eq('contracts.user_id', user.id)
                .eq('status', 'pending')
                .eq('due_date', overdueDateStr);

            if (latePayments && latePayments.length > 0) {
                for (const payment of latePayments) {
                    const sent = await dispatcher.dispatch('error',
                        'Rent Overdue Alert',
                        `Payment of ${payment.amount} ${payment.currency} for ${payment.contracts?.properties?.address} is ${rentOverdueDays} days late.`,
                        { payment_id: payment.id, action: 'collect' }
                    );
                    if (sent) logs.push(`Notified ${user.email} re: overdue rent (payment ${payment.id})`);
                }
            }

            // --- E. SEASONAL MAINTENANCE TRIGGERS ---
            // Triggered on the first day of the season (simple implementation)
            const isFirstDayOfMonth = today.getDate() === 1;
            if (isFirstDayOfMonth) {
                if (currentMonth === 10) { // November (Prepare for Winter)
                    await dispatcher.dispatch('info',
                        'Winter Maintenance',
                        'Winter is coming! It\'s a good time to check your boiler (Dud Shemesh) and sealing.',
                        { type: 'maintenance', season: 'winter' }
                    );
                } else if (currentMonth === 4) { // May (Prepare for Summer)
                    await dispatcher.dispatch('info',
                        'Summer Maintenance',
                        'Summer is almost here! Consider servicing AC units and checking roof insulation.',
                        { type: 'maintenance', season: 'summer' }
                    );
                }
            }

            // --- F. INCOMPLETE SETUP NUDGE ---
            // If user has properties but 0 contracts and joined > 3 days ago
            const userAgeDays = Math.floor((today.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

            if (userAgeDays >= 3) {
                const { count: propertyCount } = await adminClient
                    .from('properties')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                const { count: contractCount } = await adminClient
                    .from('contracts')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (propertyCount > 0 && contractCount === 0) {
                    await dispatcher.dispatch('info',
                        'Complete Your Setup',
                        'You\'ve added properties but no contracts yet. Need help getting started?',
                        { action: 'add_contract', channels: { email: true } }
                    );
                    logs.push(`Nudged ${user.email} to add contract`);
                }
            }
        }

        // --- D. PROACTIVE SUPPORT FOLLOW-UP ---
        // The support follow-up drafts a message but doesn't send it yet. 
        // It stays in the "Action Inbox". So we DO NOT use the dispatcher here, 
        // as we don't want to email the user immediately.

        // ... (Keep existing support ticket logic here) ...
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: stagnantTickets } = await adminClient
            .from('support_tickets')
            .select('id, title, description, user_id, user_profiles(full_name)')
            .eq('status', 'open')
            .lt('updated_at', oneDayAgo);

        if (stagnantTickets) {
            for (const ticket of stagnantTickets) {
                const userName = ticket.user_profiles?.full_name || 'there';
                const followUpDraft = `Hi ${userName}, I'm just checking in on this ticket ("${ticket.title}") to see if it's still an issue for you or if you need any further assistance. Let me know!`;

                await adminClient
                    .from('support_tickets')
                    .update({
                        auto_reply_draft: followUpDraft,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', ticket.id)
                    .is('auto_reply_draft', null);

                logs.push(`Proposed follow-up for stagnant ticket ${ticket.id}`);
            }
        }

        return new Response(JSON.stringify({ success: true, processed: users.length, logs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Automation Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
