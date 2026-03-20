import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndex() {
  console.log('Fetching latest CPI index data...');
  const { data: cpiData, error: cpiError } = await supabase
    .from('index_data')
    .select('*')
    .eq('index_type', 'cpi')
    .order('date', { ascending: false })
    .limit(5);

  if (cpiError) console.error('Error fetching CPI data:', cpiError);
  else console.log('Latest CPI Data:', cpiData);

  console.log('Fetching latest Housing index data...');
  const { data: housingData, error: housingError } = await supabase
    .from('index_data')
    .select('*')
    .eq('index_type', 'housing')
    .order('date', { ascending: false })
    .limit(5);

  if (housingError) console.error('Error fetching Housing data:', housingError);
  else console.log('Latest Housing Data:', housingData);
}

checkIndex();
