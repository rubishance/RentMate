// @ts-nocheck
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
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Fetch pending items from queue
        const { data: queueItems, error: fetchError } = await adminClient
            .from('storage_cleanup_queue')
            .select('*')
            .is('processed_at', null)
            .limit(100);

        if (fetchError) throw fetchError;
        if (!queueItems || queueItems.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No items to clean up" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Cleaning up ${queueItems.length} items from storage...`);
        const results = [];

        for (const item of queueItems) {
            try {
                // Remove from storage
                const { error: storageError } = await adminClient.storage
                    .from(item.bucket_id)
                    .remove([item.storage_path]);

                if (storageError) {
                    console.error(`Failed to delete ${item.storage_path}:`, storageError);
                    await adminClient.from('storage_cleanup_queue').update({
                        error_log: JSON.stringify(storageError)
                    }).eq('id', item.id);
                } else {
                    // Mark as processed
                    await adminClient.from('storage_cleanup_queue').update({
                        processed_at: new Date().toISOString()
                    }).eq('id', item.id);
                    results.push(item.id);
                }
            } catch (err) {
                console.error(`Unexpected error for item ${item.id}:`, err);
            }
        }

        return new Response(JSON.stringify({ success: true, cleaned: results.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Cleanup Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
