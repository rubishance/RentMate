-- Migration: trigger_signup_notification
-- Description: Triggers the send-admin-alert Edge Function when a new user signs up

-- 1. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://mtxwavmmywiewjrsxchi.supabase.co'; -- Replace with your actual project URL or use a config table
    function_secret text := 'YOUR_FUNCTION_SECRET'; -- Ideally this is handled via vault or not needed if using net extension with service role
BEGIN
    -- We assume the 'net' extension is enabled and configured.
    -- If using pg_net or standard http extension, syntax may vary.
    -- For Supabase, the recommended way for Database Webhooks used to be the Dashboard UI,
    -- but we can do it via SQL using `pg_net` or standard triggers if we have the extension.
    
    -- SIMPLE APPROACH: Since Supabase Database Webhooks are often configured in the UI,
    -- we will use the `net` extension if available to make an async call.
    
    -- NOTE: In many Supabase setups, it's easier to create a "Webhook" via the Dashboard.
    -- However, to do it via code/migration, we use pg_net.
    
    -- Check if pg_net is available, otherwise this might fail.
    -- Assuming pg_net is installed.
    
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
    -- Swallow errors to not block signup
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_user_signup_notify_admin ON public.user_profiles;

CREATE TRIGGER on_user_signup_notify_admin
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_signup();
