import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { token, type } = await req.json();

        if (!token || !type) {
            throw new Error("Missing token or type");
        }

        // Verify token
        // We use the Service Role Key as the secret for simplicity in this context
        // In production, a dedicated secret would be better
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const payload = await verify(token, key);
        const { userId, type: tokenType } = payload;

        if (tokenType !== type) {
            throw new Error("Invalid token type");
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        if (type === 'marketing') {
            const { error } = await supabase
                .from('user_profiles')
                .update({ marketing_consent: false })
                .eq('id', userId);

            if (error) throw error;
        } else if (type === 'reminders') {
            // Disable all granular notification preferences
            // We set days to 0 as per the system's "opt-out" logic
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('notification_preferences')
                .eq('id', userId)
                .single();

            const currentPrefs = userProfile?.notification_preferences || {};
            const newPrefs = {
                ...currentPrefs,
                contract_expiry_days: 0,
                rent_due_days: 0,
                extension_option_days: 0,
                extension_option_end_days: 0
            };

            const { error } = await supabase
                .from('user_profiles')
                .update({ notification_preferences: newPrefs })
                .eq('id', userId);

            if (error) throw error;
        } else {
            throw new Error("Unknown unsubscribe type");
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
