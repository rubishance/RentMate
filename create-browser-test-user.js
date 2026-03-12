import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const ANON_KEY = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function create() {
    const email = `uitest_${Date.now()}@rentmate.com`;
    const password = "TestPassword123!";

    console.log("Registering UI Test User...");
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: "UI Tester" } }
    });

    if (error) {
        console.error("Signup failed:", error);
        return;
    }

    // Wait for triggers to create the preferences row
    console.log("Waiting for DB triggers to complete profile setup...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Enabling AI Data Consent...");
    const { error: prefError } = await supabase
        .from('user_preferences')
        .update({ ai_data_consent: true })
        .eq('user_id', data.user.id);

    if (prefError) {
        console.error("Failed to enable AI consent:", prefError);
    } else {
        console.log(`Success! User ready.\n\nEMAIL: ${email}\nPASSWORD: ${password}`);
    }
}
create();
