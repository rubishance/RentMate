
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySettings() {
    console.log('Checking current settings...');
    const { data: currentSettings, error: fetchError } = await supabase
        .from('system_settings')
        .select('*');

    if (currentSettings) {
        console.log('Current System Settings:');
        currentSettings.forEach(s => {
            console.log(`- ${s.key}: ${JSON.stringify(s.value)}`);
        });
    }

    const sql1 = `INSERT INTO public.system_settings (key, value, description)
    VALUES ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email')
    ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb;`;

    const sql2 = `INSERT INTO public.system_settings (key, value, description)
    VALUES ('admin_email_content_preferences', '{"new_users": true, "revenue": true, "support_tickets": true, "upgrades": true, "active_properties": true}'::jsonb, 'JSON object defining which sections to include in the daily summary')
    ON CONFLICT (key) DO NOTHING;`;

    console.log('Inserting admin_email_daily_summary_enabled...');
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: sql1 }).catch(e => ({ error: e }));

    // Fallback: If rpc 'exec_sql' doesn't exist, use regular updates
    if (error1) {
        console.log('exec_sql RPC failed, using standard upsert...');
        const { error: upsertError1 } = await supabase
            .from('system_settings')
            .upsert({
                key: 'admin_email_daily_summary_enabled',
                value: true,
                description: 'Master toggle for daily admin summary email'
            });
        if (upsertError1) console.error('Error 1:', upsertError1);
        else console.log('Setting 1 applied.');

        const { error: upsertError2 } = await supabase
            .from('system_settings')
            .upsert({
                key: 'admin_email_content_preferences',
                value: { new_users: true, revenue: true, support_tickets: true, upgrades: true, active_properties: true },
                description: 'JSON object defining which sections to include in the daily summary'
            }, { onConflict: 'key' });
        if (upsertError2) console.error('Error 2:', upsertError2);
        else console.log('Setting 2 applied.');
    } else {
        console.log('SQL applied via RPC.');
    }
}

applySettings();
