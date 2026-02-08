/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { subject, title, message } = await req.json();

        if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
        if (!subject || !message) throw new Error("Subject and message are required");

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 1. Fetch users with marketing consent
        const { data: users, error: fetchError } = await supabase
            .from('user_profiles')
            .select('id, email')
            .eq('marketing_consent', true);

        if (fetchError) throw fetchError;
        if (!users || users.length === 0) {
            return new Response(JSON.stringify({ message: "No users with marketing consent found." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const emails = users.map((u: any) => u.email).filter(Boolean);

        // 2. Send emails via Resend
        // Note: Resend bulk mailing usually works better in batches or using their 'to' as an array for small lists.
        // For a true broadcast, we'll try to send to all OR batch if list is huge.
        // Using a single call with 'to' as an array if allowed, or mapping.

        const htmlBody = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { background: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid #0F172A; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; }
        .footer { text-align: center; font-size: 12px; color: #666; padding-top: 20px; border-top: 1px solid #eee; }
        .btn { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/assets/logo.png" alt="RentMate" width="150" style="max-width: 150px; height: auto;">
        </div>
        <div class="content" style="text-align: right;">
            <h2>${title || subject}</h2>
            <div style="white-space: pre-wrap;">${message}</div>
            <div style="text-align: center;">
                <a href="https://rentmate.co.il/dashboard" class="btn">למעבר לאפליקציה</a>
            </div>
        </div>
        <div class="footer">
            <p>נשלח על ידי RentMate - ניהול שכירות חכם</p>
            <p style="margin-top: 10px; color: #999;">
                הודעה זו נשלחה אליך כי בחרת לקבל עדכונים מקצועיים מ-RentMate.
                <br>
                להסרה או ניהול העדפות: <a href="https://rentmate.co.il/settings" style="color: #666; text-decoration: underline;">לחץ כאן</a>
            </p>
            <p style="margin-top: 10px; font-size: 10px; color: #bbb;">
                RentMate • תל אביב, ישראל • rubi@rentmate.co.il
            </p>
        </div>
    </div>
</body>
</html>
        `;

        // Resend batch sending logic (simplified for now - sending to all in one go if total is reasonable)
        // If the user base grows, we should use Resend's batch API.

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "RentMate Updates <updates@rentmate.co.il>",
                to: emails, // Resend supports an array of emails
                subject: `[Update] ${subject}`,
                html: htmlBody,
                reply_to: "support@rentmate.co.il"
            }),
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.message || "Resend error");

        // 3. Log to each user's CRM (Async background-ish)
        const crmLogs = users.map((u: any) => ({
            user_id: u.id,
            type: 'email' as const,
            title: `Broadcast Received: ${subject}`,
            content: `Marketing/Update email: ${title || subject}`,
            status: 'closed' as const
        }));

        // We use insert(array) for bulk efficiency
        if (crmLogs.length > 0) {
            await supabase.from('crm_interactions').insert(crmLogs);
        }

        return new Response(JSON.stringify({
            message: "Broadcast sent successfully",
            count: emails.length,
            result
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
