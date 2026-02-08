import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL = 'support@rentmate.co.il' // Change this to your email
serve(async (req) => {
    try {
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
          <h2>New Support Request</h2>
          <p><strong>From:</strong> ${user_name} (${user_email})</p>
          <p><strong>User ID:</strong> ${user_id}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>Sent from RentMate Contact Form</small></p>
        `,
            }),
        })
        const data = await res.json()
        if (!res.ok) {
            throw new Error(`Resend API error: ${JSON.stringify(data)}`)
        }
        return new Response(
            JSON.stringify({ success: true, email_id: data.id }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})