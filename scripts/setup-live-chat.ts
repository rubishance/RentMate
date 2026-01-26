
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env
const envPath = path.resolve(process.cwd(), '.env')
let envConfig: any = {}
if (fs.existsSync(envPath)) {
    envConfig = dotenv.parse(fs.readFileSync(envPath))
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envConfig.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Environment Variables (Need SERVICE_ROLE_KEY to update settings)')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
    console.log(`Setting up Live Chat configuration...`)

    const { error } = await supabase.from('system_settings').upsert({
        key: 'live_chat_enabled',
        value: true,
        description: 'Toggle the visibility of the Live Support button for all tenants.'
    }, { onConflict: 'key' })

    if (error) {
        console.error('Error inserting setting:', error)
    } else {
        console.log('✅ Success! "live_chat_enabled" setting added to System Settings.')
        console.log('You can now toggle this in the Admin Panel -> System Settings.')
    }
}

run()
