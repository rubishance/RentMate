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
        console.log(`Daily summary start: ${new Date().toISOString()}`);

        // 0. Fetch Configuration
        console.log("Fetching email configuration...");
        const { data: settingsData } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', ['admin_email_daily_summary_enabled', 'admin_email_content_preferences']);

        const isEnabled = settingsData?.find(s => s.key === 'admin_email_daily_summary_enabled')?.value !== false;
        const preferences = settingsData?.find(s => s.key === 'admin_email_content_preferences')?.value as Record<string, boolean> || {
            new_users: true,
            revenue: true,
            support_tickets: true,
            upgrades: true,
            active_properties: true
        };

        if (!isEnabled) {
            console.log("Admin Email is disabled in system settings. Skipping.");
            return new Response(JSON.stringify({ skipped: true, message: "Disabled by administrator." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 1. Fetch Stats
        console.log("Fetching stats based on preferences:", JSON.stringify(preferences));

        // New Users
        let newUsers = 0;
        if (preferences.new_users) {
            console.log("Fetching new users...");
            const { count, error } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', last24h);
            if (error) console.error("Error fetching users:", error);
            newUsers = count || 0;
        }

        // New Payments
        let totalRevenue = 0;
        let paymentCount = 0;
        if (preferences.revenue) {
            console.log("Fetching new payments...");
            const { data, error } = await supabase
                .from('invoices')
                .select('amount')
                .eq('status', 'paid')
                .gte('created_at', last24h);
            if (error) console.error("Error fetching payments:", error);
            totalRevenue = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            paymentCount = data?.length || 0;
        }

        // Support Tickets
        let newTickets = 0;
        if (preferences.support_tickets) {
            console.log("Fetching support tickets...");
            const { count, error } = await supabase
                .from('crm_interactions')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'support_ticket')
                .gte('created_at', last24h);
            if (error) console.error("Error fetching tickets:", error);
            newTickets = count || 0;
        }

        // Plan Upgrade Requests
        let newUpgrades = 0;
        if (preferences.upgrades) {
            console.log("Fetching upgrade requests...");
            const { count, error } = await supabase
                .from('admin_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'upgrade_request')
                .eq('status', 'pending')
                .gte('created_at', last24h);
            if (error) console.error("Error fetching upgrades:", error);
            newUpgrades = count || 0;
        }

        // 1.1 Advanced Subscription Analytics
        let planStats: any[] = [];
        if (preferences.plan_breakdown) {
            console.log("Fetching plan breakdown...");
            const { data: plans } = await supabase.from('subscription_plans').select('id, name');
            const { data: profiles } = await supabase.from('user_profiles').select('plan_id, subscription_status');

            planStats = plans?.map(plan => {
                const users = profiles?.filter(p => p.plan_id === plan.id) || [];
                return {
                    name: plan.name,
                    count: users.length,
                    active: users.filter(u => u.subscription_status === 'active').length
                };
            }) || [];
        }

        let cancellations = 0;
        if (preferences.cancellations) {
            console.log("Fetching cancellations...");
            const { count } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('subscription_status', 'canceled')
                .gte('updated_at', last24h);
            cancellations = count || 0;
        }

        let planChanges: any[] = [];
        if (preferences.plan_changes) {
            console.log("Fetching plan changes from audit logs...");
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('details, created_at, user_id')
                .eq('action', 'plan_change')
                .gte('created_at', last24h);

            // Optionally join with user_profiles if emails are needed
            planChanges = logs || [];
        }

        let freeTrials = 0;
        if (preferences.free_trials) {
            console.log("Fetching free trials...");
            const { count } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('subscription_status', 'trialing');
            freeTrials = count || 0;
        }

        // Active Properties
        let totalProperties = 0;
        if (preferences.active_properties) {
            console.log("Fetching total properties...");
            const { count, error } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true });
            if (error) console.error("Error fetching properties:", error);
            totalProperties = count || 0;
        }

        // --- NEW: User Activity Metrics ---
        console.log("Fetching user activity metrics...");
        // 1. Total Page Views (Last 24h)
        const { count: pageViewsCount } = await supabase
            .from('user_activity')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'page_view')
            .gte('created_at', last24h);

        // 2. Daily Active Users (DAU) - Last 24h
        // Note: Supabase JS doesn't support distinct count easily without rpc, so we fetch and set.
        // For scalability, this should be an RPC, but for now fetching IDs is fine for valid scale.
        const { data: activityData } = await supabase
            .from('user_activity')
            .select('user_id, path')
            .eq('event_type', 'page_view')
            .gte('created_at', last24h);

        const dauCount = new Set(activityData?.map(a => a.user_id)).size || 0;

        // 3. Top Pages
        const pageCounts = new Map<string, number>();
        activityData?.forEach(a => {
            // Clean path (remove UUIDs for aggregation if possible, or just raw path)
            // Simple raw path for now
            const p = a.path;
            pageCounts.set(p, (pageCounts.get(p) || 0) + 1);
        });

        const topPages = Array.from(pageCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([path, count]) => ({ path, count }));
        // ----------------------------------


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
                ${preferences.new_users ? `
                <div class="stat-card">
                    <div class="stat-label">משתמשים חדשים</div>
                    <div class="stat-value">${newUsers}</div>
                </div>` : ''}
                ${preferences.support_tickets ? `
                <div class="stat-card">
                    <div class="stat-label">פניות תמיכה</div>
                    <div class="stat-value">${newTickets}</div>
                </div>` : ''}
            </div>

            ${preferences.upgrades ? `
            <div class="stat-card highlight-card">
                <div class="stat-label">בקשות שדרוג תכנית</div>
                <div class="stat-value highlight-value">${newUpgrades}</div>
                <div style="font-size:12px; color:#7C3AED;">בקשות חדשות שממתינות לטיפול המערכת</div>
            </div>` : ''}

            ${preferences.plan_breakdown ? `
            <div class="stat-card">
                <div class="stat-label">התפלגות תכניות</div>
                <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
                    <thead>
                        <tr style="border-bottom:1px solid #E2E8F0;">
                            <th style="text-align:right; padding:8px;">תכנית</th>
                            <th style="text-align:center; padding:8px;">משתמשים</th>
                            <th style="text-align:center; padding:8px;">פעילים</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${planStats.map(s => `
                        <tr style="border-bottom:1px solid #F1F5F9;">
                            <td style="padding:8px; text-align:right;">${s.name}</td>
                            <td style="padding:8px; text-align:center;">${s.count}</td>
                            <td style="padding:8px; text-align:center; font-weight:bold; color:#10B981;">${s.active}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>` : ''}

            <div class="grid">
                ${preferences.cancellations ? `
                <div class="stat-card" style="border:1px solid #FEE2E2; background:#FEF2F2;">
                    <div class="stat-label" style="color:#EF4444;">ביטולי מנוי</div>
                    <div class="stat-value" style="color:#B91C1C;">${cancellations}</div>
                </div>` : ''}
                ${preferences.free_trials ? `
                <div class="stat-card" style="border:1px solid #DBEAFE; background:#EFF6FF;">
                    <div class="stat-label" style="color:#3B82F6;">בנסיון חינם</div>
                    <div class="stat-value" style="color:#1D4ED8;">${freeTrials}</div>
                </div>` : ''}
            </div>

            ${preferences.plan_changes && planChanges.length > 0 ? `
            <div class="stat-card">
                <div class="stat-label">שינויי תכנית אחרונים</div>
                <div style="font-size:12px; margin-top:10px;">
                    ${planChanges.map(log => `
                        <div style="padding:5px 0; border-bottom:1px solid #F1F5F9; text-align:right;">
                            שינוי תכנית: ${log.details?.old_plan || '?'} ➔ ${log.details?.new_plan || '?'}
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
            
            ${preferences.revenue ? `
            <div class="stat-card">
                <div class="stat-label">הכנסות חדשות</div>
                <div class="stat-value">₪${totalRevenue.toLocaleString()}</div>
                <div style="font-size:12px; color:#64748B;">מתוך ${paymentCount} תשלומים</div>
            </div>` : ''}

            ${preferences.active_properties ? `
            <div class="stat-card" style="margin-bottom:0;">
                <div class="stat-label">סה"כ נכסים במערכת</div>
                <div class="stat-value">${totalProperties}</div>
            </div>` : ''}

            <!-- Activity Section -->
            <div style="margin-top: 30px;">
                <h3 style="font-size:16px; margin-bottom:15px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">פעילות משתמשים (24h)</h3>
                <div class="grid">
                    <div class="stat-card" style="background: #F0FDFA; border: 1px solid #CCFBF1;">
                        <div class="stat-label" style="color: #0F766E;">צפיות בדפים</div>
                        <div class="stat-value" style="color: #115E59;">${pageViewsCount || 0}</div>
                    </div>
                    <div class="stat-card" style="background: #F0FDFA; border: 1px solid #CCFBF1;">
                        <div class="stat-label" style="color: #0F766E;">משתמשים פעילים</div>
                        <div class="stat-value" style="color: #115E59;">${dauCount}</div>
                    </div>
                </div>
                ${topPages.length > 0 ? `
                <div style="background: #F8FAFC; border-radius: 12px; padding: 15px; font-size: 13px; border: 1px solid #E2E8F0;">
                    <div style="font-weight: bold; margin-bottom: 10px; color: #64748B;">הדפים הנצפים ביותר:</div>
                    ${topPages.map((p, i) => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: ${i < topPages.length - 1 ? '1px solid #E2E8F0' : 'none'};">
                            <span style="direction: ltr; font-family: monospace;">${p.path}</span>
                            <span style="font-weight: bold;">${p.count}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
        <div class="footer">
            זהו דוח אוטומטי שנשלח למנהלי RentMate בכל בוקר בשעה 08:00
            <br/>
            <a href="${Deno.env.get('APP_URL')}/admin/settings" style="color:#94A3B8;">נהל הגדרות דוח</a>
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
