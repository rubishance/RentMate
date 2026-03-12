const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPerf() {
    console.log("Starting query...");
    const start = Date.now();
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(1);
    const end = Date.now();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Query took ${end - start}ms`);
    }
}
testPerf();
