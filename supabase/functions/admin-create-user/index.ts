import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Caller is Admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Invalid token')
        }

        // Check if caller is admin
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin' && profile?.role !== 'manager') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admins only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Parse request body
        const { email, password, fullName, role, planId } = await req.json()

        if (!email || !password || !fullName) {
            throw new Error('Missing required fields: email, password, fullName')
        }

        // 3. Create the auth user
        // We set email_confirm to true since we are creating this directly
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName
            }
        })

        if (createError) throw createError
        if (!authData.user) throw new Error('User creation failed to return a user object')

        const newUserId = authData.user.id

        // Give the database trigger a moment to run and create the user_profiles row
        await new Promise(resolve => setTimeout(resolve, 500))

        // 4. Update the created profile with role and plan
        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                role: role || 'user',
                plan_id: planId || 'free'
            })
            .eq('id', newUserId)

        if (updateError) {
            console.error('Failed to update profile after creation:', updateError)
            // We don't fail here because the auth user is already created, but we log the error
        }

        // 5. Log Action
        await supabaseAdmin.from('audit_logs').insert({
            user_id: user.id,
            target_user_id: newUserId,
            action: 'admin_create_user',
            details: { email, role, plan_id: planId },
            ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        })

        return new Response(
            JSON.stringify({
                success: true,
                user: { id: newUserId, email }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
