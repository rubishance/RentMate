
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";


// SECURITY: Restrict CORS to allowed origins only
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SUPABASE_URL') || '*';

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
            const response = await fetch(url, {
                headers: { 'User-Agent': 'RentMate/1.0 (https://rentmate.co.il)' }
            });
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
            const cpiUrl = 'https://api.cbs.gov.il/index/data/price?series=120010&format=json&download=false&last=6';
            await fetchCbsSeries(cpiUrl, 'cpi', results, errors);
        } catch (e) {
            console.error('Error fetching CPI:', e);
            errors.push(`CPI Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 2. Fetch Construction Index (Series 200010)
        try {
            console.log('Fetching Construction index data from CBS...');
            const constructionUrl = 'https://api.cbs.gov.il/index/data/price?series=200010&format=json&download=false&last=6';
            await fetchCbsSeries(constructionUrl, 'construction', results, errors);
        } catch (e) {
            console.error('Error fetching Construction Index:', e);
            errors.push(`Construction Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 3. Fetch Housing Price Index (Series 40010)
        try {
            console.log('Fetching Housing index data from CBS...');
            const housingUrl = 'https://api.cbs.gov.il/index/data/price?series=40010&format=json&download=false&last=6';
            await fetchCbsSeries(housingUrl, 'housing', results, errors);
        } catch (e) {
            console.error('Error fetching Housing Index:', e);
            errors.push(`Housing Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 4. Fetch Exchange Rates from Bank of Israel (XML API)
        try {
            console.log('Fetching Exchange Rates from BOI (XML)...');
            await fetchExchangeRatesXml(adminSupabase, results, errors);
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

async function fetchExchangeRatesXml(
    supabase: any,
    results: IndexData[],
    errors: string[]
) {
    const url = 'https://boi.org.il/PublicApi/GetExchangeRates?asXml=true';

    try {
        console.log(`Fetching XML from ${url}...`);
        const resp = await fetchWithRetry(url, 3, 2000);
        const text = await resp.text();

        // Simple Regex Parsing for <ExchangeRateResponseDTO> blocks
        // Structure: <Key>USD</Key>...<CurrentExchangeRate>3.65</CurrentExchangeRate>...<LastUpdate>2026-01-28T...</LastUpdate>
        const blocks = text.match(/<ExchangeRateResponseDTO>(.*?)<\/ExchangeRateResponseDTO>/g);

        if (!blocks) {
            errors.push('BOI XML Error: No exchange rate blocks found');
            return;
        }

        console.log(`Found ${blocks.length} currency blocks`);

        for (const block of blocks) {
            const keyMatch = block.match(/<Key>(.*?)<\/Key>/);
            const rateMatch = block.match(/<CurrentExchangeRate>(.*?)<\/CurrentExchangeRate>/);
            const dateMatch = block.match(/<LastUpdate>(.*?)<\/LastUpdate>/);

            if (keyMatch && rateMatch && dateMatch) {
                const currency = keyMatch[1].toUpperCase();
                const rate = parseFloat(rateMatch[1]);
                const dateStr = dateMatch[1].split('T')[0]; // Extract YYYY-MM-DD

                // Only interest in USD and EUR
                if (currency === 'USD' || currency === 'EUR') {
                    const dbType = currency.toLowerCase() as 'usd' | 'eur';

                    const record = {
                        index_type: dbType,
                        date: dateStr,
                        value: rate,
                        source: 'exchange-api'
                    };

                    console.log(`Parsed ${currency}: ${rate} for ${dateStr}`);
                    results.push(record as any);
                }
            }
        }

    } catch (e) {
        console.error('Failed to parse BOI XML:', e);
        errors.push(`BOI XML Parse Error: ${e instanceof Error ? e.message : String(e)}`);
    }
}

async function fetchCbsSeries(
    url: string,
    dbType: 'cpi' | 'housing' | 'construction',
    results: IndexData[],
    errors: string[]
) {
    const resp = await fetchWithRetry(url, 3, 2000);
    const json = await resp.json();

    let points = [];
    if (json.month) points = json.month;
    else if (json.day) points = json.day;
    else if (json.data) points = json.data;

    if (Array.isArray(points)) {
        for (const point of points) {
            const dateStr = point.date.split('T')[0].slice(0, 7);
            const value = parseFloat(point.value);

            if (dateStr && !isNaN(value)) {
                results.push({
                    index_type: dbType,
                    date: dateStr,
                    value: value,
                    source: 'cbs'
                });
            }
        }
        console.log(`Successfully fetched ${points.length} ${dbType} records`);
    } else {
        errors.push(`${dbType} Parse Error: content structure unknown`);
    }
}
