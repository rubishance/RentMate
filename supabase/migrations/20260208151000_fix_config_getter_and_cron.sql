-- Migration: fix_config_getter_and_cron_v2
-- Description: Corrects get_supabase_config to return unquoted strings and ensures daily cron uses correct headers.

BEGIN;

-- 1. Fix the helper function to return UNQUOTED strings from JSONB
CREATE OR REPLACE FUNCTION public.get_supabase_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    -- Use #>> '{}' to get the unquoted text value from JSONB
    SELECT value #>> '{}' INTO v_value FROM public.system_settings WHERE key = p_key;
    
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

-- 2. Clean up potentially broken settings (removing redundant quotes if they exist)
UPDATE public.system_settings 
SET value = to_jsonb(value #>> '{}')
WHERE key IN ('supabase_project_ref', 'supabase_service_role_key')
AND value::text LIKE '"%"%';

-- 3. Reschedule the daily-admin-summary cron job
-- This ensures it uses the fixed get_supabase_config and correct headers.
DO $$
BEGIN
    PERFORM cron.unschedule('daily-admin-summary');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'daily-admin-summary',
    '30 5 * * *', -- 05:30 UTC = 07:30/08:30 IL time (08:00 Target)
    $$
    SELECT
      net.http_post(
        url := 'https://' || public.get_supabase_config('supabase_project_ref') || '.supabase.co/functions/v1/send-daily-admin-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.get_supabase_config('supabase_service_role_key')
        ),
        body := '{}'::jsonb
      )
    $$
);

COMMIT;
