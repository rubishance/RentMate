import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            throw new Error('Invalid token')
        }

        // Check if caller is admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin' && profile?.role !== 'super_admin' && profile?.role !== 'manager') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admins only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is missing in environment variables');
        }

        // Calculate date ranges
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Utility to fetch usage for a date range
        const fetchUsage = async (startDate: string, endDate: string) => {
            try {
                const response = await fetch(`https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
                });
                if (!response.ok) {
                    // If the legacy endpoint fails, try alternative if possible, but for now just return 0
                    console.error(`Failed to fetch OpenAI usage: ${response.statusText}`);
                    return 0;
                }
                const data = await response.json();
                return (data.total_usage || 0) / 100; // Convert cents to USD
            } catch (err) {
                console.error("fetchUsage error:", err);
                return 0;
            }
        };

        const fetchCredits = async () => {
            try {
                const response = await fetch(`https://api.openai.com/v1/dashboard/billing/credit_grants`, {
                    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
                });
                if (!response.ok) return null;
                const data = await response.json();
                return data.total_available || 0;
            } catch (err) {
                return null;
            }
        };

        const [dailyCost, monthlyCost, availableCredits] = await Promise.all([
            fetchUsage(formatDate(today), formatDate(tomorrow)),
            fetchUsage(formatDate(startOfMonth), formatDate(startOfNextMonth)),
            fetchCredits()
        ]);

        return new Response(
            JSON.stringify({
                dailyCost,
                monthlyCost,
                availableCredits
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
