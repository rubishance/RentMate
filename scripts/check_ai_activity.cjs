const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qfvrekvugdjnwhnaucmz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
