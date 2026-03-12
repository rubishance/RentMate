require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function injectProperty() {
    console.log("Signing in as uitest_1773049506383...");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'uitest_1773049506383@rentmate.com',
        password: 'TestPassword123!'
    });

    if (authErr) {
        console.error("Auth error:", authErr.message);
        return;
    }

    console.log("Adding default property...");
    const { data, error } = await supabase
        .from('properties')
        .insert({
            user_id: authData.user.id,
            address: 'Herzl 55, Tel Aviv',
            city: 'Tel Aviv',
            property_type: 'apartment',
            rooms: 3,
            size_sqm: 80,
            has_parking: true,
            has_storage: false,
            has_balcony: true,
            has_safe_room: true
        })
        .select('*');

    if (error) {
        console.error("INSERT ERROR:", error.message);
    } else {
        console.log("Inserted Property:", data[0].address);
    }
}

injectProperty();
