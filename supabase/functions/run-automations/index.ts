// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let logs = [];

        // 1. Fetch All Users with their Automation Settings
        // We join user_automation_settings. If not found, we fallback to defaults in code.
        const { data: users, error: userError } = await adminClient
            .from('user_profiles')
            .select(`
                id, 
                email, 
                full_name,
                user_automation_settings (
                    lease_expiry_days,
                    extension_notice_days,
                    rent_overdue_days,
                    auto_reply_enabled
                )
            `)
            .eq('is_active', true);

        if (userError) throw userError;

        console.log(`Processing automation for ${users.length} users...`);

        // 2. Iterate Per User
        for (const user of users) {
            const settings = user.user_automation_settings?.[0] || {};
            const globalLeaseDays = settings.lease_expiry_days || 100;
            const globalExtDays = settings.extension_notice_days || 60;
            const rentOverdueDays = settings.rent_overdue_days || 5;

            // --- A \u0026 B. LEASE \u0026 EXTENSION CHECKS ---
            // Fetch ALL active contracts for this user
            const { data: activeContracts } = await adminClient
                .from('contracts')
                .select('id, end_date, property_id, properties(address), notice_period_days, option_notice_days, option_periods')
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
                        await sendNotification(adminClient, user.id, 'warning',
                            'Lease Ending Soon',
                            `Contract for ${address} ends in ${leaseThreshold} days. Time to renew or find a tenant.`,
                            { contract_id: contract.id, action: 'renew' }
                        );
                        logs.push(`Notified ${user.email} re: expiry (contract ${contract.id}) at ${leaseThreshold}d threshold`);
                    }

                    // 2. Extension Option Check
                    if (Array.isArray(contract.option_periods) && contract.option_periods.length > 0) {
                        const extThreshold = contract.option_notice_days || globalExtDays;
                        const extTarget = new Date();
                        extTarget.setDate(extTarget.getDate() + extThreshold);
                        const extTargetStr = extTarget.toISOString().split('T')[0];

                        if (contract.end_date === extTargetStr) {
                            await sendNotification(adminClient, user.id, 'info',
                                'Extension Deadline Approaching',
                                `You have ${extThreshold} days left to decide on the extension option for ${address} (Autonomous Alert).`,
                                { contract_id: contract.id, action: 'extension' }
                            );
                            logs.push(`Notified ${user.email} re: extension (contract ${contract.id}) at ${extThreshold}d threshold`);
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
                .eq('due_date', overdueDateStr); // Exact match for the Xth day of delay

            if (latePayments && latePayments.length > 0) {
                for (const payment of latePayments) {
                    await sendNotification(adminClient, user.id, 'error',
                        'Rent Overdue Alert',
                        `Payment of ${payment.amount} ${payment.currency} for ${payment.contracts?.properties?.address} is ${rentOverdueDays} days late.`,
                        { payment_id: payment.id, action: 'collect' }
                    );
                    logs.push(`Notified ${user.email} re: overdue rent (payment ${payment.id})`);
                }
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

// Helper to send notification
async function sendNotification(supabase: any, userId: string, type: string, title: string, message: string, metadata: any) {
    // Check if duplicate exists recently (simple debounce)
    const { data: recent } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('title', title)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h debounce
        .limit(1);

    if (recent && recent.length > 0) return;

    await supabase.from('notifications').insert({
        user_id: userId,
        type, // 'info', 'warning', 'error'
        title,
        message,
        metadata
    });
}
