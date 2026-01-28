-- Schedule the BOI Daily Exchange Rate Update
-- Time: 17:00 Israel Time Daily
-- Israel is UTC+2 (Winter) / UTC+3 (Summer)
-- 17:00 IST = 15:00 UTC (Winter) or 14:00 UTC (Summer)
-- We will set it to 14:30 UTC to be safe for both (16:30 winter / 17:30 summer) OR just 15:00 UTC (17:00 winter, 18:00 summer).
-- Let's go with 15:00 UTC. In Summer (UTC+3) this is 18:00 IDT. In Winter (UTC+2) this is 17:00 IST.
-- Both are safely after the 15:45 publication time (and 12:15 on Fridays).

SELECT cron.schedule(
    'boi-rates-daily-update',
    '0 15 * * *',  -- Every day at 15:00 UTC
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('request.header.apikey', true)
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);
