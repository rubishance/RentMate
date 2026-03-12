require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// We need the service role key to bypass RLS, or anon key if RLS allows reading
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log("Fetching conversations...");
  const { data: convs, error: convError } = await supabase
    .from('whatsapp_conversations')
    .select('*, whatsapp_messages(*)');
    
  if (convError) {
    console.error('Error fetching convs:', convError);
    return;
  }
  
  console.log('Total conversations found:', convs?.length || 0);
  if (convs && convs.length > 0) {
    convs.forEach(c => {
      console.log(`Conv ${c.id} - Phone: ${c.phone_number} - Msgs: ${c.whatsapp_messages?.length || 0}`);
      
      // Specifically look for the user's personal phone
      if (c.phone_number === '972503602000' || c.phone_number === '+972503602000' || c.phone_number === '972559419550') {
         console.log('    -> Found matching conversation! Messages:', JSON.stringify(c.whatsapp_messages, null, 2));
      }
    });
  }
}

checkMessages();
