require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Signing in as uitest_1773049506383...");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'uitest_1773049506383@rentmate.com',
        password: 'TestPassword123!'
    });

    if (authErr) {
        console.error("Auth error:", authErr.message);
        return;
    }

    console.log("Testing user_preferences upsert...");
    const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
            user_id: authData.user.id,
            language: 'he',
            ai_data_consent: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select('*');

    if (error) {
        console.error("UPSERT ERROR:", error.message, error.details, error.hint);
    } else {
        console.log("UPSERT SUCCESS:", data);
    }
}

check();
