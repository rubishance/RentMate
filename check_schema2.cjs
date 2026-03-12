const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Using Service Role:", !!supabaseKey);
    const { data: countData, error: countError } = await supabase
        .from('user_preferences')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Count Error:", countError.message);
    } else {
        console.log("Total rows in user_preferences:", countData);
    }

    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(5);

    if (error) {
        console.error("Query Error:", error.message);
    } else {
        console.log("Rows:", data);
    }
}

checkSchema();
