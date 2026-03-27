import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Verify user is authenticated
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
        const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary credentials missing in Edge Function');
        }

        const authPrefix = btoa(`${apiKey}:${apiSecret}`);
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/usage`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${authPrefix}`
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Cloudinary API error: ${response.status} ${errText}`);
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
