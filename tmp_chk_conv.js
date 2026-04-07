import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConv() {
    const { data: conv, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', '5f9ee5b1-ab7d-4191-bb27-7cdbfaaee92c');
        
    console.log("Conversation details:", conv, error);
}

checkConv();
