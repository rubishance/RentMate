import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWa() {
    console.log("Checking WhatsApp Conversatons & Messages...");
    const { data: convs, error: convErr } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
    
    console.log("Conversations:", convs, convErr);
    
    const { data: msgs, error: msgErr } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("Messages:", msgs, msgErr);

    const { data: users, error: userErr } = await supabase
        .from('user_profiles')
        .select('id, email, phone, phone_verified')
        .ilike('phone', '%0503602000%');
        
    console.log("Users with phone like 0503602000:", users, userErr);
}

checkWa();
