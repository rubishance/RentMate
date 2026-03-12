import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      throw new Error("Phone number is required");
    }

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

    // 2. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // 3. Save OTP securely
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { error: insertError } = await supabaseAdmin.from('whatsapp_otps').insert({
      phone_number: phone,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString()
    });

    if (insertError) {
      console.error("Insert Error", insertError);
      throw new Error("Failed to generate OTP");
    }

    // 4. Send to Meta
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      // In development if keys are not set, we can pretend it sent successfully so UI can still be tested
      // But we should throw if in production.
      console.warn("Missing WhatsApp system tokens. Skipping actual SMS send.");
      if (Deno.env.get('ENVIRONMENT') === 'production') {
        throw new Error("Missing WhatsApp configuration secrets on server");
      }
    } else {
      const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

      // We use a simple text message. Ideally, WhatsApp requires registered templates for the FIRST outbound message 
      // to a user. If this fails due to needing a template, you must create an OTP template in Meta Dashboard
      // and send a 'template' message instead.
      const metaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: `Your RentMate verification code is: ${otpCode}. It will expire in 10 minutes.` }
      };

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
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
