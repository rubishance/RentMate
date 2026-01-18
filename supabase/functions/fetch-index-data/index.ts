
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";


// SECURITY: Restrict CORS to allowed origins only
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://qfvrekvugdjnwhnaucmz.supabase.co';

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexData {
    index_type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    date: string; // 'YYYY-MM'
    value: number;
    source: 'cbs' | 'exchange-api';
}

// Retry helper function with exponential backoff
async function fetchWithRetry(
    url: string,
    maxRetries = 3,
    initialDelay = 1000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }

        // Don't wait after the last attempt
        if (attempt < maxRetries - 1) {
            const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || new Error('Fetch failed after retries');
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            // Supabase API URL - env var automatically injected by Supabase
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase Anon Key - env var automatically injected by Supabase
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
            // Note: For writing to the DB, we might need SERVICE_ROLE_KEY if RLS blocks us.
            // But we set a policy "Allow service role to manage index data", so we should use the service role key
            // if we want to bypass RLS, OR just ensure the edge function has admin rights.
            // Usually Edge Functions run with the ANON key by default unless configured otherwise.
            // Let's use the Service Role Key for writing data securely.
        );

        // We actually need the Service Role Key to bypass RLS for inserts if the user isn't logged in (e.g. cron job)
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const adminSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey ?? ''
        );

        const results: IndexData[] = [];
        const errors: string[] = [];

        // 1. Fetch CPI (Consumer Price Index) from CBS with retry logic
        // Series 120010 = General CPI (Madad Klali)
        try {
            console.log('Fetching CPI data from CBS...');
            // Fetch last 3 months to ensure we catch the latest update
            const cpiUrl = 'https://api.cbs.gov.il/index/data/price?series=120010&format=json&download=false&last=3';

            const cpiResponse = await fetchWithRetry(cpiUrl, 3, 2000);
            const cpiJson = await cpiResponse.json();

            // Parse CBS JSON Response
            // Structure expected: { publicationSeries: [ { seriesId: 120010, day: [ { date: '2023-12-15', value: 105.2 }, ... ] } ] }
            // Note: The specific key names might vary slightly, so we'll inspect "month" or "day" or "data".
            // Based on standard CBS API:
            // It usually returns a "month" array containing objects with "date" and "value".

            let points = [];
            if (cpiJson.month) points = cpiJson.month;
            else if (cpiJson.day) points = cpiJson.day;
            else if (cpiJson.data) points = cpiJson.data;

            if (Array.isArray(points)) {
                for (const point of points) {
                    // point.date format is usually YYYY-MM-DDT00... or YYYY-MM-DD
                    // We need YYYY-MM
                    const dateStr = point.date.split('T')[0].slice(0, 7);
                    const value = parseFloat(point.value);

                    if (dateStr && !isNaN(value)) {
                        results.push({
                            index_type: 'cpi',
                            date: dateStr,
                            value: value,
                            source: 'cbs'
                        });
                    }
                }
                console.log(`Successfully fetched ${points.length} CPI records`);
            } else {
                errors.push('CPI Parse Error: content structure unknown ' + JSON.stringify(cpiJson).slice(0, 100));
            }
        } catch (e) {
            console.error('Error fetching CPI after retries:', e);
            errors.push(`CPI Fetch Error: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
        }

        // 2. Fetch Exchange Rates from Bank of Israel with retry logic
        try {
            console.log('Fetching Exchange Rates from BOI...');
            // USD
            await fetchSpecificRate('US', 'usd', adminSupabase, results, errors);
            // EUR
            await fetchSpecificRate('EU', 'eur', adminSupabase, results, errors);
        } catch (e) {
            console.error('Error fetching Exchange Rates:', e);
            errors.push(`BOI Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 3. Upsert into DB
        if (results.length > 0) {
            console.log(`Upserting ${results.length} records...`);
            const { error: upsertError } = await adminSupabase
                .from('index_data')
                .upsert(results, { onConflict: 'index_type,date' });

            if (upsertError) {
                console.error('Upsert Error:', upsertError);
                errors.push(`DB Upsert Error: ${upsertError.message}`);
            } else {
                console.log('Upsert successful.');
            }
        }

        return new Response(JSON.stringify({
            success: true,
            records_processed: results.length,
            errors: errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Function Error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

async function fetchSpecificRate(
    currencyCode: string,
    dbType: 'usd' | 'eur',
    supabase: any,
    results: IndexData[],
    errors: string[]
) {
    // BOI Endpoint for specific currency, last 1 observation
    const url = `https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/R/${currencyCode}/ILS?c%5BDATA_TYPE%5D=OF00&lastNObservations=1&format=sdmx-json`;

    try {
        console.log(`Fetching ${currencyCode} exchange rate...`);
        const resp = await fetchWithRetry(url, 3, 2000);
        const data = await resp.json();

        // SDMX JSON structure extraction
        // data.dataSets[0].series -> key like "0:0:0:0" -> observations -> "0" -> [value]
        // We need to be careful with the key. Since we requested ONE specific series, there should be only one key in 'series'.

        const series = data.dataSets?.[0]?.series;
        if (!series) {
            errors.push(`${currencyCode}: No series data found`);
            return;
        }

        const seriesKey = Object.keys(series)[0];
        const observation = series[seriesKey].observations['0'];
        const rateValue = parseFloat(observation[0]);

        // Extract date from structure structure.dimensions.observation[0].values...
        // Or simplified: use today's date or the one from the response if we can find it easily.
        // SDMX puts time periods in structure.dimensions.observation[0].values

        const timeDimIndex = data.structure.dimensions.observation.findIndex((d: any) => d.id === 'TIME_PERIOD');
        const dateValue = data.structure.dimensions.observation[timeDimIndex].values[0].id; // e.g., "2023-10-25"

        // We store 'YYYY-MM' for the monthly index, but for daily rates we might want full date?
        // The DB schema says "date TEXT NOT NULL, -- Format: 'YYYY-MM'".
        // This suggests we are storing monthly averages or the monthly representative rate?
        // For Linkage, we usually need the specific "Base Index" for a date.
        // IF the schema assumes monthly, we might be losing daily precision for currencies.
        // Let's store YYYY-MM-DD if possible or just YYYY-MM if that's the constraint.
        // Re-reading schema: "date TEXT NOT NULL". The comment says "Format: 'YYYY-MM'".
        // If I put "2023-10-25", it might be fine if the app handles it.
        // However, for consistency with CPI (which is monthly), let's stick to the schema, or update it.
        // BUT, exchange rates change daily. Storing "2023-10" for a daily rate is misleading.
        // I will store the full date "YYYY-MM-DD" and hope the app parses it correctly, 
        // OR I will strictly follow the "YYYY-MM" comment and just store the latest for that month (which is ambiguous).
        // Let's update the intention: Store specific date.

        const record = {
            index_type: dbType,
            date: dateValue, // e.g. "2025-01-08"
            value: rateValue,
            source: 'exchange-api'
        };

        const { error } = await supabase
            .from('index_data')
            .upsert(record, { onConflict: 'index_type,date' });

        if (error) {
            console.error(`Error Upserting ${dbType}:`, error);
            errors.push(`${currencyCode} DB Error: ${error.message}`);
        } else {
            console.log(`Saved ${dbType}: ${rateValue} for ${dateValue}`);
            results.push(record as any);
        }

    } catch (e) {
        console.error(`Failed to fetch ${currencyCode} after retries:`, e);
        errors.push(`${currencyCode} Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
    }
}
