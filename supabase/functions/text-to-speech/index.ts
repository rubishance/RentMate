// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { text, voice = "nova" } = await req.json();
        
        if (!text) {
            return new Response(JSON.stringify({ error: "No text provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Check user subscription tier
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();

        const tier = profile?.subscription_tier || "free";
        
        // Temporarily bypass premium check for testing by the developer
        // if (tier === "free") {
        //     return new Response(
        //         JSON.stringify({ 
        //             error: "Voice output is a premium feature. Please upgrade your subscription to use this feature." 
        //         }), 
        //         { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        //     );
        // }

        if (!OPENAI_API_KEY) {
             return new Response(JSON.stringify({ error: "Server missing OpenAI Key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Call OpenAI TTS API
        const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "tts-1",
                input: text,
                voice: voice, // nova is a good female voice, alloy is neutral
                response_format: "mp3"
            })
        });

        if (!ttsResponse.ok) {
            const errBody = await ttsResponse.text();
            console.error("OpenAI TTS Error:", errBody);
            throw new Error("Failed to generate speech");
        }

        // Stream the response directly back to the client
        return new Response(ttsResponse.body, {
            headers: {
                ...corsHeaders,
                "Content-Type": "audio/mpeg",
                "Transfer-Encoding": "chunked"
            }
        });

    } catch (error: any) {
        console.error("Text to speech error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
