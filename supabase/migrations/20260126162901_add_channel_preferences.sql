-- Add channel preference columns to user_automation_settings
-- These control the "Dispatcher" logic for outbound alerts

ALTER TABLE IF EXISTS public.user_automation_settings 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Comment on columns for clarity
COMMENT ON COLUMN public.user_automation_settings.email_notifications_enabled IS 'Master switch for email alerts from Autopilot';
COMMENT ON COLUMN public.user_automation_settings.sms_notifications_enabled IS 'Stub: Master switch for SMS alerts (Costs money)';
