const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/) || envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrefs() {
    const { data, error } = await supabase.from('user_preferences').select('ai_data_consent').limit(1);
    if (error) {
        console.error("Schema error:", error);
    } else {
        console.log("Found:", data);
    }
}

checkPrefs();
