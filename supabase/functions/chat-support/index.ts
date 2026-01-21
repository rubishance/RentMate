// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { detectLanguage, getKnowledgeBase } from "./knowledge.ts";

// Define available functions for OpenAI
const FUNCTION_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_contracts",
            description: "Search for rental contracts. Returns matching contracts with key information. Use when user asks to find, search, or show contracts (Hebrew: חפש/מצא/הראה חוזים).",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Search term (tenant name, property address, or any contract detail)"
                    }
                },
                required: ["query"]
            }
        }
    }
];

// Function implementations
async function searchContracts(query: string, userId: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Simple search on contracts table only
        const { data, error } = await supabase
            .from('contracts')
            .select('id, start_date, end_date, monthly_rent, status, property_id, tenant_id')
            .eq('user_id', userId)
            .limit(10);

        if (error) {
            console.error("Search error:", error);
            return { success: false, message: `Database error: ${error.message}` };
        }

        if (!data || data.length === 0) {
            return { success: false, message: `לא נמצאו חוזים. (No contracts found.)` };
        }

        // Return simplified results
        const results = data.map(contract => ({
            id: contract.id,
            rent: `₪${contract.monthly_rent}`,
            period: `${contract.start_date} עד ${contract.end_date}`,
            status: contract.status
        }));

        return {
            success: true,
            count: results.length,
            message: `נמצאו ${results.length} חוזים`,
            contracts: results
        };
    } catch (err) {
        console.error("Function error:", err);
        return { success: false, message: "שגיאה בחיפוש חוזים" };
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set.");
        }

        const { messages } = await req.json();
        const authHeader = req.headers.get("authorization");

        // Extract user ID from JWT
        let userId = null;
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id;
        }

        // Check usage limits (if user is authenticated)
        if (userId) {
            const { data: usageCheck, error: usageError } = await supabase.rpc('check_ai_chat_usage', {
                p_user_id: userId,
                p_tokens_used: 500 // Estimate, will update after actual usage
            });

            if (usageError) {
                console.error("Usage check error:", usageError);
            } else if (usageCheck && !usageCheck.allowed) {
                const errorMessage = usageCheck.reason === 'message_limit_exceeded'
                    ? `הגעת למגבלת ההודעות החודשית (${usageCheck.limit} הודעות). שדרג את המנוי שלך להמשך שימוש. / You've reached your monthly message limit (${usageCheck.limit} messages). Please upgrade your subscription.`
                    : `הגעת למגבלת הטוקנים החודשית. שדרג את המנוי שלך. / You've reached your monthly token limit. Please upgrade your subscription.`;

                return new Response(
                    JSON.stringify({
                        choices: [{
                            message: { role: "assistant", content: errorMessage }
                        }]
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Detect user language and load appropriate knowledge base
        const userLanguage = detectLanguage(messages[messages.length - 1]?.content || '');
        const knowledgeBase = getKnowledgeBase(userLanguage);

        // Build messages for OpenAI
        const openaiMessages = [
            {
                role: "system",
                content: `You are a helpful customer support assistant for "RentMate", a property management app in Israel.

LANGUAGE: Respond in the SAME language the user writes in (Hebrew or English). Most users speak Hebrew.

You can help users by:
1. Answering questions based on the Knowledge Base
2. Searching for their contracts when they ask (in Hebrew: "חפש חוזה", "מצא חוזה", "הראה חוזים")

Always be helpful and conversational.

Knowledge Base:
${knowledgeBase}`
            },
            ...messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        // Initial API call with function tools
        let response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: openaiMessages,
                tools: FUNCTION_TOOLS,
                temperature: 0.7,
                max_tokens: 800,
            }),
        });

        let result = await response.json();

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: `OpenAI Error: ${result.error?.message || JSON.stringify(result)}` }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if OpenAI wants to call a function
        const toolCalls = result.choices?.[0]?.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            let functionResult;

            // Execute the function
            if (functionName === "search_contracts") {
                if (!userId) {
                    functionResult = { success: false, message: "User not authenticated. Please log in to search contracts." };
                } else {
                    functionResult = await searchContracts(functionArgs.query, userId);
                }
            } else {
                functionResult = { success: false, message: "Unknown function" };
            }

            // Send function result back to OpenAI
            openaiMessages.push(result.choices[0].message);
            openaiMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
            });

            // Get final response from OpenAI
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_tokens: 800,
                }),
            });

            result = await response.json();
        }

        const aiMessage = result.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

        return new Response(
            JSON.stringify({
                choices: [{
                    message: { role: "assistant", content: aiMessage }
                }]
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
