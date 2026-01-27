-- Add granular autopilot and voice capture settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('auto_renew_reminders_enabled', 'true'::jsonb, 'Enable automatic reminders for lease renewals and expirations.'),
  ('auto_rent_overdue_alerts_enabled', 'true'::jsonb, 'Enable automatic alerts for overdue rent payments.'),
  ('auto_cpi_adjustment_proposals_enabled', 'true'::jsonb, 'Enable automatic CPI rent adjustment proposals in the Action Inbox.'),
  ('auto_growth_engine_enabled', 'true'::jsonb, 'Enable AI-driven upsell nudges and onboarding help alerts.'),
  ('auto_stagnant_ticket_drafting_enabled', 'true'::jsonb, 'Enable automatic drafting of follow-up messages for stagnant support tickets.'),
  ('voice_capture_enabled', 'false'::jsonb, 'Enable automated phone call capture and AI summarization (Twilio/Vapi).'),
  ('voice_api_key', '""'::jsonb, 'API Key for the voice capture service provider (Twilio/Vapi).')
ON CONFLICT (key) DO UPDATE SET 
  description = EXCLUDED.description;
