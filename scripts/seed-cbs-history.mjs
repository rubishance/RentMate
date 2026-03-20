import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function purgeMockData() {
    console.log("Purging all mocked index data...");
    const { error } = await supabase
        .from('index_data')
        .delete()
        .eq('source', 'manual');
        
    if (error) {
        console.error("Purge error:", error);
    } else {
        console.log("Successfully purged mocked index data.");
    }
}

async function fetchCbsSeries(seriesId, indexType) {
    console.log(`Fetching 20-year history for ${indexType} (series ${seriesId})...`);
    
    const chunks = [
        { start: '01-2004', end: '12-2008' },
        { start: '01-2009', end: '12-2013' },
        { start: '01-2014', end: '12-2018' },
        { start: '01-2019', end: '12-2023' },
        { start: '01-2024', end: '12-2029' }
    ];

    const results = [];

    for (const chunk of chunks) {
        const url = `https://api.cbs.gov.il/index/data/price?id=${seriesId}&format=json&download=false&startPeriod=${chunk.start}&endPeriod=${chunk.end}`;
        
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' }
            });
            const json = await response.json();
            
            const data = json?.month?.[0]?.date || json?.data?.[0]?.date;
            if (!data || data.length === 0) {
                console.log(`No data returned for ${indexType} in chunk ${chunk.start}-${chunk.end}`);
                continue;
            }

            for (const item of data) {
                if (!item.month || item.year < 2004) continue;
                
                const monthStr = item.month.toString().padStart(2, '0');
                const dateStr = `${item.year}-${monthStr}`;
                
                const value = item.currBase ? item.currBase.value : (item.prevBase ? item.prevBase.value : null);
                
                if (value !== null) {
                    results.push({
                        index_type: indexType,
                        date: dateStr,
                        value: value,
                        source: 'cbs'
                    });
                }
            }
        } catch (err) {
            console.error(`Error fetching chunk ${chunk.start}-${chunk.end} for ${indexType}:`, err);
        }
        
        // Sleep to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`Prepared ${results.length} records for ${indexType}.`);

    for (let i = 0; i < results.length; i += 100) {
        const batch = results.slice(i, i + 100);
        const { error } = await supabase
            .from('index_data')
            .upsert(batch, { onConflict: 'index_type,date' });
            
        if (error) {
            console.error(`Batch upsert error for ${indexType}:`, error);
        }
    }
    console.log(`Upserted ${results.length} records for ${indexType}.`);
}

async function run() {
    await purgeMockData();
    await fetchCbsSeries('120010', 'cpi');
    await fetchCbsSeries('120490', 'housing');
    await fetchCbsSeries('200010', 'construction');
    console.log("Backfill complete.");
}

run().catch(console.error);
