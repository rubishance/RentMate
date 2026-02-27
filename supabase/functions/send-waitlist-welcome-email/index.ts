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
        const { email, full_name, id: user_id } = await req.json();

        if (!RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY");
        }

        const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: #ffffff; padding: 32px; text-align: center; border-bottom: 3px solid #0F172A; }
        .content { padding: 40px 32px; }
        .content-en { text-align: left; margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid #e5e7eb; }
        .content-he { text-align: right; direction: rtl; }
        .footer { text-align: center; font-size: 13px; color: #6b7280; padding: 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
        h2 { color: #111827; margin-top: 0; font-size: 24px; font-weight: 700; }
        p { margin: 0 0 16px 0; font-size: 16px; color: #374151; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://rentmate.co.il/logo.png" alt="RentMate" width="160" style="max-width: 160px; height: auto;">
        </div>
        
        <div class="content">
            <!-- English Section -->
            <div class="content-en">
                <h2>Welcome to the RentMate Waitlist! 🎉</h2>
                <p>Hi ${full_name || 'there'},</p>
                <p>Welcome to RentMate! We are thrilled to have you on our exclusive waitlist.</p>
                <p>RentMate is the ultimate smart property management platform designed to simplify everything for landlords in Israel. From automatically tracking payments and calculating CPI (מדד) linkage, to securely storing your contracts—we bring all your real estate tasks into one beautiful dashboard.</p>
                <p>We're currently putting the finishing touches on the app. As an early subscriber, you'll be among the very first to get access the moment we launch!</p>
                <p>Stay tuned for more updates soon.</p>
                <p style="margin-bottom: 0; font-weight: 600;">Best,<br>The RentMate Team</p>
            </div>

            <!-- Hebrew Section -->
            <div class="content-he">
                <h2>ברוכים הבאים לרשימת ההמתנה של RentMate! 🎉</h2>
                <p>היי ${full_name || 'שם'},</p>
                <p>ברוכים הבאים ל-RentMate! אנחנו כל כך נרגשים לצרף אותך לרשימת ההמתנה האקסקלוסיבית שלנו.</p>
                <p>RentMate היא הפלטפורמה החכמה והאולטימטיבית לניהול נכסים, שנועדה לעשות חיים קלים לבעלי דירות בישראל. ממעקב אוטומטי אחר תשלומים וחישובי הצמדה למדד, ועד לאחסון מאובטח של חוזים – אנחנו מרכזים את כל משימות הנדל"ן שלך בלוח בקרה אחד חכם ונוח.</p>
                <p>אנחנו נמצאים ממש בשלבי הפיתוח האחרונים. בתור נרשמים מוקדמים, תהיו בין הראשונים לקבל גישה לאפליקציה מיד עם ההשקה!</p>
                <p>נישאר בקשר בקרוב עם עדכונים נוספים.</p>
                <p style="margin-bottom: 0; font-weight: 600;">בברכה,<br>צוות RentMate</p>
            </div>
        </div>

        <div class="footer">
            <p style="margin-bottom: 8px;">RentMate - Smart Property Management</p>
            <p style="margin: 0; font-size: 11px;">RentMate • Tel Aviv, Israel • support@rentmate.co.il</p>
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
                from: "RentMate <support@rentmate.co.il>",
                to: email,
                subject: `Welcome to the RentMate Waitlist! / ברוכים הבאים לרשימת ההמתנה של RentMate! 🎉`,
                html: htmlBody,
            }),
        });

        const result = await res.json();

        // Optional CRM logging
        if (user_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            try {
                // Since this is waitlist, there's no normal user_id, 
                // but if we ever decide to log it somewhere we can do it here. 
                // We'll log it if a matching CRM user exists, but it's not strictly necessary. 
            } catch (err) {
                console.error('CRM Log Error:', err);
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error sending waitlist welcome email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
