import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkTotalCounts() {
    const { count: paymentsCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });
    const { count: contractsCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
    const { count: docsCount } = await supabase.from('property_documents').select('*', { count: 'exact', head: true });

    console.log('--- Total Records Visible to ANON Key ---');
    console.log('Payments:', paymentsCount);
    console.log('Contracts:', contractsCount);
    console.log('Documents:', docsCount);
}

checkTotalCounts();
