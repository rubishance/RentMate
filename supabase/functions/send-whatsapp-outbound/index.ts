import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { withEdgeMiddleware } from '../_shared/middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withEdgeMiddleware('send-whatsapp-outbound', async (req, logger) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { toMobile, textBody, conversationId, replyToMessageId, media } = await req.json();

    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid User Token" }), { status: 401, headers: corsHeaders });
    }

    // 2. Fetch Secrets
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error("Missing WhatsApp configuration secrets on server");
    }

    // 3. Send to Meta
    const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const metaPayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toMobile,
    };

    if (media) {
      if (media.type === 'image') {
        metaPayload.type = 'image';
        metaPayload.image = { link: media.url };
        if (textBody) metaPayload.image.caption = textBody;
      } else {
        metaPayload.type = 'document';
        metaPayload.document = { link: media.url, filename: media.filename };
        if (textBody) metaPayload.document.caption = textBody;
      }
    } else {
      metaPayload.type = 'text';
      metaPayload.text = { preview_url: false, body: textBody };
    }

    if (replyToMessageId) {
      metaPayload.context = { message_id: replyToMessageId };
    }

    const metaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaPayload)
    });

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Meta API Error:", metaData);
      throw new Error(metaData.error?.message || 'Failed to send WhatsApp message');
    }

    // 4. Update Database Status (Mark as delivered/sent)
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    await supabaseAdmin.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      type: media ? media.type : 'text',
      content: { 
        text: textBody, 
        ...(media ? { media: { url: media.url, filename: media.filename } } : {}) 
      },
      status: 'sent',
      user_id: user.id, // Record which admin sent it
      metadata: { whatsapp_id: metaData.messages?.[0]?.id }
    });

    await supabaseAdmin.from('whatsapp_conversations').update({
      last_message_at: new Date().toISOString(),
      status: 'active'
    }).eq('id', conversationId);

    return new Response(JSON.stringify({ success: true, messageId: metaData.messages?.[0]?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Send Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}));
