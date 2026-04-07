// _shared/auth.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

/**
 * Validates if the request is executed by an admin user.
 * @param req Request to extract auth header from
 * @returns { success, user, error }
 */
export async function validateAdmin(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return { success: false, error: 'Unauthorized: Missing Authorization header', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);

    if (authError || !user) {
        return { success: false, error: 'Unauthorized: Invalid or expired token', status: 401 };
    }

    const role = user.app_metadata?.role;
    if (role !== 'admin' && role !== 'superadmin') {
        return { success: false, error: 'Forbidden: Admin access only', status: 403, user };
    }

    return { success: true, user };
}
