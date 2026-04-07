import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envLines = fs.readFileSync('.env.staging', 'utf8').split('\n');
const env = {};
envLines.forEach(line => {
    if (line.includes('=')) {
        const [k, v] = line.split('=');
        env[k.trim()] = v.trim();
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function check() {
  const { data, error } = await supabase.from('security_audit_events').select('*');
  if (error) console.error(error);
  console.log("Audit Events:", JSON.stringify(data, null, 2));
}

check();
