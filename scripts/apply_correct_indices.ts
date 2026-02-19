import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '493615eb140d60f969747468b3225cdcae00fb172fa67499ae8bf39df86e2b35';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyIndices() {
    console.log('--- Applying Official Index Rates (Feb 2026 Update) ---');

    // 1. Upsert Index Data
    const indexRecords = [
        // CPI (Base 2024=100)
        { index_type: 'cpi', date: '2026-01', value: 103.3, source: 'cbs' },
        // Construction (Base July 2025=100)
        { index_type: 'construction', date: '2026-01', value: 101.3, source: 'cbs' },

        // Also ensure December 2025 is correct (usually on old bases in seeded systems)
        // Dec 2025 CPI (Base 2022=100) was 111.2, in new base it should be 103.538
        { index_type: 'cpi', date: '2025-12', value: 111.2, source: 'cbs' },
        { index_type: 'construction', date: '2025-12', value: 139.7, source: 'cbs' }
    ];

    console.log('Upserting index_data...');
    const { error: indexError } = await supabase
        .from('index_data')
        .upsert(indexRecords, { onConflict: 'index_type,date' });

    if (indexError) {
        console.error('Error upserting index_data:', indexError);
    } else {
        console.log('✅ index_data updated successfully.');
    }

    // 2. Upsert Index Bases
    const baseRecords = [
        // CPI Bases
        { index_type: 'cpi', base_period_start: '2025-01-01', base_value: 100, chain_factor: 1.074 },
        { index_type: 'cpi', base_period_start: '2023-01-01', base_value: 100, chain_factor: 1.026 },

        // Construction Bases
        { index_type: 'construction', base_period_start: '2025-07-01', base_value: 100, chain_factor: 1.387 },
        { index_type: 'construction', base_period_start: '2011-08-01', base_value: 100, chain_factor: 1.0 }
    ];

    console.log('Upserting index_bases...');
    const { error: baseError } = await supabase
        .from('index_bases')
        .upsert(baseRecords, { onConflict: 'index_type,base_period_start' });

    if (baseError) {
        console.error('Error upserting index_bases:', baseError);
    } else {
        console.log('✅ index_bases updated successfully.');
    }

    console.log('\n--- Verification ---');
    const { data: latest } = await supabase
        .from('index_data')
        .select('*')
        .in('index_type', ['cpi', 'construction'])
        .order('date', { ascending: false })
        .limit(4);

    console.table(latest);
}

applyIndices();
