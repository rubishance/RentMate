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

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing.");

        // 2. Parse Webhook Payload (from Database Webhook)
        // Expected format: { record: { id, title, description, user_id, ... }, type: 'INSERT', table: 'support_tickets' }
        const payload = await req.json();
        const { record } = payload;

        if (!record || !record.id || !record.description) {
            return new Response(JSON.stringify({ message: "Invalid payload, missing record data." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200 // Return 200 to prevent retries if just invalid
            });
        }

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 3. Prepare AI Prompt
        const prompt = `
        You are an AI Support Analyst for "RentMate", a property management app.
        Analyze the following Support Ticket:
        Title: "${record.title || 'No Title'}"
        Description: "${record.description}"
        Category (User Selected): "${record.category || 'Unknown'}"

        TASKS:
        1. Determine Urgent Level: low, medium, high, critical.
           - Critical = Security issues, Data loss, Legal threats, Payment failure.
           - High = Broken functionality, Sync issues.
           - Medium = UX issues, Questions.
           - Low = Feedback, Feature requests.
        2. Analyze Sentiment: Score from -1.0 (Angry/Negative) to 1.0 (Happy/Positive).
        3. Correct Category: If the user selected category is wrong, suggest a better one (Finance, Maintenance, Legal, General, Technical).
        4. Draft Response: Creating a polite, professional initial response to the user (in the same language they wrote).
        5. Confidence: 0.0 to 1.0 score of your analysis.
        
        OUTPUT JSON ONLY:
        {
            "urgency": "low" | "medium" | "high" | "critical",
            "sentiment": 0.5,
            "category": "String",
            "summary": "One line summary of issue",
            "draft_reply": "String message",
            "confidence": 0.9
        }
        `;

        // 4. Call OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: "You are a JSON-only API." }, { role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: "json_object" }
            }),
        });

        const aiResult = await response.json();
        const content = aiResult.choices?.[0]?.message?.content;

        if (!content) throw new Error("No response from OpenAI");

        const analysis = JSON.parse(content);

        // 5. Store Analysis in Database
        const { error: insertError } = await adminClient
            .from('ticket_analysis')
            .insert({
                ticket_id: record.id,
                sentiment_score: analysis.sentiment,
                urgency_level: analysis.urgency,
                category: analysis.category,
                confidence_score: analysis.confidence,
                ai_summary: analysis.summary
            });

        if (insertError) {
            console.error("Failed to insert ticket analysis:", insertError);
            throw insertError;
        }

        // 6. Update Ticket with Draft (if enabled)
        // We always save the draft in the new column `auto_reply_draft` we added to support_tickets
        await adminClient
            .from('support_tickets')
            .update({
                auto_reply_draft: analysis.draft_reply
            })
            .eq('id', record.id);

        return new Response(JSON.stringify({ success: true, analysis }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Error processing ticket:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
