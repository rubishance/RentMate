-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job to run every day at 06:00 AM
-- NOTE: You must replace 'YOUR_PROJECT_REF' and 'YOUR_SERVICE_ROLE_KEY' below!
-- The Service Role Key is required to bypass any RLS (though the function handles it internally, correct Auth header is good practice)
-- Or use the ANON key if the function is public.

SELECT cron.schedule(
    'fetch-index-data-daily', -- Job name
    '0 6 * * *',              -- Schedule (6:00 AM daily)
    $$
    SELECT
        net.http_post(
            url:='https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzY0MTYsImV4cCI6MjA4MzAxMjQxNn0.xA3JI4iGElpIpZjVHLCA_FGw0hfmNUJTtw_fuLlhkoA"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Comment to explain
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for updating index data';
