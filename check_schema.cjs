const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/) || envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { error } = await supabase
        .from('user_preferences')
        .insert({
            user_id: '00000000-0000-0000-0000-000000000000',
            ai_data_consent: true,
            language: 'he'
        });

    if (error) {
        console.error("Mutation Error:", error.message);
    } else {
        console.log("Success! Column ai_data_consent exists.");
        // cleanup
        await supabase.from('user_preferences').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
    }
}

checkSchema();
