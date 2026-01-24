-- Migration: fix_email_systems_20260121
-- Description: Fixes project URL for admin alerts and adds email forwarding for app notifications

-- 1. Fix Admin Signup Notification URL 
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co'; -- UPDATED TO CORRECT PROJECT
BEGIN
    PERFORM
      net.http_post(
        url := project_url || '/functions/v1/send-admin-alert',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := json_build_object(
            'type', 'INSERT',
            'table', 'user_profiles',
            'record', row_to_json(NEW)
        )::jsonb
      );
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Create Notification Email Forwarder Trigger
-- This function calls an Edge Function whenever a high-priority notification is created
CREATE OR REPLACE FUNCTION public.forward_notification_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
    user_email text;
BEGIN
    -- Only forward high-priority or action-oriented types
    IF NEW.type IN ('warning', 'error', 'urgent', 'action') THEN
        -- Get user email
        SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
        
        IF user_email IS NOT NULL THEN
            PERFORM
              net.http_post(
                url := project_url || '/functions/v1/send-notification-email',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
                body := json_build_object(
                    'email', user_email,
                    'notification', row_to_json(NEW)
                )::jsonb
              );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach trigger to notifications table
DROP TRIGGER IF EXISTS on_notification_created_forward_email ON public.notifications;
CREATE TRIGGER on_notification_created_forward_email
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.forward_notification_to_email();

-- 3. Fix Storage RLS for Admins
DROP POLICY IF EXISTS "Admins can view all storage usage" ON public.user_storage_usage;
CREATE POLICY "Admins can view all storage usage"
    ON public.user_storage_usage FOR SELECT
    USING (public.is_admin());
