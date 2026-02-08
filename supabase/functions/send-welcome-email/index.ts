/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
        const { email, full_name, user_id } = await req.json();

        if (!RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY");
        }

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
        .feature-list { list-style: none; padding: 0; }
        .feature-item { margin-bottom: 15px; padding-right: 25px; position: relative; }
        .feature-item::before { content: '✓'; position: absolute; right: 0; color: #10B981; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/assets/logo.png" alt="RentMate" width="150" style="max-width: 150px; height: auto;">
        </div>
        <div class="content" style="text-align: right;">
            <h2 style="color: #0F172A;">ברוכים הבאים ל-RentMate!</h2>
            <h3>שלום ${full_name || 'משתמש חדש'},</h3>
            <p>אנחנו שמחים שהצטרפת למשפחת RentMate - הפלטפורמה החכמה לניהול שכירות בישראל.</p>
            
            <p>הנה כמה דברים שתוכל לעשות כבר עכשיו:</p>
            <ul class="feature-list">
                <li class="feature-item"><strong>ניתוח חוזי שכירות ב-AI:</strong> העלה את החוזה שלך וקבל תובנות משפטיות ופיננסיות תוך שניות.</li>
                <li class="feature-item"><strong>מחשבון הצמדה מתקדם:</strong> חשב בקלות הפרשי מדד ומט"ח.</li>
                <li class="feature-item"><strong>ניהול מסמכים:</strong> שמור את כל הקבלות, חשבונות והמסמכים של הדירה במקום אחד בטוח.</li>
                <li class="feature-item"><strong>התראות חכמות:</strong> לעולם אל תפספס מועד סיום חוזה או תאריך אופציה.</li>
            </ul>

            <div style="text-align: center;">
                <a href="https://rentmate.co.il/dashboard" class="btn">התחל להשתמש באפליקציה</a>
            </div>

            <p style="margin-top: 30px;">אם יש לך שאלות, אנחנו כאן בשבילך!</p>
            <p>צוות RentMate</p>
        </div>
        <div class="footer">
            <p>נשלח על ידי RentMate - ניהול שכירות חכם</p>
            <p style="margin-top: 10px; color: #999;">
                הודעה זו נשלחה אליך במסגרת ההרשמה ל-RentMate.
                <br>
                לניהול העדפות התראות: <a href="https://rentmate.co.il/settings" style="color: #666; text-decoration: underline;">לחץ כאן</a>
            </p>
            <p style="margin-top: 10px; font-size: 10px; color: #bbb;">
                RentMate • תל אביב, ישראל • rubi@rentmate.co.il
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
                from: "RentMate Service <service@rentmate.co.il>",
                to: email,
                subject: `ברוכים הבאים ל-RentMate, ${full_name || ''}!`,
                html: htmlBody,
            }),
        });

        const result = await res.json();

        // 2. Log to CRM Interactions
        if (user_id) {
            const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
            try {
                await supabase.from('crm_interactions').insert({
                    user_id: user_id,
                    type: 'email',
                    title: `Welcome Email Sent`,
                    content: `System sent a welcome email to ${email} upon registration.`,
                    status: 'closed'
                })
            } catch (err) {
                console.error('CRM Log Error:', err);
            }
        }

        return new Response(JSON.stringify(result), {
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
