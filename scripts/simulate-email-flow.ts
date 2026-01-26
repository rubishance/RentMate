
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const TARGET_USER_ID = Deno.args[0] // Pass user ID as argument

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Environment Variables')
    Deno.exit(1)
}

if (!TARGET_USER_ID) {
    console.error('Please provide a Target User ID as the first argument.')
    console.log('Usage: deno run --allow-net --allow-env scripts/simulate-email-flow.ts <USER_UUID>')
    Deno.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    console.log(`Simulating email flow for user: ${TARGET_USER_ID}...`)

    // 1. Simulate OUTGOING Email (Admin sent via Gmail and BCC'd log@)
    console.log('1. Logging Outgoing Email (BCC Simulation)...')
    const { error: err1 } = await supabase.from('crm_interactions').insert({
        user_id: TARGET_USER_ID,
        type: 'email',
        title: 'Re: Property Maintenance Question',
        content: 'Hi,\n\nI received your request. We are looking into the plumber availability for Tuesday.\n\nBest,\nSupport Team',
        status: 'closed',
        metadata: {
            direction: 'outbound',
            from: 'support@rentmate.co.il',
            to: 'client@example.com',
            provider: 'gmail-bcc',
            external_link: 'https://mail.google.com/mail/u/0/#sent/123456'
        },
        created_at: new Date().toISOString()
    })
    if (err1) console.error('Error logging outgoing:', err1)
    else console.log('✅ Outgoing email logged.')

    // 2. Simulate INCOMING Email (Forwarded to inbound@)
    console.log('2. Logging Incoming Email (Forwarding Simulation)...')
    const { error: err2 } = await supabase.from('crm_interactions').insert({
        user_id: TARGET_USER_ID,
        type: 'email',
        title: 'Urgent: Water Leak',
        content: 'Hello,\n\nThere is a huge leak in the bathroom! Please help ASAP.\n\nThanks, Client',
        status: 'open',
        metadata: {
            direction: 'inbound',
            from: 'client@example.com',
            to: 'service@rentmate.co.il',
            provider: 'inbound-webhook',
            external_link: 'https://mail.google.com/mail/u/0/#inbox/789012'
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    })
    if (err2) console.error('Error logging incoming:', err2)
    else console.log('✅ Incoming email logged.')

    console.log('\nDone! Please check the Client Hub timeline.')
}

run()
