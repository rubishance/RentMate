const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3nV93e7E6AXGTNoSRPv2Xg_yd1NY6ey';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActivity() {
    console.log('Checking recent AI chat activity...');
    const { data: conversations, error } = await supabase
        .from('ai_conversations')
        .select('id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.log('Conversation list error (likely RLS):', error.message);
    } else {
        console.log('Recent AI Conversations:', conversations);
    }
}

checkActivity();
