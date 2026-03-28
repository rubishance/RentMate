// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processWhatsappAI } from './ai-router.ts'
import { executeConfirmedAction } from './execution.ts'

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

                // 1. Check if this phone number belongs to a verified user profile
                const { data: userProfile } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('phone', fromMobile)
                    .eq('phone_verified', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                const matchedUserId = userProfile?.id || null;

                // 2. Find or Create Conversation
                let { data: conversation } = await supabase
                    .from('whatsapp_conversations')
                    .select('id, user_id, status')
                    .eq('phone_number', fromMobile)
                    .single();

                if (!conversation) {
                    const { data: newConv, error: convError } = await supabase
                        .from('whatsapp_conversations')
                        .insert({
                            phone_number: fromMobile,
                            user_id: matchedUserId,
                            status: 'bot_handling',
                            unread_count: 0
                        })
                        .select('id, user_id, status')
                        .single();

                    if (convError) {
                        console.error('Error creating chat', convError);
                        return new Response(JSON.stringify({ error: 'Conv Error', details: convError }), { status: 500 });
                    }
                    conversation = newConv;

                    // Send an automated response if this is a new UNKNOWN number
                    if (!matchedUserId) {
                        const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
                        const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

                        if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
                            const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                            const metaPayload = {
                                messaging_product: 'whatsapp',
                                recipient_type: 'individual',
                                to: fromMobile,
                                type: 'text',
                                text: { body: "Hi! We don't recognize this number. You are receiving general support. To get account-specific help, please log into RentMate and add your phone number in the Profile Settings." }
                            };
                            await fetch(url, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(metaPayload)
                            });
                        }
                    }
                } else if (!conversation.user_id && matchedUserId) {
                    // Update existing conversation if user recently verified their number
                    await supabase.from('whatsapp_conversations').update({ user_id: matchedUserId }).eq('id', conversation.id);
                }

                if (conversation && message.type === 'text') {
                    // Insert Message into DB
                    const { error: msgError } = await supabase.from('whatsapp_messages').insert({
                        conversation_id: conversation.id,
                        direction: 'inbound',
                        type: 'text',
                        content: { text: message.text.body },
                        status: 'delivered',
                        metadata: { whatsapp_id: message.id }
                    });

                    if (msgError) {
                        console.error('Error creating msg', msgError);
                        return new Response(JSON.stringify({ error: 'Msg Error', details: msgError }), { status: 500 });
                    }

                    // Trigger AI Bot if the conversation is in 'bot_handling' mode
                    if (conversation.status === 'bot_handling') {
                        try {
                            console.log(`Triggering AI for conversation ${conversation.id}`);
                            
                            // Check for Confirmation State
                            const { data: sessionState } = await supabase
                                .from('whatsapp_session_states')
                                .select('status')
                                .eq('phone_number', fromMobile)
                                .single();

                            let aiReplyText = "";

                            if (sessionState?.status === 'awaiting_confirmation') {
                                aiReplyText = await executeConfirmedAction(supabase, fromMobile, message.text.body) || "Error executing action.";
                            } else {
                                aiReplyText = await processWhatsappAI(supabase, fromMobile, message.text.body, matchedUserId, conversation.id) || "";
                            }
                                
                                if (aiReplyText) {
                                    // 4. Save AI Reply softly
                                    await supabase.from('whatsapp_messages').insert({
                                        conversation_id: conversation.id,
                                        direction: 'outbound',
                                        type: 'text',
                                        content: { text: aiReplyText },
                                        status: 'sent'
                                    });
                                    
                                    // 5. Send back to WhatsApp UI Graph API
                                    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
                                    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

                                    if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
                                        const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
                                        await fetch(url, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                messaging_product: 'whatsapp',
                                                recipient_type: 'individual',
                                                to: fromMobile,
                                                type: 'text',
                                                text: { body: aiReplyText }
                                            })
                                        });
                                    }
                                }
                        } catch (aiErr) {
                            console.error('Error in AI Trigger bridge:', aiErr);
                        }
                    }
                }
            }

            return new Response(JSON.stringify({
                success: true,
                debug: {
                    hasMessages: !!value?.messages,
                    fromMobile: value?.messages?.[0]?.from,
                    text: value?.messages?.[0]?.text?.body,
                    supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
                    serviceKeyLength: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length || 0,
                }
            }), {
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
