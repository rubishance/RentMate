
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, notification } = await req.json();

        if (!RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY");
        }

        // Simple template for user notifications
        const htmlBody = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { background: #0F172A; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; }
        .footer { text-align: center; font-size: 12px; color: #666; padding-top: 20px; }
        .btn { display: inline-block; padding: 12px 24px; background: #0F172A; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0;">RentMate</h1>
        </div>
        <div class="content" style="text-align: right;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <a href="https://rentmate.co.il/dashboard" class="btn">לצפייה בפרטים</a>
        </div>
        <div class="footer">
            נשלח על ידי RentMate - ניהול שכירות חכם
        </div>
    </div>
</body>
</html>
        `;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "RentMate <noreply@rentmate.co.il>",
                to: email,
                subject: `התראה מ-RentMate: ${notification.title}`,
                html: htmlBody,
            }),
        });

        const result = await res.json();
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
