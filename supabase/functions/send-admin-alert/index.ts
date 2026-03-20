
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

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

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase configuration");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch Admin Configuration
        const { data: settings } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', ['admin_security_email', 'admin_security_whatsapp', 'security_alerts_enabled', 'admin_notification_email']);

        const adminEmail = settings?.find(s => s.key === 'admin_security_email')?.value as string
            || settings?.find(s => s.key === 'admin_notification_email')?.value as string
            || "support@rentmate.co.il";
        const adminWhatsApp = settings?.find(s => s.key === 'admin_security_whatsapp')?.value as string;
        const alertsEnabled = settings?.find(s => s.key === 'security_alerts_enabled')?.value !== false;

        if (!alertsEnabled && (payload.table === 'security_logs' || record.type === 'security_alert')) {
            return new Response(JSON.stringify({ message: "Security alerts are disabled" }), { headers: corsHeaders });
        }

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
        <img src="${SUPABASE_URL}/storage/v1/object/public/assets/logo.png" alt="RentMate" width="150" style="display: block; margin: 0 auto;">
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
            htmlBody = wrapInTemplate(`משוב חדש: ${record.type}`, message, "https://app.rentmate.co.il/admin/feedback", "צפה במשוב במערכת");
        } else if (payload.table === 'support_tickets') {
            subject = `New Support Ticket: ${record.category?.toUpperCase() || 'GENERAL'} 🎫`;
            const message = `
                <p><strong>Title:</strong> ${record.title || 'N/A'}</p>
                <p><strong>Category:</strong> ${record.category || 'N/A'}</p>
                <p><strong>Priority:</strong> <span style="color: ${record.priority === 'urgent' ? 'red' : record.priority === 'high' ? 'orange' : 'inherit'}">${record.priority?.toUpperCase() || 'NORMAL'}</span></p>
                <p><strong>Description:</strong> ${record.description || 'N/A'}</p>
                <p><strong>User ID:</strong> ${record.user_id || 'Anonymous'}</p>
            `;
            htmlBody = wrapInTemplate("כרטיס תמיכה חדש", message, `https://app.rentmate.co.il/admin/tickets?id=${record.id}`, "צפה בכרטיס");
        } else if (payload.table === 'error_logs') {
            subject = "System Error Reported ⚠️";
            const message = `
                <p><strong>Error:</strong> ${record.message}</p>
                <p><strong>Route:</strong> ${record.route || 'N/A'}</p>
                <p><strong>User ID:</strong> ${record.user_id || 'Anonymous'}</p>
                <p><strong>Environment:</strong> ${record.environment || 'production'}</p>
                <p><strong>Time:</strong> ${new Date(record.created_at).toLocaleString()}</p>
                <pre style="background: #f1f5f9; padding: 10px; border-radius: 4px; font-size: 10px; overflow-x: auto;">
                    ${record.stack || 'No stack trace available'}
                </pre>
            `;
            htmlBody = wrapInTemplate("שגיאת מערכת דווחה", message, `http://localhost:5173/admin/errors?id=${record.id}`, "צפה בפרטי השגיאה");
        } else if (payload.table === 'security_logs' || record.type === 'security_alert') {
            const evCode = record.event_code || record.event_type || 'Potential Abuse Detected';
            subject = `🛡️ Security Alert: ${evCode}`;
            const message = `
                <p><strong>Event:</strong> ${evCode}</p>
                <p><strong>Severity:</strong> <span style="color: ${record.severity === 'critical' ? 'red' : 'orange'}">${record.severity?.toUpperCase()}</span></p>
                <p><strong>Details:</strong> ${record.details ? (typeof record.details === 'string' ? record.details : JSON.stringify(record.details)) : 'N/A'}</p>
                <p><strong>User ID:</strong> ${record.user_id}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <hr>
                <p>The user has been flagged for review. Please check the security logs in the admin dashboard.</p>
            `;
            htmlBody = wrapInTemplate("התראת אבטחה RentMate", message, `http://localhost:5173/admin/users?id=${record.user_id}`, "צפה בפרופיל משתמש");

            // --- SEND WHATSAPP IF CONFIGURED ---
            if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID && adminWhatsApp) {
                try {
                    console.log(`Sending WhatsApp alert to ${adminWhatsApp}...`);
                    const waRes = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: adminWhatsApp,
                            type: "text",
                            text: {
                                body: `🛡️ *התראת אבטחה RentMate*\n\nאירוע: ${evCode}\nחומרה: ${record.severity?.toUpperCase()}\nפרטים: ${record.details}\nמשתמש: ${record.user_id}\n\nבדוק את מערכת הניהול.`
                            }
                        }),
                    });
                    const waData = await waRes.json();
                    if (!waRes.ok) console.error("WhatsApp API Error:", waData);
                } catch (waErr) {
                    console.error("WhatsApp Send Failed:", waErr);
                }
            }
        } else if (record.type === 'index_update') {
            const isSuccess = record.success !== false;
            subject = isSuccess ? "Economic Indices Updated Successfully ✅" : "Index Update Failed or Partial ⚠️";

            const message = `
                <p><strong>Status:</strong> ${isSuccess ? '<span style="color: green;">Success</span>' : '<span style="color: red;">Failed/Partial</span>'}</p>
                <p><strong>Records Processed:</strong> ${record.records_processed || 0}</p>
                <p><strong>Errors:</strong> ${record.errors?.length > 0 ? record.errors.join(', ') : 'None'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            `;
            htmlBody = wrapInTemplate(isSuccess ? "עדכון מדדים הושלם בהצלחה" : "שגיאה בעדכון מדדים", message, "http://localhost:5173/admin/indices", "ניהול מדדים");

            // --- SEND WHATSAPP ---
            if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID && adminWhatsApp) {
                try {
                    console.log(`Sending Index Update WhatsApp to ${adminWhatsApp}...`);
                    const waBody = isSuccess
                        ? `✅ *עדכון מדדים RentMate*\n\nהמדדים עודכנו בהצלחה.\nרשומות שעובדו: ${record.records_processed || 0}\nזמן: ${new Date().toLocaleString()}`
                        : `⚠️ *שגיאה בעדכון מדדים RentMate*\n\nחלו שגיאות במהלך העדכון.\nשגיאות: ${record.errors?.join(', ')}\nבדוק את לוג המערכת.`;

                    await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: adminWhatsApp,
                            type: "text",
                            text: { body: waBody }
                        }),
                    });
                } catch (waErr) {
                    console.error("WhatsApp Send Failed:", waErr);
                }
            }
        } else if (record.type === 'cbs_data_update') {
            const isSuccess = record.success !== false;
            subject = isSuccess ? "CBS Rental Data Updated ✅" : "CBS Data Update Failed ⚠️";

            const message = `
                <p><strong>Status:</strong> ${isSuccess ? '<span style="color: green;">Success</span>' : '<span style="color: red;">Failed</span>'}</p>
                <p><strong>Job Type:</strong> ${record.job_type || 'CBS Data Sync'}</p>
                <p><strong>Details:</strong> ${record.details || 'No details provided'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            `;
            htmlBody = wrapInTemplate(isSuccess ? "עדכון נתוני הלמ״ס בוצע" : "שגיאה בעדכון נתוני הלמ״ס", message, "https://app.rentmate.co.il/admin", "לוח בקרה למנהל");

            // --- SEND WHATSAPP ---
            if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID && adminWhatsApp) {
                try {
                    console.log(`Sending CBS Update WhatsApp to ${adminWhatsApp}...`);
                    const waBody = isSuccess
                        ? `✅ *עדכון נתוני הלמ״ס RentMate*\n\nהנתונים עודכנו בהצלחה.\nסוג: ${record.job_type}\nפרטים: ${record.details}\nזמן: ${new Date().toLocaleString()}`
                        : `⚠️ *שגיאה בעדכון הלמ״ס RentMate*\n\nחלו שגיאות במהלך העדכון.\nסוג: ${record.job_type}\nפרטים: ${record.details}\nבדוק את לוג המערכת.`;

                    await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: adminWhatsApp,
                            type: "text",
                            text: { body: waBody }
                        }),
                    });
                } catch (waErr) {
                    console.error("WhatsApp Send Failed:", waErr);
                }
            }
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
                from: "RentMate Admin <admin@rentmate.co.il>",
                to: adminEmail,
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
