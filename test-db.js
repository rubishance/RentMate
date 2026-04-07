import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA';

async function run() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: events, error } = await supabase
        .from('security_audit_events')
        .select('*')
        .limit(1);
        
    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log(events.length > 0 ? Object.keys(events[0]) : "No events, but columns format unknown. Schema might be empty.");
        console.log(JSON.stringify(events, null, 2));
    }
}

run();
