import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// SECURITY: Restrict CORS to allowed origins only
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://qfvrekvugdjnwhnaucmz.supabase.co'

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let payload;
        try {
            payload = await req.json()
        } catch (e) {
            throw new Error(`Failed to parse request JSON: ${e.message}`)
        }

        const { images } = payload

        if (!images || !Array.isArray(images) || images.length === 0) {
            throw new Error(`No images provided. Received payload keys: ${Object.keys(payload)}. Images value: ${JSON.stringify(images)}. Full payload: ${JSON.stringify(payload)}`)
        }

        // Call OpenAI GPT-4o Vision API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are a factual data extraction tool for rental contracts in Israel with high understanding of contracts and the israeli law.

CRITICAL RULES:
- Extract ONLY explicit, factual data that is clearly stated in the contract
- DO NOT interpret legal meaning or provide legal advice
- DO NOT infer or assume missing information
- For each field, provide the exact source text excerpt from the contract
- Assign confidence levels based on Visual Clarity and Explicit Stating:
  * HIGH: Field is clearly labeled AND visually clear (legible). Value is explicit.
  * MEDIUM: Value is inferred from context OR has minor visual ambiguity/OCR potential errors (e.g. handwritten).
  * LOW: Ambiguous context OR visually unclear (blurry, bad handwriting).
  * GUIDE: If text is legible but context is weak, use MEDIUM. If text is illegible, use LOW.


Extract these fields from the rental contract:

# People & Contact
1. tenant_name - Full name of tenant
2. tenant_id - Teudat Zehut number of tenant
3. tenant_email - Tenant email address
4. tenant_phone - Tenant phone number
5. landlord_name - Full name of landlord/property owner
6. landlord_id - Teudat Zehut number of landlord
7. landlord_phone - Landlord phone number

# Guarantors
8. guarantors_info - A single text block summarizing ALL guarantors. Format: "1. Name (ID) - Phone\n2. Name (ID) - Phone". If none, return null.

# Property Details
9. city - City name
10. street - Street name
11. building_number - Building number
12. apartment_number - Apartment number
13. property_address - Complete full address string
14. size_sqm - Property size in square meters
15. rooms - Number of rooms
16. floor - Floor number
17. has_parking - Boolean (true/false) if parking is mentioned
18. has_storage - Boolean (true/false) if storage/machsan is mentioned

# Contract Terms
19. signing_date - Date contract was signed (YYYY-MM-DD)
20. start_date - Contract start date (YYYY-MM-DD)
21. end_date - Contract end date (YYYY-MM-DD)
22. payment_day - Day of month rent is due (1-31)
23. payment_frequency - e.g., Monthly, Quarterly, Annually

# Financials
24. monthly_rent - Monthly rent amount (number only)
25. currency - Currency code (ILS, USD, EUR)
26. security_deposit_amount - Security deposit amount (number only)
27. guarantees - Type of guarantee (e.g., Bank Guarantee, Promissory Note, Check)

# Linkage (Madad/Index)
28. linkage_type - 'cpi' (Madad), 'usd', 'eur', or 'none'
29. index_calculation_method - 'known' (Madad Yadua - published index) OR 'respect_of' (Madad B'gin - index of the month)
30. base_index_date - Base date for index (YYYY-MM-DD). Look for "Madad Bassis" or specific date.
31. base_index_value - Base index value (number)
32. limit_type - 'ceiling' (max inc), 'floor' (min inc/no drop), or 'none'

# Options & Extras
33. renewal_option - Boolean (true/false) if option to renew exists
34. pets_allowed - Boolean (true/false) or null if not mentioned
35. special_clauses - A text summary of special terms (Pets, Smoking, Repairs, Breach, Early Exit).

Return ONLY valid JSON in this exact format:
{
  "fields": [
    {
      "fieldName": "tenant_name",
      "extractedValue": "John Doe",
      "sourceText": "This agreement is between John Doe (Tenant) and...",
      "confidence": "high",
      "pageNumber": 1
    }
  ]
}

If a field is not found, set extractedValue to null and confidence to "low".
Ensure all field names match exactly as listed above.`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Extract data from this rental contract. Return only the JSON object, no additional text.'
                            },
                            ...images.map((imageUrl: string) => ({
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            }))
                        ]
                    }
                ],
                max_tokens: 2000,
                temperature: 0.1, // Low temperature for consistent extraction
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
        }

        const result = await response.json()
        const content = result.choices[0].message.content
        const usage = result.usage;

        // Extract user ID from JWT for logging
        const authHeader = req.headers.get("authorization");
        if (authHeader && usage) {
            try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL');
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

                const token = authHeader.replace("Bearer ", "");
                const { data: { user } } = await supabase.auth.getUser(token);

                if (user) {
                    await supabase.rpc('log_ai_usage', {
                        p_user_id: user.id,
                        p_model: result.model || "gpt-4o",
                        p_feature: 'contract-extraction',
                        p_input_tokens: usage.prompt_tokens,
                        p_output_tokens: usage.completion_tokens
                    });
                }
            } catch (logError) {
                console.error("Failed to log AI usage:", logError);
            }
        }

        // Parse the JSON response
        let extractedData
        try {
            // Remove markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
            extractedData = JSON.parse(cleanContent)
        } catch (parseError) {
            throw new Error(`Failed to parse AI response: ${content}`)
        }

        // Post-process: add user confirmation flags
        const processedFields = extractedData.fields.map((field: any) => ({
            ...field,
            userConfirmed: false,
            manuallyOverridden: false,
        }))

        return new Response(
            JSON.stringify({
                fields: processedFields,
                processingTimestamp: new Date().toISOString()
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        )

    } catch (error) {
        console.error('Error in analyze-contract function:', error)

        // Return 400 Bad Request if it's a known error, or 500 otherwise.
        // We return the error details so the frontend can display them.
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return new Response(
            JSON.stringify({
                error: errorMessage,
                details: error
            }),
            {
                status: 400, // Changed from 500 to 400 to distinguish logic errors from crash
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        )
    }
})
