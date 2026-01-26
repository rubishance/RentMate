-- Migration: update_autopilot_settings
-- Description: Sets default values for autopilot and monthly reports.

-- Update existing or insert new settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('auto_autopilot_master_enabled', 'false'::jsonb, 'Master switch for all background automation logic (Lease expiry, overdue rent, etc).'),
    ('auto_monthly_reports_enabled', 'false'::jsonb, 'Whether to automatically generate monthly performance notifications for property owners.')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Remove the old key if it exists
DELETE FROM public.system_settings WHERE key = 'crm_autopilot_enabled';
