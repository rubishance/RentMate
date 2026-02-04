-- Add email configuration settings to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email'),
    ('admin_email_content_preferences', '{"new_users": true, "revenue": true, "support_tickets": true, "upgrades": true, "active_properties": true}'::jsonb, 'JSON object defining which sections to include in the daily summary')
ON CONFLICT (key) DO NOTHING;
