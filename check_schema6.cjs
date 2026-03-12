const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envs = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envs.match(/VITE_SUPABASE_URL=([^ \n]+)/)[1];
const supabaseKey = (envs.match(/SUPABASE_SERVICE_ROLE_KEY=([^ \n]+)/) || envs.match(/VITE_SUPABASE_ANON_KEY=([^ \n]+)/))[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // Just fetch a plan from database and try updating it with ai_analysis: true
    const { data: plans } = await supabase.from('subscription_plans').select('*').limit(1);
    const plan = plans[0];

    if (!plan) return console.log("No plnan");

    const newFeatures = { ...plan.features, ai_analysis: true };
    console.log("Attempting to update features to:", newFeatures);

    const { error } = await supabase
        .from('subscription_plans')
        .update({ features: newFeatures })
        .eq('id', plan.id);

    console.log("Update Error:", error);

    // Now fetch it back
    const { data: check } = await supabase.from('subscription_plans').select('features').eq('id', plan.id);
    console.log("Check back:", check[0].features);
}

checkSchema();
