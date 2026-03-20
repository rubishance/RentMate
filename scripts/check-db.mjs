import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('index_data')
    .select('index_type, date, value, source')
    .eq('index_type', 'usd')
    .order('date', { ascending: false })
    .limit(5);
    
  console.log("USD Data:", data);

  const { data: cpi, error: cpiError } = await supabase
    .from('index_data')
    .select('index_type, date, value, source')
    .eq('index_type', 'cpi')
    .order('date', { ascending: false })
    .limit(5);

  console.log("CPI Data:", cpi);
}

check().catch(console.error);
