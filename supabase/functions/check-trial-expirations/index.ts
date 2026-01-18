import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

Deno.serve(async (req) => {
    try {
        // 1. Find expired trials
        // Query: Users in 'trial' status where trial_end_date < NOW()
        const { data: expiredUsers, error: fetchError } = await supabase
            .from('user_profiles')
            .select('id, email, trial_end_date')
            .eq('subscription_status', 'trial')
            .lt('trial_end_date', new Date().toISOString());

        if (fetchError) throw fetchError;

        const results = [];

        // 2. Process each expired user
        for (const user of expiredUsers || []) {
            // Update status to 'expired'
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    subscription_status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                console.error(`Failed to expire user ${user.id}:`, updateError);
                continue;
            }

            // Log to Audit Logs (System Action)
            await supabase.from('audit_logs').insert({
                user_id: null, // System action
                target_user_id: user.id,
                action: 'trial_expired_system',
                details: {
                    previous_status: 'trial',
                    trial_end_date: user.trial_end_date
                }
            });

            // Add to History
            await supabase.from('subscription_history').insert({
                user_id: user.id,
                old_status: 'trial',
                new_status: 'expired',
                change_reason: 'trial_expiration_auto',
                changed_by: null // System
            });

            results.push({ id: user.id, email: user.email, status: 'expired' });
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed_count: results.length,
                results
            }),
            { headers: { 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
    }
})
