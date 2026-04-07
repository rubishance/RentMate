import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('property_documents').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) {
    console.error(error);
  } else {
    for (const d of data) {
      console.log(`[${d.category}] ${d.title} / ${d.file_name} (${d.created_at})`);
    }
  }
}
check();
