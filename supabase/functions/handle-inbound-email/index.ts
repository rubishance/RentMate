
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

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
               Identify if they are interested in specific features: CPI Linkage, Digital Contracts, Tenant Management, or Maintenance Autopilot.
               
               Generate a TAIILORED proposal reply that:
               1. Acknowledges their specific pain point (e.g., manual calculations, late rent).
               2. Briefly explains how RentMate solves it (be specific about the feature).
               3. Mentions our competitive pricing (10% lower than competitors).
               4. Ends with a clear call to action (Schedule a 10-min demo).
               
               Output JSON:
               {
                 "sentiment_score": number (-1.0 to 1.0),
                 "urgency_level": "low"|"medium"|"high"|"critical",
                 "category": "sales",
                 "confidence_score": number (0.0 to 1.0),
                 "summary": "Brief 1-sentence summary",
                 "draft_reply": "Professional, persuasive proposal (max 120 words)."
               }`
            : `You are a helpful Support Agent for RentMate.
               Analyze the incoming support request.
               Output JSON:
               {
                 "sentiment_score": number (-1.0 to 1.0),
                 "urgency_level": "low"|"medium"|"high"|"critical",
                 "category": "technical"|"billing"|"account"|"feature_request"|"other",
                 "confidence_score": number (0.0 to 1.0),
                 "summary": "Brief 1-sentence summary",
                 "draft_reply": "A helpful, empathetic email reply. If you need more info, ask nicely. If it seems like a bug, say you're investigating. Keep it under 80 words."
               }`

        const userContent = `Subject: ${subject}\n\nBody: ${body}`

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Fast & cheap
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.3, // Deterministic for classification
                response_format: { type: "json_object" }
            })
        })

        if (!res.ok) {
            const txt = await res.text()
            console.error('OpenAI Error:', txt)
            return null
        }

        const data = await res.json()
        return JSON.parse(data.choices[0].message.content)
    } catch (err) {
        console.error('AI Analysis Exception:', err)
        return null
    }
}

serve(async (req) => {
    try {
        const payload = await req.json()
        const { from, to, subject, text, html, messageId, attachments } = payload

        if (!from || !to) {
            return new Response('Missing from/to', { status: 400 })
        }

        const fromEmail = extractEmail(from).toLowerCase()
        const toEmail = extractEmail(to).toLowerCase()

        // 1. Identify context based on target address
        const isSupport = toEmail.includes('support@') || toEmail.includes('service@')
        const isSales = toEmail.includes('sales@')
        // const isLog = toEmail.includes('log@') // Used for simple logging if needed

        // 2. Identify if it's an "Admin Forward"
        const { data: adminCheck } = await supabase.from('user_profiles').select('id, role').eq('email', fromEmail).single()
        const isAdmin = adminCheck?.role === 'admin' || adminCheck?.role === 'super_admin'

        let targetUserEmail = fromEmail
        if (isAdmin && (text || '').includes('---------- Forwarded message ---------')) {
            const forwardMatch = (text || '').match(/From:\s*([^<\n\r]+)\s*<([^>\n\r]+)>/i)
            if (forwardMatch && forwardMatch[2]) {
                targetUserEmail = forwardMatch[2].toLowerCase().trim()
            }
        }

        // 3. Find target user
        let { data: user } = await supabase.from('user_profiles').select('id').eq('email', targetUserEmail).single()

        // GUEST LEADS LOGIC
        const GUEST_LEAD_ID = '00000000-0000-0000-0000-000000000000'
        if (!user && (isSales || isSupport)) {
            user = { id: GUEST_LEAD_ID }

            // ROBUST GUEST USER ENSURANCE
            try {
                // 1. Ensure Auth (Constraint: One Guest User)
                const { error: authError } = await supabase.auth.admin.createUser({
                    uid: GUEST_LEAD_ID,
                    email: 'guest-leads@rentmate.co.il',
                    email_confirm: true,
                    user_metadata: { full_name: 'Potential Lead' }
                })
                // Ignore "already registered" error

                // 2. Upsert user_profiles
                await supabase.from('user_profiles').upsert({
                    id: GUEST_LEAD_ID,
                    email: 'guest-leads@rentmate.co.il',
                    full_name: 'Potential Lead',
                    role: 'user'
                }, { onConflict: 'id' })

                // 3. Upsert profiles (Legacy/Schema mismatch fix)
                const { error: pUpsertErr } = await supabase.from('profiles').upsert({
                    id: GUEST_LEAD_ID,
                    email: 'guest-leads@rentmate.co.il',
                    full_name: 'Potential Lead',
                    role: 'user'
                }, { onConflict: 'id' })

                if (pUpsertErr) {
                    console.error('Profiles Upsert Failed:', pUpsertErr)
                    // Attach to global scope for error reporting?
                    // We'll just rely on the final error reporting to try and fetch info
                }

            } catch (err) {
                console.error('Guest User Ensurance Failed:', err)
            }
        }

        if (!user) {
            console.log(`Email from/to unknown user: ${targetUserEmail}. Skipping log.`)
            return new Response('User not found, skipped', { status: 200 })
        }

        // 4. Intelligent Automation (AI Analysis)
        let aiAnalysis = null
        if (isSupport || isSales) {
            // Perform analysis BEFORE creating ticket
            aiAnalysis = await analyzeEmailWithAI(subject || '', text || 'No content', isSales)
        }

        // 5. Zero-Touch Routing
        if (isSupport || isSales) {
            // Use AI values or Fallbacks
            const ticketCategory = aiAnalysis?.category || (isSales ? 'billing' : 'technical')
            const ticketPriority = aiAnalysis?.urgency_level === 'critical' ? 'critical' : (isSales ? 'high' : 'medium')
            const ticketDraft = aiAnalysis?.draft_reply || (isSales
                ? `Hi ${targetUserEmail.split('@')[0]}, thanks for contacting RentMate Sales. We'll be in touch shortly.`
                : null)

            // Create Ticket
            const { data: ticket, error: ticketError } = await supabase.from('support_tickets').insert({
                user_id: user.id,
                title: isSales ? `[SALE] ${subject || 'Inquiry'}` : (subject || 'Email Support Request'),
                description: text || 'See email body',
                category: ticketCategory,
                priority: ticketPriority,
                status: 'open',
                auto_reply_draft: ticketDraft,
                metadata: {
                    from: fromEmail,
                    to: toEmail,
                    original_sender: targetUserEmail,
                    is_lead: user.id === GUEST_LEAD_ID,
                    attachments: attachments || []
                }
            }).select('id, title').single()

            // 5.1 Auto-Confirmation (Zero-Touch)
            if (ticket && !ticketError) {
                const confirmationTitle = isSales ? 'פנייתך התקבלה [RentMate Sales]' : 'פנייתך התקבלה [RentMate Support]';
                const confirmationMsg = isSales
                    ? `שלום, קיבלנו את פנייתך בנושא "${ticket.title}". צוות המכירות שלנו יצור איתך קשר בהקדם.`
                    : `היי, פתחנו עבורך קריאת שירות בנושא "${ticket.title}". אנחנו כבר בודקים את העניין ונחזור אליך בקרוב. מספר פנייה: ${ticket.id.split('-')[0]}`;

                // Call send-notification-email
                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: targetUserEmail,
                        notification: { title: confirmationTitle, message: confirmationMsg }
                    }
                });
            }

            // If Ticket Created & AI Analysis Success -> Insert Analysis
            if (ticket && !ticketError && aiAnalysis) {
                await supabase.from('ticket_analysis').insert({
                    ticket_id: ticket.id,
                    sentiment_score: aiAnalysis.sentiment_score,
                    urgency_level: aiAnalysis.urgency_level,
                    category: aiAnalysis.category,
                    confidence_score: aiAnalysis.confidence_score,
                    ai_summary: aiAnalysis.summary
                })
            }
        }

        // Log as CRM Interaction regardless (Non-fatal)
        const { error: crmError } = await supabase.from('crm_interactions').insert({
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
                is_lead: user.id === GUEST_LEAD_ID,
                attachments: attachments || [],
                message_id: messageId,
                ai_analyzed: !!aiAnalysis
            }
        })

        if (crmError) {
            console.error('CRM Interaction Log Failed (Non-fatal):', crmError)
            // Proceed to return success, just warn in logs
        }

        return new Response(JSON.stringify({
            success: true,
            logged: !crmError,
            routing: (isSupport || isSales) ? 'ticket' : 'interaction',
            ai: !!aiAnalysis,
            crm_error: crmError // Optional debug info
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Email Handler Crash:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
