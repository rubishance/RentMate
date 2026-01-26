
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env.local or .env
const envPath = path.resolve(process.cwd(), '.env')
console.log('Looking for .env at:', envPath)

let envConfig: any = {}
if (fs.existsSync(envPath)) {
    console.log('.env found!')
    envConfig = dotenv.parse(fs.readFileSync(envPath))
} else {
    console.log('.env NOT found.')
}

// Try to get keys from Process OR .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL
// Fallback to Anon Key if Service Role is missing (might fail RLS, but worth a shot for simulation)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || envConfig.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('CRITICAL: Could not find SUPABASE_URL or API Key.')
    console.log('Loaded Config:', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_KEY: !!SUPABASE_KEY })
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
    console.log(`Simulating email flow...`)

    // 1. Fetch a real user
    const { data: user, error: userError } = await supabase.from('user_profiles').select('id, email').limit(1).single()

    if (userError || !user) {
        console.error('Could not find any user to test with.', userError)
        return
    }

    const TARGET_USER_ID = user.id
    console.log(`Using Target User: ${user.email} (${user.id})`)

    // 2. Simulate OUTGOING Email (Admin sent via Gmail and BCC'd log@)
    console.log('1. Logging Outgoing Email (BCC Simulation)...')
    const { error: err1 } = await supabase.from('crm_interactions').insert({
        user_id: TARGET_USER_ID,
        type: 'email',
        title: 'Re: Simulation Test - Maintenance',
        content: 'Hi,\n\nThis is a simulated reply from the admin via Gmail BCC.\n\nBest,\nSupport',
        status: 'closed',
        metadata: {
            direction: 'outbound',
            from: 'support@rentmate.co.il',
            to: user.email,
            provider: 'gmail-bcc',
            external_link: 'https://mail.google.com/mail/u/0/#sent/' + Date.now()
        },
        created_at: new Date().toISOString()
    })
    if (err1) console.error('Error logging outgoing:', err1)
    else console.log('✅ Outgoing email logged.')

    // 3. Simulate INCOMING Email (Forwarded to inbound@)
    console.log('2. Logging Incoming Email (Forwarding Simulation)...')
    const { error: err2 } = await supabase.from('crm_interactions').insert({
        user_id: TARGET_USER_ID,
        type: 'email',
        title: 'Simulation Test - Urgent Help',
        content: 'Hello,\n\nI need help with my contract. This is a simulated incoming email.\n\nThanks',
        status: 'open',
        metadata: {
            direction: 'inbound',
            from: user.email,
            to: 'service@rentmate.co.il',
            provider: 'inbound-webhook',
            external_link: 'https://mail.google.com/mail/u/0/#inbox/' + Date.now()
        },
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
    })
    if (err2) console.error('Error logging incoming:', err2)
    else console.log('✅ Incoming email logged.')

    console.log('\nDone! Please check the Client Hub timeline for user: ' + user.email)
}

run()
