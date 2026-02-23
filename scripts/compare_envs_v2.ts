
import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';

const STAGING_URL = 'https://tipnjnfbbnbskdlodrww.supabase.co';
const STAGING_KEY = 'sb_publishable_u9pM6kMV9vqsEVgW4B617A_DAkpiEmT';

const prodClient = createClient(PROD_URL, PROD_KEY);
const stagingClient = createClient(STAGING_URL, STAGING_KEY);

const COLUMNS_TO_CHECK = [
    'id', 'user_id', 'property_id', 'status', 'signing_date', 'start_date', 'end_date',
    'base_rent', 'currency', 'payment_frequency', 'payment_day', 'payment_method',
    'linkage_type', 'base_index_date', 'base_index_value', 'security_deposit_amount',
    'needs_painting', 'tenants', 'option_periods', 'rent_periods', 'special_clauses',
    'guarantees', 'guarantors_info', 'pets_allowed'
];

async function check() {
    console.log('--- Environment Parity Report ---');

    const results = [];
    for (const col of COLUMNS_TO_CHECK) {
        const { error: pErr } = await prodClient.from('contracts').select(col).limit(0);
        const { error: sErr } = await stagingClient.from('contracts').select(col).limit(0);

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
        console.log('✅ DATABASE SCHEMAS ARE ALIGNED for core fields.');
    } else {
        if (missingInProd.length > 0) console.log('❌ Missing in PROD:', missingInProd);
        if (missingInStaging.length > 0) console.log('❌ Missing in STAGING:', missingInStaging);
    }
}

check().catch(console.error);
