-- Add 'hybrid_chat_mode' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('hybrid_chat_mode', 'true'::jsonb, 'Enable rule-based menu before AI chat to reduce costs.')
ON CONFLICT (key) DO NOTHING;
