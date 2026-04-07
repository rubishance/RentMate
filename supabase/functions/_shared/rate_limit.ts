import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// We use service role to execute DB-backed rate limits securely bypassing RLS
const supabase = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

export class RateLimiter {
    /**
     * Checks rate limits via Supabase RPC function check_rate_limit.
     * @param userId The ID of the authenticated user.
     * @param endpoint The name of the endpoint for separate rate limits.
     * @param limit The maximum number of requests allowed per minute.
     * @returns boolean - true if allowed, false if limit exceeded.
     */
    static async check(userId: string, endpoint: string, limit: number): Promise<boolean> {
        if (!supabase) {
            console.warn('RateLimiter: Missing SUPABASE config. Allowing request to pass.');
            return true;
        }
        
        try {
            const { data, error } = await supabase.rpc('check_rate_limit', {
                p_user_id: userId,
                p_endpoint: endpoint,
                p_limit: limit
            });
            
            if (error) {
                console.error(`RateLimiter DB error for user ${userId} on ${endpoint}:`, error.message);
                // Fail open to avoid breaking production during transient DB issues
                return true; 
            }
            
            return data === true;
        } catch (e) {
            console.error('RateLimiter exception:', e);
            // Fail open
            return true;
        }
    }
}
