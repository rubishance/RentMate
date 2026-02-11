-- Migration: admin_security_config
-- Description: Adds system settings for abuse notifications.

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('security_alerts_enabled', 'true'::jsonb, 'Master switch for automated abuse detection alerts (Email/WhatsApp).'),
    ('admin_security_whatsapp', '"972500000000"'::jsonb, 'Admin phone number for WhatsApp security alerts. Format: CountryCode + Number (e.g., 972...)'),
    ('admin_security_email', '"rubi@rentmate.co.il"'::jsonb, 'Admin email for receiving security audit reports.')
ON CONFLICT (key) DO UPDATE SET 
    description = EXCLUDED.description;
