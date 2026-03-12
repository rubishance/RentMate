const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/) || envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(1);

    // We expect RLS to block it if we use anon key, but we want to know IF the request reaches RLS!
    // If a column is missing, the API would return a Postgres error.
    console.log("Returned Keys:", data ? Object.keys(data[0] || {}) : "No Data");
    console.log("Error:", error);
}

checkSchema();
