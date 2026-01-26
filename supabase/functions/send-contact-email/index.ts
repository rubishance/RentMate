import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ADMIN_EMAIL = 'support@rentmate.co.il'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    // 0. Validate Environment Variables
    if (!RESEND_API_KEY) {
      console.error('CRITICAL: RESEND_API_KEY is not set in Supabase secrets.')
      throw new Error('Server configuration error: Missing API Key.')
    }

    // 1. Rate Limiting Check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const endpoint = 'send-contact-email'

    // Check current usage
    const { data: usage, error: usageError } = await supabase
      .from('rate_limits')
      .select('request_count, last_request_at')
      .eq('ip_address', ip)
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (usageError) {
      console.warn('Rate limit check skipped due to DB error:', usageError.message)
    }

    const LIMIT = 10 // Increased limit for testing
    const ONE_HOUR = 60 * 60 * 1000

    if (usage) {
      const timeDiff = new Date().getTime() - new Date(usage.last_request_at).getTime()

      if (timeDiff < ONE_HOUR && usage.request_count >= LIMIT) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update usage
      await supabase.from('rate_limits')
        .update({
          request_count: timeDiff < ONE_HOUR ? usage.request_count + 1 : 1,
          last_request_at: new Date().toISOString()
        })
        .eq('ip_address', ip)
        .eq('endpoint', endpoint)
    } else {
      // Create new record
      await supabase.from('rate_limits').insert({ ip_address: ip, endpoint, request_count: 1 })
    }

    const body = await req.json().catch(() => ({}))
    const { user_id = 'guest', user_name = 'Anonymous', user_email, message } = body

    if (!user_email || !message) {
      return new Response(JSON.stringify({ error: 'Missing email or message.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send email notification using Resend
    console.log(`Attempting to send contact email to ${ADMIN_EMAIL} from ${user_email}`)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'RentMate <noreply@rentmate.co.il>',
        to: [ADMIN_EMAIL],
        reply_to: user_email,
        subject: `New Support Request from ${user_name}`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { background-color: #F8FAFC; font-family: sans-serif; color: #0F172A; line-height: 1.6; }
    .wrapper { background-color: #F8FAFC; padding: 40px 0; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E2E8F0; }
    .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 2px solid #F1F5F9; }
    .content { padding: 40px 30px; }
    .footer { background-color: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #F1F5F9; }
    .field { margin-bottom: 20px; }
    .label { font-weight: bold; color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .value { font-size: 16px; color: #1E293B; }
    .message-box { background-color: #F1F5F9; padding: 24px; border-radius: 12px; border-right: 4px solid #000; margin-top: 8px; font-style: italic; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main">
      <div class="header">
        <h1 style="margin: 0; font-weight: 800; font-size: 24px;">RentMate <span style="font-weight: 400;">Support</span></h1>
      </div>
      <div class="content">
        <h2 style="margin-top: 0; font-size: 20px; color: #000;">קבלת פנייה חדשה</h2>
        
        <div class="field">
          <div class="label">שם השולח</div>
          <div class="value">${user_name}</div>
        </div>

        <div class="field">
          <div class="label">אימייל לחזרה</div>
          <div class="value"><a href="mailto:${user_email}" style="color: #000; font-weight: 600;">${user_email}</a></div>
        </div>
        
        <div class="field">
          <div class="label">מזהה משתמש</div>
          <div class="value"><code style="background: #F1F5F9; padding: 2px 6px; border-radius: 4px;">${user_id}</code></div>
        </div>

        <div class="field">
           <div class="label">הודעה</div>
           <div class="message-box">
             ${message.replace(/\n/g, '<br>')}
           </div>
        </div>
      </div>
      <div class="footer">
        נשלח אוטומטית באמצעות מערכת הפניות של RentMate
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
      console.error('Resend API Error:', data)
      throw new Error(`Email provider error: ${data.message || 'Unknown error'}`)
    }

    console.log('Email sent successfully:', data.id)

    // 3. Log to CRM
    try {
      // Try to find if the email belongs to a registered user
      const { data: userData } = await supabase.from('user_profiles').select('id').eq('email', user_email).single()

      let targetUserId = userData?.id || user_id // fallback to passed ID if matches format, or maybe 'guest'

      // If 'guest', we might want to store it differently, but for now let's only log if we have a valid UUID or if we allow guests
      if (targetUserId && targetUserId !== 'guest') {
        await supabase.from('crm_interactions').insert({
          user_id: targetUserId,
          type: 'email',
          title: `Contact Form: ${body.subject || 'Support Request'}`,
          content: message,
          status: 'open', // Open because it needs a reply
          metadata: {
            direction: 'inbound', // It's inbound to US from the user
            from: user_email,
            to: ADMIN_EMAIL,
            external_id: data.id,
            provider: 'resend'
          }
        })
      }
    } catch (logErr) {
      console.error('Failed to log email to CRM:', logErr)
      // Don't fail the request just because logging failed
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Edge Function Request Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
