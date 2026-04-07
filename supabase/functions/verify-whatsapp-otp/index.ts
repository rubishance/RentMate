import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { withEdgeMiddleware } from '../_shared/middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withEdgeMiddleware('verify-whatsapp-otp', async (req, logger) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, token } = await req.json();

    if (!phone || !token) {
      throw new Error("Phone number and OTP token are required");
    }

    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const auth_token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth_token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid User Token" }), { status: 401, headers: corsHeaders });
    }

    // 2. Lookup OTP securely using Service Role
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Find the most recent active OTP for this phone
    const { data: otps, error: lookupError } = await supabaseAdmin
      .from('whatsapp_otps')
      .select('*')
      .eq('phone_number', phone)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError || !otps || otps.length === 0) {
      throw new Error("Invalid or expired OTP");
    }

    const otpRecord = otps[0];

    // Check expiration
    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new Error("OTP has expired");
    }

    // Check attempts to prevent brute force
    if (otpRecord.attempts >= 5) {
      throw new Error("Too many failed attempts. Please request a new code.");
    }

    // Verify code
    if (otpRecord.otp_code !== token) {
      // Increment attempts
      await supabaseAdmin.from('whatsapp_otps').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
      throw new Error("Incorrect code");
    }

    // 3. Success! Mark as verified
    await supabaseAdmin.from('whatsapp_otps').update({ verified: true }).eq('id', otpRecord.id);

    // Also update the user profile
    await supabaseAdmin.from('user_profiles').update({
      phone_verified: true,
      phone: phone
    }).eq('id', user.id);

    return new Response(JSON.stringify({ success: true, verified: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}));
