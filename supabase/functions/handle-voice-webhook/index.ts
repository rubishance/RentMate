import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Check if voice capture is enabled
        const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'voice_capture_enabled').single();

        if (setting?.value !== true) {
            console.log("Voice capture is disabled in system settings. Ignoring webhook.");
            return new Response(JSON.stringify({ success: false, message: "Voice capture disabled" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200 // Return 200 so the provider doesn't keep retrying
            });
        }

        // 2. Parse payload (Twilio/Vapi/etc)
        const payload = await req.json();
        console.log("Voice Webhook Payload:", payload);

        // TODO: Implement logic to summarize call and log to CRM
        // const interaction = {
        //   user_id: payload.user_id,
        //   type: 'call',
        //   content: payload.summary || "Phone call captured",
        //   metadata: { call_sid: payload.sid, provider: payload.provider }
        // };
        // await supabase.from('crm_interactions').insert(interaction);

        return new Response(JSON.stringify({ success: true, message: "Webhook received (Draft Mode)" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Voice Webhook Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
