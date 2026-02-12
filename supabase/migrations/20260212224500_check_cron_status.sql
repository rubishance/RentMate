-- Inspect cron jobs and run details
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- CRON JOBS ---';
    FOR r IN SELECT * FROM cron.job LOOP
        RAISE NOTICE 'Job ID: %, Name: %, Schedule: %, Command: %', r.jobid, r.jobname, r.schedule, r.command;
    END LOOP;

    RAISE NOTICE '--- RECENT RUN DETAILS (Last 5 failures) ---';
    FOR r IN SELECT * FROM cron.job_run_details WHERE status != 'succeeded' ORDER BY start_time DESC LIMIT 5 LOOP
        RAISE NOTICE 'Run ID: %, Job ID: %, Status: %, Return: %, Start: %', r.runid, r.jobid, r.status, r.return_message, r.start_time;
    END LOOP;
    
    RAISE NOTICE '--- RECENT SUCCESSFUL RUNS (Last 5) ---';
     FOR r IN SELECT * FROM cron.job_run_details WHERE status = 'succeeded' ORDER BY start_time DESC LIMIT 5 LOOP
        RAISE NOTICE 'Run ID: %, Job ID: %, Status: %, Return: %, Start: %', r.runid, r.jobid, r.status, r.return_message, r.start_time;
    END LOOP;
END $$;
