import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

serve(async (req) => {
    try {
        // 1. Initialize Supabase Client (Service Role needed for RPC)
        // Note: Use SERVICE_ROLE_KEY to bypass RLS if needed, or ANON if RLS handles it.
        // For automated jobs, Service Role is safer to ensure it can read all necessary data.
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 2. Call the Database Function
        const { data, error } = await supabase
            .rpc('process_daily_notifications')

        if (error) {
            console.error('RPC Error:', error)
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { "Content-Type": "application/json" },
                status: 400,
            })
        }

        // 3. Success
        console.log('Daily processing complete.')
        return new Response(JSON.stringify({ message: "Daily notifications processed successfully." }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })

    } catch (err) {
        console.error('Unexpected Error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        })
    }
})
