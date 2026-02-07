
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 2. Auth Check
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // 3. Request Data
        const { images, properties = [] } = await req.json();
        if (!images || !Array.isArray(images) || images.length === 0) {
            throw new Error('No images provided for analysis');
        }

        // 4. Usage Limit Check
        const { data: usage, error: usageError } = await supabase.rpc('check_and_log_ai_usage', {
            p_user_id: user.id,
            p_feature: 'bill_scan',
            p_count: 1
        });

        if (usageError) {
            console.error('Usage check error:', usageError);
        } else if (usage && !usage.allowed) {
            return new Response(
                JSON.stringify({ error: 'AI usage limit reached', limitExceeded: true }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Prepare Gemini Prompt
        const propertyListString = properties.map((p: any) => `- ID: ${p.id}, Address: ${p.address}`).join('\n');

        const prompt = `
            You are a senior financial auditor specializing in the Israeli utility and property market.
            Analyze the provided image(s) of a utility bill and extract data into a pure JSON object.
            
            CONTEXT: The user has the following properties:
            ${propertyListString}
            
            TASK:
            1. Extract bill details (amount, date, vendor, etc.).
            2. Attempt to match the address on the bill to one of the properties provided above.
               * NOTE: If only ONE property is listed above, it is ALMOST CERTAINLY the correct property. Use its ID even if the address match is not exact.
            
            FIELDS TO EXTRACT:
            - category: Strictly one of ['water', 'electric', 'gas', 'municipality', 'management', 'internet', 'cable', 'other'].
            - amount: The total sum to be paid for the current period (numeric).
            - date: Billing/Invoice date (YYYY-MM-DD).
            - vendor: Service provider name.
            - invoiceNumber: The invoice or bill number (string).
            - currency: usually '₪' or 'ILS'.
            - billingPeriodStart: Service start date (YYYY-MM-DD).
            - billingPeriodEnd: Service end date (YYYY-MM-DD).
            - summary: One sentence description of the bill contents.
            - propertyId: The ID of the matched property from the provided list, or null if no match found.
            - propertyAddress: The address of the matched property, or null if no match found.
            - confidence: 0.0 to 1.0 (Overall confidence including property match accuracy).
            
            Return ONLY the JSON object.
        `;

        // 6. Call Gemini API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const geminiPayload = {
            contents: [{
                parts: [
                    { text: prompt },
                    ...images.map(img => ({
                        inlineData: {
                            data: img.split(',')[1] || img,
                            mimeType: "image/jpeg" // Default or sniff from prefix
                        }
                    }))
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 1024,
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const result = await response.json();
        const extractedText = result.candidates[0].content.parts[0].text;
        const data = JSON.parse(extractedText);

        // 7. Log AI Usage (Advanced logging for metrics)
        try {
            await supabase.rpc('log_ai_usage', {
                p_user_id: user.id,
                p_model: "gemini-1.5-flash",
                p_feature: 'bill-scan',
                p_input_tokens: 0, // Gemini doesn't always provide simple token counts in this format
                p_output_tokens: 0
            });
        } catch (logError) {
            console.error('Logging failed:', logError);
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Analyze Bill error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
