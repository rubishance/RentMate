-- Migration: admin_alerts_and_triggers
-- Description: Sets up triggers for signup and subscription starts to alert the admin

-- 1. Correct Project URL for triggers (Consolidated)
-- We'll use a variable or just hardcode the current known correctly fixed URL
-- Current Project URL: https://qfvrekvugdjnwhnaucmz.supabase.co

-- 2. Trigger Function for Signups & Plan Changes (Admin Alerts)
CREATE OR REPLACE FUNCTION public.notify_admin_on_user_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    -- Only trigger if it's a new user OR a plan change
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan) THEN
        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-admin-alert',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'type', TG_OP,
                'table', 'user_profiles',
                'record', row_to_json(NEW),
                'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
            )::jsonb
          );
    END IF;
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Trigger Function for Paid Invoices (Subscription Start Alert)
CREATE OR REPLACE FUNCTION public.notify_admin_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
    user_record RECORD;
BEGIN
    -- Only trigger when an invoice is marked as 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Get user details for the alert
        SELECT * INTO user_record FROM public.user_profiles WHERE id = NEW.user_id;

        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-admin-alert',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'type', 'UPDATE',
                'table', 'invoices',
                'record', row_to_json(NEW),
                'user', row_to_json(user_record)
            )::jsonb
          );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger payment notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Apply Triggers
-- a. User Profiles (Signup & Plan Changes)
DROP TRIGGER IF EXISTS on_user_event_notify_admin ON public.user_profiles;
CREATE TRIGGER on_user_event_notify_admin
    AFTER INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_user_event();

-- b. Invoices (Subscription Starts)
DROP TRIGGER IF EXISTS on_invoice_paid_notify_admin ON public.invoices;
CREATE TRIGGER on_invoice_paid_notify_admin
    AFTER UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_payment();

-- Remove legacy triggers if they exist with old names
DROP TRIGGER IF EXISTS on_user_signup_notify_admin ON public.user_profiles;
DROP TRIGGER IF EXISTS notify_admin_on_signup_trigger ON public.user_profiles;
