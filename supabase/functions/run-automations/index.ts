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

        // 2. Iterate Per User (Scalability note: In future, this should be batched or use a DB-side cursor)
        for (const user of users) {
            const settings = user.user_automation_settings?.[0] || {};
            const leaseExpiryDays = settings.lease_expiry_days || 100;
            const extensionNoticeDays = settings.extension_notice_days || 60;
            const rentOverdueDays = settings.rent_overdue_days || 5;

            // --- A. LEASE EXPIRY CHECK (Contract Ends) ---
            const expiryTargetDate = new Date();
            expiryTargetDate.setDate(expiryTargetDate.getDate() + leaseExpiryDays);
            const expiryDateStr = expiryTargetDate.toISOString().split('T')[0]; // YYYY-MM-DD

            const { data: expiringContracts } = await adminClient
                .from('contracts')
                .select('id, property_id, properties(address)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .eq('end_date', expiryDateStr); // Exact match for "Notify me 100 days before"

            if (expiringContracts && expiringContracts.length > 0) {
                for (const contract of expiringContracts) {
                    await sendNotification(adminClient, user.id, 'warning',
                        'Lease Ending Soon',
                        `Contract for ${contract.properties?.address || 'property'} ends in ${leaseExpiryDays} days. Time to renew or find a tenant.`,
                        { contract_id: contract.id, action: 'renew' }
                    );
                    logs.push(`Notified ${user.email} re: expiry (contract ${contract.id})`);
                }
            }

            // --- B. EXTENSION OPTION CHECK (Decision Deadline) ---
            // Assuming we have 'option_end_date' or similar. 
            // If the schema doesn't have it explicitly as a column, we might check `contracts.option_periods` JSON.
            // For now, let's assume we look at 'end_date' AGAIN but with the extension specific threshold?
            // User request: "60 days for extension and 100 for contract ends". 
            // If the contract has an option, the 'end_date' is the end of *current* term.
            // So we actually want to warn about the SAME end_date but at a different threshold IF there is an option?
            // Implementation: We'll check again.

            const extTargetDate = new Date();
            extTargetDate.setDate(extTargetDate.getDate() + extensionNoticeDays);
            const extDateStr = extTargetDate.toISOString().split('T')[0];

            const { data: extensionContracts } = await adminClient
                .from('contracts')
                .select('id, property_id, properties(address), option_periods')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .eq('end_date', extDateStr)
                .not('option_periods', 'is', null); // Only if they have options

            if (extensionContracts && extensionContracts.length > 0) {
                for (const contract of extensionContracts) {
                    // Double check JSON array is not empty
                    if (Array.isArray(contract.option_periods) && contract.option_periods.length > 0) {
                        await sendNotification(adminClient, user.id, 'info',
                            'Extension Deadline Approaching',
                            `You have ${extensionNoticeDays} days to decide on the extension option for ${contract.properties?.address}.`,
                            { contract_id: contract.id, action: 'extension' }
                        );
                        logs.push(`Notified ${user.email} re: extension (contract ${contract.id})`);
                    }
                }
            }

            // --- C. RENT OVERDUE CHECK ---
            const overdueTargetDate = new Date();
            overdueTargetDate.setDate(overdueTargetDate.getDate() - rentOverdueDays); // e.g. 5 days AGO
            const overdueDateStr = overdueTargetDate.toISOString().split('T')[0];

            // Re-query with correct join
            const { data: latePayments } = await adminClient
                .from('payments')
                .select('id, amount, currency, contracts!inner(user_id, properties(address))')
                .eq('contracts.user_id', user.id)
                .eq('status', 'pending')
                .lte('due_date', overdueDateStr) // "Overdue BY at least X days" (so <= target date)
                .gt('due_date', (new Date(overdueTargetDate.getTime() - 86400000).toISOString().split('T')[0])); // Limit to just the "5th day" to avoid spamming everyday? OR keep spamming?
            // Current logic: Just notify on the exact day.

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
