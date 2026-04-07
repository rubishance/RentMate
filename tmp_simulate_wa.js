import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAI() {
    const fromMobile = "972503602000";
    
    // 1. Check Session State
    let { data: session, error: sessErr } = await supabase
        .from('whatsapp_session_states')
        .select('*')
        .eq('phone_number', fromMobile)
        .single();
        
    console.log("Session Check:", session, sessErr);

    if (!session) {
        // Create idle session
        const { data: newSession, error: createErr } = await supabase
            .from('whatsapp_session_states')
            .insert({
                phone_number: fromMobile,
                status: 'idle'
            })
            .select('*')
            .single();
            
        console.log("Create Session:", newSession, createErr);
        session = newSession;
    }
}

testAI();
