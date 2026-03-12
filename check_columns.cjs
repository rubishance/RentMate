require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Just fetch 1 property to inspect payload keys
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'uitest_1773049506383@rentmate.com',
        password: 'TestPassword123!'
    });

    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else {
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]).join(', '));
        } else {
            console.log("No properties found to inspect columns");
        }
    }
}

check();
