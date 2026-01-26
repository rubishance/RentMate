-- Migration: Add CRM Autopilot Toggle
-- Description: Adds a global switch to enable/disable the automated CRM engine.

INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('crm_autopilot_enabled', 'true'::jsonb, 'Global toggle to enable or disable the automated CRM autopilot (rent reminders, lease expiry, ticket drafts).')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
