const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env parser
const env = {};
try {
    const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length > 0) env[key.trim()] = vals.join('=').trim();
    });
} catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SERIES = {
    cpi: '120010',
    housing: '40010',
    construction: '200010'
};

async function fetchFromCbs(seriesId, count = 12) {
    const url = `https://api.cbs.gov.il/index/data/price?series=${seriesId}&format=json&download=false&last=${count}`;
    try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'RentMate/1.0' } });
        const data = await resp.json();

        if (data.Message && data.Message.includes('Error')) {
            throw new Error(data.Message);
        }

        let points = data.month || data.day || data.data || [];
        return points.map(p => ({
            date: p.date.split('T')[0].slice(0, 7),
            value: parseFloat(p.value)
        })).filter(p => !isNaN(p.value));
    } catch (err) {
        console.warn(`Fetch ${seriesId} failed: ${err.message}. Using fallback.`);
        const fallbacks = {
            '120010': [{ date: '2025-01', value: 109.2 }, { date: '2024-12', value: 108.8 }],
            '40010': [{ date: '2025-01', value: 105.5 }, { date: '2024-12', value: 105.1 }],
            '200010': [{ date: '2025-01', value: 123.4 }, { date: '2024-12', value: 123.0 }]
        };
        return fallbacks[seriesId] || [];
    }
}

async function seed() {
    console.log('Starting seed process...');

    // 1. CBS Indices
    for (const [type, id] of Object.entries(SERIES)) {
        console.log(`Fetching ${type} (${id})...`);
        const data = await fetchFromCbs(id, 24); // 2 years
        if (data.length > 0) {
            const records = data.map(p => ({
                index_type: type,
                date: p.date,
                value: p.value,
                source: 'cbs'
            }));
            const { error } = await supabase.from('index_data').upsert(records, { onConflict: 'index_type,date' });
            if (error) console.error(`Upsert error for ${type}:`, error.message);
            else console.log(`Seeded ${records.length} records for ${type}`);
        }
    }

    // 2. Exchange Rates
    const currencies = ['usd', 'eur'];
    for (const cur of currencies) {
        const records = [
            { index_type: cur, date: '2025-01', value: cur === 'usd' ? 3.73 : 4.05, source: 'exchange-api' },
            { index_type: cur, date: '2024-12', value: cur === 'usd' ? 3.70 : 4.02, source: 'exchange-api' }
        ];
        await supabase.from('index_data').upsert(records, { onConflict: 'index_type,date' });
        console.log(`Seeded sample exchange rates for ${cur}`);
    }

    // 3. Bases
    const bases = [
        { index_type: 'cpi', base_period_start: '2025-01-01', base_value: 100, chain_factor: 1.074 },
        { index_type: 'cpi', base_period_start: '2023-01-01', base_value: 100, chain_factor: 1.026 },
        { index_type: 'construction', base_period_start: '2011-08-01', base_value: 100, chain_factor: 1.0 }
    ];
    await supabase.from('index_bases').upsert(bases, { onConflict: 'index_type,base_period_start' });
    console.log('Seeded index bases.');

    console.log('Seed complete.');
}

seed();
