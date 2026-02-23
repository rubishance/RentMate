
import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';

const STAGING_URL = 'https://tipnjnfbbnbskdlodrww.supabase.co';
const STAGING_KEY = 'sb_publishable_u9pM6kMV9vqsEVgW4B617A_DAkpiEmT';

const prodClient = createClient(PROD_URL, PROD_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_KEY);

async function compare() {
    console.log('--- Environment Parity Check (Contracts Table) ---');

    const { data: prodData } = await prodClient.from('contracts').select('*').limit(1);
    const { data: stageData } = await stagingClient.from('contracts').select('*').limit(1);

    const prodCols = prodData && prodData.length > 0 ? Object.keys(prodData[0]) : [];
    const stageCols = stageData && stageData.length > 0 ? Object.keys(stageData[0]) : [];

    console.log('\nProduction Columns:', prodCols.length);
    console.log('Staging Columns:', stageCols.length);

    const onlyProd = prodCols.filter(x => !stageCols.includes(x));
    const onlyStage = stageCols.filter(x => !prodCols.includes(x));

    if (onlyProd.length > 0) console.log('Only in PROD:', onlyProd);
    if (onlyStage.length > 0) console.log('Only in STAGING:', onlyStage);

    if (onlyProd.length === 0 && onlyStage.length === 0) {
        console.log('✅ DATABASE SCHEMAS ARE IDENTICAL (for contracts table)');
    } else {
        console.log('⚠️  SCHEMAS DIFFER');
    }
}

compare().catch(console.error);
