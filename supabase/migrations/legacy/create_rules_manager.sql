-- Migration: Create System Settings & Notification Rules Tables

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read (for app config), only Admins can write
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
    
CREATE POLICY "Everyone can read system settings" ON public.system_settings
    FOR SELECT
    USING (true); -- Public read for generic configs like 'maintenance_mode'

-- 2. Create notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id TEXT PRIMARY KEY, -- e.g. 'contract_ending', 'payment_due'
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    days_offset INT DEFAULT 0, -- e.g. 30 (days before)
    channels JSONB DEFAULT '["in_app"]'::jsonb, -- e.g. ["in_app", "email", "push"]
    target_audience TEXT DEFAULT 'user' CHECK (target_audience IN ('user', 'admin', 'both')),
    message_template TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can manage rules
CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Seed Default Data
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('trial_duration_days', '14'::jsonb, 'Duration of the free trial in days'),
    ('maintenance_mode', 'false'::jsonb, 'If true, shows maintenance screen to non-admins'),
    ('enable_signups', 'true'::jsonb, 'Master switch to allow new user registrations')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.notification_rules (id, name, description, is_enabled, days_offset, channels, target_audience, message_template)
VALUES
    ('ending_soon', 'Contract Ending Soon', 'Warns before contract end date', true, 30, '["in_app", "push"]'::jsonb, 'user', 'Contract for %s, %s ends in %s days.'),
    ('extension_deadline', 'Extension Deadline', 'Warns before extension option expires', true, 60, '["in_app", "push"]'::jsonb, 'user', 'Extension option for %s, %s ends in %s days.'),
    ('index_update', 'Annual Index Update', 'Reminder to update rent based on index', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Annual index update required for %s, %s.'),
    ('payment_due', 'Payment Due Today', 'Alerts when a pending payment date is reached', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Payment of ₪%s for %s, %s is due today.')
ON CONFLICT (id) DO NOTHING;

-- 4. Update process_daily_notifications to use these rules
CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    rule RECORD;
    
    -- Variables to hold rule configs
    rule_ending_soon JSONB;
    rule_extension JSONB;
    rule_index JSONB;
    rule_payment JSONB;
BEGIN
    -- Fetch Rules
    SELECT to_jsonb(nr.*) INTO rule_ending_soon FROM public.notification_rules nr WHERE id = 'ending_soon';
    SELECT to_jsonb(nr.*) INTO rule_extension FROM public.notification_rules nr WHERE id = 'extension_deadline';
    SELECT to_jsonb(nr.*) INTO rule_index FROM public.notification_rules nr WHERE id = 'index_update';
    SELECT to_jsonb(nr.*) INTO rule_payment FROM public.notification_rules nr WHERE id = 'payment_due';

    -------------------------------------------------------
    -- 1. CONTRACT ENDING SOON
    -------------------------------------------------------
    IF (rule_ending_soon->>'is_enabled')::boolean IS TRUE THEN
        FOR r IN
            SELECT c.id, c.user_id, c.end_date, p.city, p.address
            FROM public.contracts c
            JOIN public.properties p ON p.id = c.property_id
            WHERE c.status = 'active'
            AND c.end_date = CURRENT_DATE + ((rule_ending_soon->>'days_offset')::int || ' days')::INTERVAL
        LOOP
            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'ending_soon') THEN
                INSERT INTO public.notifications (user_id, type, title, message, metadata)
                VALUES (
                    r.user_id, 
                    'warning', 
                    (rule_ending_soon->>'name')::text, 
                    format((rule_ending_soon->>'message_template')::text, r.city, r.address, (rule_ending_soon->>'days_offset')::text), 
                    json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
                );
            END IF;
        END LOOP;
    END IF;

    -------------------------------------------------------
    -- 2. EXTENSION OPTION DEADLINE
    -------------------------------------------------------
    IF (rule_extension->>'is_enabled')::boolean IS TRUE THEN
        FOR r IN
            SELECT c.id, c.user_id, c.end_date, p.city, p.address
            FROM public.contracts c
            JOIN public.properties p ON p.id = c.property_id
            WHERE c.status = 'active'
            AND c.extension_option = TRUE
            AND c.end_date = CURRENT_DATE + ((rule_extension->>'days_offset')::int || ' days')::INTERVAL
        LOOP
            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'extension_deadline') THEN
                INSERT INTO public.notifications (user_id, type, title, message, metadata)
                VALUES (
                    r.user_id, 
                    'action', 
                    (rule_extension->>'name')::text, 
                    format((rule_extension->>'message_template')::text, r.city, r.address, (rule_extension->>'days_offset')::text), 
                    json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
                );
            END IF;
        END LOOP;
    END IF;

    -------------------------------------------------------
    -- 3. ANNUAL INDEX UPDATE (1 Year after Start)
    -------------------------------------------------------
    IF (rule_index->>'is_enabled')::boolean IS TRUE THEN
        FOR r IN
            SELECT c.id, c.user_id, c.start_date, p.city, p.address
            FROM public.contracts c
            JOIN public.properties p ON p.id = c.property_id
            WHERE c.status = 'active'
            AND c.linkage_type != 'none'
            AND (
                c.start_date + INTERVAL '1 year' = CURRENT_DATE OR
                c.start_date + INTERVAL '2 years' = CURRENT_DATE OR
                c.start_date + INTERVAL '3 years' = CURRENT_DATE
            )
        LOOP
            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'index_update' AND metadata->>'date' = CURRENT_DATE::text) THEN
                INSERT INTO public.notifications (user_id, type, title, message, metadata)
                VALUES (
                    r.user_id, 
                    'urgent', 
                    (rule_index->>'name')::text, 
                    format((rule_index->>'message_template')::text, r.city, r.address), 
                    json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb
                );
            END IF;
        END LOOP;
    END IF;

    -------------------------------------------------------
    -- 4. PAYMENT DUE TODAY
    -------------------------------------------------------
    IF (rule_payment->>'is_enabled')::boolean IS TRUE THEN
        FOR r IN
            SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
            FROM public.payments py
            JOIN public.contracts c ON c.id = py.contract_id
            JOIN public.properties p ON p.id = c.property_id
            WHERE py.status = 'pending'
            AND py.date = CURRENT_DATE
        LOOP
            IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'payment_id' = r.id::text AND metadata->>'event' = 'payment_due') THEN
                INSERT INTO public.notifications (user_id, type, title, message, metadata)
                VALUES (
                    r.user_id, 
                    'warning', 
                    (rule_payment->>'name')::text, 
                    format((rule_payment->>'message_template')::text, r.amount, r.city, r.address), 
                    json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
                );
            END IF;
        END LOOP;
    END IF;

END;
$$;
