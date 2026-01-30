
-- Migration: Fix Trigger JSON Errors
-- Description: Switches all net.http_post calls to use jsonb_build_object for headers and provides robust fallbacks for missing settings.
-- Created: 2026-01-30

-- 1. Helper Function to get Supabase Project Config Safely
CREATE OR REPLACE FUNCTION public.get_supabase_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    -- Try system_settings first
    SELECT value INTO v_value FROM public.system_settings WHERE key = p_key;
    
    -- Try current_setting as fallback
    IF v_value IS NULL OR v_value = '' THEN
        BEGIN
            v_value := current_setting('app.settings.' || p_key, true);
        EXCEPTION WHEN OTHERS THEN
            v_value := NULL;
        END;
    END IF;
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Robust handle_automated_engagement_webhook
CREATE OR REPLACE FUNCTION public.handle_automated_engagement_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_project_ref TEXT;
  v_service_key TEXT;
  v_payload JSONB;
BEGIN
  -- Get Config
  v_project_ref := public.get_supabase_config('supabase_project_ref');
  v_service_key := public.get_supabase_config('supabase_service_role_key');

  -- If no config, log warning and exit (preventing 22P02 crashes)
  IF v_project_ref IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'Skipping webhook: Supabase config missing (project_ref or service_key)';
    RETURN NEW;
  END IF;

  -- Build Payload safely using to_jsonb
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Perform HTTP Post with structured headers
  PERFORM
    net.http_post(
      url := 'https://' || v_project_ref || '.supabase.co/functions/v1/on-event-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := v_payload
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never crash the main insert because of a webhook failure
  RAISE WARNING 'Webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update forward_notification_to_email to be robust
CREATE OR REPLACE FUNCTION public.forward_notification_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_ref text;
    v_service_key text;
    v_target_email text;
    v_asset_alerts_enabled boolean;
BEGIN
    -- Get project config
    v_project_ref := public.get_supabase_config('supabase_project_ref');
    v_service_key := public.get_supabase_config('supabase_service_role_key');

    -- Get user email and asset alerts preference
    SELECT 
        u.email, 
        COALESCE((up.notification_preferences->>'email_asset_alerts')::boolean, true)
    INTO v_target_email, v_asset_alerts_enabled
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    WHERE u.id = NEW.user_id;

    -- DECISION LOGIC:
    -- Forward IF:
    -- 1. High priority type (warning, error, urgent, action)
    -- 2. OR is a maintenance event AND the user hasn't explicitly disabled asset alerts
    IF (v_project_ref IS NOT NULL AND v_service_key IS NOT NULL AND v_target_email IS NOT NULL) AND 
       ((NEW.type IN ('warning', 'error', 'urgent', 'action')) OR 
        (NEW.metadata->>'event' = 'maintenance_record' AND v_asset_alerts_enabled = true)) 
    THEN
        PERFORM
          net.http_post(
            url := 'https://' || v_project_ref || '.supabase.co/functions/v1/send-notification-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_service_key
            ),
            body := jsonb_build_object(
                'email', v_target_email,
                'notification', to_jsonb(NEW)
            )
          );
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Fix admin_notifications type constraint
ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_type_check 
CHECK (type IN ('upgrade_request', 'system_alert', 'support_ticket', 'user_signup', 'payment_success'));

-- 5. Force reload schema
NOTIFY pgrst, 'reload schema';
