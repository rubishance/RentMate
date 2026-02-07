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
        const { action, input, types, place_id, location } = await req.json();
        const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

        if (!GOOGLE_KEY) {
            throw new Error('Server misconfiguration: Google Maps Key missing');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        // --- Action: Autocomplete ---
        if (action === 'autocomplete') {
            if (!input) throw new Error('Input required');

            // 1. Auth Check (Enforce session for all API proxy calls)
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            );

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error('Unauthorized quota usage denied');

            // Default to Israel, types handled by params
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

            // Fetch minimal fields
            const fields = 'address_component,formatted_address,geometry,name';
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=he&key=${GOOGLE_KEY}`;

            const gRes = await fetch(url);
            const gData = await gRes.json();

            return new Response(JSON.stringify(gData), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- Action: Street View (Upload pattern) ---
        if (action === 'streetview') {
            if (!location) throw new Error('Location required');

            // 1. Auth Check (Critical for storage write)
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) throw new Error('Missing Authorization header');

            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            );

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw new Error('Unauthorized');

            // 2. Fetch Image from Google
            const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${GOOGLE_KEY}`;
            const imgRes = await fetch(imageUrl);

            if (!imgRes.ok) throw new Error('Failed to fetch from Google');

            const imgBlob = await imgRes.blob();

            // 3. Upload to Supabase Storage
            // Use a consistent path or random? 
            // Random to allow multiple properties. 
            // Path: google-imports/{userId}/{timestamp}.jpg
            const timestamp = Date.now();
            const fileName = `google-imports/${user.id}/${timestamp}.jpg`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(fileName, imgBlob, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (uploadError) throw new Error(`Storage Upload Error: ${uploadError.message}`);

            // 4. Get Public URL
            const { data: urlData } = supabase.storage
                .from('property-images')
                .getPublicUrl(fileName);

            return new Response(JSON.stringify({ publicUrl: urlData.publicUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error: any) {
        console.error('Google Proxy Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
