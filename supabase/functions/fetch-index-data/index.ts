
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { withEdgeMiddleware } from '../_shared/middleware.ts';


// SECURITY: Restrict CORS to allowed origins only
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SUPABASE_URL') || '*';

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexData {
    index_type: 'cpi' | 'housing';
    date: string; // 'YYYY-MM'
    value: number;
    source: 'cbs';
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

serve(withEdgeMiddleware('fetch-index-data', async (req, logger) => {
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

        // 1.5 Fetch Housing Index specifically (120490) since it's missing from price_selected_b
        try {
            console.log('Fetching Housing Index from CBS (series 120490)...');
            const housingUrl = 'https://api.cbs.gov.il/index/data/price?series=120490&format=json&download=false&last=2';
            const resp = await fetchWithRetry(housingUrl, 3, 2000);
            const json = await resp.json();
            const points = json.month || json.data || [];
            if (points.length > 0) {
                // Sort by date descending
                points.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latest = points[0];
                results.push({
                    index_type: 'housing',
                    date: latest.date,
                    value: parseFloat(latest.value),
                    source: 'cbs'
                });
                console.log(`Parsed housing: ${latest.value} for ${latest.date}`);
            }
        } catch (e) {
            console.error('Error fetching Housing Index directly:', e);
            errors.push(`CBS Housing Fetch Error: ${e instanceof Error ? e.message : String(e)}`);
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
                console.log('Admin notification sent.');
            } else {
                console.log('No new data found and no system errors. Staying silent for retry.');
            }

            // --- 4. Send Notifications to All Active Users (If New Data Found) ---
            if (hasNewCbsData) {
                console.log('New CBS indices found! Dispatching in-app notifications to users...');
                
                // Extract the parsed values for the template
                const newCpi = results.find(r => r.source === 'cbs' && r.index_type === 'cpi' && r.date === expectedMonthStr)?.value;
                const newHousing = results.find(r => r.source === 'cbs' && r.index_type === 'housing' && r.date === expectedMonthStr)?.value;

                if (newCpi && newHousing) {
                    // Fetch all active users
                    const { data: users, error: userError } = await adminSupabase
                        .from('user_profiles')
                        .select('id, lang')
                        .eq('is_active', true);

                    if (userError) {
                        console.error('Failed to fetch active users for notifications:', userError);
                    } else if (users && users.length > 0) {
                        console.log(`Preparing to notify ${users.length} active users.`);
                        const userNotifications = users.map(user => {
                            const isHebrew = user.lang === 'he';
                            const title = isHebrew ? 'עודכנו מדדי המחירים החדשים' : 'New Index Rates Updated';
                            const message = isHebrew
                                ? `הלמ"ס פרסמה את מדדי ${expectedMonthStr}. מדד המחירים לצרכן עודכן ל-${newCpi} ומדד שירותי דיור ל-${newHousing}. היכנס למערכת כדי לראות את ההשפעה על החוזים שלך.`
                                : `The CBS just published the ${expectedMonthStr} indices. CPI is now ${newCpi} and Housing Index is ${newHousing}. Check your dashboard to see the impact on your leases.`;

                            return {
                                user_id: user.id,
                                type: 'info',
                                title: title,
                                message: message,
                                metadata: { 
                                    action: 'view_indices',
                                    cpi_value: newCpi,
                                    housing_value: newHousing,
                                    month: expectedMonthStr
                                }
                            };
                        });

                        // Insert all notifications in bulk
                        const { error: notifyError } = await adminSupabase
                            .from('notifications')
                            .insert(userNotifications);

                        if (notifyError) {
                            console.error('Failed to insert user notifications:', notifyError);
                        } else {
                            console.log(`Successfully dispatched ${userNotifications.length} in-app notifications.`);
                        }
                    }
                } else {
                     console.log('Missing specific CPI or Housing values for the new month, skipping user notifications.');
                }
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
        { index_type: 'cpi', base_period_start: '2023-01-01', base_value: 100, chain_factor: 1.026 }
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

        const typeMap: Record<string, 'cpi' | 'housing'> = {
            '120010': 'cpi',
            '120490': 'housing'
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
                    }));
                    console.log(`Parsed ${type}: ${value} for ${lastUpdateDate}`);
                }
            }
        }
    } catch (e) {
        console.error('Failed to parse CBS XML:', e);
        errors.push(`CBS XML Parse Error: ${e instanceof Error ? e.message : String(e)}`);
    }
}
