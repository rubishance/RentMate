const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/) || envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
    const { error } = await supabase
        .from('user_preferences')
        .upsert({
            user_id: '00000000-0000-0000-0000-000000000000',
            language: 'he',
            gender: 'male',
            pinned_cities: [],
            has_seen_welcome_v1: true,
            seen_features: [],
            disclaimer_accepted: true,
            ai_data_consent: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error("Upsert failed with error:", error);
    } else {
        console.log("Upsert succeeded!");
    }
}

testUpsert();
