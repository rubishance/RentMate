
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const WEBHOOK_SECRET = Deno.env.get('EMAIL_WEBHOOK_SECRET')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SUPPORT_EMAILS = ['support@rentmate.co.il', 'service@rentmate.co.il', 'log@rentmate.co.il']

function extractEmail(str: string): string {
    const match = str.match(/<(.+)>/)
    if (match) return match[1]
    return str.trim()
}

// Helper to call OpenAI for analysis
async function analyzeEmailWithAI(subject: string, body: string, isSales: boolean) {
    if (!OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY missing, skipping AI analysis')
        return null
    }

    try {
        const systemPrompt = isSales
            ? `You are a top-tier Sales Representative for RentMate. 
               Analyze the incoming sales lead. 
               Identify if they are interested in specific features.
               Generate a TAILORED proposal reply.
               Output JSON block with sentiment_score, urgency_level, category, confidence_score, summary, draft_reply.`
            : `You are a helpful Support Agent for RentMate.
               Analyze the incoming support request.
               Output JSON block with sentiment_score, urgency_level, category, confidence_score, summary, draft_reply.`

        const userContent = `Subject: ${subject}\n\nBody: ${body}`

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        })

        if (!res.ok) return null
        const data = await res.json()
        return JSON.parse(data.choices[0].message.content)
    } catch (err) {
        console.error('AI Analysis Exception:', err)
        return null
    }
}

serve(async (req) => {
    // 1. Verify Webhook Secret
    const receivedSecret = req.headers.get('X-Webhook-Secret');
    if (WEBHOOK_SECRET && receivedSecret !== WEBHOOK_SECRET) {
        console.error('CRITICAL: Unauthorized Email Hook Attempt');
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const payload = await req.json()
        const { from, to, subject, text, messageId, attachments } = payload

        if (!from || !to) {
            return new Response('Missing from/to', { status: 400 })
        }

        const fromEmail = extractEmail(from).toLowerCase()
        const toEmail = extractEmail(to).toLowerCase()

        // 2. Identify context based on target address
        const isSupport = toEmail.includes('support@') || toEmail.includes('service@')
        const isSales = toEmail.includes('sales@')

        // 3. Identify if it's an "Admin Forward"
        const { data: adminCheck } = await supabase.from('user_profiles').select('id, role').eq('email', fromEmail).single()
        const isAdmin = adminCheck?.role === 'admin' || adminCheck?.role === 'super_admin'

        let targetUserEmail = fromEmail
        if (isAdmin && (text || '').includes('---------- Forwarded message ---------')) {
            const forwardMatch = (text || '').match(/From:\s*([^<\n\r]+)\s*<([^>\n\r]+)>/i)
            if (forwardMatch && forwardMatch[2]) {
                targetUserEmail = forwardMatch[2].toLowerCase().trim()
            }
        }

        // 4. Find target user
        let { data: user } = await supabase.from('user_profiles').select('id').eq('email', targetUserEmail).single()

        // GUEST LEADS LOGIC
        const GUEST_LEAD_ID = '00000000-0000-0000-0000-000000000000'
        if (!user && (isSales || isSupport)) {
            user = { id: GUEST_LEAD_ID }
            // Ensure guest user exists (Service Role handles this)
            await supabase.from('user_profiles').upsert({
                id: GUEST_LEAD_ID,
                email: 'guest-leads@rentmate.co.il',
                full_name: 'Potential Lead',
                role: 'user'
            }, { onConflict: 'id' })
        }

        if (!user) {
            return new Response('User not found, skipped', { status: 200 })
        }

        // 5. Intelligent Automation (AI Analysis)
        let aiAnalysis = null
        if (isSupport || isSales) {
            aiAnalysis = await analyzeEmailWithAI(subject || '', text || 'No content', isSales)
        }

        // 6. Routing
        if (isSupport || isSales) {
            const ticketCategory = aiAnalysis?.category || (isSales ? 'billing' : 'technical')
            const ticketPriority = aiAnalysis?.urgency_level === 'critical' ? 'critical' : (isSales ? 'high' : 'medium')
            const ticketDraft = aiAnalysis?.draft_reply

            // Create Ticket
            await supabase.from('support_tickets').insert({
                user_id: user.id,
                title: isSales ? `[SALE] ${subject || 'Inquiry'}` : (subject || 'Email Support Request'),
                description: text || 'See email body',
                category: ticketCategory,
                priority: ticketPriority,
                status: 'open',
                auto_reply_draft: ticketDraft,
                metadata: {
                    from: fromEmail,
                    original_sender: targetUserEmail,
                    is_lead: user.id === GUEST_LEAD_ID,
                    attachments: attachments || []
                }
            })
        }

        // Log as CRM Interaction
        await supabase.from('crm_interactions').insert({
            user_id: user.id,
            type: 'email',
            title: isSales ? `[SALE] ${subject}` : (subject || 'Inbound Email'),
            content: text || 'View HTML for content',
            status: (isSupport || isSales) ? 'open' : 'closed',
            metadata: {
                direction: 'inbound',
                from: fromEmail,
                to: toEmail,
                is_forwarded: targetUserEmail !== fromEmail,
                message_id: messageId,
                ai_analyzed: !!aiAnalysis
            }
        })

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Email Handler Crash:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
