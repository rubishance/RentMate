import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayments() {
    console.log('--- Checking Payments Data ---');

    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current User ID:', user?.id || 'Not logged in');

    // Fetch all payments (this will be subject to RLS if running with anon key)
    // NOTE: This script runs in Node, if it uses the service role it sees everything.
    // If it uses the anon key, it only sees what RLS allows.
    // I'll check both if I can.

    const { data: payments, error } = await supabase
        .from('payments')
        .select('id, user_id, contract_id, amount, due_date, status');

    if (error) {
        console.error('Error fetching payments:', error);
        return;
    }

    console.log(`Found ${payments?.length || 0} payments visible via RLS.`);

    if (payments && payments.length > 0) {
        console.table(payments.slice(0, 10)); // Show first 10

        const missingUser = payments.filter(p => !p.user_id).length;
        const missingContract = payments.filter(p => !p.contract_id).length;

        console.log(`Payments with missing user_id: ${missingUser}`);
        console.log(`Payments with missing contract_id: ${missingContract}`);
    }

    // Also check contracts to see if they belong to the user
    const { data: contracts } = await supabase
        .from('contracts')
        .select('id, user_id, property_id');

    console.log(`\nFound ${contracts?.length || 0} contracts visible via RLS.`);
}

checkPayments();
