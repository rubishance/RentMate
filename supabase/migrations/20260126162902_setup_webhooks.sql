-- Create Webhooks for Reactive Customer Engagement
-- This sends table events to the 'on-event-trigger' Edge Function

-- 1. Enable net extension for webhooks if not already (usually enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "net" WITH SCHEMA "extensions";

-- 2. Generic function to call our edge function via vault or direct URL
-- Note: In a real environment, you'd use the SUPABASE_URL and SERVICE_ROLE_KEY.
-- For this migration, we assume the edge function is reachable at the project URL.

CREATE OR REPLACE FUNCTION public.handle_automated_engagement_webhook()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  -- Replace with your actual project URL or use a variable if possible
  -- In Supabase migrations, we often use the net.http_post helper
  -- For security, the Edge Function usually checks for the service role key anyway.
  PERFORM
    net.http_post(
      url := 'https://' || (SELECT value FROM system_settings WHERE key = 'supabase_project_ref') || '.supabase.co/functions/v1/on-event-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'supabase_service_role_key')
      ),
      body := payload
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Triggers
DROP TRIGGER IF EXISTS tr_on_new_ticket ON public.support_tickets;
CREATE TRIGGER tr_on_new_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();

DROP TRIGGER IF EXISTS tr_on_payment_update ON public.payments;
CREATE TRIGGER tr_on_payment_update
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();

DROP TRIGGER IF EXISTS tr_on_new_contract ON public.contracts;
CREATE TRIGGER tr_on_new_contract
AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();
