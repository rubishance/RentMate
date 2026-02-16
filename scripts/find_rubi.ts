import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findData() {
    console.log('Searching for Rubi...');
    // Try to find Rubi in user_profiles
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
        console.log('Rubi profile not found or not visible.');
    }

    console.log('\nSearching for contract "השלושה 11"...');
    // Try to find the contract by address in a join with properties
    const { data: contracts, error: contError } = await supabase
        .from('contracts')
        .select('*, properties(*)')
        .eq('status', 'active');

    if (contError) {
        console.error('Contract search error:', contError.message);
    } else {
        const target = contracts?.find(c =>
            c.properties?.address?.includes('השלושה 11') ||
            c.properties?.address?.includes('Hashlosha 11')
        );

        if (target) {
            console.log('Found Contract:', {
                id: target.id,
                property_id: target.property_id,
                user_id: target.user_id,
                address: target.properties?.address
            });

            // Check payments for this contract
            console.log('\nChecking payments for contract:', target.id);
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select('*')
                .eq('contract_id', target.id);

            if (payError) {
                console.error('Payment search error:', payError.message);
            } else {
                console.log(`Found ${payments?.length || 0} payments.`);
                if (payments && payments.length > 0) {
                    console.log('Sample payment:', payments[0]);
                }
            }
        } else {
            console.log('Contract "השלושה 11" not found or not visible.');
        }
    }
}

findData();
