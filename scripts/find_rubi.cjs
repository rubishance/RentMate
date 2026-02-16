const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findData() {
    console.log('Searching for Rubi in profiles...');
    const { data: profile, error: profError } = await supabase
        .from('user_profiles')
        .select('id, email, is_super_admin')
        .eq('email', 'rubi@rentmate.co.il')
        .maybeSingle();

    if (profError) {
        console.error('Profile search error:', profError.message);
    } else if (profile) {
        console.log('Found Rubi Profile:', profile);
    } else {
        console.log('Rubi profile not found or not visible via anon key.');
    }

    console.log('\nListing visible active contracts...');
    // Try to find the contract by address
    const { data: contracts, error: contError } = await supabase
        .from('contracts')
        .select('id, user_id, status')
        .eq('status', 'active');

    if (contError) {
        console.error('Contract search error:', contError.message);
    } else {
        console.log(`Found ${contracts?.length || 0} active contracts.`);
        // Note: address is in properties table, can't easily join with filter in one go via anon key if RLS is strict
    }
}

findData();
