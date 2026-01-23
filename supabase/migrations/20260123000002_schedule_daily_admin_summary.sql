-- Migration: schedule_daily_admin_summary
-- Description: Sets up a cron job to call the daily summary Edge Function every day at 08:00 AM

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the Job
-- We call the Edge Function via net.http_post
-- Note: '0 8 * * *' is 8:00 AM every day
-- Note: We use the project's internal service role key for authentication

SELECT cron.schedule(
    'daily-admin-summary',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/send-daily-admin-summary',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := '{}'::jsonb
    );
    $$
);

-- Note: To check if it's scheduled, run: SELECT * FROM cron.job;
-- To see execution history, run: SELECT * FROM cron.job_run_details;
