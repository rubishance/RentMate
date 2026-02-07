import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { method } = req;

        // 1. VERIFICATION REQUEST (GET)
        // Meta sends a GET request to verify the webhook URL
        if (method === 'GET') {
            const url = new URL(req.url);
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');

            // Fetch secret verify token from environment variables
            const MY_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

            if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
                return new Response(challenge, { status: 200 });
            } else {
                return new Response('Forbidden', { status: 403 });
            }
        }

        // 2. EVENT NOTIFICATION (POST)
        if (method === 'POST') {
            const body = await req.json();

            // Initialize Supabase Client
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Check if this is a WhatsApp status update or message
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (value?.messages) {
                const message = value.messages[0];
                const fromMobile = message.from; // e.g., "972501234567"

                // Find or Create Conversation
                let { data: conversation } = await supabase
                    .from('whatsapp_conversations')
                    .select('id')
                    .eq('phone_number', fromMobile)
                    .single();

                if (!conversation) {
                    const { data: newConv, error: convError } = await supabase
                        .from('whatsapp_conversations')
                        .insert({
                            phone_number: fromMobile,
                            status: 'bot_handling',
                            unread_count: 0
                        })
                        .select('id')
                        .single();

                    if (convError) console.error('Error creating chat', convError);
                    conversation = newConv;
                }

                if (conversation && message.type === 'text') {
                    // Insert Message into DB
                    await supabase.from('whatsapp_messages').insert({
                        conversation_id: conversation.id,
                        direction: 'inbound',
                        type: 'text',
                        content: { text: message.text.body },
                        status: 'delivered',
                        metadata: { whatsapp_id: message.id }
                    });

                    // Here you could trigger the AI bot or other logic
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response('Method Not Allowed', { status: 405 })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
