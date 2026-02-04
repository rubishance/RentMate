
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // Attempt raw query if view access is restricted
        const { data: rpcData, error: rpcError } = await supabase.rpc('list_tables'); // assuming no such RPC exists, this might fail too. 
        // Fallback: try to select from a known table to see if connection works
        console.log('Error listing tables via standard query:', error.message);
        return;
    }

    console.log('Tables:', data.map(t => t.table_name));
}

listTables();
