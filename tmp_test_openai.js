import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAI() {
    console.log("Starting Socratic AI Simulation...");
    const fromMobile = "972503602000";
    const messageContent = "הי";
    const conversationId = "1731ab88-f224-4035-89fa-aef09e1300a7"; // some existing conv

    const { data: recentMsgs } = await supabase
        .from('whatsapp_messages')
        .select('content, direction')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
        
    const formattedMessages = (recentMsgs || [])
        .reverse()
        .map(m => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content?.text || ''
        }));

    formattedMessages.push({ role: 'user', content: messageContent });
    console.log("Formatted:", formattedMessages);
    
    const systemPrompt = {
        role: 'system',
        content: `You are Renty, the AI assistant for RentMate. Help the user manage their properties. Keep responses extremely short and use emojis.`
    };

    const payload = {
        model: "gpt-4o",
        messages: [systemPrompt, ...formattedMessages],
        temperature: 0.2
    };

    const openAiKey = process.env.OPENAI_API_KEY;
    console.log("Sending to OpenAI with length:", payload.messages.length, "Key starts with", openAiKey.slice(0, 5));

    try {
        const fetch = globalThis.fetch;
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await aiResponse.json();
        console.log("OpenAI Result:", result);
    } catch(e) {
        console.log("FAILED:", e);
    }
}

testAI();
