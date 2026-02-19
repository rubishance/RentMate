
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

        // 1. Fetch All Latest CBS Indices from price_selected_b
        try {
            console.log('Fetching all latest Indices from CBS...');
            // This endpoint is more reliable and returns the latest for all major indices
            const selectedUrl = 'https://api.cbs.gov.il/index/data/price_selected_b?lang=en&format=json';
            await fetchCbsSelectedXml(selectedUrl, results, errors);
        } catch (e) {
            console.error('Error fetching CBS Selected:', e);
            errors.push(`CBS Selected Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
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

        // 2. Populate Missing Index Bases & Settings
        try {
            console.log('Checking for missing Index Bases and Settings...');
            await populateIndexBases(adminSupabase);

            // Ensure Admin Notification Settings exist
            const settings = [
                { key: 'admin_notification_email', value: 'admin@rentmate.co.il' },
                { key: 'admin_security_whatsapp', value: '+972503602000' }
            ];
            await adminSupabase.from('system_settings').upsert(settings, { onConflict: 'key' });
            console.log('Admin settings updated.');

        } catch (e) {
            console.error('Error populating index bases/settings:', e);
            errors.push(`System Config Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 3. Send Notification to Admin
        try {
            const currentMonth = new Date();
            // Expected month is usually the previous month (e.g. in Feb we expect Jan)
            const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
            const expectedMonthStr = lastMonth.toISOString().slice(0, 7);

            const hasNewCbsData = results.some(r => r.source === 'cbs' && r.date === expectedMonthStr);
            console.log(`Checking for new data (${expectedMonthStr}): ${hasNewCbsData ? 'FOUND' : 'NOT FOUND'}`);

            const shouldNotify = hasNewCbsData || errors.length > 0;

            if (shouldNotify) {
                console.log('Sending update notification to admin...');
                const notificationPayload = {
                    type: 'index_update',
                    success: hasNewCbsData && errors.length === 0,
                    records_processed: results.length,
                    errors: errors
                };

                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-admin-alert`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notificationPayload)
                });
                console.log('Notification sent.');
            } else {
                console.log('No new data found and no system errors. Staying silent for retry.');
            }
        } catch (e) {
            console.error('Error sending notification:', e);
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

async function populateIndexBases(supabase: any) {
    const bases = [
        // CPI Bases
        { index_type: 'cpi', base_period_start: '2025-01-01', base_value: 100, chain_factor: 1.074 },
        { index_type: 'cpi', base_period_start: '2023-01-01', base_value: 100, chain_factor: 1.026 },

        // Construction Bases
        { index_type: 'construction', base_period_start: '2025-07-01', base_value: 100, chain_factor: 1.387 },
        { index_type: 'construction', base_period_start: '2011-08-01', base_value: 100, chain_factor: 1.0 }
    ];

    console.log('Upserting index_bases...');
    const { error } = await supabase
        .from('index_bases')
        .upsert(bases, { onConflict: 'index_type,base_period_start' });

    if (error) {
        console.error('Error upserting index_bases:', error);
        throw error;
    }
}

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

async function fetchCbsSelectedXml(
    url: string,
    results: IndexData[],
    errors: string[]
) {
    try {
        console.log(`Fetching selected XML from ${url}...`);
        // We use Mozilla User Agent to avoid being blocked by CBS
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' }
        });
        const text = await resp.text();

        // 1. Get the last_update date (e.g. 2026-01)
        const dateMatch = text.match(/<last_update>(.*?)<\/last_update>/);
        if (!dateMatch) {
            errors.push('CBS XML Error: <last_update> not found');
            return;
        }
        const lastUpdateDate = dateMatch[1].trim();
        console.log(`CBS Last Update: ${lastUpdateDate}`);

        // 2. Parse individual indices
        const indBlocks = text.match(/<ind>(.*?)<\/ind>/gs);
        if (!indBlocks) {
            errors.push('CBS XML Error: No <ind> blocks found');
            return;
        }

        const typeMap: Record<string, 'cpi' | 'housing' | 'construction'> = {
            '120010': 'cpi',
            '120490': 'housing',
            '200010': 'construction'
        };

        for (const block of indBlocks) {
            const codeMatch = block.match(/<code>(.*?)<\/code>/);
            const valueMatch = block.match(/<index>(.*?)<\/index>/);

            if (codeMatch && valueMatch) {
                const code = codeMatch[1].trim();
                const value = parseFloat(valueMatch[1]);
                const type = typeMap[code];

                if (type && !isNaN(value)) {
                    results.push({
                        index_type: type,
                        date: lastUpdateDate,
                        value: value,
                        source: 'cbs'
                    });
                    console.log(`Parsed ${type}: ${value} for ${lastUpdateDate}`);
                }
            }
        }
    } catch (e) {
        console.error('Failed to parse CBS XML:', e);
        errors.push(`CBS XML Parse Error: ${e instanceof Error ? e.message : String(e)}`);
    }
}
