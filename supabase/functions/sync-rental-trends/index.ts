
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const adminSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        console.log('Fetching Rent Index (Series 120250) from CBS...');

        // Series 120250 = Rent Index for Consumer Price Index
        const cbsUrl = 'https://api.cbs.gov.il/index/data/price?series=120250&format=json&download=false&last=12';
        const response = await fetch(cbsUrl);

        if (!response.ok) {
            throw new Error(`CBS API error: ${response.statusText}`);
        }

        const json = await response.json();
        const points = json.month || json.data || [];

        if (points.length < 2) {
            throw new Error('Insufficient data points for trend calculation');
        }

        // Sort by date descending
        points.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const latest = points[0];
        const previous = points[3] || points[points.length - 1]; // Compare latest with 3 months ago (quarterly)

        const latestValue = parseFloat(latest.value);
        const prevValue = parseFloat(previous.value);

        const shiftCoefficient = latestValue / prevValue;
        const growthPercent = ((shiftCoefficient - 1) * 100).toFixed(2);

        console.log(`Latest Index: ${latestValue} (${latest.date})`);
        console.log(`Previous Index: ${prevValue} (${previous.date})`);
        console.log(`Calculated Shift Coefficient: ${shiftCoefficient}`);
        console.log(`Market Growth: ${growthPercent}%`);

        // Fetch all current rental market data
        const { data: currentData, error: fetchError } = await adminSupabase
            .from('rental_market_data')
            .select('region_name, avg_rent');

        if (fetchError) throw fetchError;

        if (!currentData || currentData.length === 0) {
            return new Response(JSON.stringify({ message: 'No market data found to update' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Update each city - scale by the national coefficient
        const updates = currentData.map(row => ({
            region_name: row.region_name,
            avg_rent: Math.round(row.avg_rent * shiftCoefficient),
            updated_at: new Date().toISOString()
        }));

        console.log(`Updating ${updates.length} regions...`);

        const { error: updateError } = await adminSupabase
            .from('rental_market_data')
            .upsert(updates, { onConflict: 'region_name' });

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
            success: true,
            market_growth_calculated: `${growthPercent}%`,
            regions_updated: updates.length,
            reference_period: `${previous.date} to ${latest.date}`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Automation Error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
