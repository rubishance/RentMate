-- Migration: fix_daily_summary_cron
-- Description: Ensures the daily admin summary cron job uses robust config helpers for authorization.

-- 1. Reschedule the daily-admin-summary cron job
-- This uses the get_supabase_config helper (added in Jan 30 migration)
-- to reliably get the service role key even in cron sessions.

SELECT cron.unschedule('daily-admin-summary');

SELECT cron.schedule(
    'daily-admin-summary',
    '30 5 * * *', -- 05:30 UTC = 07:30/08:30 IL time depending on DST. 
    -- Matches the 08:00 IL time requirement.
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

-- 2. Ensure the keys exist as fallbacks in system_settings if they aren't there
INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_project_ref', '"qfvrekvugdjnwhnaucmz"'::jsonb, 'Supabase Project Reference'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_project_ref');

INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_service_role_key', ('"' || current_setting('app.settings.service_role_key', true) || '"')::jsonb, 'Supabase Service Role Key'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_service_role_key')
AND current_setting('app.settings.service_role_key', true) IS NOT NULL;
