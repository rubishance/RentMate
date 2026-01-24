-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the index update to run every 2 hours on days 15-17 of each month
-- (Index data is typically published mid-month by CBS and BOI)
-- This gives us 36 attempts (12 per day × 3 days) to fetch the data

-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running this migration
-- Get these values from: Supabase Dashboard > Settings > API

-- Day 15: Every 2 hours (00:00, 02:00, 04:00, ..., 22:00)
SELECT cron.schedule(
    'index-update-day15',
    '0 */2 15 * *',  -- Every 2 hours on day 15
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Day 16: Every 2 hours
SELECT cron.schedule(
    'index-update-day16',
    '0 */2 16 * *',  -- Every 2 hours on day 16
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Day 17: Every 2 hours
SELECT cron.schedule(
    'index-update-day17',
    '0 */2 17 * *',  -- Every 2 hours on day 17
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Verify the jobs were created
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'index-update%' ORDER BY jobname;
