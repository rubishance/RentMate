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
        if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // 1. Fetch Stats
        // New Users
        const { count: newUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', last24h);

        // New Payments (Invoices)
        const { data: newPayments } = await supabase
            .from('invoices')
            .select('amount, currency')
            .eq('status', 'paid')
            .gte('created_at', last24h);

        const totalRevenue = newPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // Support Tickets
        const { count: newTickets } = await supabase
            .from('crm_interactions')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'support_ticket')
            .gte('created_at', last24h);

        // Plan Upgrade Requests
        const { count: newUpgrades } = await supabase
            .from('admin_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'upgrade_request')
            .eq('status', 'pending')
            .gte('created_at', last24h);

        // Active Properties
        const { count: totalProperties } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true });

        // SILENT MODE CHECK: If no significant activity, skip email
        if ((newUsers || 0) === 0 && (newTickets || 0) === 0 && (newUpgrades || 0) === 0 && totalRevenue === 0) {
            console.log("Silent Mode: No activity in the last 24h. Skipping daily summary.");
            return new Response(JSON.stringify({ skipped: true, message: "No significant activity to report." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Format Email
        const htmlBody = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #F8FAFC; color: #0F172A; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .header { background: #0F172A; color: white; padding: 40px; text-align: center; }
        .content { padding: 40px; }
        .stat-card { background: #F1F5F9; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; border: 1px solid #E2E8F0; }
        .stat-value { font-size: 32px; font-weight: 800; color: #0F172A; margin: 5px 0; }
        .stat-label { font-size: 14px; color: #64748B; text-transform: uppercase; font-weight: bold; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94A3B8; background: #F8FAFC; border-top: 1px solid #E2E8F0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .highlight-card { background: #F5F3FF; border: 1px solid #DDD6FE; }
        .highlight-value { color: #7C3AED; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0; font-size:24px;">סיכום פעילות יומי - RentMate</h1>
            <p style="margin:10px 0 0 0; opacity:0.8;">${new Date().toLocaleDateString('he-IL')} | 24 שעות אחרונות</p>
        </div>
        <div class="content">
            <div class="grid">
                <div class="stat-card">
                    <div class="stat-label">משתמשים חדשים</div>
                    <div class="stat-value">${newUsers || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">פניות תמיכה</div>
                    <div class="stat-value">${newTickets || 0}</div>
                </div>
            </div>

            <div class="stat-card highlight-card">
                <div class="stat-label">בקשות שדרוג תכנית</div>
                <div class="stat-value highlight-value">${newUpgrades || 0}</div>
                <div style="font-size:12px; color:#7C3AED;">בקשות חדשות שממתינות לטיפול המערכת</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">הכנסות חדשות</div>
                <div class="stat-value">₪${totalRevenue.toLocaleString()}</div>
                <div style="font-size:12px; color:#64748B;">מתוך ${newPayments?.length || 0} תשלומים</div>
            </div>

            <div class="stat-card" style="margin-bottom:0;">
                <div class="stat-label">סה"כ נכסים במערכת</div>
                <div class="stat-value">${totalProperties || 0}</div>
            </div>
        </div>
        <div class="footer">
            זהו דוח אוטומטי שנשלח למנהלי RentMate בכל בוקר בשעה 08:00
        </div>
    </div>
</body>
</html>
        `;

        // 3. Send Email
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "RentMate Intelligence <reports@rentmate.co.il>",
                to: "rubi@rentmate.co.il",
                subject: `📊 RentMate Daily Summary: ${new Date().toLocaleDateString()}`,
                html: htmlBody,
            }),
        });

        const result = await res.json();
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
