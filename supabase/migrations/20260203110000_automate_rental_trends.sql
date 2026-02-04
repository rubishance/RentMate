
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job to run quarterly
-- 0 6 1 2,5,8,11 * (6:00 AM on the 1st of February, May, August, November)
-- This follows the CBS quarterly rent reporting cycle

SELECT cron.schedule(
    'sync-rental-trends-quarterly', -- Job name
    '0 6 1 2,5,8,11 *',            -- Schedule (Quarterly)
    $$
    SELECT
        net.http_post(
            url:=(SELECT value FROM system_settings WHERE key = 'api_url' LIMIT 1) || '/functions/v1/sync-rental-trends',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'service_role_key' LIMIT 1)
            ),
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Comment to explain
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for synchronizing rental market data with national trends';
