import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SUPABASE_URL = "https://tipnjnfbbnbskdlodrww.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("STAGING_SERVICE_ROLE_KEY");

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing STAGING_SERVICE_ROLE_KEY environment variable");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const settings = [
    { key: 'global_email_support', value: 'support@rentmate.co.il', description: 'Primary customer support and accessibility contact address' },
    { key: 'global_email_service', value: 'service@rentmate.co.il', description: 'Alternative service address for ticketing' },
    { key: 'global_email_log', value: 'log@rentmate.co.il', description: 'Technical log storage and administrative email forwarding' },
    { key: 'global_email_sales', value: 'sales@rentmate.co.il', description: 'Lead generation and sales inquiry address' },
    { key: 'global_email_noreply', value: 'noreply@rentmate.co.il', description: 'Outgoing system address for automated reports and alerts' },
    { key: 'global_email_guest_leads', value: 'guest-leads@rentmate.co.il', description: 'Internal tracking email for interactions from potential leads' },
    { key: 'global_phone_support', value: '+972-50-360-2000', description: 'Official support phone number' },
    { key: 'global_whatsapp_support', value: '972503602000', description: 'Official WhatsApp contact number (international format)' }
];

async function run() {
    console.log("Starting migration...");
    for (const s of settings) {
        const { error } = await supabase
            .from('system_settings')
            .upsert(s, { onConflict: 'key' });

        if (error) {
            console.error(`Error upserting ${s.key}:`, error);
        } else {
            console.log(`Successfully upserted ${s.key}`);
        }
    }
}

run();
