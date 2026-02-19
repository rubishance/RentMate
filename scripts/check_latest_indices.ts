import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkIndices() {
    console.log('Checking latest index rates...');

    const types = ['cpi', 'housing', 'construction', 'usd', 'eur'];
    const results = [];

    for (const type of types) {
        const { data, error } = await supabase
            .from('index_data')
            .select('index_type, date, value, created_at')
            .eq('index_type', type)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) results.push(data);
    }

    console.log('\nLatest indices per type:');
    console.table(results);

    console.log('\nCPI History (Last 5 months):');
    const { data: cpiHistory } = await supabase
        .from('index_data')
        .select('date, value, created_at')
        .eq('index_type', 'cpi')
        .order('date', { ascending: false })
        .limit(5);
    console.table(cpiHistory);

    console.log('\n--- Index Bases ---');
    const { data: bases } = await supabase
        .from('index_bases')
        .select('*')
        .order('index_type', { ascending: true })
        .order('base_period_start', { ascending: false });

    if (bases) {
        console.log(`Found ${bases.length} base definitions:`);
        console.table(bases.map(b => ({
            type: b.index_type,
            start: b.base_period_start,
            val: b.base_value,
            factor: b.chain_factor
        })));
    } else {
        console.log('No index bases found.');
    }
}

checkIndices();
