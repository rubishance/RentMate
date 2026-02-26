import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('email', 'rubi@rentmate.co.il')
        .single();

    // We can't query auth.users with anon key, let's just query payments and see if there are duplicates
    const { data: payments } = await supabase
        .from('payments')
        .select('id, contract_id, amount, status, due_date')
        // .eq('user_id', user.id) -> If RLS allows, we might not see it without service role.
        .limit(20);

    console.log("Payments (Recent 20):", payments);
}

check().catch(console.error);
