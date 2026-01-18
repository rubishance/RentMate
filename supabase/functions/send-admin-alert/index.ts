
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
        const payload = await req.json();

        // Handle Database Webhook Structure
        const record = payload.record || payload;
        const eventType = payload.type || 'unknown'; // INSERT, UPDATE, etc.

        if (!RESEND_API_KEY) {
            console.error("Missing RESEND_API_KEY");
            return new Response(JSON.stringify({ error: "Server Configuration Error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Helper to wrap content in branded template
        const wrapInTemplate = (heading: string, message: string, actionUrl: string = "", actionText: string = "") => `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body { background-color: #F8FAFC; font-family: 'Segoe UI', sans-serif; color: #0F172A; margin: 0; padding: 0; }
    .wrapper { width: 100%; padding: 40px 0; background-color: #F8FAFC; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { padding: 30px; text-align: center; border-bottom: 3px solid #0F172A; }
    .content { padding: 40px 30px; text-align: right; direction: rtl; }
    .btn { background-color: #0F172A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="header">
        <img src="https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/assets/logo.png" alt="RentMate" width="150" style="display: block; margin: 0 auto;">
      </div>
      <div class="content">
        <h2>${heading}</h2>
        <div>${message}</div>
        ${actionUrl ? `<div style="text-align: center;"><a href="${actionUrl}" class="btn">${actionText}</a></div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>
`;

        let subject = "";
        let htmlBody = "";

        // 1. New User Signup (Database Webhook: INSERT on user_profiles)
        if (eventType === 'INSERT' && payload.table === 'user_profiles') {
            subject = "New User Signup 🎉";
            const message = `
                <p><strong>Email:</strong> ${record.email}</p>
                <p><strong>Name:</strong> ${record.full_name || 'N/A'}</p>
                <p><strong>User ID:</strong> ${record.id}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            `;
            htmlBody = wrapInTemplate("מערכת RentMate: הרשמה חדשה", message, "http://localhost:5173/admin/users", "ניהול משתמשים");
        }
        // 2. Existing Manual Trigger: Upgrade Request
        else if (record.type === 'upgrade_request') {
            subject = "New Upgrade Request 🚀";
            const message = `
                 <p><strong>User ID:</strong> ${record.user_id}</p>
                <p><strong>Proposed Plan:</strong> ${record.content?.requested_plan || 'Pro'}</p>
                <p><strong>Status:</strong> ${record.status}</p>
            `;
            htmlBody = wrapInTemplate("בקשת שדרוג חדשה", message, "http://localhost:5173/admin/notifications", "לוח בקרה למנהל");
        }
        // 3. New Feedback / Bug Report
        else if (payload.table === 'feedback') {
            subject = `New Feedback: ${record.type?.toUpperCase()} 📝`;
            const message = `
                <p><strong>Type:</strong> ${record.type}</p>
                <p><strong>Message:</strong> ${record.message}</p>
                <p><strong>User ID:</strong> ${record.user_id || 'Anonymous'}</p>
                <p><strong>Device:</strong> ${JSON.stringify(record.device_info || {})}</p>
                ${record.screenshot_url ? `<p><strong>Screenshot:</strong> <a href="${record.screenshot_url}">View Image</a></p>` : ''}
            `;
            htmlBody = wrapInTemplate(`משוב חדש: ${record.type}`, message, "http://localhost:5173/admin/feedback", "צפה במשוב במערכת");
        } else {
            console.log("Ignored event type:", eventType);
            return new Response(JSON.stringify({ message: "Notification ignored" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // Send Email
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "RentMate Admin <onboarding@resend.dev>",
                to: "reuvensh1@gmail.com",
                subject: subject,
                html: htmlBody,
            }),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
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
