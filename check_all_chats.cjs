require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role to read all conversations
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('ai_conversations')
        .select('user_id, created_at, messages')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (data && data.length > 0) {
        data.forEach((conv, index) => {
            console.log(`\n--- CONVERSATION ${index + 1} (${conv.user_id} at ${conv.created_at}) ---`);
            let messages = conv.messages;
            if (typeof messages === 'string') messages = JSON.parse(messages);

            if (!Array.isArray(messages)) return;

            messages.forEach(m => {
                console.log(`[${(m.role || 'UNKNOWN').toUpperCase()}]: ${m.content ? m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '') : '(no text)'}`);
                if (m.tool_calls) {
                    console.log(`[TOOLS CALL]: ${JSON.stringify(m.tool_calls)}`);
                }
                if (m.role === 'tool') {
                    console.log(`[TOOL RESULT]: ${m.content}`);
                }
            });
        });
    } else {
        console.log("No conversations found.");
    }
}

check();
