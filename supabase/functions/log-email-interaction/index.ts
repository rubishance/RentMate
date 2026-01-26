
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_id, direction, from, to, subject, body_preview, external_id } = await req.json()

        // 1. Identify User ID (if only email provided)
        let targetUserId = user_id
        if (!targetUserId && (to || from)) {
            // Try to find user by email
            // Logic: if direction is inbound, 'from' is user. if direction is outbound, 'to' is user.
            const emailToSearch = direction === 'inbound' ? from : to
            if (emailToSearch) {
                const { data: userData } = await supabase.from('user_profiles').select('id').eq('email', emailToSearch).single()
                if (userData) targetUserId = userData.id
            }
        }

        if (!targetUserId) {
            console.warn('Could not associate email with a user. Logging as orphaned interaction?')
            // Optionally create an 'Orphaned' interaction or just return success but do nothing
            // For now, let's create a "General Inquiry" or similar if we had that concept.
            // We will throw for now to make it explicit.
            return new Response(JSON.stringify({ success: false, message: 'User not found for email.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 2. Insert Interaction
        const { data, error } = await supabase.from('crm_interactions').insert({
            user_id: targetUserId,
            type: 'email',
            title: subject || 'No Subject',
            content: body_preview || 'No Content',
            status: 'closed',
            metadata: {
                direction, // 'inbound' or 'outbound'
                from,
                to,
                external_id // Message-ID from email provider
            },
            created_at: new Date().toISOString()
        }).select().single()

        if (error) throw error

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
