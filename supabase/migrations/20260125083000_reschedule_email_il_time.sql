-- Migration: reschedule_email_il_time
-- Description: Updates the daily admin summary schedule to 06:00 UTC (08:00 Israel Time)

-- 1. Unschedule the old job (if it exists) to avoid duplicates
SELECT cron.unschedule('daily-admin-summary');

-- 2. Schedule the new job at 06:00 UTC
-- Israel Time is UTC+2 (Winter) / UTC+3 (Summer)
-- 06:00 UTC = 08:00 IL (Winter) / 09:00 IL (Summer)
SELECT cron.schedule(
    'daily-admin-summary',
    '0 6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/send-daily-admin-summary',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := '{}'::jsonb
    );
    $$
);
