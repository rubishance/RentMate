import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log('Listing all properties...');
    const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, address, status');

    if (propError) {
        console.error('Property list error:', propError);
        return;
    }

    console.log('Total Properties:', properties.length);
    for (const p of properties) {
        console.log(`- [${p.id}] ${p.address} (Status: ${p.status})`);

        const { data: contracts, error: contractError } = await supabase
            .from('contracts')
            .select('id, status, start_date, end_date')
            .eq('property_id', p.id);

        if (contractError) {
            console.error(`Contract search error for ${p.address}:`, contractError);
            continue;
        }

        console.log(`  Contracts for ${p.address}:`, contracts);
        const activeContracts = contracts.filter(c => c.status === 'active');
        console.log(`  Active: ${activeContracts.length}`);
    }
}

debug();
