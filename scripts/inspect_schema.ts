
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- DB INSPECTION ---');

    console.log('1. Checking system_settings table presence and content...');
    const { data: settings, error: settingsError } = await supabase.from('system_settings').select('*');
    if (settingsError) {
        console.log('system_settings check failed:', settingsError.message);
    } else {
        console.log('system_settings content:', settings);
    }

    console.log('\n2. Verifying contracts table columns via information_schema...');
    const { data: columnInfo, error: infoError } = await supabase.from('contracts').select('*').limit(1);

    // If table is empty, keys of [] won't show. Let's use a workaround if possible or just trust the user.
    // Better: Query the columns using a raw RPC if available or just try a broad select.
    const { data: schemaCheck, error: schemaError } = await supabase
        .from('contracts')
        .select('id, guarantees, needs_painting, pets_allowed')
        .limit(1);

    if (schemaError) {
        console.log('Schema verification failed:', schemaError.message);
    } else {
        console.log('Schema verification success! Columns are present.');
    }
}

inspect().catch(console.error);
