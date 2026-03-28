import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function processWhatsappAI(
    supabase: any,
    fromMobile: string,
    messageContent: string,
    matchedUserId: string | null,
    conversationId: string
) {
    // 1. Check Session State
    let { data: session } = await supabase
        .from('whatsapp_session_states')
        .select('*')
        .eq('phone_number', fromMobile)
        .single();

    if (!session) {
        // Create idle session
        const { data: newSession } = await supabase
            .from('whatsapp_session_states')
            .insert({
                phone_number: fromMobile,
                status: 'idle'
            })
            .select('*')
            .single();
        session = newSession;
    }

    if (session.status === 'human_handoff') {
        // Stop AI execution if a human took over
        return null; 
    }

    if (session.status === 'awaiting_confirmation') {
        // We handle this in the execution router (index.ts) if message is 'YES'
        return null;
    }

    // 2. Fetch recent messages
    const { data: recentMsgs } = await supabase
        .from('whatsapp_messages')
        .select('content, direction')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);
        
    const formattedMessages = (recentMsgs || [])
        .reverse()
        .map((m: any) => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content?.text || ''
        }));

    // Add current message if not already in recentMsgs
    formattedMessages.push({ role: 'user', content: messageContent });

    const systemPrompt = {
        role: 'system',
        content: `You are Renty, the AI assistant for RentMate. Help the user manage their properties. 
        If they upload a document (contract, bill) or text details, use the available tools to extract structured data.
        If you are missing data, just ask a simple, friendly question (like "What's the end date?").
        Keep responses extremely short and use emojis. Use simple formatting like *this*.`
    };

    // Tools definition
    const tools = [
        {
            type: "function",
            function: {
                name: "add_contract_draft",
                description: "Extract data to add a new rental contract.",
                parameters: {
                    type: "object",
                    properties: {
                        tenant_name: { type: "string" },
                        start_date: { type: "string", description: "YYYY-MM-DD" },
                        end_date: { type: "string", description: "YYYY-MM-DD" },
                        rent_amount: { type: "number" }
                    },
                    required: ["tenant_name", "start_date", "end_date", "rent_amount"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "request_human_support",
                description: "Trigger this function if the user is angry, explicitly asks for a human, or asks a complex technical support question you cannot answer.",
                parameters: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Brief reason for handoff" }
                    },
                    required: ["reason"]
                }
            }
        }
    ];

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) throw new Error("Missing OPENAI_API_KEY");

    const payload = {
        model: "gpt-4o",
        messages: [systemPrompt, ...formattedMessages],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.2
    };

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
        console.error("OpenAI Error:", await aiResponse.text());
        return "Sorry, my brain is taking a break right now. Please try again later! 🧠💤";
    }

    const result = await aiResponse.json();
    const responseMessage = result.choices[0].message;

    // Check if AI called a tool
    if (responseMessage.tool_calls) {
        const toolCall = responseMessage.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === 'add_contract_draft') {
            // Stage the intent and data
            await supabase.from('whatsapp_session_states').update({
                current_intent: 'add_contract',
                pending_payload: args,
                status: 'awaiting_confirmation',
                updated_at: new Date().toISOString()
            }).eq('phone_number', fromMobile);

            return `Got it! I'll prepare a new contract for *${args.tenant_name}* at *${args.rent_amount} NIS* from ${args.start_date} to ${args.end_date}.\n\nDoes this look correct? Reply *YES* to save it. 👍`;
        }

        if (toolCall.function.name === 'request_human_support') {
            await supabase.from('whatsapp_session_states').update({
                current_intent: 'support_ticket',
                status: 'human_handoff',
                updated_at: new Date().toISOString()
            }).eq('phone_number', fromMobile);

            return `I've paused my automated replies and notified our human support team. They will jump into this chat shortly to assist you! 🧑‍💻`;
        }
    }

    // Default conversational reply or Socratic missing-data question
    return responseMessage.content;
}
