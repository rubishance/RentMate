-- AI Security Audit Migration
-- Adds specialized logging for AI access to sensitive contract data

-- 1. Create a helper function for Edge Functions to log audits
-- This uses SECURITY DEFINER to bypass RLS since Edge Functions use Service Role
CREATE OR REPLACE FUNCTION public.log_ai_contract_audit(
    p_user_id UUID,
    p_action TEXT,
    p_contract_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        target_user_id,
        action,
        details,
        created_at
    )
    VALUES (
        p_user_id,
        p_user_id, -- In this context, target is usually the same user
        p_action,
        p_details || jsonb_build_object(
            'audited_by', 'AI Engine',
            'contract_id', p_contract_id,
            'timestamp', NOW()
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure audit_logs is visible to admins
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.log_ai_contract_audit TO service_role;
GRANT EXECUTE ON FUNCTION public.log_ai_contract_audit TO authenticated;
