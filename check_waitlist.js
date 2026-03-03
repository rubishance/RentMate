import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWaitlist() {
    const { data, error } = await supabase.from('waitlist').select('full_name, email, phone, created_at');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Waitlist data:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkWaitlist();
