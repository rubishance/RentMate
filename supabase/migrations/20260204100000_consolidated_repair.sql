-- Migration: final_reliable_cron_and_schema_fix
-- Description: Repairs the properties table and hardens the daily admin summary cron job.

BEGIN;

-- 1. Ensure 'status' column exists in properties (fixing previous drift)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant';

-- 2. Restore occupancy logic helpers (ensuring functions are valid after repair)
CREATE OR REPLACE FUNCTION public.recalculate_all_property_statuses()
RETURNS void AS $$
BEGIN
    UPDATE public.properties p
    SET status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.property_id = p.id
            AND c.status = 'active'
            AND c.start_date <= CURRENT_DATE
            AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
        ) THEN 'Occupied'
        ELSE 'Vacant'
    END
    WHERE p.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reschedule the daily-admin-summary cron job with robust auth
-- This uses get_supabase_config (added Jan 30) to reliably get the service role key.
-- Note: pg_cron is usually enabled in Supabase by default.

DO $$
BEGIN
    PERFORM cron.unschedule('daily-admin-summary');
EXCEPTION WHEN OTHERS THEN
    NULL; -- Skip if not scheduled
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

-- 4. Sync configuration in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('supabase_project_ref', '"qfvrekvugdjnwhnaucmz"', 'Supabase Project Reference'),
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. Trigger initial recalculation
SELECT public.recalculate_all_property_statuses();

COMMIT;
