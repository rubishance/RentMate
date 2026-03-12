require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'uitest_1773049506383@rentmate.com',
        password: 'TestPassword123!'
    });

    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', authData.user.id);

    console.log("DB Preferences for Test User:", data);
}

check();
