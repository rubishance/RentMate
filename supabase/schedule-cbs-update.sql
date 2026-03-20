-- Run this in your Supabase SQL Editor to schedule the new Edge Function

-- Enable pg_net to make HTTP requests from inside the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron to schedule jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the fetch-cbs-monthly-rent Edge Function to run on the 20th of every month at 02:00 AM UTC
SELECT cron.schedule(
    'sync-monthly-cbs-data',
    '0 2 20 * *', -- Minute (0), Hour (2), Day of month (20), Month (All), Day of week (All)
    $$
    SELECT
      net.http_post(
          url:='https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-cbs-monthly-rent',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA"}'::jsonb
      ) AS request_id;
    $$
);

-- Note: 
-- 1. Replace YOUR_PROJECT_REF with your actual Supabase project reference ID.
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your actual service role key.
-- 3. Make sure you deploy the function first using: supabase functions deploy fetch-cbs-monthly-rent
