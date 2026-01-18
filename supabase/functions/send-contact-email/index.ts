import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL = 'support@rentmate.co.il'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// SECURITY: Restrict CORS to allowed origins only
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Rate Limiting Check
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const endpoint = 'send-contact-email'

    // Check current usage
    const { data: usage, error: usageError } = await supabase
      .from('rate_limits')
      .select('request_count, last_request_at')
      .eq('ip_address', ip)
      .eq('endpoint', endpoint)
      .single()

    const LIMIT = 5 // Max 5 emails per hour per IP
    const ONE_HOUR = 60 * 60 * 1000

    if (usage) {
      const timeDiff = new Date().getTime() - new Date(usage.last_request_at).getTime()

      if (timeDiff < ONE_HOUR) {
        if (usage.request_count >= LIMIT) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        // Increment count
        await supabase.from('rate_limits').update({
          request_count: usage.request_count + 1,
          last_request_at: new Date().toISOString() // Update time to slide window? Or keep strict hour? Let's just update count. Actually better to reset if old? Simplified: strict window from first request or sliding? Simplest: Delete old records periodically (via cron) or check logic here. 
          // Let's stick to simple: if < 1 hour and count >= limit, block. Else update.
        }).eq('ip_address', ip).eq('endpoint', endpoint)
      } else {
        // Reset if older than hour
        await supabase.from('rate_limits').update({ request_count: 1, last_request_at: new Date().toISOString() }).eq('ip_address', ip).eq('endpoint', endpoint)
      }
    } else {
      // Create new record
      await supabase.from('rate_limits').insert({ ip_address: ip, endpoint, request_count: 1 })
    }

    const { user_id, user_name, user_email, message } = await req.json()

    // Send email notification using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'RentMate <noreply@rentmate.co.il>',
        to: [ADMIN_EMAIL],
        subject: `New Support Request from ${user_name}`,
        html: `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <style>
    body { background-color: #F8FAFC; font-family: sans-serif; color: #0F172A; }
    .wrapper { background-color: #F8FAFC; padding: 40px 0; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid #0F172A; }
    .logo { font-size: 28px; font-weight: 800; color: #0F172A; }
    .content { padding: 40px 30px; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; color: #64748B; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; }
    .message-box { background-color: #F1F5F9; padding: 20px; border-radius: 8px; border-left: 4px solid #0F172A; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="header">
        <img src="https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/assets/logo.png" alt="RentMate" width="150" style="display: block; margin: 0 auto;">
      </div>
      <div class="content">
        <h2>New Support Request</h2>
        
        <div class="field">
          <div class="label">From</div>
          <div class="value">${user_name} (<a href="mailto:${user_email}">${user_email}</a>)</div>
        </div>
        
        <div class="field">
          <div class="label">User ID</div>
          <div class="value">${user_id}</div>
        </div>

        <div class="field">
           <div class="label">Message</div>
           <div class="message-box">
             ${message.replace(/\n/g, '<br>')}
           </div>
        </div>
      </div>
      <div class="footer">
        Sent via RentMate Contact Form
      </div>
    </div>
  </div>
</body>
</html>
                `,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
