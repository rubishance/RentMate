-- Migration: send_welcome_email_trigger
-- Description: Sends a welcome email to new users when their profile is created

CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    -- Only trigger if it's a new profile (usually only happen at signup)
    IF TG_OP = 'INSERT' THEN
        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-welcome-email',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'email', NEW.email,
                'full_name', NEW.full_name
            )::jsonb
          );
    END IF;
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't crash
    RAISE WARNING 'Failed to trigger welcome email for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach trigger to user_profiles
DROP TRIGGER IF EXISTS on_profile_created_send_welcome_email ON public.user_profiles;

CREATE TRIGGER on_profile_created_send_welcome_email
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.send_welcome_email_on_signup();
