import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

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
