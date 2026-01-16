import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        // Create Supabase client with service role key
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Call the cleanup function
        const { error } = await supabaseClient.rpc('cleanup_suspended_accounts')

        if (error) {
            console.error('Error cleaning up suspended accounts:', error)
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log('Successfully cleaned up suspended accounts')

        return new Response(
            JSON.stringify({ success: true, message: 'Cleanup completed' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
