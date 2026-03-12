require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'uitest_1773049506383@rentmate.com',
        password: 'TestPassword123!'
    });

    const { data, error } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (data && data.length > 0) {
        console.log("\n--- LAST CONVERSATION ---");
        let messages = data[0].messages;
        if (typeof messages === 'string') messages = JSON.parse(messages);

        // Handle if messages wrapped in another array
        if (!Array.isArray(messages)) {
            console.log(JSON.stringify(messages, null, 2));
            return;
        }

        messages.forEach(m => {
            console.log(`[${(m.role || 'UNKNOWN').toUpperCase()}]: ${m.content || '(no text)'}`);
            if (m.tool_calls) {
                console.log(`[TOOLS CALL]: ${JSON.stringify(m.tool_calls)}`);
            }
        });
    } else {
        console.log("No conversations found.");
    }
}

check();
