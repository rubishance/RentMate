import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        console.log("Starting abuse scan...");

        // 0. Check if alerts are enabled
        const { data: settings } = await supabase
            .from('system_settings')
            .select('key, value')
            .eq('key', 'security_alerts_enabled')
            .single();
        const alertsEnabled = settings?.value !== false;

        // 1. Detect WhatsApp Spikes (Users who sent > 50 messages in the last hour)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: whatsappSpikes, error: wsError } = await supabase
            .from('whatsapp_usage_logs')
            .select('user_id, count(*)')
            .gte('created_at', hourAgo)
            // .group('user_id') // PostgREST doesn't support GROUP BY directly like this, need a clever query or RPC
            // Actually, I'll use an RPC for the heavy lifting of detection
            ;

        // I'll implement a SQL function for the scan logic and call it from here
        // This is much more efficient than fetching all logs and processing in Deno

        const { data: results, error: rpcError } = await supabase.rpc('perform_abuse_scan');

        if (rpcError) throw rpcError;

        console.log(`Scan completed. Logged ${results?.length || 0} potential abuse events.`);

        // 2. Notify Admin if critical events found
        if (alertsEnabled && results && results.length > 0) {
            console.log("Abuse detected. Triggering admin alerts...");
            for (const event of results) {
                // We only notify for high/critical severity to avoid spamming the admin
                if (event.severity === 'critical' || event.severity === 'high') {
                    try {
                        await supabase.functions.invoke('send-admin-alert', {
                            body: {
                                table: 'security_logs',
                                record: event
                            }
                        });
                    } catch (notifyError) {
                        console.error("Failed to send admin alert for event:", event.id, notifyError);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true, events_logged: results?.length || 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Abuse scan failed:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
