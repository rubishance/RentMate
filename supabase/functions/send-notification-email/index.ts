import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, notification, lang = 'he' } = await req.json();

        if (!RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY");
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Fetch user ID based on email to generate token
        const { data: user, error: userError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            .single();

        let unsubscribeLink = 'https://rentmate.co.il/settings'; // Fallback

        if (user && !userError) {
            const key = await crypto.subtle.importKey(
                "raw",
                new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
            );

            const jwt = await create({ alg: "HS256", type: "JWT" }, { userId: user.id, type: 'reminders' }, key);
            unsubscribeLink = `https://rentmate.co.il/unsubscribe?token=${jwt}&type=reminders`;
        }

        const isRtl = lang === 'he';
        const contactEmail = 'support@rentmate.co.il';
        const footerText = isRtl
            ? 'יש לך שאלות? השב למייל זה או צור קשר בכתובת'
            : 'Have questions? Reply to this email or contact us at';
        const dashboardBtnText = isRtl ? 'למעבר למרכז הבקרה' : 'Go to Dashboard';
        const sentByText = isRtl ? 'נשלח על ידי RentMate - ניהול שכירות חכם' : 'Sent by RentMate - Smart Rental Management';

        const htmlBody = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6; 
            color: #1e293b; 
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: #ffffff;
            border-radius: 24px; 
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
        }
        .header { 
            background: #0F172A; 
            padding: 40px 20px; 
            text-align: center; 
        }
        .logo {
            font-size: 24px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -0.02em;
            text-transform: lowercase;
        }
        .content { 
            padding: 40px; 
            text-align: ${isRtl ? 'right' : 'left'};
        }
        .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 24px;
            letter-spacing: -0.01em;
        }
        .message {
            font-size: 16px;
            color: #475569;
            margin-bottom: 32px;
        }
        .footer { 
            background-color: #f8fafc;
            padding: 32px;
            text-align: center; 
            font-size: 12px; 
            color: #94a3b8; 
            border-top: 1px solid #f1f5f9; 
        }
        .btn { 
            display: inline-block; 
            padding: 16px 32px; 
            background: #4f46e5; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 14px; 
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .contact-link {
            color: #6366f1;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">rentmate</div>
        </div>
        <div class="content">
            <h2 class="title">${notification.title}</h2>
            <p class="message">${notification.message}</p>
            <div style="text-align: center;">
                <a href="https://rentmate.co.il/dashboard" class="btn">${dashboardBtnText}</a>
            </div>
        </div>
        <div class="footer">
            <p style="margin-bottom: 8px;">${footerText} <a href="mailto:${contactEmail}" class="contact-link">${contactEmail}</a></p>
            <p>${sentByText}</p>
            <p style="margin-top: 10px; font-size: 10px;">
                <a href="${unsubscribeLink}" style="color: #94a3b8; text-decoration: underline;">
                    ${isRtl ? 'הסר מרשימת תפוצה זו' : 'Unsubscribe from these notifications'}
                </a>
            </p>
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
                subject: isRtl ? `התראה מ-RentMate: ${notification.title}` : `RentMate Notification: ${notification.title}`,
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
