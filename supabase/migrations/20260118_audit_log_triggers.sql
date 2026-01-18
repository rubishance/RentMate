-- Update delete_user_account to log action
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_email TEXT;
BEGIN
    -- 1. Check if requester is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
    END IF;
    
    -- 2. Prevent deleting yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account via this function.';
    END IF;

    -- Capture email for log before deletion
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;

    -- 3. Log the action
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
        auth.uid(), 
        'delete_user', 
        jsonb_build_object('target_user_id', target_user_id, 'target_email', target_email)
    );

    -- 4. Delete from auth.users (cascades)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


-- Create Trigger Function for Profile Changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR 
       (OLD.plan_id IS DISTINCT FROM NEW.plan_id) OR 
       (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
       
        INSERT INTO public.audit_logs (user_id, action, details)
        VALUES (
            auth.uid(), -- The admin performing the update
            'update_user_profile',
            jsonb_build_object(
                'target_user_id', NEW.id,
                'changes', jsonb_build_object(
                    'role', CASE WHEN OLD.role IS DISTINCT FROM NEW.role THEN jsonb_build_array(OLD.role, NEW.role) ELSE NULL END,
                    'plan_id', CASE WHEN OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN jsonb_build_array(OLD.plan_id, NEW.plan_id) ELSE NULL END,
                    'status', CASE WHEN OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN jsonb_build_array(OLD.subscription_status, NEW.subscription_status) ELSE NULL END
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow idempotent re-run
DROP TRIGGER IF EXISTS on_profile_change_audit ON public.user_profiles;

-- Create Trigger
CREATE TRIGGER on_profile_change_audit
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION audit_profile_changes();
