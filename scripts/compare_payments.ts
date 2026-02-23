
import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';

const STAGING_URL = 'https://tipnjnfbbnbskdlodrww.supabase.co';
const STAGING_KEY = 'sb_publishable_u9pM6kMV9vqsEVgW4B617A_DAkpiEmT';

const prodClient = createClient(PROD_URL, PROD_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_KEY);

const COLUMNS_TO_CHECK = [
    'id', 'contract_id', 'amount', 'currency', 'due_date', 'status', 'paid_date',
    'payment_method', 'reference', 'original_amount', 'index_linkage_rate', 'user_id'
];

async function check() {
    console.log('--- Environment Parity Report (Payments Table) ---');

    const results = [];
    for (const col of COLUMNS_TO_CHECK) {
        const { error: pErr } = await prodClient.from('payments').select(col).limit(0);
        const { error: sErr } = await stagingClient.from('payments').select(col).limit(0);

        results.push({
            column: col,
            production: !pErr,
            staging: !sErr
        });
    }

    console.table(results);

    const missingInProd = results.filter(r => r.staging && !r.production).map(r => r.column);
    const missingInStaging = results.filter(r => r.production && !r.staging).map(r => r.column);

    if (missingInProd.length === 0 && missingInStaging.length === 0) {
        console.log('✅ PAYMENTS SCHEMAS ARE ALIGNED.');
    } else {
        if (missingInProd.length > 0) console.log('❌ Missing in PROD:', missingInProd);
        if (missingInStaging.length > 0) console.log('❌ Missing in STAGING:', missingInStaging);
    }
}

check().catch(console.error);
