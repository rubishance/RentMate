
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = "support@rentmate.co.il";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let subject = "";
    let htmlContent = "";

    if (type === "new_user") {
      subject = `🚀 New User Signed Up: ${data.full_name || data.email}`;
      htmlContent = `
                <h2>New User Onboarded</h2>
                <p><strong>Name:</strong> ${data.full_name || "N/A"}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Joined:</strong> ${new Date().toLocaleString('he-IL')}</p>
                <hr>
                <a href="https://rentmate.co.il/admin/users">View User Profiles</a>
            `;
    } else if (type === "first_payment") {
      subject = `💰 Revenue Alert: First Payment from ${data.email}`;
      htmlContent = `
                <h2>First Subscription Payment Received</h2>
                <p><strong>User:</strong> ${data.email}</p>
                <p><strong>Amount:</strong> ₪${data.amount}</p>
                <p><strong>Plan:</strong> ${data.plan}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString('he-IL')}</p>
                <hr>
                <a href="https://rentmate.co.il/admin/dashboard">Go to Admin Dashboard</a>
            `;
    } else if (type === "daily_summary") {
      // Fetch stats for the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { count: newUserCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', yesterday.toISOString());

      const { data: recentPayments } = await supabase
        .from('payments')
        .select('paid_amount')
        .eq('status', 'paid')
        .gt('created_at', yesterday.toISOString());

      const totalDailyRevenue = recentPayments?.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0) || 0;

      subject = `📊 RentMate Daily Summary: ${new Date().toLocaleDateString('he-IL')}`;
      htmlContent = `
                <h2>Last 24 Hours Summary</h2>
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <p style="font-size: 18px; margin: 0;"><strong>New Signups:</strong> ${newUserCount || 0}</p>
                    <p style="font-size: 18px; margin: 10px 0;"><strong>Revenue:</strong> ₪${totalDailyRevenue.toLocaleString()}</p>
                </div>
                <p style="margin-top: 20px;">Keep up the great work!</p>
                <hr>
                <a href="https://rentmate.co.il/admin/dashboard">Full Dashboard</a>
            `;
    } else {
      return new Response(JSON.stringify({ error: "Invalid notification type" }), { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RentMate Admin <service@rentmate.co.il>",
        to: [ADMIN_EMAIL],
        subject: subject,
        html: htmlContent,
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
      status: 500,
    });
  }
});
