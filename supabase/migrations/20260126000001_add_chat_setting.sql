-- Add 'live_chat_enabled' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('live_chat_enabled', 'true'::jsonb, 'Toggle the visibility of the Live Support button for all tenants.')
ON CONFLICT (key) DO NOTHING;
