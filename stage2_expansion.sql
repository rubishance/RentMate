-- ============================================
-- STAGE 2: FEATURE TABLES
-- ============================================

-- Create table for storing index base periods and chaining factors
CREATE TABLE IF NOT EXISTS index_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    index_type TEXT NOT NULL, -- e.g., 'cpi', 'construction', 'housing'
    base_period_start DATE NOT NULL, -- The start date of this base period (e.g., '2023-01-01')
    base_value NUMERIC NOT NULL DEFAULT 100.0, -- The value of the base index (usually 100.0)
    previous_base_period_start DATE, -- The start date of the *previous* base period
    chain_factor NUMERIC, -- The factor to multiply when moving FROM this base TO the previous base (or vice versa depending on logic)
                          -- CBS usually publishes "Linkage Coefficient" (׳׳§׳“׳ ׳§׳©׳¨) to the previous base.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_index_bases_type_date ON index_bases (index_type, base_period_start);

-- Insert known recent Israeli CPI Base Periods (Example Data - verified from CBS knowledge)
-- Note: CBS updates bases typically every 2 years recently.
-- Base Average 2022 = 100.0 (Active from Jan 2023)
-- Base Average 2020 = 100.0 (Active from Jan 2021) -> Factor to prev (2018): 1.006 ?? (Needs exact verification, putting placeholders)

-- Let's populate with a flexible structure. Users specifically requested 'Perfect' calculation.
-- I will insert a few sample rows that are commonly used or leave it for an admin seeder.
-- For now, checking 'cpi'.
-- Known recent bases:
-- 1. Base 2022 (Avg 2020=100.0) ?? No.
-- CBS Logic:
-- Base Avg 2022 = 100.0. Start Date: 2023-01-01. Link Factor to 2020 base: 1.081 (Example)
-- Base Avg 2020 = 100.0. Start Date: 2021-01-01. Link Factor to 2018 base: 1.001
-- Base Avg 2018 = 100.0. Start Date: 2019-01-01.

-- I will populate this with a separate seed script or user action if exact numbers aren't known.
-- For now, table creation is the goal.

-- CREATE INDEX IF NOT EXISTS_data table for storing economic indices
CREATE TABLE IF NOT EXISTS index_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
  date TEXT NOT NULL, -- Format: 'YYYY-MM'
  value DECIMAL(10, 4) NOT NULL,
  source TEXT DEFAULT 'cbs' CHECK (source IN ('cbs', 'exchange-api', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(index_type, date)
);

-- CREATE INDEX IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_index_data_type_date ON index_data(index_type, date);

-- Enable Row Level Security
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read index data
DROP POLICY IF EXISTS "Allow authenticated users to read index data" ON index_data; CREATE POLICY "Allow authenticated users to read index data" ON index_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update index data (will be done via Edge Function)
-- Policy: Allow authenticated users to manage index data (needed for manual refresh button)
DROP POLICY IF EXISTS "Allow authenticated users to manage index data" ON index_data; CREATE POLICY "Allow authenticated users to manage index data" ON index_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
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
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings; CREATE POLICY "Admins can manage system settings" ON public.system_settings
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
    
DROP POLICY IF EXISTS "Everyone can read system settings" ON public.system_settings; CREATE POLICY "Everyone can read system settings" ON public.system_settings
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
DROP POLICY IF EXISTS "Admins can manage notification rules" ON public.notification_rules; CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
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
    ('payment_due', 'Payment Due Today', 'Alerts when a pending payment date is reached', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Payment of ג‚×%s for %s, %s is due today.')
ON CONFLICT (id) DO NOTHING;

-- 4. Update process_daily_notifications to use these rules
DROP FUNCTION IF EXISTS public.process_daily_notifications() CASCADE;
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
-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own messages" ON contact_messages; CREATE POLICY "Users can view own messages" ON contact_messages FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own messages" ON contact_messages; CREATE POLICY "Users can insert own messages" ON contact_messages FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admin policy (if you want admins to see all messages)
DROP POLICY IF EXISTS "Admins can view all messages" ON contact_messages; CREATE POLICY "Admins can view all messages" ON contact_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- CREATE INDEX IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
-- Create a table to track rate limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_idx ON public.rate_limits(ip_address, endpoint);

-- Function to clean up old rate limit entries (e.g., older than 1 hour)
DROP FUNCTION IF EXISTS clean_old_rate_limits() CASCADE;
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE last_request_at < (now() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (although Edge Functions might bypass it with service role, good practice)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny public access by default (only service role should write)
DROP POLICY IF EXISTS "No public access" ON public.rate_limits; CREATE POLICY "No public access" ON public.rate_limits
    FOR ALL
    USING (false);
-- ============================================
-- TRACK DELETED USERS (Audit & Abuse Prevention)
-- ============================================

-- 1. Create a log table that is NOT connected to the user_id via foreign key
-- (So it survives the deletion)
CREATE TABLE IF NOT EXISTS deleted_users_log (
    id BIGSERIAL PRIMARY KEY,
    original_user_id UUID,
    email TEXT,
    phone TEXT,
    subscription_status_at_deletion TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the Trigger Function
DROP FUNCTION IF EXISTS log_user_deletion() CASCADE;
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deleted_users_log (
        original_user_id,
        email,
        subscription_status_at_deletion
    )
    VALUES (
        OLD.id,
        OLD.email,
        OLD.subscription_status::text
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger (BEFORE DELETE) to user_profiles
DROP TRIGGER IF EXISTS on_user_profile_deleted ON user_profiles;

CREATE TRIGGER on_user_profile_deleted
    BEFORE DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_user_deletion();




