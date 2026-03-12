const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/) || envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: countData } = await supabase
        .from('subscription_plans')
        .select('features');
    console.log(countData);
}

checkSchema();
