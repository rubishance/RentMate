require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Checking DB...");
  const { data: user, error: userError } = await supabase.from('users').select('*').limit(5);
  console.log("Users:", user?.length);
  
  // Find test user
  const email = 'test@rentmate.co.il';
  
  const { data: properties, error: pErr } = await supabase.from('properties').select('id, address, city, user_id').limit(10);
  console.log("Properties total:", properties?.length);
  console.log("Some properties:", properties?.slice(0,2));
  
  const { data: contracts, error: cErr } = await supabase.from('contracts').select('id, status, end_date, property_id').limit(10);
  console.log("Contracts total:", contracts?.length);
}
run();
