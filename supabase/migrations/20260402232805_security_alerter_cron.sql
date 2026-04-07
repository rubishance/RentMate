-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Automate Secret Injection into Vault without exposing plaintext in Git
DO $$
DECLARE
  v_key text;
BEGIN
  -- We extract the environment's service role key automatically at migration runtime
  v_key := current_setting('app.settings.service_role_key', true);

  -- Only perform the insert if the secret doesn't already exist and the key isn't null.
  IF v_key IS NOT NULL AND v_key != '' THEN
    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'SERVICE_ROLE_KEY_FOR_CRON') THEN
      PERFORM vault.create_secret(
        v_key,
        'SERVICE_ROLE_KEY_FOR_CRON',
        'Auto-generated Service Role Key used for pg_cron net.http_post'
      );
    END IF;
  END IF;
END $$;

-- Schedule the security alerter
SELECT cron.schedule(
  'invoke-security-alerter-every-hour',
  '0 * * * *', -- At minute 0 past every hour
  $$
  DECLARE
    _service_key text;
    _project_url text := current_setting('app.settings.project_url', true);
  BEGIN
    -- 1. Fetch secret from Vault
    SELECT decrypted_secret INTO _service_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SERVICE_ROLE_KEY_FOR_CRON' 
    LIMIT 1;

    -- 2. Exception Handling if Vault or Settings fail
    IF _service_key IS NULL OR _service_key = '' THEN
      RAISE EXCEPTION 'CRON ABORTED: SERVICE_ROLE_KEY_FOR_CRON not found in Supabase Vault.';
    END IF;

    IF _project_url IS NULL OR _project_url = '' THEN
      RAISE EXCEPTION 'CRON ABORTED: Project URL missing from app.settings.';
    END IF;

    -- 3. Execute POST Request Securely
    PERFORM net.http_post(
        url:= _project_url || '/functions/v1/security-alerter',
        headers:= jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body:= jsonb_build_object('triggered_by', 'pg_cron', 'timestamp', now())
    );
  END
  $$
);
