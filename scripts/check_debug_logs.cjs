const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log('Checking debug_logs...');
    const { data: logs, error } = await supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching logs:', error.message);
        return;
    }

    if (logs && logs.length > 0) {
        console.table(logs);
    } else {
        console.log('No recent debug logs found.');
    }
}

checkLogs();
