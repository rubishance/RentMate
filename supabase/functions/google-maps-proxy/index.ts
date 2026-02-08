import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log('Function started. Action:', body.action);
        const { action, input, types, place_id, location } = body;
        const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

        if (!GOOGLE_KEY) {
            throw new Error('Server misconfiguration: Google Maps Key missing');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Explicitly get the user from the token to ensure identity is confirmed
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('StreetView Auth Error:', authError);
            throw new Error(`Unauthorized (User Check Failed): ${authError?.message || 'No user found'}`);
        }
        console.log('User Authenticated:', user.id);

        // --- Action: Autocomplete ---
        if (action === 'autocomplete') {
            if (!input) throw new Error('Input required');
            const typeParam = types === 'cities' ? '(cities)' : 'address';
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(typeParam)}&components=country:il&language=he&key=${GOOGLE_KEY}`;

            const gRes = await fetch(url);
            const gData = await gRes.json();

            return new Response(JSON.stringify(gData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- Action: Place Details ---
        if (action === 'details') {
            if (!place_id) throw new Error('Place ID required');
            const fields = 'address_component,formatted_address,geometry,name';
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=he&key=${GOOGLE_KEY}`;

            const gRes = await fetch(url);
            const gData = await gRes.json();

            return new Response(JSON.stringify(gData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- Action: Street View ---
        if (action === 'streetview') {
            if (!location) throw new Error('Location required');

            console.log('StreetView request for:', location);
            const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${GOOGLE_KEY}`;
            const imgRes = await fetch(imageUrl);

            if (!imgRes.ok) throw new Error('Failed to fetch from Google');

            const imgBlob = await imgRes.blob();
            const timestamp = Date.now();
            // Path structure: google-imports/{userId}/{timestamp}.jpg
            const fileName = `google-imports/${user.id}/${timestamp}.jpg`;

            console.log('Uploading to storage:', fileName);
            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(fileName, imgBlob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.error('Storage Upload Error Detail:', uploadError);
                throw new Error(`Storage Upload Error: ${uploadError.message}`);
            }

            console.log('Upload Success. Returning path:', fileName);
            // Return BOTH the path (relative) and a flag to indicate it's a storage path
            return new Response(JSON.stringify({
                publicUrl: fileName, // We reuse 'publicUrl' field name to match frontend expectation but pass the path
                path: fileName
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({
                error: error.message,
                stack: error.stack,
                details: error
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
