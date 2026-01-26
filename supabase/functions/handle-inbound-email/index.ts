
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SUPPORT_EMAILS = ['support@rentmate.co.il', 'service@rentmate.co.il', 'log@rentmate.co.il']

function extractEmail(str: string): string {
    const match = str.match(/<(.+)>/)
    if (match) return match[1]
    return str.trim()
}

serve(async (req) => {
    try {
        const { from, to, subject, text, html, messageId } = await req.json()

        if (!from || !to) {
            return new Response('Missing from/to', { status: 400 })
        }

        const fromEmail = extractEmail(from).toLowerCase()
        const toEmail = extractEmail(to).toLowerCase()

        // Determine Logic
        // 1. Is it an existing admin sending OUT? (BCC case)
        const isOutbound = SUPPORT_EMAILS.some(e => fromEmail.includes(e))

        // 2. Who is the "Client"?
        const clientEmail = isOutbound ? toEmail : fromEmail

        // 3. Find Client ID
        const { data: user } = await supabase.from('user_profiles').select('id').eq('email', clientEmail).single()

        if (!user) {
            console.log(`Email from/to unknown user: ${clientEmail}. Skipping log.`)
            return new Response('User not found, skipped', { status: 200 })
        }

        // 4. Log it
        const { error } = await supabase.from('crm_interactions').insert({
            user_id: user.id,
            type: 'email',
            title: subject || 'No Subject',
            content: text || 'HTML Content', // Prefer text, fallback to something else if needed
            status: isOutbound ? 'closed' : 'open', // Incoming needs attention
            metadata: {
                direction: isOutbound ? 'outbound' : 'inbound',
                from: fromEmail,
                to: toEmail,
                external_id: messageId,
                snippet: (text || '').substring(0, 200)
            },
            created_at: new Date().toISOString()
        })

        if (error) {
            console.error('DB Error:', error)
            return new Response('Database error', { status: 500 })
        }

        return new Response(JSON.stringify({ success: true, logged: true }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
