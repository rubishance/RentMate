import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REVENUECAT_WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_TOKEN"); // Set this in Supabase Vault / Secrets

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (REVENUECAT_WEBHOOK_AUTH && authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH}`) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const body = await req.json();
        const event = body.event;

        if (!event || !event.app_user_id) {
            return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
        }

        const appUserId = event.app_user_id; // This should map to our Supabase user_id
        
        // Connect to Supabase
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const type = event.type; 
        
        // Map Entitlements
        let targetPlanId = 'solo'; // Default fallback
        if (event.entitlement_ids?.includes("master_tier")) {
            targetPlanId = "master";
        } else if (event.entitlement_ids?.includes("mate_tier")) {
            targetPlanId = "mate";
        }

        console.log(`Processing RC Webhook: ${type} for User: ${appUserId}. Target Plan: ${targetPlanId}`);

        if (
            type === "INITIAL_PURCHASE" || 
            type === "RENEWAL" || 
            type === "UNCANCELLATION" || 
            type === "TRANSFER"
        ) {
            // Upgrade user
            const { error: updateError } = await supabaseClient
                .from('user_profiles')
                .update({ plan_id: targetPlanId })
                .eq('id', appUserId);
                
            if (updateError) throw updateError;
            
        } else if (
            type === "CANCELLATION" || 
            type === "EXPIRATION" || 
            type === "BILLING_ISSUE"
        ) {
            // Note: CANCELLATION sets auto_renew to false, but they might still be entitled until expiration.
            // Expiration means they are absolutely done. We downgrade on EXPIRATION.
            if (type === "EXPIRATION" || type === "BILLING_ISSUE") {
                const { error: downgradeError } = await supabaseClient
                    .from('user_profiles')
                    .update({ plan_id: 'solo' })
                    .eq('id', appUserId);
                    
                if (downgradeError) throw downgradeError;
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
        
    } catch (error: any) {
        console.error('Webhook processing error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
