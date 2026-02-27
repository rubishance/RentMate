-- Migration: send_waitlist_welcome_email
-- Description: Sends a welcome email to new leads when they join the waitlist

CREATE OR REPLACE FUNCTION public.send_waitlist_welcome_email_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    -- Only trigger on new signups
    IF TG_OP = 'INSERT' THEN
        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-waitlist-welcome-email',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'email', NEW.email,
                'full_name', NEW.full_name,
                'id', NEW.id
            )::jsonb
          );
    END IF;
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't crash the signup transaction
    RAISE WARNING 'Failed to trigger waitlist welcome email for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach trigger to public.waitlist
DROP TRIGGER IF EXISTS on_waitlist_signup_send_email ON public.waitlist;

CREATE TRIGGER on_waitlist_signup_send_email
    AFTER INSERT ON public.waitlist
    FOR EACH ROW
    EXECUTE FUNCTION public.send_waitlist_welcome_email_on_signup();
