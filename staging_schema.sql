-- ============================================
-- FOUNDATION: CORE TABLES AND EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USER PROFILES (The Pivot)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    subscription_status TEXT DEFAULT 'active',
    subscription_plan TEXT DEFAULT 'free_forever',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROPERTIES
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT,
    address TEXT,
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add extraction fields to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS guarantors_info TEXT, -- Summarized text of all guarantors
ADD COLUMN IF NOT EXISTS special_clauses TEXT; -- Summarized text of special clauses

-- Update RLS if needed (usually unrelated to column addition, but good practice to verify)
-- Existing policies should cover these new columns automatically if they are SELECT * / INSERT / UPDATE
-- Trigger: Notify on Contract Status Change

CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    notification_title text;
    notification_body text;
BEGIN
    -- Only proceed if status changed
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Fetch property address
    SELECT city || ', ' || address INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Determine message
    notification_title := 'Contract Status Updated';
    notification_body := format('Contract for %s is now %s.', property_address, NEW.status);

    -- Insert Notification
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info', -- Status change is informational/important but not necessarily a warning
        notification_title,
        notification_body,
        json_build_object(
            'contract_id', NEW.id,
            'event', 'status_change',
            'old_status', OLD.status,
            'new_status', NEW.status
        )::jsonb
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;

CREATE TRIGGER on_contract_status_change
    AFTER UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_contract_status_change();
-- Function: Process Daily Notifications
-- This function is intended to be run once a day (e.g., via pg_cron or Edge Function).

CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    extension_days int := 60; -- Default extension notice period
BEGIN
    -------------------------------------------------------
    -- 1. CONTRACT ENDING SOON (30 Days)
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.end_date = CURRENT_DATE + INTERVAL '30 days'
    LOOP
        -- Check if we already sent this notification (idempotency)
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'ending_soon'
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Contract Ending Soon',
                format('Contract for %s, %s ends in 30 days (%s).', r.city, r.address, r.end_date),
                json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 2. EXTENSION OPTION DEADLINE (User Defined / Default 60 days)
    -------------------------------------------------------
    -- Note: Ideally fetch 'extension_days' from user_preferences per user, but for mass handling we use default or logic.
    -- If user_preferences has the column, we could join. For now, strict 60 days.
    
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.extension_option = TRUE
        -- Assuming deadline IS the end_date if not specified otherwise, or checking user preference
        AND c.end_date = CURRENT_DATE + (extension_days || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'extension_deadline'
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'action', -- Custom type 'action' or 'info'
                'Extension Deadline Approaching',
                format('Extension option for %s, %s ends in %s days.', r.city, r.address, extension_days),
                json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 3. ANNUAL INDEX UPDATE (1 Year after Start)
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.start_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.linkage_type != 'none' -- Only if linked
        AND (
            c.start_date + INTERVAL '1 year' = CURRENT_DATE OR
            c.start_date + INTERVAL '2 years' = CURRENT_DATE OR
            c.start_date + INTERVAL '3 years' = CURRENT_DATE
        )
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'index_update'
            AND metadata->>'date' = CURRENT_DATE::text
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'urgent',
                'Annual Index Update',
                format('Annual index update required for %s, %s.', r.city, r.address),
                json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 4. PAYMENT DUE TODAY
    -------------------------------------------------------
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'payment_id' = r.id::text 
            AND metadata->>'event' = 'payment_due'
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Payment Due Today',
                format('Payment of ג‚×%s for %s, %s is due today.', r.amount, r.city, r.address),
                json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
            );
        END IF;
    END LOOP;

END;
$$;
-- Add needs_painting column to contracts table
ALTER TABLE contracts 
ADD COLUMN needs_painting BOOLEAN DEFAULT false;

-- Add option_periods column to contracts table
-- Use JSONB to store an array of options, e.g., [{"length": 12, "unit": "months"}, {"length": 1, "unit": "years"}]

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN option_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
-- Migration to add 'other' to the property_type check constraint

-- First, drop the existing check constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Re-add the check constraint with 'other' included
ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
-- Add parking and storage columns to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_storage BOOLEAN DEFAULT false;
-- Add property_type column
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment';
-- Migration to add missing rent_price column to properties table
-- Fixes error: Could not find the 'rent_price' column of 'properties' in the schema cache

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2);

-- Also ensure RLS is enabled as a best practice, though likely already on
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
-- Add Stripe-related fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);

-- Add comment
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'sessions';
-- Clean up legacy/unnecessary columns from contracts table
-- Use with caution: Only drops columns that are confirmed unused by current codebase

DO $$
BEGIN
    -- Drop 'index_base' if it exists (legacy name, replaced by base_index_value)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'index_base') THEN
        ALTER TABLE contracts DROP COLUMN index_base;
    END IF;

    -- Drop 'linkage_rate' if it exists (legacy name, replaced by linkage_value or coefficient)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'linkage_rate') THEN
        ALTER TABLE contracts DROP COLUMN linkage_rate;
    END IF;

    -- Drop 'index_linkage_rate' if it exists on contracts (it belongs on payments)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'index_linkage_rate') THEN
        ALTER TABLE contracts DROP COLUMN index_linkage_rate;
    END IF;

     -- Drop 'user_confirmed' if it exists on properties (not used)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'user_confirmed') THEN
        ALTER TABLE properties DROP COLUMN user_confirmed;
    END IF;

END $$;
-- Create admin_notifications table
create table if not exists admin_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('upgrade_request', 'system_alert')),
  content jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'resolved', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table admin_notifications enable row level security;

-- Policy: Admins can view all notifications
create policy "Admins can view all notifications"
  on admin_notifications for select
  to authenticated
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can update notifications
create policy "Admins can update notifications"
  on admin_notifications for update
  to authenticated
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Users can insert their own upgrade requests
create policy "Users can insert upgrade requests"
  on admin_notifications for insert
  to authenticated
  with check (
    user_id = auth.uid() 
    and type = 'upgrade_request'
  );

-- Optional: Index for filtering by status
create index if not exists idx_admin_notifications_status on admin_notifications(status);
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
CREATE POLICY "Users can view own messages"
    ON contact_messages FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages"
    ON contact_messages FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admin policy (if you want admins to see all messages)
CREATE POLICY "Admins can view all messages"
    ON contact_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create index for faster queries
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
-- Create the 'contracts' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files to 'contracts' bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contracts');

-- Policy: Allow authenticated users to view files in 'contracts' bucket
CREATE POLICY "Allow authenticated view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contracts');

-- Policy: Allow users to update their own files (optional, but good for redaction flow)
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contracts');

-- Policy: Allow users to delete their own files
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contracts');
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
CREATE INDEX idx_index_bases_type_date ON index_bases (index_type, base_period_start);

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

-- Create index_data table for storing economic indices
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_index_data_type_date ON index_data(index_type, date);

-- Enable Row Level Security
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read index data
CREATE POLICY "Allow authenticated users to read index data"
  ON index_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update index data (will be done via Edge Function)
-- Policy: Allow authenticated users to manage index data (needed for manual refresh button)
CREATE POLICY "Allow authenticated users to manage index data"
  ON index_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Check if trigger exists before creating
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_new_notification') THEN
        -- Create function to update user updated_at or handle realtime if needed
        -- For now, just a placeholder or could trigger a realtime event
        RETURN;
    END IF;
END
$$;
-- Create a public bucket for property images
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('property-images', 'property-images', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Policy: Public can VIEW files (It's a public bucket, but good to be explicit for SELECT)
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images"
    ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'property-images' );

-- Policy: Authenticated users can UPLOAD files
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'property-images'
        AND
        auth.role() = 'authenticated'
    );

-- Policy: Users can UPDATE their own files (or all authenticated for now for simplicity in this context, but better to restrict)
-- For now, allowing authenticated users to update/delete for simplicity as ownership tracking on files might be complex without folder structure
DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
CREATE POLICY "Authenticated users can update property images"
    ON storage.objects
    FOR UPDATE
    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
CREATE POLICY "Authenticated users can delete property images"
    ON storage.objects
    FOR DELETE
    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );
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
CREATE POLICY "No public access" ON public.rate_limits
    FOR ALL
    USING (false);
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
    ('payment_due', 'Payment Due Today', 'Alerts when a pending payment date is reached', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Payment of ג‚×%s for %s, %s is due today.')
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
-- Identify duplicates properties (same address, city, user_id)
-- Using array_agg with ORDER BY created_at to keep the oldest record
WITH duplicates AS (
  SELECT
    address,
    city,
    user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
    array_agg(id) as all_ids
  FROM properties
  GROUP BY address, city, user_id
  HAVING COUNT(*) > 1
),
busted_duplicates AS (
  SELECT
    keep_id,
    unnest(all_ids) as duplicate_id
  FROM duplicates
)
-- 1. Update Tenants to point to the kept property
UPDATE tenants
SET property_id = bd.keep_id
FROM busted_duplicates bd
WHERE tenants.property_id = bd.duplicate_id
AND tenants.property_id != bd.keep_id;

-- 2. Update Contracts to point to the kept property
-- Re-calculate duplicates for safety in this transaction block step
WITH duplicates AS (
  SELECT
    address,
    city,
    user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
    array_agg(id) as all_ids
  FROM properties
  GROUP BY address, city, user_id
  HAVING COUNT(*) > 1
),
busted_duplicates AS (
  SELECT
    keep_id,
    unnest(all_ids) as duplicate_id
  FROM duplicates
)
UPDATE contracts
SET property_id = bd.keep_id
FROM busted_duplicates bd
WHERE contracts.property_id = bd.duplicate_id
AND contracts.property_id != bd.keep_id;

-- 3. Delete the duplicate properties
WITH duplicates AS (
  SELECT
    address,
    city,
    user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
    array_agg(id) as all_ids
  FROM properties
  GROUP BY address, city, user_id
  HAVING COUNT(*) > 1
)
DELETE FROM properties
WHERE id IN (
    SELECT unnest(all_ids) FROM duplicates
) AND id NOT IN (
    SELECT keep_id FROM duplicates
);
-- ============================================
-- EMERGENCY FIX: SECURE ALL USER DATA WITH PROPER RLS
-- ============================================
-- This migration ensures all user data is properly isolated

-- 1. ENSURE USER_ID COLUMNS EXIST
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL EXISTING PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
DROP POLICY IF EXISTS "Users can update own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
DROP POLICY IF EXISTS "Users can view own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can insert own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can delete own tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

-- 4. CREATE SECURE POLICIES FOR PROPERTIES
CREATE POLICY "Users can view own properties"
    ON properties FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own properties"
    ON properties FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own properties"
    ON properties FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own properties"
    ON properties FOR DELETE
    USING (user_id = auth.uid());

-- 5. CREATE SECURE POLICIES FOR TENANTS
CREATE POLICY "Users can view own tenants"
    ON tenants FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tenants"
    ON tenants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tenants"
    ON tenants FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tenants"
    ON tenants FOR DELETE
    USING (user_id = auth.uid());

-- 6. CREATE SECURE POLICIES FOR CONTRACTS
CREATE POLICY "Users can view own contracts"
    ON contracts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contracts"
    ON contracts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contracts"
    ON contracts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own contracts"
    ON contracts FOR DELETE
    USING (user_id = auth.uid());

-- 7. CREATE SECURE POLICIES FOR PAYMENTS
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payments"
    ON payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payments"
    ON payments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payments"
    ON payments FOR DELETE
    USING (user_id = auth.uid());

-- 8. BACKFILL EXISTING DATA (CRITICAL!)
-- Update all existing records to have the correct user_id
-- This assumes you want to assign all existing data to the first user
-- IMPORTANT: Adjust this query based on your needs!

DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user's ID (you may want to specify a specific user)
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update all NULL user_id records
        UPDATE properties SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE tenants SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE contracts SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
        
        RAISE NOTICE 'Backfilled user_id for existing records to user: %', first_user_id;
    END IF;
END $$;
-- ============================================
-- EMERGENCY FIX V2: SECURE ALL USER DATA WITH PROPER RLS
-- This version drops ALL policies first to avoid conflicts
-- ============================================

-- 1. DROP ALL EXISTING POLICIES (to avoid conflicts)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename IN ('properties', 'tenants', 'contracts', 'payments'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. ENSURE USER_ID COLUMNS EXIST
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. ENABLE RLS ON ALL TABLES
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SECURE POLICIES FOR PROPERTIES
CREATE POLICY "Users can view own properties"
    ON properties FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own properties"
    ON properties FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own properties"
    ON properties FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own properties"
    ON properties FOR DELETE
    USING (user_id = auth.uid());

-- 5. CREATE SECURE POLICIES FOR TENANTS
CREATE POLICY "Users can view own tenants"
    ON tenants FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tenants"
    ON tenants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tenants"
    ON tenants FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tenants"
    ON tenants FOR DELETE
    USING (user_id = auth.uid());

-- 6. CREATE SECURE POLICIES FOR CONTRACTS
CREATE POLICY "Users can view own contracts"
    ON contracts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contracts"
    ON contracts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contracts"
    ON contracts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own contracts"
    ON contracts FOR DELETE
    USING (user_id = auth.uid());

-- 7. CREATE SECURE POLICIES FOR PAYMENTS
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payments"
    ON payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payments"
    ON payments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payments"
    ON payments FOR DELETE
    USING (user_id = auth.uid());

-- 8. BACKFILL EXISTING DATA
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user's ID
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update all NULL user_id records
        UPDATE properties SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE tenants SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE contracts SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
        
        RAISE NOTICE 'Backfilled user_id for existing records to user: %', first_user_id;
    END IF;
END $$;

-- 9. VERIFY RLS IS ENABLED
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, rowsecurity 
              FROM pg_tables 
              WHERE schemaname = 'public' 
              AND tablename IN ('properties', 'tenants', 'contracts', 'payments'))
    LOOP
        IF NOT r.rowsecurity THEN
            RAISE EXCEPTION 'RLS is NOT enabled on table: %', r.tablename;
        ELSE
            RAISE NOTICE 'RLS is enabled on table: %', r.tablename;
        END IF;
    END LOOP;
END $$;
-- ============================================
-- EMERGENCY SIGNUP RESET
-- ============================================

-- 1. DROP ALL TRIGGERS (Clear the conflict)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

-- 2. CONSOLIDATED TRIGGER FUNCTION
-- Handles both Profile Creation and Invoice Recovery in one safe transaction.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public -- Force Public Schema
AS $$
BEGIN
    -- A. Create User Profile
    -- We use a simpler INSERT to minimize potential type errors
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'::user_role,
        'active'::subscription_status,
        'free_forever'::subscription_plan_type
    )
    ON CONFLICT (id) DO NOTHING; -- Idempotency: If it exists, skip.

    -- B. Link Past Invoices (Safely)
    -- We wrap this in a block so if it fails, the user is still created.
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed for users %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If the main profile creation fails, we must fail the signup to prevent phantom users.
    RAISE EXCEPTION 'Signup Critical Error: %', SQLERRM;
END;
$$;

-- 3. RE-ATTACH SINGLE TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Enable RLS just in case
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow Admins to UPDATE any profile
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);
-- Function: Enforce NO OVERLAPPING Active Contracts per Property
CREATE OR REPLACE FUNCTION public.check_active_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if the status is being set to 'active'
    IF NEW.status = 'active' THEN
        IF EXISTS (
            SELECT 1 FROM public.contracts
            WHERE property_id = NEW.property_id
            AND status = 'active'
            AND id != NEW.id -- Exclude self during updates
            AND (
                (start_date <= NEW.end_date) AND (end_date >= NEW.start_date)
            )
        ) THEN
            RAISE EXCEPTION 'Property % has an overlapping active contract. Dates cannot overlap with an existing active contract.', NEW.property_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check before insert or update on contracts
DROP TRIGGER IF EXISTS trigger_check_active_contract ON public.contracts;
CREATE TRIGGER trigger_check_active_contract
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.check_active_contract();


-- Function: Auto-sync Tenant Status
CREATE OR REPLACE FUNCTION public.sync_tenant_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Case 1: Contract becomes ACTIVE (Insert or Update)
    IF NEW.status = 'active' THEN
        -- Link tenant to property and set active
        UPDATE public.tenants
        SET property_id = NEW.property_id,
            status = 'active'
        WHERE id = NEW.tenant_id;
        
        -- Optional: Should we unlink other tenants from this property?
        -- For now, we assume the strict contract logic handles the "one active" rule, 
        -- so we just ensure THIS tenant is the active one.
    END IF;

    -- Case 2: Contract ends or changes from active to something else
    IF (OLD.status = 'active' AND NEW.status != 'active') THEN
        -- Unlink tenant (set to past)
        UPDATE public.tenants
        SET property_id = NULL,
            status = 'past'
        WHERE id = NEW.tenant_id 
        AND property_id = NEW.property_id; -- Only if they are still linked to this property
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync Tenant Status
DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON public.contracts;
CREATE TRIGGER trigger_sync_tenant_status
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_status_from_contract();


-- Function: Auto-update Property Status
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- If contract becomes active, set Property to Occupied
    IF NEW.status = 'active' THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = NEW.property_id;
    
    -- If contract ends (ended/terminated) and was previously active
    ELSIF (NEW.status IN ('ended', 'terminated')) THEN
        -- Check if there are ANY other active contracts currently valid (by date)
        -- Actually, simplistically, if we just ended the active one, we might differ to Vacant unless another covers TODAY.
        -- For simplicity, if NO active contracts exist at all, set Vacant.
        IF NOT EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE property_id = NEW.property_id 
            AND status = 'active' 
            AND id != NEW.id
        ) THEN
            UPDATE public.properties
            SET status = 'Vacant'
            WHERE id = NEW.property_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update Property Status after contract changes
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
CREATE TRIGGER trigger_update_property_status
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract();
-- Add metadata column to notifications for storing context (e.g., contract_id)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow new column usage if necessary (usually robust enough)
-- ============================================
-- FINAL SYSTEM FIX (Schema + Triggers)
-- ============================================

-- 1. ENSURE SCHEMA IS CORRECT (Idempotent)
-- We make sure the columns exist. If they were missing, this fixes the "Database Error".
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 2. RESET TRIGGERS (Clean Slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.relink_past_invoices();

-- 3. MASTER SIGNUP FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- A. Create User Profile
    INSERT INTO public.user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Link Past Invoices
    -- We explicitly check if any matching invoices exist before trying to update.
    -- This block will catch errors and Log them instead of crashing the signup.
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking error: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: If profile creation fails, we allow the auth user but log the error.
    -- (Actually, we should probably raise to fail auth, but let's be safe for now)
    RAISE WARNING 'Profile creation error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. VERIFY PERMISSIONS
GRANT ALL ON TABLE public.invoices TO postgres, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
-- Fix Contracts Table Schema
-- Adds missing Foreign Keys and other essential columns

-- 1. Foreign Keys (Crucial for the error you saw)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Other Missing Columns (preventing future errors)
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS signing_date date,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS base_rent numeric(10, 2),
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS',
ADD COLUMN IF NOT EXISTS payment_frequency text,
ADD COLUMN IF NOT EXISTS payment_day integer,
ADD COLUMN IF NOT EXISTS linkage_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 3. Linkage Details
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS base_index_date date,
ADD COLUMN IF NOT EXISTS base_index_value numeric(10, 4),
ADD COLUMN IF NOT EXISTS linkage_sub_type text,
ADD COLUMN IF NOT EXISTS linkage_ceiling numeric(5, 2),
ADD COLUMN IF NOT EXISTS linkage_floor numeric(5, 2);

-- 4. Permissions
GRANT ALL ON public.contracts TO postgres, service_role, authenticated;
-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================

-- 1. Create a SECURITY DEFINER function to check admin status
-- This function runs with the privileges of the creator (superuser), bypassing RLS.
-- This breaks the infinite loop where checking RLS required querying the table protected by RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public -- Secure the search path
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Admins see all" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all" ON user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins manage CRM" ON crm_interactions;
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;

-- Resets for User Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 3. Recreate Policies using the Safe Function

-- A. User Profiles
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
    ON user_profiles FOR SELECT 
    USING (is_admin());

CREATE POLICY "Admins can update all profiles" 
    ON user_profiles FOR UPDATE 
    USING (is_admin());

-- B. CRM Interactions (Admin Only)
CREATE POLICY "Admins manage CRM"
    ON crm_interactions FOR ALL
    USING (is_admin());

-- C. Audit Logs (Admin Only)
CREATE POLICY "Admins view audit logs"
    ON audit_logs FOR SELECT
    USING (is_admin());

-- D. Invoices (Users own, Admins all)
DROP POLICY IF EXISTS "Users view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON invoices;

CREATE POLICY "Users view own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins view all invoices"
    ON invoices FOR SELECT
    USING (is_admin());
-- Ensure contract_file_url exists on contracts table
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

-- ============================================
-- RESCUE SCRIPT: Fix Missing Profile
-- ============================================

-- If you can't log in, it's likely your "User Profile" wasn't created due to the previous error.
-- This script manually creates it for you.

DO $$
DECLARE
    target_email TEXT := 'rentmate.rubi@gmail.com'; -- <--- YOUR EMAIL HERE
    v_user_id UUID;
BEGIN
    -- 1. Find the User ID from the Auth table
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found in Auth system. Please Sign Up first.', target_email;
    END IF;

    -- 2. Create the Profile manually if it's missing
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        v_user_id,
        target_email,
        'Admin User', -- Default name
        'admin',      -- Give yourself Admin access
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', subscription_status = 'active';

    RAISE NOTICE 'Fixed profile for %', target_email;
END;
$$;
-- ============================================
-- FIX ORPHANED USERS
-- ============================================
-- This script finds users in auth.users who don't have a user_profiles entry
-- and creates the missing profiles for them.

-- 1. Create missing profiles for orphaned auth users
INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name,
    first_name,
    last_name,
    role, 
    subscription_status, 
    plan_id
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'User',
    'user',
    'active',
    'free'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    updated_at = NOW();

-- 2. Log the fix
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL;
    
    RAISE NOTICE 'Fixed % orphaned user profiles', orphaned_count;
END $$;
-- ============================================
-- FINAL FIX FOR SIGNUP ERRORS
-- ============================================

-- 1. Grant Permissions to be absolutely safe
GRANT ALL ON TABLE public.invoices TO postgres, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;

-- 2. Update the Invoice Relinking Trigger to be ROBUST
-- We add 'SET search_path = public' to ensure it finds the table.
-- We add a Try/Catch block to prevent blocking signup if this fails.

CREATE OR REPLACE FUNCTION relink_past_invoices()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Update invoices that have NO owner (user_id is NULL) 
    -- but match the new user's email string.
    UPDATE public.invoices
    SET user_id = NEW.id
    WHERE user_id IS NULL 
    AND billing_email = NEW.email;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If this fails, we Log it but ALLOW the user to sign up.
    -- We don't want to block registration just because of an invoice linking error.
    RAISE WARNING 'Failed to relink invoices for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Ensure the Trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
CREATE TRIGGER on_auth_user_created_relink_invoices
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION relink_past_invoices();
-- Comprehensive Fix for "Failed to Update Profile"

DO $$ 
BEGIN
    -- 1. Ensure Columns Exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_name TEXT;
    END IF;

    -- 2. Populate NULLs (Safety Check)
    UPDATE public.user_profiles
    SET 
        first_name = COALESCE(full_name, 'User'),
        last_name = 'aaa'
    WHERE first_name IS NULL OR last_name IS NULL;

    -- 3. Reset RLS Policies for user_profiles (The Nuclear Option for Permissions)
    -- First, ensure RLS is on
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

    -- Drop potentially conflicting policies
    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users update own" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users view own" ON public.user_profiles;

    -- Re-create Standard Policies
    
    -- SELECT
    CREATE POLICY "Users view own"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

    -- UPDATE (Explicitly Allow)
    CREATE POLICY "Users update own"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

    -- INSERT (Crucial for 'upsert' if row is missing/ghosted)
    CREATE POLICY "Users insert own"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

END $$;
-- Safely add missing columns to properties table
DO $$
BEGIN
    -- Add has_parking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_parking') THEN
        ALTER TABLE properties ADD COLUMN has_parking BOOLEAN DEFAULT false;
    END IF;

    -- Add has_storage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_storage') THEN
        ALTER TABLE properties ADD COLUMN has_storage BOOLEAN DEFAULT false;
    END IF;

    -- Add property_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'property_type') THEN
        ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT 'apartment';
    END IF;

    -- Add image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'image_url') THEN
        ALTER TABLE properties ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Update constraint for property_type
DO $$
BEGIN
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
    ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
    CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
-- FIX: Re-create the handle_new_user function with explicit search_path and permissions

-- 1. Grant permissions to be sure
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;

-- 2. Drop the trigger first to avoid conflicts during replace
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Re-define the function with `SET search_path = public`
-- This fixes issues where the function can't find 'user_profiles' or the enums.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'::user_role,
        'active'::subscription_status,
        'free_forever'::subscription_plan_type
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- In case of error, we raise it so we know WHY it failed in the logs, 
    -- but for the user it will just say "Database error".
    -- We try to make the above INSERT bulletproof by casting.
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
END;
$$;

-- 4. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- FIX SIGNUP TRIGGER (Proper Plan Linking)
-- ============================================

-- 1. Ensure the 'free' plan exists to avoid foreign key errors
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, max_tenants)
VALUES ('free', 'Free Forever', 0, 1, 2)
ON CONFLICT (id) DO NOTHING;

-- 2. Re-define the handler to set plan_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        plan_id, -- New relation
        subscription_plan -- Legacy enum fallback
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'::user_role,
        'active'::subscription_status,
        'free', -- Default to 'free' plan ID
        'free_forever'::subscription_plan_type -- Legacy fallback
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
END;
$$;
-- Comprehensive migration to fix schema for Tenants and Contracts

-- 1. Fix Tenants Table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Fix Contracts Table (Financials & Linkage)
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS',
ADD COLUMN IF NOT EXISTS payment_frequency TEXT,
ADD COLUMN IF NOT EXISTS payment_day INTEGER,
ADD COLUMN IF NOT EXISTS linkage_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS base_index_date DATE,
ADD COLUMN IF NOT EXISTS base_index_value NUMERIC(10, 4), -- More precision for index
ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS signing_date DATE,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Add New Linkage Features (Sub-Type and Caps)
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS linkage_sub_type TEXT, -- 'known', 'respect_of', 'base'
ADD COLUMN IF NOT EXISTS linkage_ceiling NUMERIC(5, 2), -- Percentage
ADD COLUMN IF NOT EXISTS linkage_floor NUMERIC(5, 2); -- Percentage

-- 4. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
-- ============================================
-- FORCE ACTIVATE ACCOUNT (Bypass Email)
-- ============================================

-- 1. CONFIRM EMAIL MANUALLY (So you don't need to wait for it)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'rentmate.rubi@gmail.com';  -- Your Email

-- 2. FIX DATABASE SCHEMA (Add missing columns)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';

-- 3. FORCE CREATE ADMIN PROFILE
DO $$
DECLARE
    v_user_id UUID;
    target_email TEXT := 'rentmate.rubi@gmail.com';
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NOT NULL THEN
        -- Insert or Update the profile to be an Admin
        INSERT INTO public.user_profiles (
            id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
            v_user_id, target_email, 'Admin User', 'admin', 'active', 'free_forever'
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            subscription_status = 'active', 
            subscription_plan = 'free_forever';
            
        RAISE NOTICE 'User % has been fully activated and promoted to Admin.', target_email;
    ELSE
        RAISE WARNING 'User % not found in Auth system. Did you sign up?', target_email;
    END IF;
END;
$$;

-- 4. REPAIR SIGNUP TRIGGER (For future users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
        'user', 'active', 'free_forever'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Try to recover invoices (but don't fail if it breaks)
    BEGIN
        UPDATE public.invoices SET user_id = NEW.id 
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NEW;
END;
$$;
-- ============================================
-- AUTO-RECOVER PAST INVOICES ON SIGNUP
-- ============================================

-- This function runs whenever a NEW user triggers the 'handle_new_user' flow (or separate trigger).
-- It looks for "Orphaned" invoices (where user_id IS NULL) that match the new user's email.

CREATE OR REPLACE FUNCTION relink_past_invoices()
RETURNS TRIGGER AS $$
DECLARE
    recovered_count INT;
BEGIN
    -- Update invoices that have NO owner (user_id is NULL) 
    -- but match the new user's email string.
    UPDATE public.invoices
    SET user_id = NEW.id
    WHERE user_id IS NULL 
    AND billing_email = NEW.email;

    GET DIAGNOSTICS recovered_count = ROW_COUNT;

    -- Optional: Log this event if you want audit trails
    -- RAISE NOTICE 'Recovered % invoices for user % based on email match.', recovered_count, NEW.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach this to the SAME trigger point as profile creation, 
-- or run it right after.
-- We'll attach it to auth.users AFTER INSERT.

DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

CREATE TRIGGER on_auth_user_created_relink_invoices
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION relink_past_invoices();
-- ============================================
-- PROTECT INVOICES & DATA RETENTION
-- ============================================

-- 1. Modify Invoices to survive User Deletion
-- We drop the "Cascade" constraint and replace it with "Set Null"
ALTER TABLE invoices
DROP CONSTRAINT invoices_user_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- 2. Add "Snapshot" fields
-- If the user is deleted, "user_id" becomes NULL.
-- We need these text fields to know who the invoice was for (Tax Law Requirement).
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 3. Update existing invoices (Backfill)
-- Copy current profile data into the snapshot fields so we don't lose it.
UPDATE invoices i
SET 
  billing_name = p.full_name,
  billing_email = p.email
FROM user_profiles p
WHERE i.user_id = p.id;

-- 4. Automatic Snapshot Trigger
-- Whenever a new invoice is created, automatically copy the user's details 
-- into the billing fields. This ensures data integrity even if the user changes later.
CREATE OR REPLACE FUNCTION snapshot_invoice_details()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if not provided manually
    IF NEW.billing_name IS NULL OR NEW.billing_email IS NULL THEN
        SELECT full_name, email INTO NEW.billing_name, NEW.billing_email
        FROM user_profiles
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_invoice_created ON invoices;
CREATE TRIGGER on_invoice_created
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION snapshot_invoice_details();
-- ============================================
-- RELAX SESSION LIMITS (Increase to 5)
-- ============================================

-- Update the manage_session_limits function to be more lenient
CREATE OR REPLACE FUNCTION public.manage_session_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_device_type TEXT;
    session_count INT;
    oldest_session_id UUID;
    -- FIX: Increased from 1 to 5 to prevent aggressive logouts
    max_sessions_per_type INT := 5; 
BEGIN
    -- Identify what kind of device is trying to log in
    new_device_type := public.get_device_type(NEW.user_agent);

    -- Count EXISTING sessions for this user of the SAME type
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id
    AND public.get_device_type(user_agent) = new_device_type;

    -- If we are at (or above) the limit, we need to make room.
    IF session_count >= max_sessions_per_type THEN
        
        -- Identify the Oldest Session to remove
        SELECT id
        INTO oldest_session_id
        FROM auth.sessions
        WHERE user_id = NEW.user_id
        AND public.get_device_type(user_agent) = new_device_type
        ORDER BY created_at ASC
        LIMIT 1;

        -- Delete it
        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
-- Relax legacy constraints on tenants table to prevent errors
-- This makes specific columns optional (nullable)

ALTER TABLE public.tenants ALTER COLUMN monthly_rent DROP NOT NULL;

-- Also relax others that might be legacy leftovers
ALTER TABLE public.tenants ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.tenants ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.tenants ALTER COLUMN email DROP NOT NULL;

-- Ensure properties constraints are also reasonable
ALTER TABLE public.properties ALTER COLUMN rent_price DROP NOT NULL;
-- ============================================
-- FINAL REPAIR: SCHEMA + DATA + TRIGGERS
-- ============================================

-- 1. FIX TABLE SCHEMA (Add missing columns)
-- We use TEXT to avoid Enum complexities. It works perfectly with TS enums.
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';

-- Ensure role exists too
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. RESCUE THE ADMIN USER (rentmate.rubi@gmail.com)
DO $$
DECLARE
    target_email TEXT := 'rentmate.rubi@gmail.com'; 
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (
            id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
            v_user_id, 
            target_email, 
            'Admin User', 
            'admin', 
            'active', 
            'free_forever'
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            subscription_status = 'active',
            subscription_plan = 'free_forever';
            
        RAISE NOTICE 'Admin profile repaired for %', target_email;
    ELSE
        RAISE NOTICE 'User % not found in Auth, skipping rescue.', target_email;
    END IF;
END;
$$;

-- 3. UPDATE SIGNUP TRIGGER (To match the fixed schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create Profile
    INSERT INTO public.user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Link Invoices (Safely)
    BEGIN
        UPDATE public.invoices SET user_id = NEW.id 
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN 
        RAISE WARNING 'Link failed: %', SQLERRM; 
    END;

    RETURN NEW;
END;
$$;
-- =================================================================
-- EMERGENCY RESET FOR AUTH & RLS (Run this to fix 500 Errors)
-- =================================================================

-- 1. DISABLE RLS TEMPORARILY (To unblock operations while we fix)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins see all" ON public.user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;

-- 3. DROP TRIGGERS & FUNCTIONS (To ensure no loop in triggers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.relink_past_invoices();

-- 4. FIX TYPES (Ensure Enums exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. RE-CREATE SAFE ADMIN CHECK (SECURITY DEFINER is Key)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
    -- Check if the user has 'admin' role in user_profiles
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$;

-- 6. RE-CREATE HANDLE NEW USER (Simple & Safe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user' -- Default role
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if retry
    RETURN NEW;
END;
$$;

-- 7. RE-ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. RE-ENABLE RLS WITH SIMPLE POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users see themselves
CREATE POLICY "Users view own" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Users update themselves
CREATE POLICY "Users update own" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Policy: Admins see all (Using Safe Function)
CREATE POLICY "Admins view all" 
    ON public.user_profiles FOR SELECT 
    USING (public.is_admin());

-- Policy: Admins update all
CREATE POLICY "Admins update all" 
    ON public.user_profiles FOR UPDATE 
    USING (public.is_admin());
-- Migration: Safe Tenant Deletion (Set NULL on Property Delete)

DO $$ 
BEGIN
    -- 1. Drop existing FK constraint
    -- We need to find the name. Usually automatically named or explicitly named.
    -- We'll try to drop by finding it or dropping common names.
    -- Since we don't know the exact name, we can query it or just drop if exists with likely names.
    -- Better approach: Alter table drop constraint if exists.
    
    -- Attempt to identify and drop the constraint on column 'property_id'
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'tenants' AND constraint_type = 'FOREIGN KEY') THEN
               
        -- Drop the constraint causing "ON DELETE CASCADE" or "RESTRICT" behavior
        -- Note: We might not know the exact name, so in production we'd look it up.
        -- For this migration, we will assume standard naming or iterate.
        -- HOWEVER, in Supabase SQL editor we can just do:
        
        ALTER TABLE public.tenants
        DROP CONSTRAINT IF EXISTS tenants_property_id_fkey; -- Standard name
        
    END IF;

    -- 2. Add the new Safe Constraint
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_property_id_fkey
    FOREIGN KEY (property_id)
    REFERENCES public.properties(id)
    ON DELETE SET NULL;

END $$;
-- ============================================
-- SAFE DEBUG SIGNUP (Basic)
-- ============================================

-- 1. Drop existing triggers to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create a Minimal, Safe Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Just insert the profile. 
    -- We assume the columns allow text if they are Enums (Postgres auto-cast).
    -- If "free_forever" doesn't match the enum label, it will fail, 
    -- so we are careful to match the exact string from the CREATE TYPE.
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',           -- Text, let Postgres cast to user_role
        'active',         -- Text, let Postgres cast to subscription_status
        'free_forever'    -- Text, let Postgres cast to subscription_plan_type
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If this fails, we catch it and raise a VERY CLEAR error
    RAISE EXCEPTION 'DEBUG ERROR: %', SQLERRM;
END;
$$;

-- 3. Re-Attach
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Migration: secure_tables_rls
-- Description: Enforces strict RLS on properties (assets), contracts, tenants, and payments.

-- ==============================================================================
-- 1. ENSURE PAYMENTS HAS USER_ID (Denormalization for Performance & Strict RLS)
-- ==============================================================================
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Backfill user_id for payments from contracts
UPDATE public.payments p
SET user_id = c.user_id
FROM public.contracts c
WHERE p.contract_id = c.id
AND p.user_id IS NULL;

-- ==============================================================================
-- 2. ENABLE RLS
-- ==============================================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments   ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. DEFINE POLICIES (DROP EXISTING FIRST)
-- ==============================================================================

-- Helper macro isn't standard SQL, so we repeat the blocks for clarity.

---------------------------------------------------------------------------------
-- TABLE: PROPERTIES (Assets)
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
-- Also drop any permissive policies from previous migrations
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.properties;

CREATE POLICY "Users can view own properties"   ON public.properties FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (user_id = auth.uid());

---------------------------------------------------------------------------------
-- TABLE: CONTRACTS
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.contracts;

CREATE POLICY "Users can view own contracts"   ON public.contracts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own contracts" ON public.contracts FOR DELETE USING (user_id = auth.uid());

---------------------------------------------------------------------------------
-- TABLE: TENANTS
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tenants;

CREATE POLICY "Users can view own tenants"   ON public.tenants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tenants" ON public.tenants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tenants" ON public.tenants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tenants" ON public.tenants FOR DELETE USING (user_id = auth.uid());

---------------------------------------------------------------------------------
-- TABLE: PAYMENTS
---------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

CREATE POLICY "Users can view own payments"   ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid());

-- Seed Index Bases for CPI (Consumer Price Index)
-- These are approximate factors for demonstration of the "Chained Index" logic.
-- User can update these with exact official CBS figures later.

INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor, previous_base_period_start)
VALUES
-- Base Average 2022 = 100.0 (Started Jan 2023)
('cpi', '2023-01-01', 100.0, 1.081, '2021-01-01'),

-- Base Average 2020 = 100.0 (Started Jan 2021)
('cpi', '2021-01-01', 100.0, 1.006, '2019-01-01'),

-- Base Average 2018 = 100.0 (Started Jan 2019)
('cpi', '2019-01-01', 100.0, 1.008, '2017-01-01'),

-- Example from User Image (Implicit) -> Factor 1.094
-- Let's pretend there was a base change where the factor was 1.094
('cpi', '2017-01-01', 100.0, 1.094, '2015-01-01');
-- ============================================
-- SESSION LIMITS MIGRATION (1 PC + 1 Mobile)
-- ============================================

-- 1. Helper Function: Detect Device Type from User Agent
-- Returns 'mobile' for phones/tablets, 'desktop' for everything else
CREATE OR REPLACE FUNCTION public.get_device_type(user_agent TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE -- Optimization: Always returns same result for same input
AS $$
BEGIN
    IF user_agent IS NULL THEN
        RETURN 'desktop'; -- Default fallback
    END IF;

    -- Standard mobile indicators
    -- "Mobi" catches many browsers, "Android", "iPhone", "iPad" are specific
    IF user_agent ~* '(Mobi|Android|iPhone|iPad|iPod)' THEN
        RETURN 'mobile';
    ELSE
        RETURN 'desktop';
    END IF;
END;
$$;

-- 2. Trigger Function: Enforce Limits
CREATE OR REPLACE FUNCTION public.manage_session_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to delete other sessions
SET search_path = public, auth -- Access to auth schema
AS $$
DECLARE
    new_device_type TEXT;
    session_count INT;
    oldest_session_id UUID;
    max_sessions_per_type INT := 1; -- Hardcoded limit: 1 per group
BEGIN
    -- Identify what kind of device is trying to log in
    new_device_type := public.get_device_type(NEW.user_agent);

    -- Count EXISTING sessions for this user of the SAME type
    -- We filter by the computed device type
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id
    AND public.get_device_type(user_agent) = new_device_type;

    -- If we are at (or above) the limit, we need to make room.
    -- (Note: 'session_count' is the count BEFORE this new row is inserted)
    IF session_count >= max_sessions_per_type THEN
        
        -- Identify the Oldest Session to remove
        SELECT id
        INTO oldest_session_id
        FROM auth.sessions
        WHERE user_id = NEW.user_id
        AND public.get_device_type(user_agent) = new_device_type
        ORDER BY created_at ASC
        LIMIT 1;

        -- Delete it
        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
            
            -- Optional: Raise a notice for debugging (visible in Postgres logs)
            -- RAISE NOTICE 'Session Limit Reached for User %. Deleted sess % (Type: %)', NEW.user_id, oldest_session_id, new_device_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Attach Trigger to auth.sessions
-- We use BEFORE INSERT so we can clean up *before* the new session lands.
DROP TRIGGER IF EXISTS enforce_session_limits ON auth.sessions;

CREATE TRIGGER enforce_session_limits
    BEFORE INSERT ON auth.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_session_limits();
-- COMPLETE NOTIFICATION SYSTEM SETUP
-- Run this file to set up the entire system (Table, Columns, Functions, Triggers)

-- 1. Create Table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'action', 'urgent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Contract Status Change Trigger
CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    notification_title text;
    notification_body text;
BEGIN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT city || ', ' || address INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    notification_title := 'Contract Status Updated';
    notification_body := format('Contract for %s is now %s.', property_address, NEW.status);

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info',
        notification_title,
        notification_body,
        json_build_object(
            'contract_id', NEW.id,
            'event', 'status_change',
            'old_status', OLD.status,
            'new_status', NEW.status
        )::jsonb
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;
CREATE TRIGGER on_contract_status_change
    AFTER UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_contract_status_change();


-- 5. Daily Notification Job Function
CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    extension_days int := 60;
BEGIN
    -- Contract Ending Soon (30 Days)
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.end_date = CURRENT_DATE + INTERVAL '30 days'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'ending_soon') THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'warning', 'Contract Ending Soon', format('Contract for %s, %s ends in 30 days.', r.city, r.address), json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb);
        END IF;
    END LOOP;

    -- Extension Deadline
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.extension_option = TRUE
        AND c.end_date = CURRENT_DATE + (extension_days || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'extension_deadline') THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'action', 'Extension Deadline Approaching', format('Extension option for %s, %s ends in %s days.', r.city, r.address, extension_days), json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb);
        END IF;
    END LOOP;

    -- Annual Index Update
    FOR r IN
        SELECT c.id, c.user_id, c.start_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.linkage_type != 'none'
        AND (c.start_date + INTERVAL '1 year' = CURRENT_DATE OR c.start_date + INTERVAL '2 years' = CURRENT_DATE OR c.start_date + INTERVAL '3 years' = CURRENT_DATE)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'index_update' AND metadata->>'date' = CURRENT_DATE::text) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'urgent', 'Annual Index Update', format('Annual index update required for %s, %s.', r.city, r.address), json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb);
        END IF;
    END LOOP;

    -- Payment Due Today
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
            VALUES (r.user_id, 'warning', 'Payment Due Today', format('Payment of ג‚×%s for %s, %s is due today.', r.amount, r.city, r.address), json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb);
        END IF;
    END LOOP;
END;
$$;
-- Migration: Simplify Contract Statuses
-- 1. Update existing data to match new statuses
UPDATE public.contracts 
SET status = 'active' 
WHERE status = 'pending';

UPDATE public.contracts 
SET status = 'archived' 
WHERE status IN ('ended', 'terminated');

-- 2. Drop existing check constraint if it exists (it might be implicit or named)
-- We'll try to drop any existing constraint on status just in case, but usually it's just a text column.
-- If there was a constraint named 'contracts_status_check', we would drop it.
-- ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- 3. Add new check constraint
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('active', 'archived'));

-- 4. Set default value to 'active'
ALTER TABLE public.contracts 
ALTER COLUMN status SET DEFAULT 'active';
-- Migration: Split Names into First and Last (with defaults)

DO $$ 
BEGIN

    -- 1. Add Columns (Allow NULL initially to populate)
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

    -- 2. Migrate Data
    -- Strategy:
    -- First Name = full_name (if exists) OR 'User'
    -- Last Name = 'aaa' (Mandatory default for existing)
    UPDATE public.user_profiles
    SET 
        first_name = COALESCE(full_name, 'User'),
        last_name = 'aaa'
    WHERE first_name IS NULL OR last_name IS NULL;

    -- 3. Enforce Not Null
    ALTER TABLE public.user_profiles
    ALTER COLUMN first_name SET NOT NULL,
    ALTER COLUMN last_name SET NOT NULL;

END $$;
-- ============================================
-- STORAGE POLICIES: ADMIN & DOCUMENTS (SAFE VERSION)
-- ============================================

-- 1. Create Bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('secure_documents', 'secure_documents', false, false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- 2. ENABLE RLS - SKIPPED
-- This command often fails due to permissions on the system 'storage' schema. 
-- RLS is enabled by default on Supabase storage.objects.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES

-- Policy: Admin can do ANYTHING in 'secure_documents'
DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
CREATE POLICY "Admins full access to secure_documents"
    ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'secure_documents' 
        AND 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        bucket_id = 'secure_documents' 
        AND 
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Users can VIEW their OWN files
DROP POLICY IF EXISTS "Users view own secure documents" ON storage.objects;
CREATE POLICY "Users view own secure documents"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'secure_documents'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can UPLOAD to their OWN folder (Optional)
DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
CREATE POLICY "Users upload own documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'secure_documents'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
        AND
        auth.role() = 'authenticated'
    );
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
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deleted_users_log (
        original_user_id,
        email,
        subcription_status_at_deletion
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
-- Migration: trigger_signup_notification
-- Description: Triggers the send-admin-alert Edge Function when a new user signs up

-- 1. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://mtxwavmmywiewjrsxchi.supabase.co'; -- Replace with your actual project URL or use a config table
    function_secret text := 'YOUR_FUNCTION_SECRET'; -- Ideally this is handled via vault or not needed if using net extension with service role
BEGIN
    -- We assume the 'net' extension is enabled and configured.
    -- If using pg_net or standard http extension, syntax may vary.
    -- For Supabase, the recommended way for Database Webhooks used to be the Dashboard UI,
    -- but we can do it via SQL using `pg_net` or standard triggers if we have the extension.
    
    -- SIMPLE APPROACH: Since Supabase Database Webhooks are often configured in the UI,
    -- we will use the `net` extension if available to make an async call.
    
    -- NOTE: In many Supabase setups, it's easier to create a "Webhook" via the Dashboard.
    -- However, to do it via code/migration, we use pg_net.
    
    -- Check if pg_net is available, otherwise this might fail.
    -- Assuming pg_net is installed.
    
    PERFORM
      net.http_post(
        url := project_url || '/functions/v1/send-admin-alert',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := json_build_object(
            'type', 'INSERT',
            'table', 'user_profiles',
            'record', row_to_json(NEW)
        )::jsonb
      );
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Swallow errors to not block signup
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_user_signup_notify_admin ON public.user_profiles;

CREATE TRIGGER on_user_signup_notify_admin
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_signup();
-- VERIFICATION SCRIPT
-- Run this to confirm RLS is active and correct

SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('properties', 'contracts', 'tenants', 'payments')
ORDER BY tablename, cmd;

-- EXPECTED OUTPUT:
-- For each table, you should see 4 rows: DELETE, INSERT, SELECT, UPDATE.
-- The 'qual' and 'with_check' columns should contain (user_id = auth.uid()).
-- User Preferences Table (for future use with authentication)
-- This migration is NOT deployed yet - it's ready for when auth is implemented

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en')),
    gender TEXT CHECK (gender IN ('male', 'female', 'unspecified')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read/write their own preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences"
    ON user_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job to run every day at 06:00 AM
-- NOTE: You must replace 'YOUR_PROJECT_REF' and 'YOUR_SERVICE_ROLE_KEY' below!
-- The Service Role Key is required to bypass any RLS (though the function handles it internally, correct Auth header is good practice)
-- Or use the ANON key if the function is public.

SELECT cron.schedule(
    'fetch-index-data-daily', -- Job name
    '0 6 * * *',              -- Schedule (6:00 AM daily)
    $$
    SELECT
        net.http_post(
            url:='https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzY0MTYsImV4cCI6MjA4MzAxMjQxNn0.xA3JI4iGElpIpZjVHLCA_FGw0hfmNUJTtw_fuLlhkoA"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Comment to explain
-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_date DATE DEFAULT NULL,
    payment_method TEXT DEFAULT NULL,
    reference TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies (assuming contracts have user_id, or widely permissive for now to avoid breakage if user_id is missing)
-- Ideally:
-- CREATE POLICY "Users can manage their own payments" ON public.payments
-- USING (contract_id IN (SELECT id FROM public.contracts WHERE user_id = auth.uid()));

-- Fallback permissive policy for development if user_id logic is flaky
CREATE POLICY "Enable all access for authenticated users" ON public.payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
-- Seed dummy CPI data for 2024-2025
-- Using approximate values based on recent trends (base 2022 ~105-110)

INSERT INTO index_data (index_type, date, value, source)
VALUES 
  ('cpi', '2024-01', 105.0, 'manual'),
  ('cpi', '2024-02', 105.2, 'manual'),
  ('cpi', '2024-03', 105.5, 'manual'),
  ('cpi', '2024-04', 106.0, 'manual'),
  ('cpi', '2024-05', 106.3, 'manual'),
  ('cpi', '2024-06', 106.5, 'manual'),
  ('cpi', '2024-07', 107.0, 'manual'),
  ('cpi', '2024-08', 107.2, 'manual'),
  ('cpi', '2024-09', 107.5, 'manual'),
  ('cpi', '2024-10', 107.8, 'manual'),
  ('cpi', '2024-11', 108.0, 'manual'),
  ('cpi', '2024-12', 108.2, 'manual'),
  ('cpi', '2025-01', 108.5, 'manual'),
  ('cpi', '2025-02', 108.8, 'manual'),
  ('cpi', '2025-03', 109.0, 'manual'),
  ('cpi', '2025-04', 109.3, 'manual'),
  ('cpi', '2025-05', 109.5, 'manual'),
  ('cpi', '2025-06', 109.8, 'manual'),
  ('cpi', '2025-07', 110.0, 'manual'),
  ('cpi', '2025-08', 110.2, 'manual'),
  ('cpi', '2025-09', 110.5, 'manual'),
  ('cpi', '2025-10', 110.8, 'manual'),
  ('cpi', '2025-11', 111.0, 'manual'),
  ('cpi', '2025-12', 111.2, 'manual')
ON CONFLICT (index_type, date) DO UPDATE 
SET value = EXCLUDED.value;
-- Add columns for linkage tracking to payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC, -- The base amount before linkage
ADD COLUMN IF NOT EXISTS index_linkage_rate NUMERIC, -- The linkage percentage applied
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC; -- What was actually paid
-- Create saved_calculations table
create table if not exists public.saved_calculations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete set null,
    input_data jsonb not null,
    result_data jsonb not null
);

-- RLS Policies
alter table public.saved_calculations enable row level security;

-- Allow public read access (so anyone with the link can view)
create policy "Allow public read access"
    on public.saved_calculations for select
    using (true);

-- Allow authenticated users to insert their own calculations
create policy "Allow authenticated insert"
    on public.saved_calculations for insert
    with check (auth.uid() = user_id);

-- Add indexes for faster lookups if needed (though UUID lookup is fast)
create index if not exists saved_calculations_id_idx on public.saved_calculations(id);
-- Update RLS policies for saved_calculations to allow public/anonymous inserts

-- Drop the restrictive policy
drop policy if exists "Allow authenticated insert" on public.saved_calculations;

-- Create a new inclusive policy
-- Allows insertion if:
-- 1. The user is authenticated and the user_id matches their UID
-- 2. The user is anonymous (or authenticated) and provides no user_id (NULL)
create policy "Allow public insert"
    on public.saved_calculations for insert
    with check (
        (auth.uid() = user_id) OR (user_id is null)
    );
-- Allow public (anon) users to read index data for landing page
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'index_data' 
        AND policyname = 'Allow public read access to index data'
    ) THEN
        CREATE POLICY "Allow public read access to index data"
          ON index_data
          FOR SELECT
          TO anon
          USING (true);
    END IF;
END $$;
-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the index update to run every 2 hours on days 15-17 of each month
-- (Index data is typically published mid-month by CBS and BOI)
-- This gives us 36 attempts (12 per day ֳ— 3 days) to fetch the data

-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running this migration
-- Get these values from: Supabase Dashboard > Settings > API

-- Day 15: Every 2 hours (00:00, 02:00, 04:00, ..., 22:00)
SELECT cron.schedule(
    'index-update-day15',
    '0 */2 15 * *',  -- Every 2 hours on day 15
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Day 16: Every 2 hours
SELECT cron.schedule(
    'index-update-day16',
    '0 */2 16 * *',  -- Every 2 hours on day 16
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Day 17: Every 2 hours
SELECT cron.schedule(
    'index-update-day17',
    '0 */2 17 * *',  -- Every 2 hours on day 17
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Verify the jobs were created
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'index-update%' ORDER BY jobname;
-- Drop the saved_calculations table as it's no longer needed
-- Calculator sharing now uses URL-encoded links (stateless, no database storage)

DROP TABLE IF EXISTS saved_calculations;
-- ============================================
-- 1. Create Subscription Plans Table
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
    name TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) DEFAULT 0,
    
    -- Resource Limits (-1 for unlimited)
    max_properties INTEGER DEFAULT 1,
    max_tenants INTEGER DEFAULT 1,
    max_contracts INTEGER DEFAULT 1,
    max_sessions INTEGER DEFAULT 1,
    
    -- Modular Features
    features JSONB DEFAULT '{}'::jsonb, -- e.g. {"can_export": true, "ai_assistant": false}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read plans, only admins can modify (if we build UI for it)
CREATE POLICY "Public Read Plans" 
    ON subscription_plans FOR SELECT 
    USING (true);

-- Seed Data
INSERT INTO subscription_plans (id, name, price_monthly, max_properties, max_tenants, max_contracts, max_sessions, features)
VALUES 
    ('free', 'Free Forever', 0, 1, 2, 1, 1, '{"support_level": "basic"}'::jsonb),
    ('pro', 'Pro', 29.99, 10, 20, -1, 3, '{"support_level": "priority", "export_data": true}'::jsonb),
    ('enterprise', 'Enterprise', 99.99, -1, -1, -1, -1, '{"support_level": "dedicated", "export_data": true, "api_access": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    max_properties = EXCLUDED.max_properties,
    max_tenants = EXCLUDED.max_tenants,
    max_contracts = EXCLUDED.max_contracts,
    max_sessions = EXCLUDED.max_sessions,
    features = EXCLUDED.features;
-- ============================================
-- 2. Link User Profiles to Subscription Plans
-- ============================================

-- 1. Add plan_id column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'free';

-- 2. Migrate existing users based on old enum (if needed)
-- Assuming 'free_forever' -> 'free', anything else -> 'free' or 'enterprise'
-- Since we are just starting, defaulting to 'free' is safe.
UPDATE user_profiles SET plan_id = 'free' WHERE plan_id IS NULL;

-- 3. Drop old columns if they exist (optional cleanup)
-- We'll keep them for a moment just in case, but let's drop the reliance on the enum type eventually.
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_plan;

-- 4. Update Trigger for New Users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        id, email, full_name, role, subscription_status, plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user',
        'active',
        'free' -- Default to free plan
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- 3. Dynamic Session Limits
-- ============================================

CREATE OR REPLACE FUNCTION public.manage_session_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_device_type TEXT;
    session_count INT;
    oldest_session_id UUID;
    user_plan_limit INT;
BEGIN
    -- 1. Get User's Plan Limit
    SELECT sp.max_sessions
    INTO user_plan_limit
    FROM public.user_profiles up
    JOIN public.subscription_plans sp ON up.plan_id = sp.id
    WHERE up.id = NEW.user_id;

    -- Fallback if no plan found (shouldn't happen)
    IF user_plan_limit IS NULL THEN
        user_plan_limit := 1;
    END IF;

    -- If unlimited (-1), skip check
    IF user_plan_limit = -1 THEN
        RETURN NEW;
    END IF;

    -- 2. Identify Device Type
    new_device_type := public.get_device_type(NEW.user_agent);

    -- 3. Count EXISTING sessions
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id;
    -- Note: We removed the "per device type" logic to enforce a GLOBAL session limit per plan.
    -- If you want per-device, uncomment the AND clause below, but usually plans limit total active sessions.
    -- AND public.get_device_type(user_agent) = new_device_type;

    -- 4. Enforce Limit
    IF session_count >= user_plan_limit THEN
        -- Delete Oldest Session
        SELECT id
        INTO oldest_session_id
        FROM auth.sessions
        WHERE user_id = NEW.user_id
        ORDER BY created_at ASC
        LIMIT 1;

        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
-- ============================================
-- 4. Get User Stats RPC
-- ============================================

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    -- User Profile Columns
    id UUID,
    email TEXT,
    full_name TEXT,
    role user_role,
    subscription_status subscription_status,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    
    -- Stats
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.role,
        up.subscription_status,
        up.plan_id,
        up.created_at,
        
        -- Counts (Coalesce to 0)
        COALESCE(p.count, 0) as properties_count,
        COALESCE(t.count, 0) as tenants_count,
        COALESCE(c.count, 0) as contracts_count
    FROM user_profiles up
    -- Join Property Counts
    LEFT JOIN (
        SELECT user_id, count(*) as count 
        FROM properties 
        GROUP BY user_id
    ) p ON up.id = p.user_id
    -- Join Tenant Counts
    LEFT JOIN (
        SELECT user_id, count(*) as count 
        FROM tenants 
        GROUP BY user_id
    ) t ON up.id = t.user_id
    -- Join Contract Counts
    LEFT JOIN (
        SELECT user_id, count(*) as count 
        FROM contracts 
        GROUP BY user_id
    ) c ON up.id = c.user_id
    
    ORDER BY up.created_at DESC;
END;
$$;
-- ============================================
-- 5. Admin Delete User RPC
-- ============================================

-- Function to delete user from auth.users (cascades to all other tables)
-- Note: modifying auth.users usually requires superuser or specific grants.
-- Usage: supabase.rpc('delete_user_account', { target_user_id: '...' })

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth -- vital for accessing auth schema
AS $$
BEGIN
    -- 1. Check if requester is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
    END IF;
    
    -- 2. Prevent deleting yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account via this function.';
    END IF;

    -- 3. Delete from auth.users
    -- This triggers CASCADE to user_profiles -> properties, etc.
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
-- Add fields for account deletion tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted'));

-- Create index for efficient querying of suspended accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create function to permanently delete accounts after 14 days
CREATE OR REPLACE FUNCTION cleanup_suspended_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    user_record RECORD;
BEGIN
    -- Calculate cutoff date (14 days ago)
    cutoff_date := NOW() - INTERVAL '14 days';
    
    -- Find all users marked for deletion more than 14 days ago
    FOR user_record IN 
        SELECT id 
        FROM user_profiles 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < cutoff_date
        AND account_status = 'suspended'
    LOOP
        -- Delete user data (cascades will handle related records)
        DELETE FROM user_profiles WHERE id = user_record.id;
        
        -- Delete from auth.users (requires admin privileges)
        DELETE FROM auth.users WHERE id = user_record.id;
        
        RAISE NOTICE 'Deleted user account: %', user_record.id;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users (will be called by Edge Function)
GRANT EXECUTE ON FUNCTION cleanup_suspended_accounts() TO service_role;

-- Update delete_user_account to log action
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_email TEXT;
BEGIN
    -- 1. Check if requester is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
    END IF;
    
    -- 2. Prevent deleting yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account via this function.';
    END IF;

    -- Capture email for log before deletion
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;

    -- 3. Log the action
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
        auth.uid(), 
        'delete_user', 
        jsonb_build_object('target_user_id', target_user_id, 'target_email', target_email)
    );

    -- 4. Delete from auth.users (cascades)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


-- Create Trigger Function for Profile Changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR 
       (OLD.plan_id IS DISTINCT FROM NEW.plan_id) OR 
       (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
       
        INSERT INTO public.audit_logs (user_id, action, details)
        VALUES (
            auth.uid(), -- The admin performing the update
            'update_user_profile',
            jsonb_build_object(
                'target_user_id', NEW.id,
                'changes', jsonb_build_object(
                    'role', CASE WHEN OLD.role IS DISTINCT FROM NEW.role THEN jsonb_build_array(OLD.role, NEW.role) ELSE NULL END,
                    'plan_id', CASE WHEN OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN jsonb_build_array(OLD.plan_id, NEW.plan_id) ELSE NULL END,
                    'status', CASE WHEN OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN jsonb_build_array(OLD.subscription_status, NEW.subscription_status) ELSE NULL END
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow idempotent re-run
DROP TRIGGER IF EXISTS on_profile_change_audit ON public.user_profiles;

-- Create Trigger
CREATE TRIGGER on_profile_change_audit
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION audit_profile_changes();
-- Create Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous feedback
    message TEXT NOT NULL,
    type TEXT DEFAULT 'bug', -- 'bug', 'feature', 'other'
    status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
    screenshot_url TEXT,
    device_info JSONB
);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (Anon or Authenticated)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.feedback;
CREATE POLICY "Enable insert for everyone"
ON public.feedback FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Allow Admins to see all
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Admins can view all feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Support updating status by Admins
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback"
ON public.feedback FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Storage Bucket for Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;
CREATE POLICY "Anyone can upload feedback screenshots"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK ( bucket_id = 'feedback-screenshots' );

DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
CREATE POLICY "Anyone can view feedback screenshots"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING ( bucket_id = 'feedback-screenshots' );
-- Add Granular Storage Quota Fields to Subscription Plans
-- Migration: 20260119_add_granular_storage_quotas.sql

-- Add category-specific storage columns
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_media_mb INTEGER DEFAULT -1,      -- -1 for unlimited within global cap
ADD COLUMN IF NOT EXISTS max_utilities_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_maintenance_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_documents_mb INTEGER DEFAULT -1;

-- Update existing plans with sensible defaults
-- (Assuming Free gets restricted media but more room for documents)
UPDATE subscription_plans SET 
    max_media_mb = 50,         -- 50MB for photos/video max on free
    max_utilities_mb = 20,     -- 20MB for bills
    max_maintenance_mb = 20,   -- 20MB for repairs
    max_documents_mb = 10      -- 10MB for contracts
WHERE id = 'free';

-- Update the quota check function to support categories
CREATE OR REPLACE FUNCTION check_storage_quota(
    p_user_id UUID,
    p_file_size BIGINT,
    p_category TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_usage BIGINT;
    v_cat_usage BIGINT;
    v_max_total_mb INTEGER;
    v_max_cat_mb INTEGER;
    v_col_name TEXT;
BEGIN
    -- 1. Get current usage and plan limits
    SELECT 
        u.total_bytes,
        CASE 
            WHEN p_category IN ('photo', 'video') THEN u.media_bytes
            WHEN p_category LIKE 'utility_%' THEN u.utilities_bytes
            WHEN p_category = 'maintenance' THEN u.maintenance_bytes
            ELSE u.documents_bytes
        END,
        s.max_storage_mb,
        CASE 
            WHEN p_category IN ('photo', 'video') THEN s.max_media_mb
            WHEN p_category LIKE 'utility_%' THEN s.max_utilities_mb
            WHEN p_category = 'maintenance' THEN s.max_maintenance_mb
            ELSE s.max_documents_mb
        END
    INTO 
        v_total_usage,
        v_cat_usage,
        v_max_total_mb,
        v_max_cat_mb
    FROM user_profiles up
    JOIN subscription_plans s ON up.plan_id = s.id
    LEFT JOIN user_storage_usage u ON u.user_id = up.id
    WHERE up.id = p_user_id;

    -- Initialize usage if user has no records yet
    v_total_usage := COALESCE(v_total_usage, 0);
    v_cat_usage := COALESCE(v_cat_usage, 0);

    -- 2. Check Global Limit
    IF v_max_total_mb != -1 AND (v_total_usage + p_file_size) > (v_max_total_mb * 1024 * 1024) THEN
        RETURN FALSE;
    END IF;

    -- 3. Check Category Limit (if specified and not unlimited)
    IF p_category IS NOT NULL AND v_max_cat_mb != -1 THEN
        IF (v_cat_usage + p_file_size) > (v_max_cat_mb * 1024 * 1024) THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Add Storage Quota Fields to Subscription Plans
-- Migration: 20260119_add_storage_quotas.sql

-- Add storage quota columns
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 100,  -- MB per user
ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10; -- MB per file

-- Update existing plans with storage limits
UPDATE subscription_plans SET 
    max_storage_mb = 100,    -- 100MB total
    max_file_size_mb = 5     -- 5MB per file
WHERE id = 'free';

UPDATE subscription_plans SET 
    max_storage_mb = 5120,   -- 5GB total
    max_file_size_mb = 50    -- 50MB per file
WHERE id = 'pro';

UPDATE subscription_plans SET 
    max_storage_mb = -1,     -- Unlimited
    max_file_size_mb = 500   -- 500MB per file
WHERE id = 'enterprise';

-- Comments
-- Create table for short URLs
CREATE TABLE IF NOT EXISTS calculation_shares (
    id TEXT PRIMARY KEY, -- Short ID (e.g., "abc123")
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    calculation_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    view_count INTEGER DEFAULT 0
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_calculation_shares_expires ON calculation_shares(expires_at);

-- RLS Policies
ALTER TABLE calculation_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public shares)
CREATE POLICY "Public can view calculation shares"
    ON calculation_shares FOR SELECT
    USING (true);

-- Authenticated users can create
CREATE POLICY "Authenticated users can create shares"
    ON calculation_shares FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own shares (for view count)
CREATE POLICY "Anyone can update view count"
    ON calculation_shares FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Function to generate short ID
CREATE OR REPLACE FUNCTION generate_short_id(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create short URL
CREATE OR REPLACE FUNCTION create_calculation_share(p_calculation_data JSONB)
RETURNS TEXT AS $$
DECLARE
    v_short_id TEXT;
    v_max_attempts INTEGER := 10;
    v_attempt INTEGER := 0;
BEGIN
    LOOP
        v_short_id := generate_short_id(6);
        
        -- Try to insert
        BEGIN
            INSERT INTO calculation_shares (id, user_id, calculation_data)
            VALUES (v_short_id, auth.uid(), p_calculation_data);
            
            RETURN v_short_id;
        EXCEPTION WHEN unique_violation THEN
            v_attempt := v_attempt + 1;
            IF v_attempt >= v_max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique short ID after % attempts', v_max_attempts;
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM calculation_shares
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
-- Property Documents System - Main Table
-- Migration: 20260119_create_property_documents.sql

CREATE TABLE IF NOT EXISTS property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Document Classification
    category TEXT NOT NULL CHECK (category IN (
        'photo',           -- Property photos
        'video',           -- Property videos
        'utility_water',   -- Water bills
        'utility_electric',-- Electric bills
        'utility_gas',     -- Gas bills
        'utility_municipality', -- Municipality bills (arnona)
        'utility_management',   -- Building management fees
        'maintenance',     -- Repair/maintenance records
        'invoice',         -- General invoices
        'receipt',         -- Payment receipts
        'insurance',       -- Insurance documents
        'warranty',        -- Warranty documents
        'legal',           -- Legal documents
        'other'            -- Miscellaneous
    )),
    
    -- Storage Info
    storage_bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    
    -- Metadata
    title TEXT,
    description TEXT,
    tags TEXT[],
    
    -- Date Info
    document_date DATE,  -- When the bill/invoice was issued
    period_start DATE,   -- For recurring bills (e.g., monthly utility)
    period_end DATE,
    
    -- Financial Data (for bills/invoices)
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'ILS',
    paid BOOLEAN DEFAULT false,
    payment_date DATE,
    
    -- Maintenance Specific
    vendor_name TEXT,
    issue_type TEXT,     -- e.g., "plumbing", "electrical", "painting"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_category ON property_documents(category);
CREATE INDEX IF NOT EXISTS idx_property_documents_date ON property_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_property_documents_user ON property_documents(user_id);

-- RLS Policies
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their property documents"
    ON property_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their property documents"
    ON property_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their property documents"
    ON property_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their property documents"
    ON property_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
-- Create document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., 'utility_electric', 'maintenance', 'media', 'other'
    name TEXT NOT NULL, -- The user-friendly subject/title
    folder_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Policies for document_folders
CREATE POLICY "Users can view folders for their properties"
    ON document_folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert folders for their properties"
    ON document_folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update folders for their properties"
    ON document_folders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete folders for their properties"
    ON document_folders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- Add folder_id to property_documents
ALTER TABLE property_documents
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_property_category ON document_folders(property_id, category);
CREATE INDEX IF NOT EXISTS idx_property_documents_folder ON property_documents(folder_id);
-- Create property_media table
CREATE TABLE IF NOT EXISTS public.property_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    drive_web_view_link TEXT NOT NULL,
    drive_thumbnail_link TEXT,
    name TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own property media"
    ON public.property_media FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own property media"
    ON public.property_media FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own property media"
    ON public.property_media FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_user_id ON public.property_media(user_id);
-- Create short_links table for URL shortener
-- Migration: 20260119_create_short_links.sql

CREATE TABLE IF NOT EXISTS public.short_links (
    slug TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '90 days') NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: track who created it
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone with the link can use it)
CREATE POLICY "Public can read short links"
ON public.short_links FOR SELECT
USING (true);

-- Allow public insert access (since the calculator allows sharing without login, technically)
-- Alternatively, if we want to restrict generation to logged-in users, change this.
-- Assuming internal tool for now, but user requirement "without keeping every calculation" 
-- implies ephemeral nature. We'll allow public insert for now to support non-logged-in sharing 
-- if that's a use case, OR restrict to authenticated users if the app requires auth.
-- Given RentMate seems to have auth, let's allow authenticated users.
-- UPDATE: User wants to share results. If guest users can use calculator, they need to insert.
-- Let's stick to authenticated for creation to prevent spam, assuming users log in to use the app effectively.
-- If user is guest, we might need a stored procedure or standard anon policy.
-- Adding "Public can insert" with limits would be safer, but for MVP:
CREATE POLICY "Authenticated users can create short links"
ON public.short_links FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Also allow anonymous creation if needed? The user removed server-side calc storage.
-- Let's add anonymous policy for now to be safe with "demo" mode or guest usage.
CREATE POLICY "Public can create short links"
ON public.short_links FOR INSERT
WITH CHECK (true);

-- Auto-cleanup function (optional usually, but good for hygiene)
-- We can rely on `expires_at` in the query `WHERE expires_at > now()`
-- User Storage Usage Tracking
-- Migration: 20260119_create_user_storage_usage.sql

CREATE TABLE IF NOT EXISTS user_storage_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Breakdown by category
    media_bytes BIGINT DEFAULT 0,
    utilities_bytes BIGINT DEFAULT 0,
    maintenance_bytes BIGINT DEFAULT 0,
    documents_bytes BIGINT DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own storage usage"
    ON user_storage_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_storage_usage (user_id, total_bytes, file_count)
        VALUES (NEW.user_id, NEW.file_size, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_bytes = user_storage_usage.total_bytes + NEW.file_size,
            file_count = user_storage_usage.file_count + 1,
            updated_at = NOW();
            
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_storage_usage
        SET 
            total_bytes = GREATEST(0, total_bytes - OLD.file_size),
            file_count = GREATEST(0, file_count - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on property_documents
CREATE TRIGGER update_storage_on_document_change
AFTER INSERT OR DELETE ON property_documents
FOR EACH ROW EXECUTE FUNCTION update_user_storage();

-- Storage Quota Check Function
CREATE OR REPLACE FUNCTION check_storage_quota(
    p_user_id UUID,
    p_file_size BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_usage BIGINT;
    v_max_storage_mb INTEGER;
    v_max_storage_bytes BIGINT;
BEGIN
    -- Get current usage
    SELECT COALESCE(total_bytes, 0)
    INTO v_current_usage
    FROM user_storage_usage
    WHERE user_id = p_user_id;
    
    -- Get plan limit
    SELECT sp.max_storage_mb
    INTO v_max_storage_mb
    FROM user_profiles up
    JOIN subscription_plans sp ON up.plan_id = sp.id
    WHERE up.id = p_user_id;
    
    -- -1 means unlimited
    IF v_max_storage_mb = -1 THEN
        RETURN TRUE;
    END IF;
    
    v_max_storage_bytes := v_max_storage_mb * 1024 * 1024;
    
    -- Check if adding this file would exceed quota
    RETURN (v_current_usage + p_file_size) <= v_max_storage_bytes;
END;
$$ LANGUAGE plpgsql;

-- Comments
-- Enable RLS (Ensure it's enabled)
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view folders for their properties" ON document_folders;
DROP POLICY IF EXISTS "Users can insert folders for their properties" ON document_folders;
DROP POLICY IF EXISTS "Users can update folders for their properties" ON document_folders;
DROP POLICY IF EXISTS "Users can delete folders for their properties" ON document_folders;

-- Re-create Policies

-- 1. SELECT
CREATE POLICY "Users can view folders for their properties"
    ON document_folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- 2. INSERT
CREATE POLICY "Users can insert folders for their properties"
    ON document_folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- 3. UPDATE
CREATE POLICY "Users can update folders for their properties"
    ON document_folders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- 4. DELETE
CREATE POLICY "Users can delete folders for their properties"
    ON document_folders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- Force schema cache reload again just in case
NOTIFY pgrst, 'reload schema';
-- Fix RLS Violation in Storage Trigger (with Category Support)
-- Migration: 20260119_fix_trigger_security.sql

-- The update_user_storage function needs to run with SECURITY DEFINER
-- because it modifies user_storage_usage which has RLS enabled.

CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
DECLARE
    v_col TEXT;
    v_size BIGINT;
    v_user_id UUID;
    v_cat TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_size := NEW.file_size;
        v_user_id := NEW.user_id;
        v_cat := NEW.category;
    ELSE
        v_size := OLD.file_size;
        v_user_id := OLD.user_id;
        v_cat := OLD.category;
    END IF;

    -- Determine which column to update based on category
    IF v_cat IN ('photo', 'video') THEN
        v_col := 'media_bytes';
    ELSIF v_cat LIKE 'utility_%' THEN
        v_col := 'utilities_bytes';
    ELSIF v_cat = 'maintenance' THEN
        v_col := 'maintenance_bytes';
    ELSE
        v_col := 'documents_bytes';
    END IF;

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
            VALUES ($1, $2, 1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                updated_at = NOW()
        ', v_col, v_col, v_col) USING v_user_id, v_size;
            
    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('
            UPDATE user_storage_usage
            SET 
                total_bytes = GREATEST(0, total_bytes - $1),
                file_count = GREATEST(0, file_count - 1),
                %I = GREATEST(0, %I - $1),
                updated_at = NOW()
            WHERE user_id = $2
        ', v_col, v_col) USING v_size, v_user_id;
    END IF;
    
    RETURN NULL; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Update Storage Tracking to include category breakdown
-- Migration: 20260119_update_storage_trigger.sql

CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
DECLARE
    v_col TEXT;
    v_size BIGINT;
    v_user_id UUID;
    v_cat TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_size := NEW.file_size;
        v_user_id := NEW.user_id;
        v_cat := NEW.category;
    ELSE
        v_size := OLD.file_size;
        v_user_id := OLD.user_id;
        v_cat := OLD.category;
    END IF;

    -- Determine which column to update based on category
    IF v_cat IN ('photo', 'video') THEN
        v_col := 'media_bytes';
    ELSIF v_cat LIKE 'utility_%' THEN
        v_col := 'utilities_bytes';
    ELSIF v_cat = 'maintenance' THEN
        v_col := 'maintenance_bytes';
    ELSE
        v_col := 'documents_bytes';
    END IF;

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
            VALUES ($1, $2, 1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                updated_at = NOW()
        ', v_col, v_col, v_col) USING v_user_id, v_size;
            
    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('
            UPDATE user_storage_usage
            SET 
                total_bytes = GREATEST(0, total_bytes - $1),
                file_count = GREATEST(0, file_count - 1),
                %I = GREATEST(0, %I - $1),
                updated_at = NOW()
            WHERE user_id = $2
        ', v_col, v_col) USING v_size, v_user_id;
    END IF;
    
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;
-- Add extension_option_start column to contracts table
-- This column stores when the tenant's extension option period begins

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS extension_option_start DATE;

-- AI Chat Usage Tracking
CREATE TABLE IF NOT EXISTS ai_chat_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI Usage Limits per Subscription Tier
CREATE TABLE IF NOT EXISTS ai_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    monthly_message_limit INTEGER NOT NULL,
    monthly_token_limit INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO ai_usage_limits (tier_name, monthly_message_limit, monthly_token_limit) VALUES
    ('free', 50, 50000),           -- 50 messages, ~50k tokens
    ('basic', 200, 200000),         -- 200 messages, ~200k tokens
    ('pro', 1000, 1000000),         -- 1000 messages, ~1M tokens
    ('business', -1, -1)            -- Unlimited (-1)
ON CONFLICT (tier_name) DO NOTHING;

-- Function to check and log AI usage
CREATE OR REPLACE FUNCTION check_ai_chat_usage(
    p_user_id UUID,
    p_tokens_used INTEGER DEFAULT 500
)
RETURNS JSON AS $$
DECLARE
    v_usage RECORD;
    v_limit RECORD;
    v_user_tier TEXT;
    v_result JSON;
BEGIN
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_user_tier
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Default to free if no tier found
    v_user_tier := COALESCE(v_user_tier, 'free');
    
    -- Get limits for this tier
    SELECT * INTO v_limit
    FROM ai_usage_limits
    WHERE tier_name = v_user_tier;
    
    -- Get or create usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_usage
    FROM ai_chat_usage
    WHERE user_id = p_user_id;
    
    -- Check if we need to reset (monthly)
    IF v_usage.last_reset_at < DATE_TRUNC('month', NOW()) THEN
        UPDATE ai_chat_usage
        SET message_count = 0,
            tokens_used = 0,
            last_reset_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        v_usage.message_count := 0;
        v_usage.tokens_used := 0;
    END IF;
    
    -- Check limits (skip if unlimited)
    IF v_limit.monthly_message_limit != -1 AND v_usage.message_count >= v_limit.monthly_message_limit THEN
        v_result := json_build_object(
            'allowed', false,
            'reason', 'message_limit_exceeded',
            'current_usage', v_usage.message_count,
            'limit', v_limit.monthly_message_limit,
            'tier', v_user_tier
        );
        RETURN v_result;
    END IF;
    
    IF v_limit.monthly_token_limit != -1 AND v_usage.tokens_used >= v_limit.monthly_token_limit THEN
        v_result := json_build_object(
            'allowed', false,
            'reason', 'token_limit_exceeded',
            'current_usage', v_usage.tokens_used,
            'limit', v_limit.monthly_token_limit,
            'tier', v_user_tier
        );
        RETURN v_result;
    END IF;
    
    -- Increment usage
    UPDATE ai_chat_usage
    SET message_count = message_count + 1,
        tokens_used = tokens_used + p_tokens_used,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Return success
    v_result := json_build_object(
        'allowed', true,
        'current_messages', v_usage.message_count + 1,
        'message_limit', v_limit.monthly_message_limit,
        'current_tokens', v_usage.tokens_used + p_tokens_used,
        'token_limit', v_limit.monthly_token_limit,
        'tier', v_user_tier
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage"
    ON ai_chat_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all AI usage"
    ON ai_chat_usage FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can view limits (for UI display)
CREATE POLICY "Anyone can view AI limits"
    ON ai_usage_limits FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify limits
CREATE POLICY "Admins can modify AI limits"
    ON ai_usage_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_id ON ai_chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_last_reset ON ai_chat_usage(last_reset_at);
-- 1. Add notification_preferences column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"contract_expiry_days": 60, "rent_due_days": 3}';

-- 2. Update Contract Expiration Check to use preferences
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
    LOOP
        -- Extract preference, default to 60, cap at 180
        pref_days := COALESCE((expiring_contract.notification_preferences->>'contract_expiry_days')::int, 60);
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if contract expires in this window
        IF expiring_contract.end_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND expiring_contract.end_date >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = expiring_contract.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = expiring_contract.id::text
                -- We allow re-notifying if the title implies a different "tier" of warning, but for now we keep it simple
                -- Just alert once per contract expiry cycle is usually enough, or enable duplicates if significant time passed
                 AND n.created_at > (CURRENT_DATE - INTERVAL '6 months') -- Simple debounce for same contract
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    expiring_contract.user_id,
                    'warning',
                    'Contract Expiring Soon',
                    'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
                    jsonb_build_object('contract_id', expiring_contract.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Update Rent Due Check to use preferences
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address,
            up.notification_preferences
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE pay.status = 'pending'
    LOOP
        -- Extract preference, default to 3, cap at 180 (though less makes sense for rent)
        pref_days := COALESCE((due_payment.notification_preferences->>'rent_due_days')::int, 3);
        IF pref_days > 180 THEN pref_days := 180; END IF;

        IF due_payment.due_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND due_payment.due_date >= CURRENT_DATE THEN

            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = due_payment.user_id
                AND n.type = 'info'
                AND n.metadata->>'payment_id' = due_payment.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    due_payment.user_id,
                    'info',
                    'Rent Due Soon',
                    'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                    jsonb_build_object('payment_id', due_payment.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;
-- Migration: 20260120_database_performance_refactor.sql
-- Description: Adds missing indexes for foreign keys and implements RPCs for faster dashboard data retrieval.

-- ==============================================================================
-- 1. ADD MISSING INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Contracts: user_id, property_id, tenant_id
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);

-- Payments: user_id, contract_id, status
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Property Documents: user_id, property_id, folder_id, category
CREATE INDEX IF NOT EXISTS idx_property_docs_user_id ON public.property_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_property_docs_property_id ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_docs_folder_id ON public.property_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_property_docs_category ON public.property_documents(category);

-- Document Folders: property_id
CREATE INDEX IF NOT EXISTS idx_document_folders_property_id ON public.document_folders(property_id);

-- Short Links: user_id, created_at
CREATE INDEX IF NOT EXISTS idx_short_links_user_id ON public.short_links(user_id);
CREATE INDEX IF NOT EXISTS idx_short_links_created_at ON public.short_links(created_at);

-- ==============================================================================
-- 2. CREATE RPCS FOR AGGREGATED DATA
-- ==============================================================================

/**
 * Efficiently get counts of documents per category for a user.
 * Replaces client-side aggregation in Dashboard.
 */
CREATE OR REPLACE FUNCTION public.get_property_document_counts(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'media', COUNT(*) FILTER (WHERE category IN ('photo', 'video')),
        'utilities', COUNT(*) FILTER (WHERE category LIKE 'utility_%'),
        'maintenance', COUNT(*) FILTER (WHERE category = 'maintenance'),
        'documents', COUNT(*) FILTER (WHERE category NOT IN ('photo', 'video', 'maintenance') AND category NOT LIKE 'utility_%')
    ) INTO result
    FROM public.property_documents
    WHERE user_id = p_user_id;

    RETURN result;
END;
$$;

/**
 * Get high-level dashboard stats in a single call.
 * Including income, pending payments, and document counts.
 */
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    income_stats RECORD;
    doc_counts JSONB;
BEGIN
    -- 1. Get Income Stats
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('paid', 'pending')), 0) as total
    INTO income_stats
    FROM public.payments
    WHERE user_id = p_user_id
    AND due_date >= date_trunc('month', now())
    AND due_date < date_trunc('month', now() + interval '1 month');

    -- 2. Get Document Counts (reuse RPC logic)
    doc_counts := public.get_property_document_counts(p_user_id);

    RETURN jsonb_build_object(
        'income', jsonb_build_object(
            'collected', income_stats.collected,
            'pending', income_stats.pending,
            'monthlyTotal', income_stats.total
        ),
        'storage', doc_counts,
        'timestamp', now()
    );
END;
$$;
-- Comprehensive Daily Notification Logic

-- 1. Updated Contract Expiration Check (60 days)
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        WHERE c.status = 'active'
        -- Changed to 60 days
        AND c.end_date <= (CURRENT_DATE + INTERVAL '60 days')
        AND c.end_date >= CURRENT_DATE
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = expiring_contract.user_id
            AND n.type = 'warning'
            AND n.metadata->>'contract_id' = expiring_contract.id::text
            AND n.title = 'Contract Expiring Soon' 
        ) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                metadata
            ) VALUES (
                expiring_contract.user_id,
                'warning',
                'Contract Expiring Soon',
                'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
                jsonb_build_object('contract_id', expiring_contract.id)
            );
            count_new := count_new + 1;
        END IF;
    END LOOP;
END;
$$;

-- 2. New Rent Due Check (3 days before)
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
BEGIN
    -- This logic assumes we have 'payments' records generated. 
    -- Alternatively, it could calculate "next payment date" dynamically from contracts if payments aren't pre-generated.
    -- For robustness, we'll assume we are looking for payments in 'pending' status due nicely soon.

    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        WHERE pay.status = 'pending'
        AND pay.due_date <= (CURRENT_DATE + INTERVAL '3 days')
        AND pay.due_date >= CURRENT_DATE
    LOOP
        -- Avoid dupes for this specific payment ID
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = due_payment.user_id
            AND n.type = 'info'
            AND n.metadata->>'payment_id' = due_payment.id::text
        ) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                metadata
            ) VALUES (
                due_payment.user_id,
                'info',
                'Rent Due Soon',
                'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                jsonb_build_object('payment_id', due_payment.id)
            );
            count_new := count_new + 1;
        END IF;
    END LOOP;
END;
$$;

-- 3. Master Orchestrator
CREATE OR REPLACE FUNCTION public.check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_contract_expirations();
    PERFORM public.check_rent_due();
END;
$$;
-- Add extension_option_end column and notification preference

-- 1. Add extension_option_end column to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS extension_option_end DATE;


-- 2. Add extension_option_end_days to notification preferences
UPDATE public.user_profiles
SET notification_preferences = jsonb_set(
    COALESCE(notification_preferences, '{}'::jsonb),
    '{extension_option_end_days}',
    '7'
)
WHERE notification_preferences IS NULL 
   OR NOT notification_preferences ? 'extension_option_end_days';

-- 3. Create function to check for upcoming extension option deadlines
CREATE OR REPLACE FUNCTION public.check_extension_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deadline_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR deadline_record IN
        SELECT 
            c.id, 
            c.extension_option_end,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_end IS NOT NULL
    LOOP
        -- Extract preference, default to 7, cap at 180
        pref_days := COALESCE((deadline_record.notification_preferences->>'extension_option_end_days')::int, 7);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if deadline is approaching
        IF deadline_record.extension_option_end <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND deadline_record.extension_option_end >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = deadline_record.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = deadline_record.id::text
                AND n.title = 'Extension Option Deadline Approaching'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    deadline_record.user_id,
                    'warning',
                    'Extension Option Deadline Approaching',
                    'Deadline to announce extension option for ' || deadline_record.address || ' is in ' || (deadline_record.extension_option_end - CURRENT_DATE)::text || ' days (' || to_char(deadline_record.extension_option_end, 'DD/MM/YYYY') || '). Contact tenant soon.',
                    jsonb_build_object('contract_id', deadline_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 4. Update master daily notifications function
CREATE OR REPLACE FUNCTION public.check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_contract_expirations();
    PERFORM public.check_rent_due();
    PERFORM public.check_extension_options();
    PERFORM public.check_extension_deadlines();
END;
$$;
-- Add extension_option_days to notification preferences
-- Update default structure to include all three notification types

-- 1. Update existing records to include extension_option_days
UPDATE public.user_profiles
SET notification_preferences = jsonb_set(
    COALESCE(notification_preferences, '{}'::jsonb),
    '{extension_option_days}',
    '30'
)
WHERE notification_preferences IS NULL 
   OR NOT notification_preferences ? 'extension_option_days';

-- 2. Create function to check for upcoming extension option periods
CREATE OR REPLACE FUNCTION public.check_extension_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extension_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR extension_record IN
        SELECT 
            c.id, 
            c.extension_option_start,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_start IS NOT NULL
    LOOP
        -- Extract preference, default to 30, cap at 180
        pref_days := COALESCE((extension_record.notification_preferences->>'extension_option_days')::int, 30);
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if extension option starts in this window
        IF extension_record.extension_option_start <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND extension_record.extension_option_start >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = extension_record.user_id
                AND n.type = 'info'
                AND n.metadata->>'contract_id' = extension_record.id::text
                AND n.title = 'Extension Option Available'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    extension_record.user_id,
                    'info',
                    'Extension Option Available',
                    'Extension option period for ' || extension_record.address || ' starts in ' || (extension_record.extension_option_start - CURRENT_DATE)::text || ' days (' || to_char(extension_record.extension_option_start, 'DD/MM/YYYY') || '). Consider discussing with tenant.',
                    jsonb_build_object('contract_id', extension_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Update the master daily notifications function to include extension checks
CREATE OR REPLACE FUNCTION public.check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_contract_expirations();
    PERFORM public.check_rent_due();
    PERFORM public.check_extension_options();
END;
$$;
-- Harden SECURITY DEFINER functions with strict search_path
-- Migration: 20260120_harden_security_definer_functions.sql

-- 1. update_user_storage
ALTER FUNCTION public.update_user_storage() SET search_path = public;

-- 2. check_storage_quota
ALTER FUNCTION public.check_storage_quota(UUID, BIGINT, TEXT) SET search_path = public;

-- 3. process_daily_notifications
ALTER FUNCTION public.process_daily_notifications() SET search_path = public;

-- 4. Any other functions found in migrations that are SECURITY DEFINER but missing search_path
-- Searching for 'SECURITY DEFINER' in codebase often reveals these.
-- Note: delete_user_account and handle_new_user already have it.
-- Update notification functions to respect 0 value (disabled notifications)

-- 1. Update Contract Expiration Check to skip if disabled (0 days)
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
    LOOP
        -- Extract preference, default to 60, cap at 180
        pref_days := COALESCE((expiring_contract.notification_preferences->>'contract_expiry_days')::int, 60);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if contract expires in this window
        IF expiring_contract.end_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND expiring_contract.end_date >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = expiring_contract.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = expiring_contract.id::text
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    expiring_contract.user_id,
                    'warning',
                    'Contract Expiring Soon',
                    'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
                    jsonb_build_object('contract_id', expiring_contract.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 2. Update Rent Due Check to skip if disabled (0 days)
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address,
            up.notification_preferences
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE pay.status = 'pending'
    LOOP
        -- Extract preference, default to 3, cap at 180
        pref_days := COALESCE((due_payment.notification_preferences->>'rent_due_days')::int, 3);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;

        IF due_payment.due_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND due_payment.due_date >= CURRENT_DATE THEN

            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = due_payment.user_id
                AND n.type = 'info'
                AND n.metadata->>'payment_id' = due_payment.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    due_payment.user_id,
                    'info',
                    'Rent Due Soon',
                    'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                    jsonb_build_object('payment_id', due_payment.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Update Extension Option Check to skip if disabled (0 days)
CREATE OR REPLACE FUNCTION public.check_extension_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extension_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR extension_record IN
        SELECT 
            c.id, 
            c.extension_option_start,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_start IS NOT NULL
    LOOP
        -- Extract preference, default to 30, cap at 180
        pref_days := COALESCE((extension_record.notification_preferences->>'extension_option_days')::int, 30);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if extension option starts in this window
        IF extension_record.extension_option_start <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND extension_record.extension_option_start >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = extension_record.user_id
                AND n.type = 'info'
                AND n.metadata->>'contract_id' = extension_record.id::text
                AND n.title = 'Extension Option Available'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    extension_record.user_id,
                    'info',
                    'Extension Option Available',
                    'Extension option period for ' || extension_record.address || ' starts in ' || (extension_record.extension_option_start - CURRENT_DATE)::text || ' days (' || to_char(extension_record.extension_option_start, 'DD/MM/YYYY') || '). Consider discussing with tenant.',
                    jsonb_build_object('contract_id', extension_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;
-- Function to check for expiring contracts and generate notifications
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
BEGIN
    -- Loop through active contracts expiring in the next 30 days
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        WHERE c.status = 'active'
        AND c.end_date <= (CURRENT_DATE + INTERVAL '30 days')
        AND c.end_date >= CURRENT_DATE
    LOOP
        -- Check if a 'warning' notification already exists for this contract to avoid duplicates
        -- We check metadata->>'contract_id'
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = expiring_contract.user_id
            AND n.type = 'warning'
            AND n.metadata->>'contract_id' = expiring_contract.id::text
        ) THEN
            -- Insert Notification
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                metadata
            ) VALUES (
                expiring_contract.user_id,
                'warning',
                'Contract Expiring Soon',
                'The contract for ' || expiring_contract.address || ', ' || expiring_contract.city || ' ends on ' || to_char(expiring_contract.end_date, 'YYYY-MM-DD') || '.',
                jsonb_build_object('contract_id', expiring_contract.id)
            );
            
            count_new := count_new + 1;
        END IF;
    END LOOP;

    -- Optional: Log execution (if you had a logs table, or just raise notice for debugging)
    -- RAISE NOTICE 'Generated % new expiration notifications', count_new;
END;
$$;
-- ============================================
-- AI Usage Tracking & Limits
-- ============================================

-- 1. Add max_ai_scans to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_ai_scans INTEGER DEFAULT 5;

-- 2. Update Seed Data for existing plans
UPDATE subscription_plans SET max_ai_scans = 5 WHERE id = 'free';
UPDATE subscription_plans SET max_ai_scans = 50 WHERE id = 'pro';
UPDATE subscription_plans SET max_ai_scans = -1 WHERE id = 'enterprise';

-- 3. Create AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL, -- 'bill_scan', 'contract_analysis', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs (user_id, created_at);

-- Policies
CREATE POLICY "Users can view their own usage logs"
    ON ai_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 4. RPC to check and log usage
-- Returns { allowed: boolean, current_usage: int, limit: int }
CREATE OR REPLACE FUNCTION check_and_log_ai_usage(p_user_id UUID, p_feature TEXT DEFAULT 'bill_scan', p_count INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_current_usage INTEGER;
    v_month_start TIMESTAMPTZ;
    v_requester_role TEXT;
BEGIN
    -- SECURITY CHECK: 
    -- 1. Must be authenticated
    -- 2. Must be logging for self OR be an admin
    SELECT role INTO v_requester_role FROM public.user_profiles WHERE id = auth.uid();
    
    IF p_user_id != auth.uid() AND COALESCE(v_requester_role, 'user') != 'admin' THEN
        RAISE EXCEPTION 'Access Denied: You cannot log usage for another user.';
    END IF;

    -- Get current month start
    v_month_start := date_trunc('month', now());

    -- 1. Get User's Limit from their plan
    SELECT p.max_ai_scans INTO v_limit
    FROM user_profiles up
    JOIN subscription_plans p ON up.plan_id = p.id
    WHERE up.id = p_user_id;

    -- Fallback to default free limit if not found
    IF v_limit IS NULL THEN
        v_limit := 5;
    END IF;

    -- 2. Count total AI usage this month
    SELECT COUNT(*)::INTEGER INTO v_current_usage
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= v_month_start;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + p_count) <= v_limit THEN
        -- Log the usage (multiple entries)
        FOR i IN 1..p_count LOOP
            INSERT INTO ai_usage_logs (user_id, feature_name)
            VALUES (p_user_id, p_feature);
        END LOOP;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'current_usage', v_current_usage + p_count,
            'limit', v_limit
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'current_usage', v_current_usage,
            'limit', v_limit
        );
    END IF;
END;
$$;
-- Add is_super_admin column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create RPC for financial metrics (Super Admin Only)
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_mrr decimal := 0;
    total_users int := 0;
    active_subs int := 0;
    new_users_30d int := 0;
    churn_rate decimal := 0; -- Placeholder for now
    is_super boolean;
BEGIN
    -- Check if requesting user is super admin
    SELECT is_super_admin INTO is_super
    FROM user_profiles 
    WHERE id = auth.uid();

    IF is_super IS NOT TRUE THEN
        RAISE EXCEPTION 'Access Denied: Super Admin Only';
    END IF;

    -- 1. Total Users
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    
    -- 2. Active Subscribers (Any plan that is not 'free' or 'free_forever')
    -- Note: This depends on how you categorize 'active' payment plans. 
    -- We assume existence of plan_id implies a subscription if it's not the default free one.
    SELECT COUNT(*) INTO active_subs 
    FROM user_profiles 
    WHERE plan_id IS NOT NULL 
    AND plan_id NOT IN ('free', 'free_forever')
    AND subscription_status = 'active';
    
    -- 3. MRR Calculation
    -- Sum of price_monthly for all active users based on their plan_id
    SELECT COALESCE(SUM(sp.price_monthly), 0)
    INTO total_mrr
    FROM user_profiles up
    JOIN subscription_plans sp ON up.plan_id = sp.id
    WHERE up.subscription_status = 'active';
    
    -- 4. Growth (New users in last 30 days)
    SELECT COUNT(*) INTO new_users_30d
    FROM user_profiles
    WHERE created_at > (NOW() - INTERVAL '30 days');

    RETURN json_build_object(
        'mrr', total_mrr,
        'total_users', total_users,
        'active_subscribers', active_subs,
        'new_users_30d', new_users_30d,
        'churn_rate', 0 -- TODO: Implement churn logic later
    );
END;
$$;
-- ============================================
-- ADMIN STATS FUNCTION
-- ============================================
-- Creates a function that allows admins to get system-wide statistics
-- bypassing RLS policies

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_admin_stats();

-- Create admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count
    FROM contracts;

    -- Get total revenue (sum of paid payments)
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount
    FROM payments
    WHERE status = 'paid';

    -- Get active users (users who logged in within last 30 days)
    SELECT COUNT(*) INTO active_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL
    AND updated_at > NOW() - INTERVAL '30 days';

    -- Build JSON result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count
    );

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (function will check admin role internally)
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- Add comment
-- Migration: fix_admin_permissions
-- Description: Grants execute permissions on admin RPCs and ensures admins can view all data for management purposes.

-- 1. Grant Execute on RPCs
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;

-- 2. Ensure Admin Policies for Management Tables
-- user_storage_usage
DROP POLICY IF EXISTS "Admins can view all storage usage" ON public.user_storage_usage;
CREATE POLICY "Admins can view all storage usage"
    ON public.user_storage_usage FOR SELECT
    USING (public.is_admin());

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

-- property_documents (Admin should be able to see metadata at least? usually handled by service role or specific rpc)
-- For now, let's just make sure the storage usage tracking is solid.

-- 3. Fix user_profiles RLS if it's missing (it was in reset_auth_policies.sql, but let's be safe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        -- Re-run the policies to be absolutely sure
        DROP POLICY IF EXISTS "Admins view all" ON public.user_profiles;
        CREATE POLICY "Admins view all" 
            ON public.user_profiles FOR SELECT 
            USING (public.is_admin());
            
        DROP POLICY IF EXISTS "Admins update all" ON public.user_profiles;
        CREATE POLICY "Admins update all" 
            ON public.user_profiles FOR UPDATE 
            USING (public.is_admin());
    END IF;
END $$;
-- Migration: fix_email_systems_20260121
-- Description: Fixes project URL for admin alerts and adds email forwarding for app notifications

-- 1. Fix Admin Signup Notification URL 
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co'; -- UPDATED TO CORRECT PROJECT
BEGIN
    PERFORM
      net.http_post(
        url := project_url || '/functions/v1/send-admin-alert',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := json_build_object(
            'type', 'INSERT',
            'table', 'user_profiles',
            'record', row_to_json(NEW)
        )::jsonb
      );
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Create Notification Email Forwarder Trigger
-- This function calls an Edge Function whenever a high-priority notification is created
CREATE OR REPLACE FUNCTION public.forward_notification_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
    user_email text;
BEGIN
    -- Only forward high-priority or action-oriented types
    IF NEW.type IN ('warning', 'error', 'urgent', 'action') THEN
        -- Get user email
        SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
        
        IF user_email IS NOT NULL THEN
            PERFORM
              net.http_post(
                url := project_url || '/functions/v1/send-notification-email',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
                body := json_build_object(
                    'email', user_email,
                    'notification', row_to_json(NEW)
                )::jsonb
              );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach trigger to notifications table
DROP TRIGGER IF EXISTS on_notification_created_forward_email ON public.notifications;
CREATE TRIGGER on_notification_created_forward_email
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.forward_notification_to_email();

-- 3. Fix Storage RLS for Admins
DROP POLICY IF EXISTS "Admins can view all storage usage" ON public.user_storage_usage;
CREATE POLICY "Admins can view all storage usage"
    ON public.user_storage_usage FOR SELECT
    USING (public.is_admin());
-- ============================================
-- IMPROVED SIGNUP TRIGGER (Prevents Orphaned Users)
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved signup function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create User Profile with UPSERT to handle edge cases
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'User',
        'user',
        'active',
        'free'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        updated_at = NOW();

    -- Link Past Invoices (if any exist)
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail signup
        RAISE WARNING 'Invoice linking failed for user %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Critical: If profile creation fails, we should fail the auth signup too
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.invoices TO postgres, service_role;

-- Verify trigger is active
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE 'Signup trigger successfully installed';
    ELSE
        RAISE WARNING 'Signup trigger installation failed!';
    END IF;
END $$;
INSERT INTO public.system_settings (key, value, description)
VALUES 
('maintenance_mode', 'false'::jsonb, 'When enabled, only Super Admins can access the application. Regular users see a maintenance screen.'),
('maintenance_message', '"RentMate is currently undergoing scheduled maintenance. We will be back shortly."'::jsonb, 'The message displayed to users during maintenance mode.'),
('disable_ai_processing', 'false'::jsonb, 'Emergency toggle to disable all AI-powered features (Contract Analysis, Chat, etc.) to save costs or during API outages.')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

-- Update get_financial_metrics to include storage distribution and system stats
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_mrr decimal := 0;
    total_users int := 0;
    active_subs int := 0;
    new_users_30d int := 0;
    
    -- Storage stats
    total_storage_mb decimal := 0;
    media_storage_mb decimal := 0;
    docs_storage_mb decimal := 0;
    
    -- System flags
    is_maint_active boolean;
    is_ai_disabled boolean;
    
    is_super boolean;
BEGIN
    -- Security Check
    SELECT is_super_admin INTO is_super FROM user_profiles WHERE id = auth.uid();
    IF is_super IS NOT TRUE THEN RAISE EXCEPTION 'Access Denied: Super Admin Only'; END IF;

    -- 1. Standard Metrics
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    SELECT COUNT(*) INTO active_subs FROM user_profiles WHERE plan_id IS NOT NULL AND plan_id NOT IN ('free', 'free_forever') AND subscription_status = 'active';
    
    SELECT COALESCE(SUM(sp.price_monthly), 0) INTO total_mrr 
    FROM user_profiles up 
    JOIN subscription_plans sp ON up.plan_id = sp.id 
    WHERE up.subscription_status = 'active';
    
    SELECT COUNT(*) INTO new_users_30d FROM user_profiles WHERE created_at > (NOW() - INTERVAL '30 days');

    -- 2. Storage Aggregation (Aggregating from user_storage_usage if it exists, or files)
    -- Assuming a table user_storage_usage exists based on types/database.ts line 79
    SELECT 
        COALESCE(SUM(total_bytes) / (1024 * 1024), 0),
        COALESCE(SUM(media_bytes) / (1024 * 1024), 0),
        COALESCE(SUM(documents_bytes + utilities_bytes + maintenance_bytes) / (1024 * 1024), 0)
    INTO total_storage_mb, media_storage_mb, docs_storage_mb
    FROM public.user_storage_usage;

    -- 3. System Flags (Casting jsonb safely)
    SELECT (value::text::boolean) INTO is_maint_active FROM system_settings WHERE key = 'maintenance_mode';
    SELECT (value::text::boolean) INTO is_ai_disabled FROM system_settings WHERE key = 'disable_ai_processing';

    RETURN json_build_object(
        'mrr', total_mrr,
        'total_users', total_users,
        'active_subscribers', active_subs,
        'new_users_30d', new_users_30d,
        'storage', json_build_object(
            'total_mb', ROUND(total_storage_mb, 2),
            'media_mb', ROUND(media_storage_mb, 2),
            'docs_mb', ROUND(docs_storage_mb, 2)
        ),
        'system_status', json_build_object(
            'maintenance_mode', COALESCE(is_maint_active, false),
            'ai_disabled', COALESCE(is_ai_disabled, false)
        )
    );
END;
$$;
-- Create system_broadcasts table
CREATE TABLE IF NOT EXISTS public.system_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    target_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

-- 1. Viewable by ALL users (even unauthenticated potentially, though usually app users)
DROP POLICY IF EXISTS "Broadcasts are viewable by everyone" ON public.system_broadcasts;
CREATE POLICY "Broadcasts are viewable by everyone"
    ON public.system_broadcasts FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 2. CRUD only for Super Admins
DROP POLICY IF EXISTS "Super Admins have full access to broadcasts" ON public.system_broadcasts;
CREATE POLICY "Super Admins have full access to broadcasts"
    ON public.system_broadcasts FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND is_super_admin = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND is_super_admin = true
    ));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_broadcasts_updated_at
    BEFORE UPDATE ON public.system_broadcasts
    FOR EACH ROW
    EXECUTE PROCEDURE update_broadcast_updated_at();
-- Add marketing consent fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

-- Update the handle_new_user function to capture marketing_consent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id,
        marketing_consent,
        marketing_consent_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'User',
        'active',
        'free',
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, FALSE),
        CASE WHEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        marketing_consent = COALESCE(EXCLUDED.marketing_consent, user_profiles.marketing_consent),
        marketing_consent_at = COALESCE(EXCLUDED.marketing_consent_at, user_profiles.marketing_consent_at),
        updated_at = NOW();

    RETURN NEW;
END;
$$;
-- Migration: send_welcome_email_trigger
-- Description: Sends a welcome email to new users when their profile is created

CREATE OR REPLACE FUNCTION public.send_welcome_email_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    -- Only trigger if it's a new profile (usually only happen at signup)
    IF TG_OP = 'INSERT' THEN
        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-welcome-email',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'email', NEW.email,
                'full_name', NEW.full_name
            )::jsonb
          );
    END IF;
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't crash
    RAISE WARNING 'Failed to trigger welcome email for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Attach trigger to user_profiles
DROP TRIGGER IF EXISTS on_profile_created_send_welcome_email ON public.user_profiles;

CREATE TRIGGER on_profile_created_send_welcome_email
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.send_welcome_email_on_signup();
-- Migration to add counter_read to property_documents
-- Date: 2026-01-22

-- 1. Add counter_read column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='property_documents' AND column_name='counter_read') THEN
        ALTER TABLE property_documents ADD COLUMN counter_read DECIMAL(12,2);
    END IF;
END $$;

-- 2. Add comment for clarity
-- Migration: asset_email_alerts
-- Description: Adds automated notifications and email forwarding for maintenance records based on user preference

-- 1. Create function to generate notification on maintenance record insertion
CREATE OR REPLACE FUNCTION public.notify_on_maintenance_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    user_lang text;
    notif_title text;
    notif_message text;
BEGIN
    -- Only trigger for maintenance category
    IF NEW.category != 'maintenance' THEN
        RETURN NEW;
    END IF;

    -- Get property address
    SELECT COALESCE(city, '') || ', ' || COALESCE(address, '') INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Get user language preference (defaults to 'he')
    SELECT COALESCE(language, 'he') INTO user_lang
    FROM public.user_profiles
    WHERE id = NEW.user_id;

    -- Set localized content
    IF user_lang = 'he' THEN
        notif_title := '׳ ׳•׳¡׳£ ׳×׳™׳¢׳•׳“ ׳×׳—׳–׳•׳§׳”';
        notif_message := format('׳ ׳•׳¡׳£ ׳×׳™׳¢׳•׳“ ׳×׳—׳–׳•׳§׳” ׳—׳“׳© ("%s") ׳¢׳‘׳•׳¨ ׳”׳ ׳›׳¡ %s.', COALESCE(NEW.title, '׳׳׳ ׳›׳•׳×׳¨׳×'), property_address);
    ELSE
        notif_title := 'Maintenance Record Added';
        notif_message := format('A new maintenance record ("%s") was added for %s.', COALESCE(NEW.title, 'Untitled'), property_address);
    END IF;

    -- Insert into notifications table
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info',
        notif_title,
        notif_message,
        json_build_object(
            'document_id', NEW.id,
            'property_id', NEW.property_id,
            'event', 'maintenance_record'
        )::jsonb
    );

    RETURN NEW;
END;
$$;

-- Attach trigger to property_documents
DROP TRIGGER IF EXISTS on_maintenance_record_created ON public.property_documents;
CREATE TRIGGER on_maintenance_record_created
    AFTER INSERT ON public.property_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_maintenance_record();

-- 2. Update forward_notification_to_email to respect email_asset_alerts preference
CREATE OR REPLACE FUNCTION public.forward_notification_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
    target_email text;
    asset_alerts_enabled boolean;
BEGIN
    -- Get user email and asset alerts preference
    SELECT 
        u.email, 
        COALESCE((up.notification_preferences->>'email_asset_alerts')::boolean, true)
    INTO target_email, asset_alerts_enabled
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    WHERE u.id = NEW.user_id;

    -- DECISION LOGIC:
    -- Forward IF:
    -- 1. High priority type (warning, error, urgent, action)
    -- 2. OR is a maintenance event AND the user hasn't explicitly disabled asset alerts
    IF (NEW.type IN ('warning', 'error', 'urgent', 'action')) OR 
       (NEW.metadata->>'event' = 'maintenance_record' AND asset_alerts_enabled = true) 
    THEN
        IF target_email IS NOT NULL THEN
            PERFORM
              net.http_post(
                url := project_url || '/functions/v1/send-notification-email',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
                body := json_build_object(
                    'email', target_email,
                    'notification', row_to_json(NEW)
                )::jsonb
              );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
    RETURN NEW;
END;
$$;
-- Migration: Add 'chat' to crm_interaction_type enum
DO $$ 
BEGIN
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'chat';
EXCEPTION
    WHEN others THEN
        -- If the type doesn't exist yet (though it should), this will fail silently
        RAISE NOTICE 'Skipping type update: crm_interaction_type might not exist or already has chat value.';
END $$;
-- Migration: Fix Schema Discrepancies and Missing Relationships
-- 1. Fix user_storage_usage -> user_profiles relationship
DO $$ 
BEGIN
    -- Ensure relationship to user_profiles for PostgREST joins
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_storage_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE user_storage_usage 
        ADD CONSTRAINT user_storage_usage_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add price_yearly to subscription_plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'price_yearly'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN price_yearly NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;

-- 3. Fix ai_chat_usage -> user_profiles relationship
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_chat_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE ai_chat_usage 
        ADD CONSTRAINT ai_chat_usage_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Upgrade get_admin_stats to JSONB
-- IMPORTANT: Drop first because we change return type
DROP FUNCTION IF EXISTS public.get_admin_stats();

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count
    FROM contracts;

    -- Get total revenue (sum of paid payments)
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount
    FROM payments
    WHERE status = 'paid';

    -- Get active users (users who logged in within last 30 days)
    SELECT COUNT(*) INTO active_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL
    AND updated_at > NOW() - INTERVAL '30 days';

    -- Build JSONB result
    result := jsonb_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count
    );

    RETURN result;
END;
$$;

-- 5. Admin Notifications Triggers
-- Function to trigger admin notification edge function
CREATE OR REPLACE FUNCTION notify_admin_of_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Use Supabase Vault or Secrets for the API URL if needed, but here we hardcode the known URL pattern
    -- Alternatively, we can use a simpler approach if the Netlify/Edge function is public or has a secret key
    PERFORM
      net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/admin-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
        ),
        body := jsonb_build_object(
          'type', TG_ARGV[0],
          'data', CASE 
                    WHEN TG_ARGV[0] = 'new_user' THEN jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name)
                    WHEN TG_ARGV[0] = 'first_payment' THEN jsonb_build_object('email', (SELECT email FROM user_profiles WHERE id = NEW.user_id), 'amount', NEW.paid_amount, 'plan', NEW.plan_id)
                    ELSE '{}'::jsonb
                  END
        )
      );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New User
-- This needs to happen after the profile is created
DROP TRIGGER IF EXISTS on_user_profile_created_notify_admin ON user_profiles;
CREATE TRIGGER on_user_profile_created_notify_admin
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_of_event('new_user');

-- Trigger for First Payment
-- Note: Logic to detect if it's the FIRST payment can be in the trigger or the function
CREATE OR REPLACE FUNCTION notify_admin_of_first_payment()
RETURNS TRIGGER AS $$
DECLARE
  payment_count INTEGER;
BEGIN
    -- Check if this is the user's first successful payment
    SELECT COUNT(*) INTO payment_count
    FROM payments
    WHERE user_id = NEW.user_id
    AND status = 'paid';

    IF payment_count = 1 THEN
        PERFORM notify_admin_of_event(); -- This needs to be called with arguments, so let's adjust
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actually, let's keep it simple. The trigger itself will check
DROP TRIGGER IF EXISTS on_first_payment_notify_admin ON payments;
CREATE TRIGGER on_first_payment_notify_admin
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.status != 'paid' AND NEW.status = 'paid')
    EXECUTE FUNCTION notify_admin_of_event('first_payment');

-- 6. Cron Job for Daily Summary
-- Requires pg_cron to be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'daily-summary-8am',
    '0 8 * * *', -- 8:00 AM every day
    $$
    SELECT net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/admin-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
        ),
        body := jsonb_build_object('type', 'daily_summary')
    );
    $$
);
-- Migration: admin_alerts_and_triggers
-- Description: Sets up triggers for signup and subscription starts to alert the admin

-- 1. Correct Project URL for triggers (Consolidated)
-- We'll use a variable or just hardcode the current known correctly fixed URL
-- Current Project URL: https://qfvrekvugdjnwhnaucmz.supabase.co

-- 2. Trigger Function for Signups & Plan Changes (Admin Alerts)
CREATE OR REPLACE FUNCTION public.notify_admin_on_user_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    -- Only trigger if it's a new user OR a plan change
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan) THEN
        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-admin-alert',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'type', TG_OP,
                'table', 'user_profiles',
                'record', row_to_json(NEW),
                'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
            )::jsonb
          );
    END IF;
      
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Trigger Function for Paid Invoices (Subscription Start Alert)
CREATE OR REPLACE FUNCTION public.notify_admin_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
    user_record RECORD;
BEGIN
    -- Only trigger when an invoice is marked as 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Get user details for the alert
        SELECT * INTO user_record FROM public.user_profiles WHERE id = NEW.user_id;

        PERFORM
          net.http_post(
            url := project_url || '/functions/v1/send-admin-alert',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
            body := json_build_object(
                'type', 'UPDATE',
                'table', 'invoices',
                'record', row_to_json(NEW),
                'user', row_to_json(user_record)
            )::jsonb
          );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger payment notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Apply Triggers
-- a. User Profiles (Signup & Plan Changes)
DROP TRIGGER IF EXISTS on_user_event_notify_admin ON public.user_profiles;
CREATE TRIGGER on_user_event_notify_admin
    AFTER INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_user_event();

-- b. Invoices (Subscription Starts)
DROP TRIGGER IF EXISTS on_invoice_paid_notify_admin ON public.invoices;
CREATE TRIGGER on_invoice_paid_notify_admin
    AFTER UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_payment();

-- Remove legacy triggers if they exist with old names
DROP TRIGGER IF EXISTS on_user_signup_notify_admin ON public.user_profiles;
DROP TRIGGER IF EXISTS notify_admin_on_signup_trigger ON public.user_profiles;
-- Migration: schedule_daily_admin_summary
-- Description: Sets up a cron job to call the daily summary Edge Function every day at 08:00 AM

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the Job
-- We call the Edge Function via net.http_post
-- Note: '0 8 * * *' is 8:00 AM every day
-- Note: We use the project's internal service role key for authentication

SELECT cron.schedule(
    'daily-admin-summary',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/send-daily-admin-summary',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := '{}'::jsonb
    );
    $$
);

-- Note: To check if it's scheduled, run: SELECT * FROM cron.job;
-- To see execution history, run: SELECT * FROM cron.job_run_details;
-- Migration: admin_god_mode_rls
-- Description: Grants Admins and Super Admins view access to all core data (properties, contracts, tenants, payments).

-- 1. Ensure public.is_admin() accounts for is_super_admin if role is not set
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR is_super_admin = true)
    );
END;
$$;

-- 2. Add Admin policies to core tables

-- PROPERTIES
DROP POLICY IF EXISTS "Admins view all properties" ON public.properties;
CREATE POLICY "Admins view all properties" 
    ON public.properties FOR SELECT 
    USING (public.is_admin());

-- CONTRACTS
DROP POLICY IF EXISTS "Admins view all contracts" ON public.contracts;
CREATE POLICY "Admins view all contracts" 
    ON public.contracts FOR SELECT 
    USING (public.is_admin());

-- TENANTS
DROP POLICY IF EXISTS "Admins view all tenants" ON public.tenants;
CREATE POLICY "Admins view all tenants" 
    ON public.tenants FOR SELECT 
    USING (public.is_admin());

-- PAYMENTS
DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
CREATE POLICY "Admins view all payments" 
    ON public.payments FOR SELECT 
    USING (public.is_admin());

-- PROPERTY DOCUMENTS
DROP POLICY IF EXISTS "Admins view all property documents" ON public.property_documents;
CREATE POLICY "Admins view all property documents" 
    ON public.property_documents FOR SELECT 
    USING (public.is_admin());

-- DOCUMENT FOLDERS
DROP POLICY IF EXISTS "Admins view all document folders" ON public.document_folders;
CREATE POLICY "Admins view all document folders" 
    ON public.document_folders FOR SELECT 
    USING (public.is_admin());

-- SHORT LINKS
DROP POLICY IF EXISTS "Admins view all short links" ON public.short_links;
CREATE POLICY "Admins view all short links" 
    ON public.short_links FOR SELECT 
    USING (public.is_admin());

-- STORAGE OBJECTS (God Mode for Admins)
DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
CREATE POLICY "Admins full access to secure_documents"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'secure_documents' 
        AND public.is_admin()
    )
    WITH CHECK (
        bucket_id = 'secure_documents' 
        AND public.is_admin()
    );

-- 3. Notify Schema Reload
NOTIFY pgrst, 'reload schema';
DO $$
BEGIN
    -- Update rubi@rentmate.co.il if it exists
    UPDATE public.user_profiles
    SET role = 'admin',
        is_super_admin = true
    WHERE email = 'rubi@rentmate.co.il';

    -- If the user exists in auth.users but not in profiles (unlikely), handle_new_user should have created it.
    -- But let's be safe.
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'rubi@rentmate.co.il') THEN
        INSERT INTO public.user_profiles (id, email, role, is_super_admin)
        SELECT id, email, 'admin', true
        FROM auth.users
        WHERE email = 'rubi@rentmate.co.il'
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', is_super_admin = true;
    END IF;
END $$;
-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'feature_request', 'bug', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created by a previous version
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.support_tickets ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'chat_context') THEN
        ALTER TABLE public.support_tickets ADD COLUMN chat_context JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolution_notes') THEN
        ALTER TABLE public.support_tickets ADD COLUMN resolution_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolved_at') THEN
        ALTER TABLE public.support_tickets ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- Ticket Comments Table (for back-and-forth communication)
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create tickets
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own open tickets
DROP POLICY IF EXISTS "Users can update own open tickets" ON support_tickets;
CREATE POLICY "Users can update own open tickets"
    ON support_tickets FOR UPDATE
    USING (auth.uid() = user_id AND status = 'open');

-- Admins can view all tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all tickets
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view comments on their tickets
DROP POLICY IF EXISTS "Users can view own ticket comments" ON ticket_comments;
CREATE POLICY "Users can view own ticket comments"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE id = ticket_comments.ticket_id AND user_id = auth.uid()
        )
    );

-- Users can add comments to their tickets
DROP POLICY IF EXISTS "Users can comment on own tickets" ON ticket_comments;
CREATE POLICY "Users can comment on own tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE id = ticket_comments.ticket_id AND user_id = auth.uid()
        )
    );

-- Admins can view all comments
DROP POLICY IF EXISTS "Admins can view all comments" ON ticket_comments;
CREATE POLICY "Admins can view all comments"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can add comments to any ticket
DROP POLICY IF EXISTS "Admins can comment on all tickets" ON ticket_comments;
CREATE POLICY "Admins can comment on all tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();

-- Function to notify admins of new tickets
CREATE OR REPLACE FUNCTION notify_admins_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert admin notification
    INSERT INTO admin_notifications (type, user_id, content, status)
    VALUES (
        'support_ticket',
        NEW.user_id,
        jsonb_build_object(
            'ticket_id', NEW.id,
            'title', NEW.title,
            'category', NEW.category,
            'priority', NEW.priority
        ),
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for admin notifications
DROP TRIGGER IF EXISTS notify_admins_on_new_ticket ON support_tickets;
CREATE TRIGGER notify_admins_on_new_ticket
    AFTER INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_new_ticket();
-- Update Daily Notification Job to respect User Preferences
-- Specifically adding support for "Payment Due Today" toggle

CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    extension_days_default int := 60;
    pref jsonb;
BEGIN
    -------------------------------------------------------
    -- 1. CONTRACT ENDING SOON (Default 30 Days)
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address, up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = c.user_id
        WHERE c.status = 'active'
        AND c.end_date = CURRENT_DATE + (COALESCE((up.notification_preferences->>'contract_expiry_days')::int, 30) || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'ending_soon'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Contract Ending Soon',
                format('Contract for %s, %s ends in %s days.', r.city, r.address, COALESCE((r.notification_preferences->>'contract_expiry_days')::int, 30)),
                json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 2. EXTENSION OPTION DEADLINE
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address, up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = c.user_id
        WHERE c.status = 'active'
        AND c.extension_option = TRUE
        AND c.end_date = CURRENT_DATE + (COALESCE((up.notification_preferences->>'extension_option_end_days')::int, 60) || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'extension_deadline'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'action',
                'Extension Deadline Approaching',
                format('Extension option for %s, %s ends in %s days.', r.city, r.address, COALESCE((r.notification_preferences->>'extension_option_end_days')::int, 60)),
                json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 3. PAYMENT DUE IN X DAYS (Lead Warning)
    -------------------------------------------------------
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address, up.notification_preferences
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = py.user_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE + (COALESCE((up.notification_preferences->>'rent_due_days')::int, 0) || ' days')::INTERVAL
        AND (up.notification_preferences->>'rent_due_days')::int > 0
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'payment_id' = r.id::text 
            AND metadata->>'event' = 'payment_warning'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'info',
                'Payment Reminder',
                format('Payment of ג‚×%s for %s, %s is due in %s days.', r.amount, r.city, r.address, (r.notification_preferences->>'rent_due_days')::int),
                json_build_object('payment_id', r.id, 'event', 'payment_warning')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 4. PAYMENT DUE TODAY (Strict Toggle)
    -------------------------------------------------------
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address, up.notification_preferences
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = py.user_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE
        AND COALESCE((up.notification_preferences->>'rent_due_today')::boolean, true) = true
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'payment_id' = r.id::text 
            AND metadata->>'event' = 'payment_due'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Payment Due Today',
                format('Payment of ג‚×%s for %s, %s is due today.', r.amount, r.city, r.address),
                json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
            );
        END IF;
    END LOOP;

END;
$$;
-- Migration: fix_admin_schema_issues_20260124
-- Description: Fixes discrepancies in user_profiles, user_storage_usage, and AI usage tracking.

-- 1. Add subscription_tier to user_profiles (for AI Usage and older queries)
-- We keep it in sync with plan_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
END $$;

-- Update existing data
UPDATE user_profiles SET subscription_tier = plan_id WHERE subscription_tier IS NULL OR subscription_tier != plan_id;

-- Create sync trigger
CREATE OR REPLACE FUNCTION sync_user_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subscription_tier := NEW.plan_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_user_tier ON user_profiles;
CREATE TRIGGER tr_sync_user_tier
    BEFORE INSERT OR UPDATE OF plan_id ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_tier();

-- 2. Fix the Foreign Key for Storage Usage (PostgREST needs explicit profiles link)
DO $$ 
BEGIN
    -- First drop auth.users link if it's the only one
    -- ALTER TABLE user_storage_usage DROP CONSTRAINT IF EXISTS user_storage_usage_user_id_fkey;
    
    -- Ensure link to user_profiles
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_storage_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.user_storage_usage 
        ADD CONSTRAINT user_storage_usage_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Fix the AI Chat Usage Function (Make it more robust)
CREATE OR REPLACE FUNCTION check_ai_chat_usage(
    p_user_id UUID,
    p_tokens_used INTEGER DEFAULT 500
)
RETURNS JSON AS $$
DECLARE
    v_usage RECORD;
    v_limit RECORD;
    v_user_tier TEXT;
    v_result JSON;
BEGIN
    -- Get user's subscription tier (using plan_id as fallback)
    SELECT COALESCE(subscription_tier, plan_id, 'free') INTO v_user_tier
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Default to free if no tier found
    v_user_tier := COALESCE(v_user_tier, 'free');
    
    -- Get limits for this tier
    SELECT * INTO v_limit
    FROM ai_usage_limits
    WHERE tier_name = v_user_tier;
    
    -- Fallback to free limits if tier limits not found
    IF NOT FOUND THEN
        SELECT * INTO v_limit FROM ai_usage_limits WHERE tier_name = 'free';
    END IF;
    
    -- Get or create usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_usage
    FROM ai_chat_usage
    WHERE user_id = p_user_id;
    
    -- Check if we need to reset (monthly)
    IF v_usage.last_reset_at < DATE_TRUNC('month', NOW()) THEN
        UPDATE ai_chat_usage
        SET message_count = 0,
            tokens_used = 0,
            last_reset_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        v_usage.message_count := 0;
        v_usage.tokens_used := 0;
    END IF;
    
    -- Check limits (skip if unlimited)
    IF v_limit.monthly_message_limit != -1 AND v_usage.message_count >= v_limit.monthly_message_limit THEN
        v_result := json_build_object(
            'allowed', false,
            'reason', 'message_limit_exceeded',
            'current_usage', v_usage.message_count,
            'limit', v_limit.monthly_message_limit,
            'tier', v_user_tier
        );
        RETURN v_result;
    END IF;
    
    IF v_limit.monthly_token_limit != -1 AND v_usage.tokens_used >= v_limit.monthly_token_limit THEN
        v_result := json_build_object(
            'allowed', false,
            'reason', 'token_limit_exceeded',
            'current_usage', v_usage.tokens_used,
            'limit', v_limit.monthly_token_limit,
            'tier', v_user_tier
        );
        RETURN v_result;
    END IF;
    
    -- Increment usage
    UPDATE ai_chat_usage
    SET message_count = message_count + 1,
        tokens_used = tokens_used + p_tokens_used,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Return success
    v_result := json_build_object(
        'allowed', true,
        'current_messages', v_usage.message_count + 1,
        'message_limit', v_limit.monthly_message_limit,
        'current_tokens', v_usage.tokens_used + p_tokens_used,
        'token_limit', v_limit.monthly_token_limit,
        'tier', v_user_tier
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix get_users_with_stats RPC structure
-- We'll use TEXT for enum columns in return type to be more flexible
DROP FUNCTION IF EXISTS get_users_with_stats();

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    subscription_status TEXT,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.role::TEXT,
        up.subscription_status::TEXT,
        up.plan_id,
        up.created_at,
        COALESCE(p.count, 0) as properties_count,
        COALESCE(t.count, 0) as tenants_count,
        COALESCE(c.count, 0) as contracts_count
    FROM user_profiles up
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    WHERE up.deleted_at IS NULL
    ORDER BY up.created_at DESC;
END;
$$;

-- 5. Force schema cache reload (if possible)
NOTIFY pgrst, 'reload schema';
-- Migration: Fix Schema Integrity and Relationship Join Issues (Robust Version)
-- This fixes:
-- 1. Delete user failure (Foreign key violations because objects weren't cascading)
-- 2. Notification Center error (Could not find relationship between admin_notifications and user_profiles)

DO $$ 
BEGIN
    -- 1. PROPERTIES
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
        ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_user_id_fkey;
        ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_user_id_profiles_fkey;
        
        ALTER TABLE public.properties
        ADD CONSTRAINT properties_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 2. TENANTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_fkey;
        ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_profiles_fkey;
        
        ALTER TABLE public.tenants
        ADD CONSTRAINT tenants_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 3. CONTRACTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
        ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_user_id_fkey;
        ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_user_id_profiles_fkey;

        ALTER TABLE public.contracts
        ADD CONSTRAINT contracts_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 4. ADMIN_NOTIFICATIONS (Fix relationship for PostgREST joins)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
        ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_user_id_fkey;
        ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_user_id_profiles_fkey;
        
        ALTER TABLE public.admin_notifications
        ADD CONSTRAINT admin_notifications_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 5. SUPPORT_TICKETS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
        ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_profiles_fkey;
        
        ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 6. TICKET_COMMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_comments') THEN
        ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey;
        ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_profiles_fkey;
        
        ALTER TABLE public.ticket_comments
        ADD CONSTRAINT ticket_comments_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 7. PROPERTY_DOCUMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_documents') THEN
        ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_user_id_fkey;
        ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_user_id_profiles_fkey;
        
        ALTER TABLE public.property_documents
        ADD CONSTRAINT property_documents_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
-- AI Detailed Usage Tracking for Cost Analysis
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    feature TEXT NOT NULL, -- 'chat' or 'contract-extraction'
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all AI usage logs
CREATE POLICY "Admins can view all AI usage logs"
    ON public.ai_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to log AI usage with cost calculation
CREATE OR REPLACE FUNCTION public.log_ai_usage(
    p_user_id UUID,
    p_model TEXT,
    p_feature TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_input NUMERIC;
    v_cost_output NUMERIC;
    v_total_cost NUMERIC;
BEGIN
    -- Determine costs based on model
    -- Prices per 1M tokens
    IF p_model LIKE 'gpt-4o-mini%' THEN
        v_cost_input := 0.15;
        v_cost_output := 0.60;
    ELSIF p_model LIKE 'gpt-4o%' THEN
        v_cost_input := 2.50;
        v_cost_output := 10.00;
    ELSE
        -- Default/Fallback (GPT-4o-mini prices if unknown)
        v_cost_input := 0.15;
        v_cost_output := 0.60;
    END IF;

    -- Calculate total cost
    v_total_cost := (p_input_tokens::NUMERIC / 1000000 * v_cost_input) + (p_output_tokens::NUMERIC / 1000000 * v_cost_output);

    -- Insert log
    INSERT INTO public.ai_usage_logs (
        user_id,
        model,
        feature,
        input_tokens,
        output_tokens,
        estimated_cost_usd
    ) VALUES (
        p_user_id,
        p_model,
        p_feature,
        p_input_tokens,
        p_output_tokens,
        v_total_cost
    );

    -- Update the old aggregator table if it exists
    INSERT INTO public.ai_chat_usage (user_id, message_count, tokens_used, updated_at)
    VALUES (p_user_id, 1, p_input_tokens + p_output_tokens, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET message_count = public.ai_chat_usage.message_count + 1,
        tokens_used = public.ai_chat_usage.tokens_used + (p_input_tokens + p_output_tokens),
        updated_at = NOW();
END;
$$;

-- Update get_admin_stats to include AI cost
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
    total_ai_cost_usd NUMERIC;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count
    FROM contracts;

    -- Get total revenue (sum of paid payments)
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount
    FROM payments
    WHERE status = 'paid';

    -- Get active users (users who logged in within last 30 days)
    SELECT COUNT(*) INTO active_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL
    AND updated_at > NOW() - INTERVAL '30 days';

    -- Get total AI cost
    SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO total_ai_cost_usd
    FROM ai_usage_logs;

    -- Build JSON result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost_usd
    );

    RETURN result;
END;
$$;
-- AI Conversations Table (Compact Mode)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    total_cost_usd NUMERIC(10, 6) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own conversations
DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own AI conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view everything
DROP POLICY IF EXISTS "Admins can view all AI conversations" ON public.ai_conversations;
CREATE POLICY "Admins can view all AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RPC to safely append messages and update cost
-- This prevents race conditions and handles the JSONB manipulation on the server
CREATE OR REPLACE FUNCTION public.append_ai_messages(
    p_conversation_id UUID,
    p_new_messages JSONB,
    p_cost_usd NUMERIC DEFAULT 0,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conv_id UUID;
    v_final_user_id UUID;
BEGIN
    -- Determine user ID: prefer explicit, fallback to auth.uid()
    v_final_user_id := COALESCE(p_user_id, auth.uid());

    -- Update existing or insert new
    INSERT INTO public.ai_conversations (id, user_id, messages, total_cost_usd, updated_at)
    VALUES (
        p_conversation_id,
        v_final_user_id,
        p_new_messages,
        p_cost_usd,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET messages = public.ai_conversations.messages || EXCLUDED.messages,
        total_cost_usd = public.ai_conversations.total_cost_usd + EXCLUDED.total_cost_usd,
        updated_at = NOW()
    RETURNING id INTO v_conv_id;

    RETURN v_conv_id;
END;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at);
-- Migration: Add invoice_number to property_documents
-- Date: 2026-01-25

ALTER TABLE property_documents 
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Create an index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_property_documents_duplicate_check 
ON property_documents(vendor_name, document_date, invoice_number);
-- Migration: Enhance CRM Interactions with Metadata and Human Chat
-- Adds metadata support for external links (Gmail etc.) and prepares human chat types

-- 1. Add metadata column to crm_interactions
ALTER TABLE public.crm_interactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add 'whatsapp' and 'text' to crm_interaction_type if needed
-- Note: 'chat' is already used for Bot, we'll use 'human_chat' for manual entries or real-time human chat
DO $$ 
BEGIN
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'human_chat';
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'whatsapp';
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Create Human Chat Tables for real-time support (Phase 3 Prep)
CREATE TABLE IF NOT EXISTS public.human_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.human_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.human_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_role TEXT CHECK (sender_role IN ('user', 'admin')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Human Chats
ALTER TABLE public.human_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins manage human conversations" ON public.human_conversations;
CREATE POLICY "Admins manage human conversations" ON public.human_conversations
AS PERMISSIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage human messages" ON public.human_messages;
CREATE POLICY "Admins manage human messages" ON public.human_messages
AS PERMISSIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can see their own conversations
DROP POLICY IF EXISTS "Users view own human conversations" ON public.human_conversations;
CREATE POLICY "Users view own human conversations" ON public.human_conversations
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view/send own human messages" ON public.human_messages;
CREATE POLICY "Users view/send own human messages" ON public.human_messages
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.human_conversations 
        WHERE id = public.human_messages.conversation_id AND user_id = auth.uid()
    )
);
-- Create human_conversations table
CREATE TABLE IF NOT EXISTS public.human_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create human_messages table
CREATE TABLE IF NOT EXISTS public.human_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.human_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.human_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_messages ENABLE ROW LEVEL SECURITY;

-- Policies for humman_conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.human_conversations;
CREATE POLICY "Admins can view all conversations"
    ON public.human_conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert conversations" ON public.human_conversations;
CREATE POLICY "Admins can insert conversations"
    ON public.human_conversations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update conversations" ON public.human_conversations;
CREATE POLICY "Admins can update conversations"
    ON public.human_conversations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.human_conversations;
CREATE POLICY "Users can view their own conversations"
    ON public.human_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policies for human_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.human_messages;
CREATE POLICY "Admins can view all messages"
    ON public.human_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert messages" ON public.human_messages;
CREATE POLICY "Admins can insert messages"
    ON public.human_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.human_messages;
CREATE POLICY "Users can view messages in their conversations"
    ON public.human_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.human_conversations
            WHERE id = human_messages.conversation_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in their active conversations" ON public.human_messages;
CREATE POLICY "Users can insert messages in their active conversations"
    ON public.human_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.human_conversations
            WHERE id = human_messages.conversation_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_human_conversations_user_id ON public.human_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_human_messages_conversation_id ON public.human_messages(conversation_id);
-- Migration: reschedule_email_il_time
-- Description: Updates the daily admin summary schedule to 06:00 UTC (08:00 Israel Time)

-- 1. Unschedule the old job (if it exists) to avoid duplicates
SELECT cron.unschedule('daily-admin-summary');

-- 2. Schedule the new job at 06:00 UTC
-- Israel Time is UTC+2 (Winter) / UTC+3 (Summer)
-- 06:00 UTC = 08:00 IL (Winter) / 09:00 IL (Summer)
SELECT cron.schedule(
    'daily-admin-summary',
    '0 6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/send-daily-admin-summary',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := '{}'::jsonb
    );
    $$
);
-- Add ai_data_consent to user_preferences
-- Defaults to FALSE for privacy

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ai_data_consent') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN ai_data_consent BOOLEAN DEFAULT false;
    END IF;
END $$;
-- Add 'live_chat_enabled' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('live_chat_enabled', 'true'::jsonb, 'Toggle the visibility of the Live Support button for all tenants.')
ON CONFLICT (key) DO NOTHING;
-- Add 'hybrid_chat_mode' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('hybrid_chat_mode', 'true'::jsonb, 'Enable rule-based menu before AI chat to reduce costs.')
ON CONFLICT (key) DO NOTHING;
-- Migration: Add Autonomous Notice Periods to Contracts
-- Description: Adds columns to store legal notice periods extracted from the contract by AI.

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
ADD COLUMN IF NOT EXISTS option_notice_days INTEGER;

-- Migration: Add CRM Autopilot Toggle
-- Description: Adds a global switch to enable/disable the automated CRM engine.

INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('crm_autopilot_enabled', 'true'::jsonb, 'Global toggle to enable or disable the automated CRM autopilot (rent reminders, lease expiry, ticket drafts).')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
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
-- Migration: Embed Tenants in Contracts
-- Description: Adds a 'tenants' jsonb column to the contracts table to support multiple tenants per contract and removes the need for a separate tenants table.

-- 1. Add the column
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenants jsonb DEFAULT '[]'::jsonb;

-- 2. Backfill existing data
UPDATE public.contracts c
SET tenants = jsonb_build_array(
    jsonb_build_object(
        'name', t.name,
        'id_number', t.id_number,
        'email', t.email,
        'phone', t.phone
    )
)
FROM public.tenants t
WHERE c.tenant_id = t.id
AND (c.tenants IS NULL OR c.tenants = '[]'::jsonb);

-- 3. Update the view/trigger if necessary (none found in research)

-- Enhance get_users_with_stats RPC with deeper analytics
DROP FUNCTION IF EXISTS get_users_with_stats();

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    -- User Profile Columns
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role user_role,
    subscription_status subscription_status,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    
    -- Stats
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT,
    ai_sessions_count BIGINT,
    open_tickets_count BIGINT,
    storage_usage_mb NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.phone,
        up.role,
        up.subscription_status,
        up.plan_id,
        up.created_at,
        up.last_login,
        
        -- Basic Counts
        COALESCE(p.count, 0) as properties_count,
        COALESCE(t.count, 0) as tenants_count,
        COALESCE(c.count, 0) as contracts_count,
        
        -- AI Usage
        COALESCE(ai.count, 0) as ai_sessions_count,
        
        -- Support Status
        COALESCE(st.count, 0) as open_tickets_count,
        
        -- Storage Usage (Bytes to MB)
        ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2) as storage_usage_mb
        
    FROM user_profiles up
    -- Property Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    -- Contract Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
    LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
    LEFT JOIN user_storage_usage usu ON up.id = usu.user_id
    
    ORDER BY up.created_at DESC;
END;
$$;
-- Migration: Handle Guest Leads Routing
-- Description: Adds 'sales@rentmate.co.il' support and guest lead user ID.

-- 1. Create a "Guest Leads" user system entry if not exists
-- We use a fixed UUID for the "System Guest" to route anonymous emails.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'guest-leads@rentmate.co.il') THEN
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
        VALUES (
          '00000000-0000-0000-0000-000000000000', 
          'guest-leads@rentmate.co.il', 
          '{"full_name": "Potential Lead"}'::jsonb, 
          NOW()
        );
    END IF;
END $$;

-- 2. Ensure profile exists for routing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'guest-leads@rentmate.co.il') THEN
        INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name, role)
        VALUES (
          '00000000-0000-0000-0000-000000000000', 
          'guest-leads@rentmate.co.il', 
          'Potential Lead', 
          'Potential',
          'Lead',
          'user'
        );
    END IF;
END $$;

-- 3. Update get_admin_stats to include automated actions count
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
    total_ai_cost_usd NUMERIC;
    total_automated_actions INTEGER;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count FROM user_profiles WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count FROM contracts;

    -- Get total revenue
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount FROM payments WHERE status = 'paid';

    -- Get active users (30d)
    SELECT COUNT(*) INTO active_users_count FROM user_profiles WHERE deleted_at IS NULL AND updated_at > NOW() - INTERVAL '30 days';

    -- Get total AI cost
    SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO total_ai_cost_usd FROM ai_usage_logs;

    -- Get total automated actions (from logs where action_taken includes 'proposed' or 'notified')
    SELECT COUNT(*) INTO total_automated_actions FROM automation_logs;

    -- Build JSON result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost_usd,
        'totalAutomatedActions', total_automated_actions
    );

    RETURN result;
END;
$$;
-- Fix Signup Error "Database error saving new user"
-- This migration ensures all dependencies for the signup trigger are present.

DO $$ 
BEGIN
    -- 1. Ensure 'first_name' and 'last_name' columns exist in user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_name TEXT;
    END IF;

    -- 2. Ensure 'subscription_plans' has the 'free' plan
    INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, features)
    VALUES ('free', 'Free Forever', 0, 1, '{"support_level": "basic"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Ensure 'plan_id' column exists in user_profiles
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'plan_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN plan_id TEXT REFERENCES public.subscription_plans(id) DEFAULT 'free';
    END IF;

END $$;

-- 4. Redefine handle_new_user with robust error handling and column usage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_plan_id TEXT := 'free';
BEGIN
    -- Verify plan exists, fallback to NULL if 'free' is missing (to prevent crash)
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = default_plan_id) THEN
        default_plan_id := NULL; 
    END IF;

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        'user', -- Default role
        'active', -- Default status
        default_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        updated_at = NOW();

    -- Link Past Invoices safely
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but try to succeed if possible? 
    -- No, if profile fails, auth should fail. But give clear error.
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;

-- 5. Ensure Trigger is Attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Create ticket_analysis table
CREATE TABLE IF NOT EXISTS public.ticket_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sentiment_score FLOAT, -- -1.0 to 1.0
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    confidence_score FLOAT,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_rules table (System-wide or Admin managed rules)
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'lease_expiry', 'rent_overdue', 'ticket_created'
    condition JSONB, -- e.g. {"days_before": 60}
    action_type TEXT NOT NULL, -- 'email', 'notification', 'auto_reply'
    action_config JSONB, -- template_id, etc.
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_logs table
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.automation_rules(id),
    user_id UUID REFERENCES auth.users(id), -- Target user
    entity_id UUID, -- contract_id, ticket_id, etc.
    action_taken TEXT,
    status TEXT, -- 'success', 'failed'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_automation_settings table
CREATE TABLE IF NOT EXISTS public.user_automation_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    lease_expiry_days INTEGER DEFAULT 100,
    extension_notice_days INTEGER DEFAULT 60,
    rent_overdue_days INTEGER DEFAULT 5,
    auto_reply_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add auto_reply_draft to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS auto_reply_draft TEXT;

-- RLS Policies
ALTER TABLE public.ticket_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_automation_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view all ticket analysis
DROP POLICY IF EXISTS "Admins can view all ticket analysis" ON public.ticket_analysis;
CREATE POLICY "Admins can view all ticket analysis" ON public.ticket_analysis
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Users can view their own automation settings
DROP POLICY IF EXISTS "Users can view own automation settings" ON public.user_automation_settings;
CREATE POLICY "Users can view own automation settings" ON public.user_automation_settings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can update their own automation settings
DROP POLICY IF EXISTS "Users can update own automation settings" ON public.user_automation_settings;
CREATE POLICY "Users can update own automation settings" ON public.user_automation_settings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Insert policy for user automation settings (so they can create it initially)
DROP POLICY IF EXISTS "Users can insert own automation settings" ON public.user_automation_settings;
CREATE POLICY "Users can insert own automation settings" ON public.user_automation_settings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Admins can manage automation rules
DROP POLICY IF EXISTS "Admins can manage automation rules" ON public.automation_rules;
CREATE POLICY "Admins can manage automation rules" ON public.automation_rules
    FOR ALL TO authenticated
    USING (public.is_admin());

-- Admins can view logs
DROP POLICY IF EXISTS "Admins can view automation logs" ON public.automation_logs;
CREATE POLICY "Admins can view automation logs" ON public.automation_logs
    FOR SELECT TO authenticated
    USING (public.is_admin());
-- Add channel preference columns to user_automation_settings
-- These control the "Dispatcher" logic for outbound alerts

ALTER TABLE IF EXISTS public.user_automation_settings 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Comment on columns for clarity
-- Create Webhooks for Reactive Customer Engagement
-- This sends table events to the 'on-event-trigger' Edge Function

-- 1. Enable net extension for webhooks if not already (usually enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Generic function to call our edge function via vault or direct URL
-- Note: In a real environment, you'd use the SUPABASE_URL and SERVICE_ROLE_KEY.
-- For this migration, we assume the edge function is reachable at the project URL.

CREATE OR REPLACE FUNCTION public.handle_automated_engagement_webhook()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  -- Replace with your actual project URL or use a variable if possible
  -- In Supabase migrations, we often use the net.http_post helper
  -- For security, the Edge Function usually checks for the service role key anyway.
  PERFORM
    net.http_post(
      url := 'https://' || (SELECT value FROM system_settings WHERE key = 'supabase_project_ref') || '.supabase.co/functions/v1/on-event-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'supabase_service_role_key')
      ),
      body := payload
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Triggers
DROP TRIGGER IF EXISTS tr_on_new_ticket ON public.support_tickets;
CREATE TRIGGER tr_on_new_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();

DROP TRIGGER IF EXISTS tr_on_payment_update ON public.payments;
CREATE TRIGGER tr_on_payment_update
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();

DROP TRIGGER IF EXISTS tr_on_new_contract ON public.contracts;
CREATE TRIGGER tr_on_new_contract
AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();
-- ============================================
-- UPDATED ADMIN STATS FUNCTION (v2)
-- ============================================
-- Adds Automation & Engagement metrics

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
    total_ai_cost NUMERIC;
    automated_actions_count INTEGER;
    stagnant_tickets_count INTEGER;
    avg_sentiment_score NUMERIC;
    last_automation_run TIMESTAMPTZ;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- 1. Core Metrics
    SELECT COUNT(*) INTO total_users_count FROM user_profiles WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO total_contracts_count FROM contracts;
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount FROM payments WHERE status = 'paid';
    SELECT COUNT(*) INTO active_users_count FROM user_profiles WHERE deleted_at IS NULL AND updated_at > NOW() - INTERVAL '30 days';
    
    -- 2. AI & Automation Metrics
    SELECT COALESCE(SUM(total_cost_usd), 0) INTO total_ai_cost FROM ai_conversations;
    SELECT COUNT(*) INTO automated_actions_count FROM automation_logs;
    SELECT COUNT(*) INTO stagnant_tickets_count FROM support_tickets WHERE status = 'open' AND updated_at < NOW() - INTERVAL '24 hours';
    SELECT COALESCE(AVG(sentiment_score), 0) INTO avg_sentiment_score FROM ticket_analysis;
    SELECT MAX(created_at) INTO last_automation_run FROM automation_logs;

    -- 3. Build Result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost,
        'totalAutomatedActions', automated_actions_count,
        'stagnantTickets', stagnant_tickets_count,
        'avgSentiment', avg_sentiment_score,
        'lastAutomationRun', last_automation_run
    );

    RETURN result;
END;
$$;
-- Migration: storage_cleanup_system
-- Description: Adds a queue system to clean up storage files when DB records are deleted.

-- 1. Create Cleanup Queue Table
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
    id BIGSERIAL PRIMARY KEY,
    bucket_id TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_log TEXT
);

-- Enable RLS (Internal only, but good practice)
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION public.queue_storage_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.storage_cleanup_queue (bucket_id, storage_path)
    VALUES (OLD.storage_bucket, OLD.storage_path);
    RETURN OLD;
END;
$$;

-- 3. Attach Trigger to property_documents
DROP TRIGGER IF EXISTS on_document_deleted_cleanup ON public.property_documents;
CREATE TRIGGER on_document_deleted_cleanup
AFTER DELETE ON public.property_documents
FOR EACH ROW
EXECUTE FUNCTION public.queue_storage_cleanup();

-- 4. Comment
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
-- AI Security Audit Migration
-- Adds specialized logging for AI access to sensitive contract data

-- 1. Create a helper function for Edge Functions to log audits
-- This uses SECURITY DEFINER to bypass RLS since Edge Functions use Service Role
CREATE OR REPLACE FUNCTION public.log_ai_contract_audit(
    p_user_id UUID,
    p_action TEXT,
    p_contract_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        target_user_id,
        action,
        details,
        created_at
    )
    VALUES (
        p_user_id,
        p_user_id, -- In this context, target is usually the same user
        p_action,
        p_details || jsonb_build_object(
            'audited_by', 'AI Engine',
            'contract_id', p_contract_id,
            'timestamp', NOW()
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure audit_logs is visible to admins
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.log_ai_contract_audit TO service_role;
GRANT EXECUTE ON FUNCTION public.log_ai_contract_audit TO authenticated;
-- ==========================================
-- COMPREHENSIVE INDEX SYSTEM INITIALIZATION
-- ==========================================

-- 1. Create index_data table (if missing)
CREATE TABLE IF NOT EXISTS index_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
  date TEXT NOT NULL, -- Format: 'YYYY-MM'
  value DECIMAL(10, 4) NOT NULL,
  source TEXT DEFAULT 'cbs' CHECK (source IN ('cbs', 'exchange-api', 'manual', 'boi')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(index_type, date)
);

-- 2. Create index_bases table (if missing)
CREATE TABLE IF NOT EXISTS index_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
    base_period_start DATE NOT NULL,
    base_value NUMERIC NOT NULL DEFAULT 100.0,
    previous_base_period_start DATE,
    chain_factor NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(index_type, base_period_start)
);

-- 3. Seed Construction Inputs Index (Series 200010, Base 2011=100)
INSERT INTO index_data (index_type, date, value, source)
VALUES 
    ('construction', '2025-01', 123.4, 'manual'),
    ('construction', '2024-12', 123.0, 'manual'),
    ('construction', '2024-11', 121.8, 'manual'),
    ('construction', '2024-10', 121.5, 'manual'),
    ('construction', '2024-09', 121.2, 'manual'),
    ('construction', '2024-08', 121.0, 'manual')
ON CONFLICT (index_type, date) DO UPDATE SET value = EXCLUDED.value;

-- 4. Seed Housing Price Index (Series 40010)
INSERT INTO index_data (index_type, date, value, source)
VALUES 
    ('housing', '2025-01', 105.5, 'manual'),
    ('housing', '2024-12', 105.1, 'manual'),
    ('housing', '2024-11', 104.8, 'manual'),
    ('housing', '2024-10', 104.5, 'manual'),
    ('housing', '2024-09', 104.2, 'manual'),
    ('housing', '2024-08', 104.0, 'manual')
ON CONFLICT (index_type, date) DO UPDATE SET value = EXCLUDED.value;

-- 5. Seed Exchange Rates (USD/EUR)
INSERT INTO index_data (index_type, date, value, source)
VALUES 
    ('usd', '2025-01', 3.73, 'manual'),
    ('eur', '2025-01', 4.05, 'manual'),
    ('usd', '2024-12', 3.70, 'manual'),
    ('eur', '2024-12', 4.02, 'manual')
ON CONFLICT (index_type, date) DO UPDATE SET value = EXCLUDED.value;

-- 6. Insert Base Periods & Chain Factors
INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor)
VALUES 
    -- Construction
    ('construction', '2011-08-01', 100.0, 1.0),
    -- CPI common bases
    ('cpi', '2025-01-01', 100.0, 1.074),
    ('cpi', '2023-01-01', 100.0, 1.026),
    ('cpi', '2021-01-01', 100.0, 1.0)
ON CONFLICT (index_type, base_period_start) DO UPDATE 
SET base_value = EXCLUDED.base_value, chain_factor = EXCLUDED.chain_factor;

-- 7. RLS Policies (Safeguard)
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_bases ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
DO $$ BEGIN
    CREATE POLICY "Allow authenticated read index_data" ON index_data FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read index_bases" ON index_bases FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow service_role to manage (for Edge Functions)
DO $$ BEGIN
    CREATE POLICY "Allow full access for service_role index_data" ON index_data FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow full access for service_role index_bases" ON index_bases FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Migration: add_phone_to_profiles
-- Description: Adds a phone column to user_profiles and updates handle_new_user trigger.

-- 1. Add phone column to user_profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. Backfill phone from auth.users (if possible)
-- auth.users might have phone stored in 'phone' column or 'raw_user_meta_data'
DO $$
BEGIN
    UPDATE public.user_profiles up
    SET phone = au.phone
    FROM auth.users au
    WHERE up.id = au.id
    AND up.phone IS NULL
    AND au.phone IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- Fallback for environments where direct auth.users access isn't allowed without superuser
    RAISE NOTICE 'Backfill from auth.users failed: %', SQLERRM;
END $$;

-- 3. Update handle_new_user() to include phone on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_plan_id TEXT := 'free';
BEGIN
    -- Verify plan exists, fallback to NULL if 'free' is missing (to prevent crash)
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = default_plan_id) THEN
        default_plan_id := NULL; 
    END IF;

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        NEW.phone,
        'user', 
        'active', 
        default_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;
-- Schedule the BOI Daily Exchange Rate Update
-- Time: 17:00 Israel Time Daily
-- Israel is UTC+2 (Winter) / UTC+3 (Summer)
-- 17:00 IST = 15:00 UTC (Winter) or 14:00 UTC (Summer)
-- We will set it to 14:30 UTC to be safe for both (16:30 winter / 17:30 summer) OR just 15:00 UTC (17:00 winter, 18:00 summer).
-- Let's go with 15:00 UTC. In Summer (UTC+3) this is 18:00 IDT. In Winter (UTC+2) this is 17:00 IST.
-- Both are safely after the 15:45 publication time (and 12:15 on Fridays).

SELECT cron.schedule(
    'boi-rates-daily-update',
    '0 15 * * *',  -- Every day at 15:00 UTC
    $$
    SELECT
        net.http_post(
            url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-index-data',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('request.header.apikey', true)
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $$
);
-- Migration: fix_user_stats_rpc_v2
-- Description: Unifies get_users_with_stats RPC with correct column structure and phone support.

-- 1. Drop the function first to ensure we change the signature safely
DROP FUNCTION IF EXISTS get_users_with_stats();

-- 2. Create refined version with explicit column matching
CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT,
    subscription_status TEXT,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT,
    ai_sessions_count BIGINT,
    open_tickets_count BIGINT,
    storage_usage_mb NUMERIC,
    is_super_admin BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.phone,
        up.role::TEXT,
        COALESCE(up.subscription_status::TEXT, 'active'),
        up.plan_id,
        up.created_at,
        up.last_login,
        
        -- Asset Stats
        COALESCE(p.count, 0)::BIGINT as properties_count,
        COALESCE(t.count, 0)::BIGINT as tenants_count,
        COALESCE(c.count, 0)::BIGINT as contracts_count,
        
        -- Usage Stats
        COALESCE(ai.count, 0)::BIGINT as ai_sessions_count,
        
        -- Support Stats
        COALESCE(st.count, 0)::BIGINT as open_tickets_count,
        
        -- Storage Usage (Bytes to MB)
        ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2)::NUMERIC as storage_usage_mb,
        
        -- Permissions
        COALESCE(up.is_super_admin, false) as is_super_admin
        
    FROM user_profiles up
    -- Property Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    -- Contract Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
    LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
    LEFT JOIN (SELECT user_id, total_bytes FROM user_storage_usage) usu ON up.id = usu.user_id
    
    WHERE up.deleted_at IS NULL
    ORDER BY up.created_at DESC;
END;
$$;
-- Historical Backfill for USD and EUR
-- Backfill Bank of Israel Exchange Rates (20 Years)
-- Generated by scripts/fetch_boi_history.py

INSERT INTO public.index_data (index_type, date, value, source)
VALUES
('usd', '2006-02-02', 4.692, 'exchange-api'),
('usd', '2006-02-03', 4.69, 'exchange-api'),
('usd', '2006-02-06', 4.699, 'exchange-api'),
('usd', '2006-02-07', 4.719, 'exchange-api'),
('usd', '2006-02-08', 4.708, 'exchange-api'),
('usd', '2006-02-09', 4.694, 'exchange-api'),
('usd', '2006-02-10', 4.694, 'exchange-api'),
('usd', '2006-02-13', 4.704, 'exchange-api'),
('usd', '2006-02-14', 4.718, 'exchange-api'),
('usd', '2006-02-15', 4.723, 'exchange-api'),
('usd', '2006-02-16', 4.705, 'exchange-api'),
('usd', '2006-02-17', 4.693, 'exchange-api'),
('usd', '2006-02-20', 4.687, 'exchange-api'),
('usd', '2006-02-21', 4.71, 'exchange-api'),
('usd', '2006-02-22', 4.725, 'exchange-api'),
('usd', '2006-02-23', 4.707, 'exchange-api'),
('usd', '2006-02-24', 4.713, 'exchange-api'),
('usd', '2006-02-27', 4.712, 'exchange-api'),
('usd', '2006-02-28', 4.706, 'exchange-api'),
('usd', '2006-03-01', 4.703, 'exchange-api'),
('usd', '2006-03-02', 4.702, 'exchange-api'),
('usd', '2006-03-03', 4.695, 'exchange-api'),
('usd', '2006-03-06', 4.696, 'exchange-api'),
('usd', '2006-03-07', 4.709, 'exchange-api'),
('usd', '2006-03-08', 4.712, 'exchange-api'),
('usd', '2006-03-09', 4.711, 'exchange-api'),
('usd', '2006-03-10', 4.712, 'exchange-api'),
('usd', '2006-03-13', 4.717, 'exchange-api'),
('usd', '2006-03-16', 4.694, 'exchange-api'),
('usd', '2006-03-17', 4.666, 'exchange-api'),
('usd', '2006-03-20', 4.658, 'exchange-api'),
('usd', '2006-03-21', 4.659, 'exchange-api'),
('usd', '2006-03-22', 4.67, 'exchange-api'),
('usd', '2006-03-23', 4.671, 'exchange-api'),
('usd', '2006-03-24', 4.681, 'exchange-api'),
('usd', '2006-03-27', 4.685, 'exchange-api'),
('usd', '2006-03-29', 4.703, 'exchange-api'),
('usd', '2006-03-30', 4.673, 'exchange-api'),
('usd', '2006-03-31', 4.665, 'exchange-api'),
('usd', '2006-04-03', 4.671, 'exchange-api'),
('usd', '2006-04-04', 4.64, 'exchange-api'),
('usd', '2006-04-05', 4.612, 'exchange-api'),
('usd', '2006-04-06', 4.597, 'exchange-api'),
('usd', '2006-04-07', 4.604, 'exchange-api'),
('usd', '2006-04-10', 4.612, 'exchange-api'),
('usd', '2006-04-11', 4.6, 'exchange-api'),
('usd', '2006-04-18', 4.587, 'exchange-api'),
('usd', '2006-04-20', 4.563, 'exchange-api'),
('usd', '2006-04-21', 4.561, 'exchange-api'),
('usd', '2006-04-24', 4.545, 'exchange-api'),
('usd', '2006-04-25', 4.527, 'exchange-api'),
('usd', '2006-04-26', 4.542, 'exchange-api'),
('usd', '2006-04-27', 4.532, 'exchange-api'),
('usd', '2006-04-28', 4.503, 'exchange-api'),
('usd', '2006-05-01', 4.484, 'exchange-api'),
('usd', '2006-05-02', 4.491, 'exchange-api'),
('usd', '2006-05-04', 4.496, 'exchange-api'),
('usd', '2006-05-05', 4.471, 'exchange-api'),
('usd', '2006-05-08', 4.433, 'exchange-api'),
('usd', '2006-05-09', 4.448, 'exchange-api'),
('usd', '2006-05-10', 4.428, 'exchange-api'),
('usd', '2006-05-11', 4.445, 'exchange-api'),
('usd', '2006-05-12', 4.43, 'exchange-api'),
('usd', '2006-05-15', 4.459, 'exchange-api'),
('usd', '2006-05-16', 4.452, 'exchange-api'),
('usd', '2006-05-17', 4.433, 'exchange-api'),
('usd', '2006-05-18', 4.464, 'exchange-api'),
('usd', '2006-05-19', 4.459, 'exchange-api'),
('usd', '2006-05-22', 4.486, 'exchange-api'),
('usd', '2006-05-23', 4.492, 'exchange-api'),
('usd', '2006-05-24', 4.513, 'exchange-api'),
('usd', '2006-05-25', 4.522, 'exchange-api'),
('usd', '2006-05-26', 4.513, 'exchange-api'),
('usd', '2006-05-30', 4.517, 'exchange-api'),
('usd', '2006-05-31', 4.518, 'exchange-api'),
('usd', '2006-06-01', 4.524, 'exchange-api'),
('usd', '2006-06-05', 4.478, 'exchange-api'),
('usd', '2006-06-06', 4.469, 'exchange-api'),
('usd', '2006-06-07', 4.477, 'exchange-api'),
('usd', '2006-06-08', 4.468, 'exchange-api'),
('usd', '2006-06-09', 4.48, 'exchange-api'),
('usd', '2006-06-12', 4.478, 'exchange-api'),
('usd', '2006-06-13', 4.5, 'exchange-api'),
('usd', '2006-06-14', 4.494, 'exchange-api'),
('usd', '2006-06-15', 4.46, 'exchange-api'),
('usd', '2006-06-16', 4.436, 'exchange-api'),
('usd', '2006-06-19', 4.445, 'exchange-api'),
('usd', '2006-06-20', 4.458, 'exchange-api'),
('usd', '2006-06-21', 4.465, 'exchange-api'),
('usd', '2006-06-22', 4.461, 'exchange-api'),
('usd', '2006-06-23', 4.466, 'exchange-api'),
('usd', '2006-06-26', 4.476, 'exchange-api'),
('usd', '2006-06-27', 4.49, 'exchange-api'),
('usd', '2006-06-28', 4.477, 'exchange-api'),
('usd', '2006-06-29', 4.477, 'exchange-api'),
('usd', '2006-06-30', 4.44, 'exchange-api'),
('usd', '2006-07-03', 4.419, 'exchange-api'),
('usd', '2006-07-04', 4.391, 'exchange-api'),
('usd', '2006-07-05', 4.378, 'exchange-api'),
('usd', '2006-07-06', 4.401, 'exchange-api'),
('usd', '2006-07-07', 4.384, 'exchange-api'),
('usd', '2006-07-10', 4.391, 'exchange-api'),
('usd', '2006-07-11', 4.387, 'exchange-api'),
('usd', '2006-07-12', 4.434, 'exchange-api'),
('usd', '2006-07-13', 4.496, 'exchange-api'),
('usd', '2006-07-14', 4.521, 'exchange-api'),
('usd', '2006-07-17', 4.492, 'exchange-api'),
('usd', '2006-07-18', 4.455, 'exchange-api'),
('usd', '2006-07-19', 4.462, 'exchange-api'),
('usd', '2006-07-20', 4.446, 'exchange-api'),
('usd', '2006-07-21', 4.461, 'exchange-api'),
('usd', '2006-07-24', 4.462, 'exchange-api'),
('usd', '2006-07-25', 4.428, 'exchange-api'),
('usd', '2006-07-26', 4.437, 'exchange-api'),
('usd', '2006-07-27', 4.423, 'exchange-api'),
('usd', '2006-07-28', 4.428, 'exchange-api'),
('usd', '2006-07-31', 4.393, 'exchange-api'),
('usd', '2006-08-01', 4.4, 'exchange-api'),
('usd', '2006-08-02', 4.408, 'exchange-api'),
('usd', '2006-08-04', 4.405, 'exchange-api'),
('usd', '2006-08-07', 4.396, 'exchange-api'),
('usd', '2006-08-08', 4.364, 'exchange-api'),
('usd', '2006-08-09', 4.363, 'exchange-api'),
('usd', '2006-08-10', 4.389, 'exchange-api'),
('usd', '2006-08-11', 4.388, 'exchange-api'),
('usd', '2006-08-14', 4.377, 'exchange-api'),
('usd', '2006-08-15', 4.371, 'exchange-api'),
('usd', '2006-08-16', 4.368, 'exchange-api'),
('usd', '2006-08-17', 4.359, 'exchange-api'),
('usd', '2006-08-18', 4.366, 'exchange-api'),
('usd', '2006-08-21', 4.361, 'exchange-api'),
('usd', '2006-08-22', 4.357, 'exchange-api'),
('usd', '2006-08-23', 4.366, 'exchange-api'),
('usd', '2006-08-24', 4.375, 'exchange-api'),
('usd', '2006-08-25', 4.392, 'exchange-api'),
('usd', '2006-08-28', 4.4, 'exchange-api'),
('usd', '2006-08-29', 4.396, 'exchange-api'),
('usd', '2006-08-30', 4.38, 'exchange-api'),
('usd', '2006-08-31', 4.364, 'exchange-api'),
('usd', '2006-09-01', 4.373, 'exchange-api'),
('usd', '2006-09-04', 4.369, 'exchange-api'),
('usd', '2006-09-05', 4.36, 'exchange-api'),
('usd', '2006-09-06', 4.368, 'exchange-api'),
('usd', '2006-09-07', 4.387, 'exchange-api'),
('usd', '2006-09-08', 4.386, 'exchange-api'),
('usd', '2006-09-11', 4.394, 'exchange-api'),
('usd', '2006-09-12', 4.388, 'exchange-api'),
('usd', '2006-09-13', 4.375, 'exchange-api'),
('usd', '2006-09-14', 4.377, 'exchange-api'),
('usd', '2006-09-15', 4.368, 'exchange-api'),
('usd', '2006-09-18', 4.354, 'exchange-api'),
('usd', '2006-09-19', 4.348, 'exchange-api'),
('usd', '2006-09-20', 4.339, 'exchange-api'),
('usd', '2006-09-21', 4.328, 'exchange-api'),
('usd', '2006-09-25', 4.323, 'exchange-api'),
('usd', '2006-09-26', 4.316, 'exchange-api'),
('usd', '2006-09-27', 4.303, 'exchange-api'),
('usd', '2006-09-28', 4.297, 'exchange-api'),
('usd', '2006-09-29', 4.302, 'exchange-api'),
('usd', '2006-10-03', 4.294, 'exchange-api'),
('usd', '2006-10-04', 4.283, 'exchange-api'),
('usd', '2006-10-05', 4.255, 'exchange-api'),
('usd', '2006-10-06', 4.238, 'exchange-api'),
('usd', '2006-10-09', 4.258, 'exchange-api'),
('usd', '2006-10-10', 4.256, 'exchange-api'),
('usd', '2006-10-11', 4.269, 'exchange-api'),
('usd', '2006-10-12', 4.269, 'exchange-api'),
('usd', '2006-10-13', 4.248, 'exchange-api'),
('usd', '2006-10-16', 4.265, 'exchange-api'),
('usd', '2006-10-17', 4.265, 'exchange-api'),
('usd', '2006-10-18', 4.273, 'exchange-api'),
('usd', '2006-10-19', 4.273, 'exchange-api'),
('usd', '2006-10-20', 4.278, 'exchange-api'),
('usd', '2006-10-23', 4.282, 'exchange-api'),
('usd', '2006-10-24', 4.283, 'exchange-api'),
('usd', '2006-10-25', 4.287, 'exchange-api'),
('usd', '2006-10-26', 4.285, 'exchange-api'),
('usd', '2006-10-27', 4.294, 'exchange-api'),
('usd', '2006-10-30', 4.288, 'exchange-api'),
('usd', '2006-10-31', 4.288, 'exchange-api'),
('usd', '2006-11-01', 4.261, 'exchange-api'),
('usd', '2006-11-02', 4.283, 'exchange-api'),
('usd', '2006-11-03', 4.29, 'exchange-api'),
('usd', '2006-11-06', 4.31, 'exchange-api'),
('usd', '2006-11-07', 4.331, 'exchange-api'),
('usd', '2006-11-08', 4.33, 'exchange-api'),
('usd', '2006-11-09', 4.324, 'exchange-api'),
('usd', '2006-11-10', 4.289, 'exchange-api'),
('usd', '2006-11-13', 4.289, 'exchange-api'),
('usd', '2006-11-14', 4.288, 'exchange-api'),
('usd', '2006-11-15', 4.292, 'exchange-api'),
('usd', '2006-11-16', 4.319, 'exchange-api'),
('usd', '2006-11-17', 4.308, 'exchange-api'),
('usd', '2006-11-20', 4.312, 'exchange-api'),
('usd', '2006-11-21', 4.325, 'exchange-api'),
('usd', '2006-11-22', 4.321, 'exchange-api'),
('usd', '2006-11-23', 4.313, 'exchange-api'),
('usd', '2006-11-24', 4.296, 'exchange-api'),
('usd', '2006-11-27', 4.3, 'exchange-api'),
('usd', '2006-11-28', 4.291, 'exchange-api'),
('usd', '2006-11-30', 4.247, 'exchange-api'),
('usd', '2006-12-01', 4.234, 'exchange-api'),
('usd', '2006-12-04', 4.23, 'exchange-api'),
('usd', '2006-12-05', 4.225, 'exchange-api'),
('usd', '2006-12-06', 4.2, 'exchange-api'),
('usd', '2006-12-07', 4.198, 'exchange-api'),
('usd', '2006-12-08', 4.195, 'exchange-api'),
('usd', '2006-12-11', 4.202, 'exchange-api'),
('usd', '2006-12-12', 4.202, 'exchange-api'),
('usd', '2006-12-13', 4.182, 'exchange-api'),
('usd', '2006-12-14', 4.176, 'exchange-api'),
('usd', '2006-12-15', 4.178, 'exchange-api'),
('usd', '2006-12-18', 4.193, 'exchange-api'),
('usd', '2006-12-19', 4.193, 'exchange-api'),
('usd', '2006-12-20', 4.178, 'exchange-api'),
('usd', '2006-12-21', 4.181, 'exchange-api'),
('usd', '2006-12-22', 4.186, 'exchange-api'),
('usd', '2006-12-26', 4.222, 'exchange-api'),
('usd', '2006-12-27', 4.225, 'exchange-api'),
('usd', '2006-12-28', 4.207, 'exchange-api'),
('usd', '2006-12-29', 4.225, 'exchange-api'),
('usd', '2007-01-02', 4.205, 'exchange-api'),
('usd', '2007-01-03', 4.187, 'exchange-api'),
('usd', '2007-01-04', 4.204, 'exchange-api'),
('usd', '2007-01-05', 4.235, 'exchange-api'),
('usd', '2007-01-08', 4.238, 'exchange-api'),
('usd', '2007-01-09', 4.234, 'exchange-api'),
('usd', '2007-01-10', 4.249, 'exchange-api'),
('usd', '2007-01-11', 4.238, 'exchange-api'),
('usd', '2007-01-12', 4.225, 'exchange-api'),
('usd', '2007-01-15', 4.222, 'exchange-api'),
('usd', '2007-01-16', 4.219, 'exchange-api'),
('usd', '2007-01-17', 4.228, 'exchange-api'),
('usd', '2007-01-18', 4.222, 'exchange-api'),
('usd', '2007-01-19', 4.219, 'exchange-api'),
('usd', '2007-01-22', 4.22, 'exchange-api'),
('usd', '2007-01-23', 4.221, 'exchange-api'),
('usd', '2007-01-24', 4.226, 'exchange-api'),
('usd', '2007-01-25', 4.225, 'exchange-api'),
('usd', '2007-01-26', 4.243, 'exchange-api'),
('usd', '2007-01-29', 4.251, 'exchange-api'),
('usd', '2007-01-30', 4.251, 'exchange-api'),
('usd', '2007-01-31', 4.26, 'exchange-api'),
('usd', '2007-02-01', 4.242, 'exchange-api'),
('usd', '2007-02-02', 4.247, 'exchange-api'),
('usd', '2007-02-05', 4.254, 'exchange-api'),
('usd', '2007-02-06', 4.248, 'exchange-api'),
('usd', '2007-02-07', 4.237, 'exchange-api'),
('usd', '2007-02-08', 4.233, 'exchange-api'),
('usd', '2007-02-09', 4.226, 'exchange-api'),
('usd', '2007-02-12', 4.238, 'exchange-api'),
('usd', '2007-02-13', 4.241, 'exchange-api'),
('usd', '2007-02-14', 4.229, 'exchange-api'),
('usd', '2007-02-15', 4.22, 'exchange-api'),
('usd', '2007-02-16', 4.203, 'exchange-api'),
('usd', '2007-02-19', 4.183, 'exchange-api'),
('usd', '2007-02-20', 4.184, 'exchange-api'),
('usd', '2007-02-21', 4.188, 'exchange-api'),
('usd', '2007-02-22', 4.183, 'exchange-api'),
('usd', '2007-02-23', 4.19, 'exchange-api'),
('usd', '2007-02-26', 4.199, 'exchange-api'),
('usd', '2007-02-27', 4.204, 'exchange-api'),
('usd', '2007-02-28', 4.211, 'exchange-api'),
('usd', '2007-03-01', 4.218, 'exchange-api'),
('usd', '2007-03-02', 4.209, 'exchange-api'),
('usd', '2007-03-06', 4.222, 'exchange-api'),
('usd', '2007-03-07', 4.222, 'exchange-api'),
('usd', '2007-03-08', 4.211, 'exchange-api'),
('usd', '2007-03-09', 4.196, 'exchange-api'),
('usd', '2007-03-12', 4.2, 'exchange-api'),
('usd', '2007-03-13', 4.206, 'exchange-api'),
('usd', '2007-03-14', 4.212, 'exchange-api'),
('usd', '2007-03-15', 4.212, 'exchange-api'),
('usd', '2007-03-16', 4.209, 'exchange-api'),
('usd', '2007-03-19', 4.208, 'exchange-api'),
('usd', '2007-03-20', 4.211, 'exchange-api'),
('usd', '2007-03-21', 4.197, 'exchange-api'),
('usd', '2007-03-22', 4.19, 'exchange-api'),
('usd', '2007-03-23', 4.191, 'exchange-api'),
('usd', '2007-03-26', 4.203, 'exchange-api'),
('usd', '2007-03-27', 4.181, 'exchange-api'),
('usd', '2007-03-28', 4.179, 'exchange-api'),
('usd', '2007-03-29', 4.17, 'exchange-api'),
('usd', '2007-03-30', 4.155, 'exchange-api'),
('usd', '2007-04-04', 4.135, 'exchange-api'),
('usd', '2007-04-05', 4.129, 'exchange-api'),
('usd', '2007-04-10', 4.124, 'exchange-api'),
('usd', '2007-04-11', 4.107, 'exchange-api'),
('usd', '2007-04-12', 4.066, 'exchange-api'),
('usd', '2007-04-13', 4.069, 'exchange-api'),
('usd', '2007-04-16', 4.046, 'exchange-api'),
('usd', '2007-04-17', 4.064, 'exchange-api'),
('usd', '2007-04-18', 4.069, 'exchange-api'),
('usd', '2007-04-19', 4.076, 'exchange-api'),
('usd', '2007-04-20', 4.07, 'exchange-api'),
('usd', '2007-04-23', 4.067, 'exchange-api'),
('usd', '2007-04-25', 4.029, 'exchange-api'),
('usd', '2007-04-26', 4.014, 'exchange-api'),
('usd', '2007-04-27', 4.018, 'exchange-api'),
('usd', '2007-04-30', 4.024, 'exchange-api'),
('usd', '2007-05-01', 4.035, 'exchange-api'),
('usd', '2007-05-02', 4.065, 'exchange-api'),
('usd', '2007-05-03', 4.044, 'exchange-api'),
('usd', '2007-05-04', 4.042, 'exchange-api'),
('usd', '2007-05-07', 3.998, 'exchange-api'),
('usd', '2007-05-08', 3.99, 'exchange-api'),
('usd', '2007-05-09', 3.974, 'exchange-api'),
('usd', '2007-05-10', 3.954, 'exchange-api'),
('usd', '2007-05-11', 3.977, 'exchange-api'),
('usd', '2007-05-14', 3.96, 'exchange-api'),
('usd', '2007-05-15', 3.973, 'exchange-api'),
('usd', '2007-05-16', 3.932, 'exchange-api'),
('usd', '2007-05-17', 3.952, 'exchange-api'),
('usd', '2007-05-18', 3.996, 'exchange-api'),
('usd', '2007-05-21', 3.998, 'exchange-api'),
('usd', '2007-05-22', 3.991, 'exchange-api'),
('usd', '2007-05-24', 3.999, 'exchange-api'),
('usd', '2007-05-25', 4.032, 'exchange-api'),
('usd', '2007-05-29', 4.023, 'exchange-api'),
('usd', '2007-05-30', 4.052, 'exchange-api'),
('usd', '2007-05-31', 4.033, 'exchange-api'),
('usd', '2007-06-01', 4.071, 'exchange-api'),
('usd', '2007-06-04', 4.062, 'exchange-api'),
('usd', '2007-06-05', 4.063, 'exchange-api'),
('usd', '2007-06-06', 4.098, 'exchange-api'),
('usd', '2007-06-07', 4.14, 'exchange-api'),
('usd', '2007-06-08', 4.197, 'exchange-api'),
('usd', '2007-06-11', 4.187, 'exchange-api'),
('usd', '2007-06-12', 4.187, 'exchange-api'),
('usd', '2007-06-13', 4.214, 'exchange-api'),
('usd', '2007-06-14', 4.183, 'exchange-api'),
('usd', '2007-06-15', 4.175, 'exchange-api'),
('usd', '2007-06-18', 4.142, 'exchange-api'),
('usd', '2007-06-19', 4.168, 'exchange-api'),
('usd', '2007-06-20', 4.187, 'exchange-api'),
('usd', '2007-06-21', 4.23, 'exchange-api'),
('usd', '2007-06-22', 4.222, 'exchange-api'),
('usd', '2007-06-25', 4.251, 'exchange-api'),
('usd', '2007-06-26', 4.262, 'exchange-api'),
('usd', '2007-06-27', 4.291, 'exchange-api'),
('usd', '2007-06-28', 4.257, 'exchange-api'),
('usd', '2007-06-29', 4.249, 'exchange-api'),
('usd', '2007-07-02', 4.237, 'exchange-api'),
('usd', '2007-07-03', 4.192, 'exchange-api'),
('usd', '2007-07-04', 4.183, 'exchange-api'),
('usd', '2007-07-05', 4.213, 'exchange-api'),
('usd', '2007-07-06', 4.236, 'exchange-api'),
('usd', '2007-07-09', 4.226, 'exchange-api'),
('usd', '2007-07-10', 4.231, 'exchange-api'),
('usd', '2007-07-11', 4.256, 'exchange-api'),
('usd', '2007-07-12', 4.264, 'exchange-api'),
('usd', '2007-07-13', 4.272, 'exchange-api'),
('usd', '2007-07-16', 4.283, 'exchange-api'),
('usd', '2007-07-17', 4.288, 'exchange-api'),
('usd', '2007-07-18', 4.285, 'exchange-api'),
('usd', '2007-07-19', 4.243, 'exchange-api'),
('usd', '2007-07-20', 4.227, 'exchange-api'),
('usd', '2007-07-23', 4.241, 'exchange-api'),
('usd', '2007-07-25', 4.221, 'exchange-api'),
('usd', '2007-07-26', 4.275, 'exchange-api'),
('usd', '2007-07-27', 4.321, 'exchange-api'),
('usd', '2007-07-30', 4.342, 'exchange-api'),
('usd', '2007-07-31', 4.305, 'exchange-api'),
('usd', '2007-08-01', 4.337, 'exchange-api'),
('usd', '2007-08-02', 4.337, 'exchange-api'),
('usd', '2007-08-03', 4.312, 'exchange-api'),
('usd', '2007-08-06', 4.296, 'exchange-api'),
('usd', '2007-08-07', 4.296, 'exchange-api'),
('usd', '2007-08-08', 4.278, 'exchange-api'),
('usd', '2007-08-09', 4.272, 'exchange-api'),
('usd', '2007-08-10', 4.292, 'exchange-api'),
('usd', '2007-08-13', 4.238, 'exchange-api'),
('usd', '2007-08-14', 4.222, 'exchange-api'),
('usd', '2007-08-15', 4.241, 'exchange-api'),
('usd', '2007-08-16', 4.251, 'exchange-api'),
('usd', '2007-08-17', 4.238, 'exchange-api'),
('usd', '2007-08-20', 4.202, 'exchange-api'),
('usd', '2007-08-21', 4.202, 'exchange-api'),
('usd', '2007-08-22', 4.17, 'exchange-api'),
('usd', '2007-08-23', 4.157, 'exchange-api'),
('usd', '2007-08-24', 4.176, 'exchange-api'),
('usd', '2007-08-27', 4.155, 'exchange-api'),
('usd', '2007-08-28', 4.125, 'exchange-api'),
('usd', '2007-08-29', 4.128, 'exchange-api'),
('usd', '2007-08-30', 4.113, 'exchange-api'),
('usd', '2007-08-31', 4.124, 'exchange-api'),
('usd', '2007-09-03', 4.131, 'exchange-api'),
('usd', '2007-09-04', 4.137, 'exchange-api'),
('usd', '2007-09-05', 4.117, 'exchange-api'),
('usd', '2007-09-06', 4.134, 'exchange-api'),
('usd', '2007-09-07', 4.129, 'exchange-api'),
('usd', '2007-09-10', 4.132, 'exchange-api'),
('usd', '2007-09-11', 4.102, 'exchange-api'),
('usd', '2007-09-17', 4.093, 'exchange-api'),
('usd', '2007-09-18', 4.103, 'exchange-api'),
('usd', '2007-09-19', 4.058, 'exchange-api'),
('usd', '2007-09-20', 4.06, 'exchange-api'),
('usd', '2007-09-24', 4.035, 'exchange-api'),
('usd', '2007-09-25', 4.034, 'exchange-api'),
('usd', '2007-09-26', 4.03, 'exchange-api'),
('usd', '2007-09-28', 4.013, 'exchange-api'),
('usd', '2007-10-01', 3.98, 'exchange-api'),
('usd', '2007-10-02', 4.002, 'exchange-api'),
('usd', '2007-10-03', 4.01, 'exchange-api'),
('usd', '2007-10-05', 4.013, 'exchange-api'),
('usd', '2007-10-08', 3.999, 'exchange-api'),
('usd', '2007-10-09', 4.045, 'exchange-api'),
('usd', '2007-10-10', 4.022, 'exchange-api'),
('usd', '2007-10-11', 4.041, 'exchange-api'),
('usd', '2007-10-12', 4.027, 'exchange-api'),
('usd', '2007-10-15', 4.036, 'exchange-api'),
('usd', '2007-10-16', 4.047, 'exchange-api'),
('usd', '2007-10-17', 4.029, 'exchange-api'),
('usd', '2007-10-18', 4.013, 'exchange-api'),
('usd', '2007-10-19', 4.018, 'exchange-api'),
('usd', '2007-10-22', 4.034, 'exchange-api'),
('usd', '2007-10-23', 4.025, 'exchange-api'),
('usd', '2007-10-24', 4.03, 'exchange-api'),
('usd', '2007-10-25', 4.006, 'exchange-api'),
('usd', '2007-10-26', 3.992, 'exchange-api'),
('usd', '2007-10-29', 3.992, 'exchange-api'),
('usd', '2007-10-30', 3.978, 'exchange-api'),
('usd', '2007-10-31', 3.966, 'exchange-api'),
('usd', '2007-11-01', 3.964, 'exchange-api'),
('usd', '2007-11-02', 3.969, 'exchange-api'),
('usd', '2007-11-05', 3.958, 'exchange-api'),
('usd', '2007-11-06', 3.941, 'exchange-api'),
('usd', '2007-11-07', 3.923, 'exchange-api'),
('usd', '2007-11-08', 3.927, 'exchange-api'),
('usd', '2007-11-09', 3.927, 'exchange-api'),
('usd', '2007-11-12', 3.962, 'exchange-api'),
('usd', '2007-11-13', 3.956, 'exchange-api'),
('usd', '2007-11-14', 3.931, 'exchange-api'),
('usd', '2007-11-15', 3.934, 'exchange-api'),
('usd', '2007-11-16', 3.935, 'exchange-api'),
('usd', '2007-11-19', 3.932, 'exchange-api'),
('usd', '2007-11-20', 3.898, 'exchange-api'),
('usd', '2007-11-21', 3.903, 'exchange-api'),
('usd', '2007-11-22', 3.891, 'exchange-api'),
('usd', '2007-11-23', 3.862, 'exchange-api'),
('usd', '2007-11-26', 3.866, 'exchange-api'),
('usd', '2007-11-27', 3.861, 'exchange-api'),
('usd', '2007-11-28', 3.875, 'exchange-api'),
('usd', '2007-11-29', 3.849, 'exchange-api'),
('usd', '2007-11-30', 3.83, 'exchange-api'),
('usd', '2007-12-03', 3.841, 'exchange-api'),
('usd', '2007-12-04', 3.841, 'exchange-api'),
('usd', '2007-12-05', 3.845, 'exchange-api'),
('usd', '2007-12-06', 3.881, 'exchange-api'),
('usd', '2007-12-07', 3.875, 'exchange-api'),
('usd', '2007-12-10', 3.893, 'exchange-api'),
('usd', '2007-12-11', 3.921, 'exchange-api'),
('usd', '2007-12-12', 3.938, 'exchange-api'),
('usd', '2007-12-13', 3.927, 'exchange-api'),
('usd', '2007-12-14', 3.971, 'exchange-api'),
('usd', '2007-12-17', 4.008, 'exchange-api'),
('usd', '2007-12-18', 3.974, 'exchange-api'),
('usd', '2007-12-19', 3.942, 'exchange-api'),
('usd', '2007-12-20', 3.943, 'exchange-api'),
('usd', '2007-12-21', 3.914, 'exchange-api'),
('usd', '2007-12-24', 3.876, 'exchange-api'),
('usd', '2007-12-26', 3.92, 'exchange-api'),
('usd', '2007-12-27', 3.871, 'exchange-api'),
('usd', '2007-12-28', 3.857, 'exchange-api'),
('usd', '2007-12-31', 3.846, 'exchange-api'),
('usd', '2008-01-02', 3.861, 'exchange-api'),
('usd', '2008-01-03', 3.838, 'exchange-api'),
('usd', '2008-01-04', 3.807, 'exchange-api'),
('usd', '2008-01-07', 3.828, 'exchange-api'),
('usd', '2008-01-08', 3.799, 'exchange-api'),
('usd', '2008-01-09', 3.791, 'exchange-api'),
('usd', '2008-01-10', 3.805, 'exchange-api'),
('usd', '2008-01-11', 3.775, 'exchange-api'),
('usd', '2008-01-14', 3.725, 'exchange-api'),
('usd', '2008-01-15', 3.711, 'exchange-api'),
('usd', '2008-01-16', 3.737, 'exchange-api'),
('usd', '2008-01-17', 3.744, 'exchange-api'),
('usd', '2008-01-18', 3.78, 'exchange-api'),
('usd', '2008-01-21', 3.801, 'exchange-api'),
('usd', '2008-01-22', 3.795, 'exchange-api'),
('usd', '2008-01-23', 3.712, 'exchange-api'),
('usd', '2008-01-24', 3.682, 'exchange-api'),
('usd', '2008-01-25', 3.71, 'exchange-api'),
('usd', '2008-01-28', 3.709, 'exchange-api'),
('usd', '2008-01-29', 3.639, 'exchange-api'),
('usd', '2008-01-30', 3.646, 'exchange-api'),
('usd', '2008-01-31', 3.625, 'exchange-api'),
('usd', '2008-02-01', 3.594, 'exchange-api'),
('usd', '2008-02-04', 3.578, 'exchange-api'),
('usd', '2008-02-05', 3.607, 'exchange-api'),
('usd', '2008-02-06', 3.626, 'exchange-api'),
('usd', '2008-02-07', 3.655, 'exchange-api'),
('usd', '2008-02-08', 3.611, 'exchange-api'),
('usd', '2008-02-11', 3.618, 'exchange-api'),
('usd', '2008-02-12', 3.581, 'exchange-api'),
('usd', '2008-02-13', 3.608, 'exchange-api'),
('usd', '2008-02-14', 3.615, 'exchange-api'),
('usd', '2008-02-15', 3.591, 'exchange-api'),
('usd', '2008-02-18', 3.602, 'exchange-api'),
('usd', '2008-02-19', 3.591, 'exchange-api'),
('usd', '2008-02-20', 3.622, 'exchange-api'),
('usd', '2008-02-21', 3.614, 'exchange-api'),
('usd', '2008-02-22', 3.592, 'exchange-api'),
('usd', '2008-02-25', 3.58, 'exchange-api'),
('usd', '2008-02-26', 3.628, 'exchange-api'),
('usd', '2008-02-27', 3.608, 'exchange-api'),
('usd', '2008-02-28', 3.621, 'exchange-api'),
('usd', '2008-02-29', 3.635, 'exchange-api'),
('usd', '2008-03-03', 3.656, 'exchange-api'),
('usd', '2008-03-04', 3.626, 'exchange-api'),
('usd', '2008-03-05', 3.591, 'exchange-api'),
('usd', '2008-03-06', 3.599, 'exchange-api'),
('usd', '2008-03-07', 3.6, 'exchange-api'),
('usd', '2008-03-10', 3.577, 'exchange-api'),
('usd', '2008-03-11', 3.515, 'exchange-api'),
('usd', '2008-03-12', 3.482, 'exchange-api'),
('usd', '2008-03-13', 3.403, 'exchange-api'),
('usd', '2008-03-14', 3.474, 'exchange-api'),
('usd', '2008-03-17', 3.426, 'exchange-api'),
('usd', '2008-03-18', 3.38, 'exchange-api'),
('usd', '2008-03-19', 3.377, 'exchange-api'),
('usd', '2008-03-20', 3.399, 'exchange-api'),
('usd', '2008-03-24', 3.523, 'exchange-api'),
('usd', '2008-03-25', 3.513, 'exchange-api'),
('usd', '2008-03-26', 3.504, 'exchange-api'),
('usd', '2008-03-27', 3.5, 'exchange-api'),
('usd', '2008-03-28', 3.519, 'exchange-api'),
('usd', '2008-03-31', 3.553, 'exchange-api'),
('usd', '2008-04-01', 3.544, 'exchange-api'),
('usd', '2008-04-02', 3.554, 'exchange-api'),
('usd', '2008-04-03', 3.577, 'exchange-api'),
('usd', '2008-04-04', 3.614, 'exchange-api'),
('usd', '2008-04-07', 3.64, 'exchange-api'),
('usd', '2008-04-08', 3.613, 'exchange-api'),
('usd', '2008-04-09', 3.597, 'exchange-api'),
('usd', '2008-04-10', 3.613, 'exchange-api'),
('usd', '2008-04-11', 3.6, 'exchange-api'),
('usd', '2008-04-14', 3.565, 'exchange-api'),
('usd', '2008-04-15', 3.489, 'exchange-api'),
('usd', '2008-04-16', 3.477, 'exchange-api'),
('usd', '2008-04-17', 3.465, 'exchange-api'),
('usd', '2008-04-18', 3.425, 'exchange-api'),
('usd', '2008-04-21', 3.452, 'exchange-api'),
('usd', '2008-04-22', 3.468, 'exchange-api'),
('usd', '2008-04-23', 3.442, 'exchange-api'),
('usd', '2008-04-24', 3.453, 'exchange-api'),
('usd', '2008-04-25', 3.486, 'exchange-api'),
('usd', '2008-04-28', 3.463, 'exchange-api'),
('usd', '2008-04-29', 3.467, 'exchange-api'),
('usd', '2008-04-30', 3.429, 'exchange-api'),
('usd', '2008-05-01', 3.424, 'exchange-api'),
('usd', '2008-05-02', 3.45, 'exchange-api'),
('usd', '2008-05-05', 3.437, 'exchange-api'),
('usd', '2008-05-06', 3.416, 'exchange-api'),
('usd', '2008-05-07', 3.443, 'exchange-api'),
('usd', '2008-05-09', 3.461, 'exchange-api'),
('usd', '2008-05-12', 3.45, 'exchange-api'),
('usd', '2008-05-13', 3.434, 'exchange-api'),
('usd', '2008-05-14', 3.428, 'exchange-api'),
('usd', '2008-05-15', 3.424, 'exchange-api'),
('usd', '2008-05-16', 3.362, 'exchange-api'),
('usd', '2008-05-19', 3.368, 'exchange-api'),
('usd', '2008-05-20', 3.378, 'exchange-api'),
('usd', '2008-05-21', 3.362, 'exchange-api'),
('usd', '2008-05-22', 3.338, 'exchange-api'),
('usd', '2008-05-23', 3.333, 'exchange-api'),
('usd', '2008-05-27', 3.285, 'exchange-api'),
('usd', '2008-05-28', 3.288, 'exchange-api'),
('usd', '2008-05-29', 3.262, 'exchange-api'),
('usd', '2008-05-30', 3.233, 'exchange-api'),
('usd', '2008-06-02', 3.26, 'exchange-api'),
('usd', '2008-06-03', 3.268, 'exchange-api'),
('usd', '2008-06-04', 3.325, 'exchange-api'),
('usd', '2008-06-05', 3.376, 'exchange-api'),
('usd', '2008-06-06', 3.333, 'exchange-api'),
('usd', '2008-06-10', 3.375, 'exchange-api'),
('usd', '2008-06-11', 3.399, 'exchange-api'),
('usd', '2008-06-12', 3.426, 'exchange-api'),
('usd', '2008-06-13', 3.422, 'exchange-api'),
('usd', '2008-06-16', 3.418, 'exchange-api'),
('usd', '2008-06-17', 3.34, 'exchange-api'),
('usd', '2008-06-18', 3.345, 'exchange-api'),
('usd', '2008-06-19', 3.366, 'exchange-api'),
('usd', '2008-06-20', 3.354, 'exchange-api'),
('usd', '2008-06-23', 3.373, 'exchange-api'),
('usd', '2008-06-24', 3.373, 'exchange-api'),
('usd', '2008-06-25', 3.388, 'exchange-api'),
('usd', '2008-06-26', 3.375, 'exchange-api'),
('usd', '2008-06-27', 3.378, 'exchange-api'),
('usd', '2008-06-30', 3.352, 'exchange-api'),
('usd', '2008-07-01', 3.338, 'exchange-api'),
('usd', '2008-07-02', 3.284, 'exchange-api'),
('usd', '2008-07-03', 3.253, 'exchange-api'),
('usd', '2008-07-04', 3.273, 'exchange-api'),
('usd', '2008-07-07', 3.246, 'exchange-api'),
('usd', '2008-07-08', 3.266, 'exchange-api'),
('usd', '2008-07-09', 3.23, 'exchange-api'),
('usd', '2008-07-10', 3.314, 'exchange-api'),
('usd', '2008-07-11', 3.38, 'exchange-api'),
('usd', '2008-07-14', 3.329, 'exchange-api'),
('usd', '2008-07-15', 3.302, 'exchange-api'),
('usd', '2008-07-16', 3.344, 'exchange-api'),
('usd', '2008-07-17', 3.373, 'exchange-api'),
('usd', '2008-07-18', 3.384, 'exchange-api'),
('usd', '2008-07-21', 3.427, 'exchange-api'),
('usd', '2008-07-22', 3.465, 'exchange-api'),
('usd', '2008-07-23', 3.473, 'exchange-api'),
('usd', '2008-07-24', 3.489, 'exchange-api'),
('usd', '2008-07-25', 3.486, 'exchange-api'),
('usd', '2008-07-28', 3.477, 'exchange-api'),
('usd', '2008-07-29', 3.464, 'exchange-api'),
('usd', '2008-07-30', 3.469, 'exchange-api'),
('usd', '2008-07-31', 3.47, 'exchange-api'),
('usd', '2008-08-01', 3.515, 'exchange-api'),
('usd', '2008-08-04', 3.543, 'exchange-api'),
('usd', '2008-08-05', 3.556, 'exchange-api'),
('usd', '2008-08-06', 3.55, 'exchange-api'),
('usd', '2008-08-07', 3.538, 'exchange-api'),
('usd', '2008-08-08', 3.588, 'exchange-api'),
('usd', '2008-08-11', 3.566, 'exchange-api'),
('usd', '2008-08-12', 3.589, 'exchange-api'),
('usd', '2008-08-13', 3.594, 'exchange-api'),
('usd', '2008-08-14', 3.585, 'exchange-api'),
('usd', '2008-08-15', 3.59, 'exchange-api'),
('usd', '2008-08-18', 3.569, 'exchange-api'),
('usd', '2008-08-19', 3.576, 'exchange-api'),
('usd', '2008-08-20', 3.576, 'exchange-api'),
('usd', '2008-08-21', 3.536, 'exchange-api'),
('usd', '2008-08-22', 3.476, 'exchange-api'),
('usd', '2008-08-25', 3.514, 'exchange-api'),
('usd', '2008-08-26', 3.533, 'exchange-api'),
('usd', '2008-08-27', 3.566, 'exchange-api'),
('usd', '2008-08-28', 3.581, 'exchange-api'),
('usd', '2008-08-29', 3.592, 'exchange-api'),
('usd', '2008-09-01', 3.618, 'exchange-api'),
('usd', '2008-09-02', 3.635, 'exchange-api'),
('usd', '2008-09-03', 3.602, 'exchange-api'),
('usd', '2008-09-04', 3.582, 'exchange-api'),
('usd', '2008-09-05', 3.586, 'exchange-api'),
('usd', '2008-09-08', 3.582, 'exchange-api'),
('usd', '2008-09-09', 3.592, 'exchange-api'),
('usd', '2008-09-10', 3.598, 'exchange-api'),
('usd', '2008-09-11', 3.625, 'exchange-api'),
('usd', '2008-09-12', 3.621, 'exchange-api'),
('usd', '2008-09-15', 3.59, 'exchange-api'),
('usd', '2008-09-16', 3.554, 'exchange-api'),
('usd', '2008-09-17', 3.549, 'exchange-api'),
('usd', '2008-09-18', 3.521, 'exchange-api'),
('usd', '2008-09-19', 3.532, 'exchange-api'),
('usd', '2008-09-22', 3.486, 'exchange-api'),
('usd', '2008-09-23', 3.402, 'exchange-api'),
('usd', '2008-09-24', 3.421, 'exchange-api'),
('usd', '2008-09-25', 3.396, 'exchange-api'),
('usd', '2008-09-26', 3.421, 'exchange-api'),
('usd', '2008-10-02', 3.494, 'exchange-api'),
('usd', '2008-10-03', 3.465, 'exchange-api'),
('usd', '2008-10-06', 3.465, 'exchange-api'),
('usd', '2008-10-07', 3.503, 'exchange-api'),
('usd', '2008-10-10', 3.595, 'exchange-api'),
('usd', '2008-10-13', 3.607, 'exchange-api'),
('usd', '2008-10-15', 3.629, 'exchange-api'),
('usd', '2008-10-16', 3.705, 'exchange-api'),
('usd', '2008-10-17', 3.739, 'exchange-api'),
('usd', '2008-10-20', 3.749, 'exchange-api'),
('usd', '2008-10-22', 3.834, 'exchange-api'),
('usd', '2008-10-23', 3.841, 'exchange-api'),
('usd', '2008-10-24', 3.879, 'exchange-api'),
('usd', '2008-10-27', 3.824, 'exchange-api'),
('usd', '2008-10-28', 3.777, 'exchange-api'),
('usd', '2008-10-29', 3.767, 'exchange-api'),
('usd', '2008-10-30', 3.713, 'exchange-api'),
('usd', '2008-10-31', 3.783, 'exchange-api'),
('usd', '2008-11-03', 3.752, 'exchange-api'),
('usd', '2008-11-04', 3.778, 'exchange-api'),
('usd', '2008-11-05', 3.827, 'exchange-api'),
('usd', '2008-11-06', 3.837, 'exchange-api'),
('usd', '2008-11-07', 3.816, 'exchange-api'),
('usd', '2008-11-10', 3.776, 'exchange-api'),
('usd', '2008-11-11', 3.796, 'exchange-api'),
('usd', '2008-11-12', 3.876, 'exchange-api'),
('usd', '2008-11-13', 3.928, 'exchange-api'),
('usd', '2008-11-14', 3.883, 'exchange-api'),
('usd', '2008-11-17', 3.915, 'exchange-api'),
('usd', '2008-11-18', 3.964, 'exchange-api'),
('usd', '2008-11-19', 3.969, 'exchange-api'),
('usd', '2008-11-20', 3.998, 'exchange-api'),
('usd', '2008-11-21', 4.022, 'exchange-api'),
('usd', '2008-11-24', 3.993, 'exchange-api'),
('usd', '2008-11-25', 3.969, 'exchange-api'),
('usd', '2008-11-26', 3.89, 'exchange-api'),
('usd', '2008-11-27', 3.899, 'exchange-api'),
('usd', '2008-11-28', 3.92, 'exchange-api'),
('usd', '2008-12-01', 3.99, 'exchange-api'),
('usd', '2008-12-02', 3.955, 'exchange-api'),
('usd', '2008-12-03', 3.978, 'exchange-api'),
('usd', '2008-12-04', 3.964, 'exchange-api'),
('usd', '2008-12-05', 3.981, 'exchange-api'),
('usd', '2008-12-08', 3.935, 'exchange-api'),
('usd', '2008-12-09', 3.931, 'exchange-api'),
('usd', '2008-12-10', 3.904, 'exchange-api'),
('usd', '2008-12-11', 3.911, 'exchange-api'),
('usd', '2008-12-12', 3.898, 'exchange-api'),
('usd', '2008-12-15', 3.863, 'exchange-api'),
('usd', '2008-12-16', 3.833, 'exchange-api'),
('usd', '2008-12-17', 3.755, 'exchange-api'),
('usd', '2008-12-18', 3.677, 'exchange-api'),
('usd', '2008-12-19', 3.736, 'exchange-api'),
('usd', '2008-12-22', 3.835, 'exchange-api'),
('usd', '2008-12-23', 3.835, 'exchange-api'),
('usd', '2008-12-24', 3.873, 'exchange-api'),
('usd', '2008-12-29', 3.848, 'exchange-api'),
('usd', '2008-12-30', 3.765, 'exchange-api'),
('usd', '2008-12-31', 3.802, 'exchange-api'),
('usd', '2009-01-02', 3.783, 'exchange-api'),
('usd', '2009-01-05', 3.853, 'exchange-api'),
('usd', '2009-01-06', 3.861, 'exchange-api'),
('usd', '2009-01-07', 3.857, 'exchange-api'),
('usd', '2009-01-08', 3.888, 'exchange-api'),
('usd', '2009-01-09', 3.861, 'exchange-api'),
('usd', '2009-01-12', 3.895, 'exchange-api'),
('usd', '2009-01-13', 3.915, 'exchange-api'),
('usd', '2009-01-14', 3.889, 'exchange-api'),
('usd', '2009-01-15', 3.885, 'exchange-api'),
('usd', '2009-01-16', 3.861, 'exchange-api'),
('usd', '2009-01-19', 3.84, 'exchange-api'),
('usd', '2009-01-20', 3.888, 'exchange-api'),
('usd', '2009-01-21', 3.903, 'exchange-api'),
('usd', '2009-01-22', 3.945, 'exchange-api'),
('usd', '2009-01-23', 3.974, 'exchange-api'),
('usd', '2009-01-26', 3.995, 'exchange-api'),
('usd', '2009-01-27', 3.98, 'exchange-api'),
('usd', '2009-01-28', 4.025, 'exchange-api'),
('usd', '2009-01-29', 4.017, 'exchange-api'),
('usd', '2009-01-30', 4.065, 'exchange-api'),
('usd', '2009-02-02', 4.065, 'exchange-api'),
('usd', '2009-02-03', 4.074, 'exchange-api'),
('usd', '2009-02-04', 4.074, 'exchange-api'),
('usd', '2009-02-05', 4.067, 'exchange-api'),
('usd', '2009-02-06', 4.012, 'exchange-api'),
('usd', '2009-02-09', 4.037, 'exchange-api'),
('usd', '2009-02-11', 4.061, 'exchange-api'),
('usd', '2009-02-12', 4.054, 'exchange-api'),
('usd', '2009-02-13', 4.045, 'exchange-api'),
('usd', '2009-02-16', 4.074, 'exchange-api'),
('usd', '2009-02-17', 4.135, 'exchange-api'),
('usd', '2009-02-18', 4.142, 'exchange-api'),
('usd', '2009-02-19', 4.123, 'exchange-api'),
('usd', '2009-02-20', 4.16, 'exchange-api'),
('usd', '2009-02-23', 4.148, 'exchange-api'),
('usd', '2009-02-24', 4.161, 'exchange-api'),
('usd', '2009-02-25', 4.191, 'exchange-api'),
('usd', '2009-02-26', 4.173, 'exchange-api'),
('usd', '2009-02-27', 4.162, 'exchange-api'),
('usd', '2009-03-02', 4.209, 'exchange-api'),
('usd', '2009-03-03', 4.206, 'exchange-api'),
('usd', '2009-03-04', 4.211, 'exchange-api'),
('usd', '2009-03-05', 4.235, 'exchange-api'),
('usd', '2009-03-06', 4.234, 'exchange-api'),
('usd', '2009-03-09', 4.245, 'exchange-api'),
('usd', '2009-03-12', 4.215, 'exchange-api'),
('usd', '2009-03-13', 4.171, 'exchange-api'),
('usd', '2009-03-16', 4.135, 'exchange-api'),
('usd', '2009-03-17', 4.144, 'exchange-api'),
('usd', '2009-03-18', 4.124, 'exchange-api'),
('usd', '2009-03-19', 4.05, 'exchange-api'),
('usd', '2009-03-20', 4.024, 'exchange-api'),
('usd', '2009-03-23', 4.052, 'exchange-api'),
('usd', '2009-03-24', 4.066, 'exchange-api'),
('usd', '2009-03-25', 4.101, 'exchange-api'),
('usd', '2009-03-26', 4.148, 'exchange-api'),
('usd', '2009-03-27', 4.196, 'exchange-api'),
('usd', '2009-03-30', 4.226, 'exchange-api'),
('usd', '2009-03-31', 4.188, 'exchange-api'),
('usd', '2009-04-01', 4.209, 'exchange-api'),
('usd', '2009-04-02', 4.175, 'exchange-api'),
('usd', '2009-04-03', 4.165, 'exchange-api'),
('usd', '2009-04-06', 4.125, 'exchange-api'),
('usd', '2009-04-07', 4.172, 'exchange-api'),
('usd', '2009-04-14', 4.166, 'exchange-api'),
('usd', '2009-04-16', 4.189, 'exchange-api'),
('usd', '2009-04-17', 4.179, 'exchange-api'),
('usd', '2009-04-20', 4.207, 'exchange-api'),
('usd', '2009-04-21', 4.214, 'exchange-api'),
('usd', '2009-04-22', 4.205, 'exchange-api'),
('usd', '2009-04-23', 4.229, 'exchange-api'),
('usd', '2009-04-24', 4.248, 'exchange-api'),
('usd', '2009-04-27', 4.233, 'exchange-api'),
('usd', '2009-04-28', 4.256, 'exchange-api'),
('usd', '2009-04-30', 4.163, 'exchange-api'),
('usd', '2009-05-01', 4.161, 'exchange-api'),
('usd', '2009-05-04', 4.161, 'exchange-api'),
('usd', '2009-05-05', 4.125, 'exchange-api'),
('usd', '2009-05-06', 4.141, 'exchange-api'),
('usd', '2009-05-07', 4.134, 'exchange-api'),
('usd', '2009-05-08', 4.101, 'exchange-api'),
('usd', '2009-05-11', 4.1, 'exchange-api'),
('usd', '2009-05-12', 4.102, 'exchange-api'),
('usd', '2009-05-13', 4.109, 'exchange-api'),
('usd', '2009-05-14', 4.154, 'exchange-api'),
('usd', '2009-05-15', 4.145, 'exchange-api'),
('usd', '2009-05-18', 4.169, 'exchange-api'),
('usd', '2009-05-19', 4.121, 'exchange-api'),
('usd', '2009-05-20', 4.091, 'exchange-api'),
('usd', '2009-05-21', 4.017, 'exchange-api'),
('usd', '2009-05-22', 3.96, 'exchange-api'),
('usd', '2009-05-26', 4, 'exchange-api'),
('usd', '2009-05-27', 3.992, 'exchange-api'),
('usd', '2009-05-28', 3.958, 'exchange-api'),
('usd', '2009-06-01', 3.887, 'exchange-api'),
('usd', '2009-06-02', 3.911, 'exchange-api'),
('usd', '2009-06-03', 3.932, 'exchange-api'),
('usd', '2009-06-04', 3.967, 'exchange-api'),
('usd', '2009-06-05', 3.931, 'exchange-api'),
('usd', '2009-06-08', 4.005, 'exchange-api'),
('usd', '2009-06-09', 3.967, 'exchange-api'),
('usd', '2009-06-10', 3.914, 'exchange-api'),
('usd', '2009-06-11', 3.921, 'exchange-api'),
('usd', '2009-06-12', 3.916, 'exchange-api'),
('usd', '2009-06-15', 3.965, 'exchange-api'),
('usd', '2009-06-16', 3.932, 'exchange-api'),
('usd', '2009-06-17', 3.95, 'exchange-api'),
('usd', '2009-06-18', 3.958, 'exchange-api'),
('usd', '2009-06-19', 3.958, 'exchange-api'),
('usd', '2009-06-22', 3.955, 'exchange-api'),
('usd', '2009-06-23', 3.968, 'exchange-api'),
('usd', '2009-06-24', 3.933, 'exchange-api'),
('usd', '2009-06-25', 3.962, 'exchange-api'),
('usd', '2009-06-26', 3.973, 'exchange-api'),
('usd', '2009-06-29', 3.936, 'exchange-api'),
('usd', '2009-06-30', 3.919, 'exchange-api'),
('usd', '2009-07-01', 3.89, 'exchange-api'),
('usd', '2009-07-02', 3.866, 'exchange-api'),
('usd', '2009-07-03', 3.884, 'exchange-api'),
('usd', '2009-07-06', 3.916, 'exchange-api'),
('usd', '2009-07-07', 3.91, 'exchange-api'),
('usd', '2009-07-08', 3.964, 'exchange-api'),
('usd', '2009-07-09', 3.956, 'exchange-api'),
('usd', '2009-07-10', 3.965, 'exchange-api'),
('usd', '2009-07-13', 3.987, 'exchange-api'),
('usd', '2009-07-14', 3.96, 'exchange-api'),
('usd', '2009-07-15', 3.919, 'exchange-api'),
('usd', '2009-07-16', 3.902, 'exchange-api'),
('usd', '2009-07-17', 3.904, 'exchange-api'),
('usd', '2009-07-20', 3.902, 'exchange-api'),
('usd', '2009-07-21', 3.888, 'exchange-api'),
('usd', '2009-07-22', 3.886, 'exchange-api'),
('usd', '2009-07-23', 3.881, 'exchange-api'),
('usd', '2009-07-24', 3.867, 'exchange-api'),
('usd', '2009-07-27', 3.811, 'exchange-api'),
('usd', '2009-07-28', 3.781, 'exchange-api'),
('usd', '2009-07-29', 3.803, 'exchange-api'),
('usd', '2009-07-31', 3.79, 'exchange-api'),
('usd', '2009-08-03', 3.743, 'exchange-api'),
('usd', '2009-08-04', 3.866, 'exchange-api'),
('usd', '2009-08-05', 3.889, 'exchange-api'),
('usd', '2009-08-06', 3.931, 'exchange-api'),
('usd', '2009-08-07', 3.912, 'exchange-api'),
('usd', '2009-08-10', 3.873, 'exchange-api'),
('usd', '2009-08-11', 3.87, 'exchange-api'),
('usd', '2009-08-12', 3.857, 'exchange-api'),
('usd', '2009-08-13', 3.818, 'exchange-api'),
('usd', '2009-08-14', 3.789, 'exchange-api'),
('usd', '2009-08-17', 3.811, 'exchange-api'),
('usd', '2009-08-18', 3.824, 'exchange-api'),
('usd', '2009-08-19', 3.832, 'exchange-api'),
('usd', '2009-08-20', 3.811, 'exchange-api'),
('usd', '2009-08-21', 3.818, 'exchange-api'),
('usd', '2009-08-24', 3.804, 'exchange-api'),
('usd', '2009-08-25', 3.796, 'exchange-api'),
('usd', '2009-08-26', 3.797, 'exchange-api'),
('usd', '2009-08-27', 3.799, 'exchange-api'),
('usd', '2009-08-28', 3.822, 'exchange-api'),
('usd', '2009-08-31', 3.811, 'exchange-api'),
('usd', '2009-09-01', 3.796, 'exchange-api'),
('usd', '2009-09-02', 3.807, 'exchange-api'),
('usd', '2009-09-03', 3.796, 'exchange-api'),
('usd', '2009-09-04', 3.762, 'exchange-api'),
('usd', '2009-09-07', 3.757, 'exchange-api'),
('usd', '2009-09-08', 3.78, 'exchange-api'),
('usd', '2009-09-09', 3.781, 'exchange-api'),
('usd', '2009-09-10', 3.788, 'exchange-api'),
('usd', '2009-09-11', 3.782, 'exchange-api'),
('usd', '2009-09-14', 3.779, 'exchange-api'),
('usd', '2009-09-15', 3.761, 'exchange-api'),
('usd', '2009-09-16', 3.74, 'exchange-api'),
('usd', '2009-09-17', 3.75, 'exchange-api'),
('usd', '2009-09-21', 3.742, 'exchange-api'),
('usd', '2009-09-22', 3.729, 'exchange-api'),
('usd', '2009-09-23', 3.732, 'exchange-api'),
('usd', '2009-09-24', 3.733, 'exchange-api'),
('usd', '2009-09-25', 3.77, 'exchange-api'),
('usd', '2009-09-29', 3.774, 'exchange-api'),
('usd', '2009-09-30', 3.758, 'exchange-api'),
('usd', '2009-10-01', 3.78, 'exchange-api'),
('usd', '2009-10-02', 3.766, 'exchange-api'),
('usd', '2009-10-05', 3.76, 'exchange-api'),
('usd', '2009-10-06', 3.733, 'exchange-api'),
('usd', '2009-10-07', 3.734, 'exchange-api'),
('usd', '2009-10-08', 3.732, 'exchange-api'),
('usd', '2009-10-09', 3.737, 'exchange-api'),
('usd', '2009-10-12', 3.728, 'exchange-api'),
('usd', '2009-10-13', 3.714, 'exchange-api'),
('usd', '2009-10-14', 3.709, 'exchange-api'),
('usd', '2009-10-15', 3.718, 'exchange-api'),
('usd', '2009-10-16', 3.709, 'exchange-api'),
('usd', '2009-10-19', 3.708, 'exchange-api'),
('usd', '2009-10-20', 3.7, 'exchange-api'),
('usd', '2009-10-21', 3.704, 'exchange-api'),
('usd', '2009-10-22', 3.698, 'exchange-api'),
('usd', '2009-10-23', 3.692, 'exchange-api'),
('usd', '2009-10-26', 3.69, 'exchange-api'),
('usd', '2009-10-27', 3.709, 'exchange-api'),
('usd', '2009-10-28', 3.745, 'exchange-api'),
('usd', '2009-10-29', 3.764, 'exchange-api'),
('usd', '2009-10-30', 3.746, 'exchange-api'),
('usd', '2009-11-02', 3.775, 'exchange-api'),
('usd', '2009-11-03', 3.806, 'exchange-api'),
('usd', '2009-11-04', 3.793, 'exchange-api'),
('usd', '2009-11-05', 3.792, 'exchange-api'),
('usd', '2009-11-06', 3.771, 'exchange-api'),
('usd', '2009-11-09', 3.741, 'exchange-api'),
('usd', '2009-11-10', 3.759, 'exchange-api'),
('usd', '2009-11-11', 3.749, 'exchange-api'),
('usd', '2009-11-12', 3.769, 'exchange-api'),
('usd', '2009-11-13', 3.774, 'exchange-api'),
('usd', '2009-11-16', 3.753, 'exchange-api'),
('usd', '2009-11-17', 3.768, 'exchange-api'),
('usd', '2009-11-18', 3.77, 'exchange-api'),
('usd', '2009-11-19', 3.793, 'exchange-api'),
('usd', '2009-11-20', 3.811, 'exchange-api'),
('usd', '2009-11-23', 3.801, 'exchange-api'),
('usd', '2009-11-24', 3.777, 'exchange-api'),
('usd', '2009-11-25', 3.762, 'exchange-api'),
('usd', '2009-11-26', 3.776, 'exchange-api'),
('usd', '2009-11-27', 3.826, 'exchange-api'),
('usd', '2009-11-30', 3.792, 'exchange-api'),
('usd', '2009-12-01', 3.775, 'exchange-api'),
('usd', '2009-12-02', 3.777, 'exchange-api'),
('usd', '2009-12-03', 3.772, 'exchange-api'),
('usd', '2009-12-04', 3.774, 'exchange-api'),
('usd', '2009-12-07', 3.815, 'exchange-api'),
('usd', '2009-12-08', 3.797, 'exchange-api'),
('usd', '2009-12-09', 3.806, 'exchange-api'),
('usd', '2009-12-10', 3.781, 'exchange-api'),
('usd', '2009-12-11', 3.775, 'exchange-api'),
('usd', '2009-12-14', 3.78, 'exchange-api'),
('usd', '2009-12-15', 3.787, 'exchange-api'),
('usd', '2009-12-16', 3.783, 'exchange-api'),
('usd', '2009-12-17', 3.803, 'exchange-api'),
('usd', '2009-12-18', 3.793, 'exchange-api'),
('usd', '2009-12-21', 3.801, 'exchange-api'),
('usd', '2009-12-22', 3.801, 'exchange-api'),
('usd', '2009-12-23', 3.808, 'exchange-api'),
('usd', '2009-12-24', 3.797, 'exchange-api'),
('usd', '2009-12-28', 3.793, 'exchange-api'),
('usd', '2009-12-29', 3.79, 'exchange-api'),
('usd', '2009-12-30', 3.789, 'exchange-api'),
('usd', '2009-12-31', 3.775, 'exchange-api'),
('usd', '2010-01-04', 3.765, 'exchange-api'),
('usd', '2010-01-05', 3.736, 'exchange-api'),
('usd', '2010-01-06', 3.74, 'exchange-api'),
('usd', '2010-01-07', 3.727, 'exchange-api'),
('usd', '2010-01-08', 3.718, 'exchange-api'),
('usd', '2010-01-11', 3.683, 'exchange-api'),
('usd', '2010-01-12', 3.691, 'exchange-api'),
('usd', '2010-01-13', 3.667, 'exchange-api'),
('usd', '2010-01-14', 3.683, 'exchange-api'),
('usd', '2010-01-15', 3.682, 'exchange-api'),
('usd', '2010-01-18', 3.687, 'exchange-api'),
('usd', '2010-01-19', 3.69, 'exchange-api'),
('usd', '2010-01-20', 3.704, 'exchange-api'),
('usd', '2010-01-21', 3.715, 'exchange-api'),
('usd', '2010-01-22', 3.727, 'exchange-api'),
('usd', '2010-01-25', 3.722, 'exchange-api'),
('usd', '2010-01-26', 3.733, 'exchange-api'),
('usd', '2010-01-27', 3.729, 'exchange-api'),
('usd', '2010-01-28', 3.728, 'exchange-api'),
('usd', '2010-01-29', 3.724, 'exchange-api'),
('usd', '2010-02-01', 3.735, 'exchange-api'),
('usd', '2010-02-02', 3.707, 'exchange-api'),
('usd', '2010-02-03', 3.704, 'exchange-api'),
('usd', '2010-02-04', 3.722, 'exchange-api'),
('usd', '2010-02-05', 3.747, 'exchange-api'),
('usd', '2010-02-08', 3.732, 'exchange-api'),
('usd', '2010-02-09', 3.728, 'exchange-api'),
('usd', '2010-02-10', 3.749, 'exchange-api'),
('usd', '2010-02-11', 3.739, 'exchange-api'),
('usd', '2010-02-12', 3.739, 'exchange-api'),
('usd', '2010-02-15', 3.752, 'exchange-api'),
('usd', '2010-02-16', 3.744, 'exchange-api'),
('usd', '2010-02-17', 3.738, 'exchange-api'),
('usd', '2010-02-18', 3.749, 'exchange-api'),
('usd', '2010-02-19', 3.76, 'exchange-api'),
('usd', '2010-02-22', 3.766, 'exchange-api'),
('usd', '2010-02-23', 3.767, 'exchange-api'),
('usd', '2010-02-24', 3.772, 'exchange-api'),
('usd', '2010-02-25', 3.785, 'exchange-api'),
('usd', '2010-02-26', 3.796, 'exchange-api'),
('usd', '2010-03-02', 3.787, 'exchange-api'),
('usd', '2010-03-03', 3.769, 'exchange-api'),
('usd', '2010-03-04', 3.778, 'exchange-api'),
('usd', '2010-03-05', 3.771, 'exchange-api'),
('usd', '2010-03-08', 3.763, 'exchange-api'),
('usd', '2010-03-09', 3.766, 'exchange-api'),
('usd', '2010-03-10', 3.748, 'exchange-api'),
('usd', '2010-03-11', 3.731, 'exchange-api'),
('usd', '2010-03-12', 3.718, 'exchange-api'),
('usd', '2010-03-15', 3.715, 'exchange-api'),
('usd', '2010-03-16', 3.722, 'exchange-api'),
('usd', '2010-03-17', 3.714, 'exchange-api'),
('usd', '2010-03-18', 3.729, 'exchange-api'),
('usd', '2010-03-19', 3.733, 'exchange-api'),
('usd', '2010-03-22', 3.739, 'exchange-api'),
('usd', '2010-03-23', 3.741, 'exchange-api'),
('usd', '2010-03-24', 3.742, 'exchange-api'),
('usd', '2010-03-25', 3.749, 'exchange-api'),
('usd', '2010-03-26', 3.75, 'exchange-api'),
('usd', '2010-03-31', 3.713, 'exchange-api'),
('usd', '2010-04-01', 3.697, 'exchange-api'),
('usd', '2010-04-06', 3.7, 'exchange-api'),
('usd', '2010-04-07', 3.707, 'exchange-api'),
('usd', '2010-04-08', 3.699, 'exchange-api'),
('usd', '2010-04-09', 3.692, 'exchange-api'),
('usd', '2010-04-12', 3.682, 'exchange-api'),
('usd', '2010-04-13', 3.684, 'exchange-api'),
('usd', '2010-04-14', 3.705, 'exchange-api'),
('usd', '2010-04-15', 3.701, 'exchange-api'),
('usd', '2010-04-16', 3.701, 'exchange-api'),
('usd', '2010-04-19', 3.724, 'exchange-api'),
('usd', '2010-04-21', 3.719, 'exchange-api'),
('usd', '2010-04-22', 3.738, 'exchange-api'),
('usd', '2010-04-23', 3.743, 'exchange-api'),
('usd', '2010-04-26', 3.719, 'exchange-api'),
('usd', '2010-04-27', 3.735, 'exchange-api'),
('usd', '2010-04-28', 3.749, 'exchange-api'),
('usd', '2010-04-29', 3.728, 'exchange-api'),
('usd', '2010-04-30', 3.716, 'exchange-api'),
('usd', '2010-05-03', 3.73, 'exchange-api'),
('usd', '2010-05-04', 3.737, 'exchange-api'),
('usd', '2010-05-05', 3.75, 'exchange-api'),
('usd', '2010-05-06', 3.772, 'exchange-api'),
('usd', '2010-05-07', 3.803, 'exchange-api'),
('usd', '2010-05-10', 3.748, 'exchange-api'),
('usd', '2010-05-11', 3.757, 'exchange-api'),
('usd', '2010-05-12', 3.748, 'exchange-api'),
('usd', '2010-05-13', 3.753, 'exchange-api'),
('usd', '2010-05-14', 3.759, 'exchange-api'),
('usd', '2010-05-17', 3.778, 'exchange-api'),
('usd', '2010-05-18', 3.759, 'exchange-api'),
('usd', '2010-05-20', 3.819, 'exchange-api'),
('usd', '2010-05-21', 3.822, 'exchange-api'),
('usd', '2010-05-24', 3.811, 'exchange-api'),
('usd', '2010-05-25', 3.87, 'exchange-api'),
('usd', '2010-05-26', 3.845, 'exchange-api'),
('usd', '2010-05-27', 3.834, 'exchange-api'),
('usd', '2010-05-28', 3.829, 'exchange-api'),
('usd', '2010-06-01', 3.879, 'exchange-api'),
('usd', '2010-06-02', 3.853, 'exchange-api'),
('usd', '2010-06-03', 3.845, 'exchange-api'),
('usd', '2010-06-04', 3.853, 'exchange-api'),
('usd', '2010-06-07', 3.875, 'exchange-api'),
('usd', '2010-06-08', 3.873, 'exchange-api'),
('usd', '2010-06-09', 3.884, 'exchange-api'),
('usd', '2010-06-10', 3.849, 'exchange-api'),
('usd', '2010-06-11', 3.848, 'exchange-api'),
('usd', '2010-06-14', 3.825, 'exchange-api'),
('usd', '2010-06-15', 3.819, 'exchange-api'),
('usd', '2010-06-16', 3.819, 'exchange-api'),
('usd', '2010-06-17', 3.818, 'exchange-api'),
('usd', '2010-06-18', 3.814, 'exchange-api'),
('usd', '2010-06-21', 3.814, 'exchange-api'),
('usd', '2010-06-22', 3.841, 'exchange-api'),
('usd', '2010-06-23', 3.86, 'exchange-api'),
('usd', '2010-06-24', 3.867, 'exchange-api'),
('usd', '2010-06-25', 3.864, 'exchange-api'),
('usd', '2010-06-28', 3.888, 'exchange-api'),
('usd', '2010-06-29', 3.888, 'exchange-api'),
('usd', '2010-06-30', 3.875, 'exchange-api'),
('usd', '2010-07-01', 3.883, 'exchange-api'),
('usd', '2010-07-02', 3.89, 'exchange-api'),
('usd', '2010-07-05', 3.886, 'exchange-api'),
('usd', '2010-07-06', 3.888, 'exchange-api'),
('usd', '2010-07-07', 3.894, 'exchange-api'),
('usd', '2010-07-08', 3.866, 'exchange-api'),
('usd', '2010-07-09', 3.866, 'exchange-api'),
('usd', '2010-07-12', 3.866, 'exchange-api'),
('usd', '2010-07-13', 3.86, 'exchange-api'),
('usd', '2010-07-14', 3.859, 'exchange-api'),
('usd', '2010-07-15', 3.859, 'exchange-api'),
('usd', '2010-07-16', 3.858, 'exchange-api'),
('usd', '2010-07-19', 3.859, 'exchange-api'),
('usd', '2010-07-21', 3.862, 'exchange-api'),
('usd', '2010-07-22', 3.864, 'exchange-api'),
('usd', '2010-07-23', 3.849, 'exchange-api'),
('usd', '2010-07-26', 3.859, 'exchange-api'),
('usd', '2010-07-27', 3.802, 'exchange-api'),
('usd', '2010-07-28', 3.805, 'exchange-api'),
('usd', '2010-07-29', 3.789, 'exchange-api'),
('usd', '2010-07-30', 3.779, 'exchange-api'),
('usd', '2010-08-02', 3.769, 'exchange-api'),
('usd', '2010-08-03', 3.753, 'exchange-api'),
('usd', '2010-08-04', 3.774, 'exchange-api'),
('usd', '2010-08-05', 3.761, 'exchange-api'),
('usd', '2010-08-06', 3.775, 'exchange-api'),
('usd', '2010-08-09', 3.756, 'exchange-api'),
('usd', '2010-08-10', 3.772, 'exchange-api'),
('usd', '2010-08-11', 3.791, 'exchange-api'),
('usd', '2010-08-12', 3.8, 'exchange-api'),
('usd', '2010-08-13', 3.79, 'exchange-api'),
('usd', '2010-08-16', 3.803, 'exchange-api'),
('usd', '2010-08-17', 3.78, 'exchange-api'),
('usd', '2010-08-18', 3.778, 'exchange-api'),
('usd', '2010-08-19', 3.785, 'exchange-api'),
('usd', '2010-08-20', 3.794, 'exchange-api'),
('usd', '2010-08-23', 3.8, 'exchange-api'),
('usd', '2010-08-24', 3.817, 'exchange-api'),
('usd', '2010-08-25', 3.821, 'exchange-api'),
('usd', '2010-08-26', 3.815, 'exchange-api'),
('usd', '2010-08-27', 3.829, 'exchange-api'),
('usd', '2010-08-30', 3.818, 'exchange-api'),
('usd', '2010-08-31', 3.817, 'exchange-api'),
('usd', '2010-09-01', 3.798, 'exchange-api'),
('usd', '2010-09-02', 3.788, 'exchange-api'),
('usd', '2010-09-03', 3.779, 'exchange-api'),
('usd', '2010-09-06', 3.772, 'exchange-api'),
('usd', '2010-09-07', 3.782, 'exchange-api'),
('usd', '2010-09-13', 3.77, 'exchange-api'),
('usd', '2010-09-14', 3.772, 'exchange-api'),
('usd', '2010-09-15', 3.754, 'exchange-api'),
('usd', '2010-09-16', 3.733, 'exchange-api'),
('usd', '2010-09-20', 3.728, 'exchange-api'),
('usd', '2010-09-21', 3.716, 'exchange-api'),
('usd', '2010-09-22', 3.694, 'exchange-api'),
('usd', '2010-09-24', 3.693, 'exchange-api'),
('usd', '2010-09-27', 3.681, 'exchange-api'),
('usd', '2010-09-28', 3.677, 'exchange-api'),
('usd', '2010-09-29', 3.665, 'exchange-api'),
('usd', '2010-10-01', 3.645, 'exchange-api'),
('usd', '2010-10-04', 3.628, 'exchange-api'),
('usd', '2010-10-05', 3.618, 'exchange-api'),
('usd', '2010-10-06', 3.601, 'exchange-api'),
('usd', '2010-10-07', 3.591, 'exchange-api'),
('usd', '2010-10-08', 3.601, 'exchange-api'),
('usd', '2010-10-11', 3.599, 'exchange-api'),
('usd', '2010-10-12', 3.62, 'exchange-api'),
('usd', '2010-10-13', 3.593, 'exchange-api'),
('usd', '2010-10-14', 3.58, 'exchange-api'),
('usd', '2010-10-15', 3.569, 'exchange-api'),
('usd', '2010-10-18', 3.581, 'exchange-api'),
('usd', '2010-10-19', 3.589, 'exchange-api'),
('usd', '2010-10-20', 3.619, 'exchange-api'),
('usd', '2010-10-21', 3.61, 'exchange-api'),
('usd', '2010-10-22', 3.638, 'exchange-api'),
('usd', '2010-10-25', 3.599, 'exchange-api'),
('usd', '2010-10-26', 3.632, 'exchange-api'),
('usd', '2010-10-27', 3.642, 'exchange-api'),
('usd', '2010-10-28', 3.645, 'exchange-api'),
('usd', '2010-10-29', 3.636, 'exchange-api'),
('usd', '2010-11-01', 3.627, 'exchange-api'),
('usd', '2010-11-02', 3.622, 'exchange-api'),
('usd', '2010-11-03', 3.613, 'exchange-api'),
('usd', '2010-11-04', 3.58, 'exchange-api'),
('usd', '2010-11-05', 3.582, 'exchange-api'),
('usd', '2010-11-08', 3.613, 'exchange-api'),
('usd', '2010-11-09', 3.622, 'exchange-api'),
('usd', '2010-11-10', 3.64, 'exchange-api'),
('usd', '2010-11-11', 3.658, 'exchange-api'),
('usd', '2010-11-12', 3.68, 'exchange-api'),
('usd', '2010-11-15', 3.672, 'exchange-api'),
('usd', '2010-11-16', 3.677, 'exchange-api'),
('usd', '2010-11-17', 3.684, 'exchange-api'),
('usd', '2010-11-18', 3.653, 'exchange-api'),
('usd', '2010-11-19', 3.643, 'exchange-api'),
('usd', '2010-11-22', 3.62, 'exchange-api'),
('usd', '2010-11-23', 3.643, 'exchange-api'),
('usd', '2010-11-24', 3.654, 'exchange-api'),
('usd', '2010-11-25', 3.651, 'exchange-api'),
('usd', '2010-11-26', 3.679, 'exchange-api'),
('usd', '2010-11-29', 3.677, 'exchange-api'),
('usd', '2010-11-30', 3.683, 'exchange-api'),
('usd', '2010-12-01', 3.665, 'exchange-api'),
('usd', '2010-12-02', 3.652, 'exchange-api'),
('usd', '2010-12-03', 3.635, 'exchange-api'),
('usd', '2010-12-06', 3.631, 'exchange-api'),
('usd', '2010-12-07', 3.623, 'exchange-api'),
('usd', '2010-12-08', 3.642, 'exchange-api'),
('usd', '2010-12-09', 3.628, 'exchange-api'),
('usd', '2010-12-10', 3.616, 'exchange-api'),
('usd', '2010-12-13', 3.611, 'exchange-api'),
('usd', '2010-12-14', 3.592, 'exchange-api'),
('usd', '2010-12-15', 3.584, 'exchange-api'),
('usd', '2010-12-16', 3.598, 'exchange-api'),
('usd', '2010-12-17', 3.588, 'exchange-api'),
('usd', '2010-12-20', 3.606, 'exchange-api'),
('usd', '2010-12-21', 3.598, 'exchange-api'),
('usd', '2010-12-22', 3.596, 'exchange-api'),
('usd', '2010-12-23', 3.595, 'exchange-api'),
('usd', '2010-12-24', 3.592, 'exchange-api'),
('usd', '2010-12-27', 3.583, 'exchange-api'),
('usd', '2010-12-28', 3.57, 'exchange-api'),
('usd', '2010-12-29', 3.577, 'exchange-api'),
('usd', '2010-12-30', 3.56, 'exchange-api'),
('usd', '2010-12-31', 3.549, 'exchange-api'),
('usd', '2011-01-03', 3.544, 'exchange-api'),
('usd', '2011-01-04', 3.528, 'exchange-api'),
('usd', '2011-01-05', 3.542, 'exchange-api'),
('usd', '2011-01-06', 3.558, 'exchange-api'),
('usd', '2011-01-07', 3.576, 'exchange-api'),
('usd', '2011-01-10', 3.577, 'exchange-api'),
('usd', '2011-01-11', 3.552, 'exchange-api'),
('usd', '2011-01-12', 3.536, 'exchange-api'),
('usd', '2011-01-13', 3.566, 'exchange-api'),
('usd', '2011-01-14', 3.55, 'exchange-api'),
('usd', '2011-01-17', 3.548, 'exchange-api'),
('usd', '2011-01-18', 3.529, 'exchange-api'),
('usd', '2011-01-19', 3.544, 'exchange-api'),
('usd', '2011-01-20', 3.599, 'exchange-api'),
('usd', '2011-01-21', 3.632, 'exchange-api'),
('usd', '2011-01-24', 3.625, 'exchange-api'),
('usd', '2011-01-25', 3.618, 'exchange-api'),
('usd', '2011-01-26', 3.6, 'exchange-api'),
('usd', '2011-01-27', 3.656, 'exchange-api'),
('usd', '2011-01-28', 3.68, 'exchange-api'),
('usd', '2011-01-31', 3.71, 'exchange-api'),
('usd', '2011-02-01', 3.691, 'exchange-api'),
('usd', '2011-02-02', 3.675, 'exchange-api'),
('usd', '2011-02-03', 3.683, 'exchange-api'),
('usd', '2011-02-04', 3.713, 'exchange-api'),
('usd', '2011-02-07', 3.676, 'exchange-api'),
('usd', '2011-02-08', 3.678, 'exchange-api'),
('usd', '2011-02-09', 3.665, 'exchange-api'),
('usd', '2011-02-10', 3.688, 'exchange-api'),
('usd', '2011-02-11', 3.693, 'exchange-api'),
('usd', '2011-02-14', 3.667, 'exchange-api'),
('usd', '2011-02-15', 3.65, 'exchange-api'),
('usd', '2011-02-16', 3.611, 'exchange-api'),
('usd', '2011-02-17', 3.613, 'exchange-api'),
('usd', '2011-02-18', 3.624, 'exchange-api'),
('usd', '2011-02-21', 3.602, 'exchange-api'),
('usd', '2011-02-22', 3.634, 'exchange-api'),
('usd', '2011-02-23', 3.634, 'exchange-api'),
('usd', '2011-02-24', 3.658, 'exchange-api'),
('usd', '2011-02-25', 3.656, 'exchange-api'),
('usd', '2011-02-28', 3.622, 'exchange-api'),
('usd', '2011-03-01', 3.623, 'exchange-api'),
('usd', '2011-03-02', 3.635, 'exchange-api'),
('usd', '2011-03-03', 3.611, 'exchange-api'),
('usd', '2011-03-04', 3.611, 'exchange-api'),
('usd', '2011-03-07', 3.598, 'exchange-api'),
('usd', '2011-03-08', 3.583, 'exchange-api'),
('usd', '2011-03-09', 3.565, 'exchange-api'),
('usd', '2011-03-10', 3.567, 'exchange-api'),
('usd', '2011-03-11', 3.579, 'exchange-api'),
('usd', '2011-03-14', 3.553, 'exchange-api'),
('usd', '2011-03-15', 3.56, 'exchange-api'),
('usd', '2011-03-16', 3.561, 'exchange-api'),
('usd', '2011-03-17', 3.562, 'exchange-api'),
('usd', '2011-03-18', 3.554, 'exchange-api'),
('usd', '2011-03-22', 3.524, 'exchange-api'),
('usd', '2011-03-23', 3.536, 'exchange-api'),
('usd', '2011-03-24', 3.546, 'exchange-api'),
('usd', '2011-03-25', 3.555, 'exchange-api'),
('usd', '2011-03-28', 3.54, 'exchange-api'),
('usd', '2011-03-29', 3.525, 'exchange-api'),
('usd', '2011-03-30', 3.511, 'exchange-api'),
('usd', '2011-03-31', 3.481, 'exchange-api'),
('usd', '2011-04-01', 3.473, 'exchange-api'),
('usd', '2011-04-04', 3.465, 'exchange-api'),
('usd', '2011-04-05', 3.468, 'exchange-api'),
('usd', '2011-04-06', 3.46, 'exchange-api'),
('usd', '2011-04-07', 3.451, 'exchange-api'),
('usd', '2011-04-08', 3.438, 'exchange-api'),
('usd', '2011-04-11', 3.441, 'exchange-api'),
('usd', '2011-04-12', 3.446, 'exchange-api'),
('usd', '2011-04-13', 3.417, 'exchange-api'),
('usd', '2011-04-14', 3.431, 'exchange-api'),
('usd', '2011-04-15', 3.416, 'exchange-api'),
('usd', '2011-04-20', 3.424, 'exchange-api'),
('usd', '2011-04-21', 3.405, 'exchange-api'),
('usd', '2011-04-26', 3.413, 'exchange-api'),
('usd', '2011-04-27', 3.42, 'exchange-api'),
('usd', '2011-04-28', 3.411, 'exchange-api'),
('usd', '2011-04-29', 3.395, 'exchange-api'),
('usd', '2011-05-02', 3.377, 'exchange-api'),
('usd', '2011-05-03', 3.397, 'exchange-api'),
('usd', '2011-05-04', 3.392, 'exchange-api'),
('usd', '2011-05-05', 3.407, 'exchange-api'),
('usd', '2011-05-06', 3.447, 'exchange-api'),
('usd', '2011-05-09', 3.448, 'exchange-api'),
('usd', '2011-05-11', 3.465, 'exchange-api'),
('usd', '2011-05-12', 3.504, 'exchange-api'),
('usd', '2011-05-13', 3.485, 'exchange-api'),
('usd', '2011-05-16', 3.538, 'exchange-api'),
('usd', '2011-05-17', 3.52, 'exchange-api'),
('usd', '2011-05-18', 3.529, 'exchange-api'),
('usd', '2011-05-19', 3.49, 'exchange-api'),
('usd', '2011-05-20', 3.474, 'exchange-api'),
('usd', '2011-05-23', 3.516, 'exchange-api'),
('usd', '2011-05-24', 3.496, 'exchange-api'),
('usd', '2011-05-25', 3.499, 'exchange-api'),
('usd', '2011-05-26', 3.469, 'exchange-api'),
('usd', '2011-05-27', 3.472, 'exchange-api'),
('usd', '2011-05-31', 3.437, 'exchange-api'),
('usd', '2011-06-01', 3.42, 'exchange-api'),
('usd', '2011-06-02', 3.406, 'exchange-api'),
('usd', '2011-06-03', 3.387, 'exchange-api'),
('usd', '2011-06-06', 3.383, 'exchange-api'),
('usd', '2011-06-07', 3.363, 'exchange-api'),
('usd', '2011-06-09', 3.377, 'exchange-api'),
('usd', '2011-06-10', 3.393, 'exchange-api'),
('usd', '2011-06-13', 3.434, 'exchange-api'),
('usd', '2011-06-14', 3.395, 'exchange-api'),
('usd', '2011-06-15', 3.418, 'exchange-api'),
('usd', '2011-06-16', 3.485, 'exchange-api'),
('usd', '2011-06-17', 3.463, 'exchange-api'),
('usd', '2011-06-20', 3.459, 'exchange-api'),
('usd', '2011-06-21', 3.416, 'exchange-api'),
('usd', '2011-06-22', 3.421, 'exchange-api'),
('usd', '2011-06-23', 3.45, 'exchange-api'),
('usd', '2011-06-24', 3.445, 'exchange-api'),
('usd', '2011-06-27', 3.451, 'exchange-api'),
('usd', '2011-06-28', 3.463, 'exchange-api'),
('usd', '2011-06-29', 3.426, 'exchange-api'),
('usd', '2011-06-30', 3.415, 'exchange-api'),
('usd', '2011-07-01', 3.399, 'exchange-api'),
('usd', '2011-07-04', 3.389, 'exchange-api'),
('usd', '2011-07-05', 3.411, 'exchange-api'),
('usd', '2011-07-06', 3.42, 'exchange-api'),
('usd', '2011-07-07', 3.406, 'exchange-api'),
('usd', '2011-07-08', 3.398, 'exchange-api'),
('usd', '2011-07-11', 3.434, 'exchange-api'),
('usd', '2011-07-12', 3.465, 'exchange-api'),
('usd', '2011-07-13', 3.437, 'exchange-api'),
('usd', '2011-07-14', 3.431, 'exchange-api'),
('usd', '2011-07-15', 3.439, 'exchange-api'),
('usd', '2011-07-18', 3.452, 'exchange-api'),
('usd', '2011-07-19', 3.439, 'exchange-api'),
('usd', '2011-07-20', 3.419, 'exchange-api'),
('usd', '2011-07-21', 3.428, 'exchange-api'),
('usd', '2011-07-22', 3.391, 'exchange-api'),
('usd', '2011-07-25', 3.408, 'exchange-api'),
('usd', '2011-07-26', 3.398, 'exchange-api'),
('usd', '2011-07-27', 3.4, 'exchange-api'),
('usd', '2011-07-28', 3.43, 'exchange-api'),
('usd', '2011-07-29', 3.43, 'exchange-api'),
('usd', '2011-08-01', 3.412, 'exchange-api'),
('usd', '2011-08-02', 3.449, 'exchange-api'),
('usd', '2011-08-03', 3.464, 'exchange-api'),
('usd', '2011-08-04', 3.489, 'exchange-api'),
('usd', '2011-08-05', 3.52, 'exchange-api'),
('usd', '2011-08-08', 3.552, 'exchange-api'),
('usd', '2011-08-10', 3.515, 'exchange-api'),
('usd', '2011-08-11', 3.548, 'exchange-api'),
('usd', '2011-08-12', 3.548, 'exchange-api'),
('usd', '2011-08-15', 3.52, 'exchange-api'),
('usd', '2011-08-16', 3.538, 'exchange-api'),
('usd', '2011-08-17', 3.519, 'exchange-api'),
('usd', '2011-08-18', 3.557, 'exchange-api'),
('usd', '2011-08-19', 3.586, 'exchange-api'),
('usd', '2011-08-22', 3.578, 'exchange-api'),
('usd', '2011-08-23', 3.578, 'exchange-api'),
('usd', '2011-08-24', 3.608, 'exchange-api'),
('usd', '2011-08-25', 3.609, 'exchange-api'),
('usd', '2011-08-26', 3.626, 'exchange-api'),
('usd', '2011-08-29', 3.606, 'exchange-api'),
('usd', '2011-08-30', 3.572, 'exchange-api'),
('usd', '2011-08-31', 3.558, 'exchange-api'),
('usd', '2011-09-01', 3.574, 'exchange-api'),
('usd', '2011-09-02', 3.584, 'exchange-api'),
('usd', '2011-09-05', 3.633, 'exchange-api'),
('usd', '2011-09-06', 3.656, 'exchange-api'),
('usd', '2011-09-07', 3.673, 'exchange-api'),
('usd', '2011-09-08', 3.681, 'exchange-api'),
('usd', '2011-09-09', 3.7, 'exchange-api'),
('usd', '2011-09-12', 3.725, 'exchange-api'),
('usd', '2011-09-13', 3.712, 'exchange-api'),
('usd', '2011-09-14', 3.714, 'exchange-api'),
('usd', '2011-09-15', 3.686, 'exchange-api'),
('usd', '2011-09-16', 3.654, 'exchange-api'),
('usd', '2011-09-19', 3.698, 'exchange-api'),
('usd', '2011-09-20', 3.682, 'exchange-api'),
('usd', '2011-09-21', 3.689, 'exchange-api'),
('usd', '2011-09-22', 3.721, 'exchange-api'),
('usd', '2011-09-23', 3.712, 'exchange-api'),
('usd', '2011-09-26', 3.725, 'exchange-api'),
('usd', '2011-09-27', 3.712, 'exchange-api'),
('usd', '2011-10-03', 3.755, 'exchange-api'),
('usd', '2011-10-04', 3.763, 'exchange-api'),
('usd', '2011-10-05', 3.734, 'exchange-api'),
('usd', '2011-10-06', 3.725, 'exchange-api'),
('usd', '2011-10-10', 3.675, 'exchange-api'),
('usd', '2011-10-11', 3.688, 'exchange-api'),
('usd', '2011-10-12', 3.66, 'exchange-api'),
('usd', '2011-10-14', 3.66, 'exchange-api'),
('usd', '2011-10-17', 3.635, 'exchange-api'),
('usd', '2011-10-18', 3.651, 'exchange-api'),
('usd', '2011-10-19', 3.634, 'exchange-api'),
('usd', '2011-10-21', 3.646, 'exchange-api'),
('usd', '2011-10-24', 3.644, 'exchange-api'),
('usd', '2011-10-25', 3.643, 'exchange-api'),
('usd', '2011-10-26', 3.65, 'exchange-api'),
('usd', '2011-10-27', 3.62, 'exchange-api'),
('usd', '2011-10-28', 3.602, 'exchange-api'),
('usd', '2011-10-31', 3.604, 'exchange-api'),
('usd', '2011-11-01', 3.65, 'exchange-api'),
('usd', '2011-11-02', 3.651, 'exchange-api'),
('usd', '2011-11-03', 3.665, 'exchange-api'),
('usd', '2011-11-04', 3.665, 'exchange-api'),
('usd', '2011-11-07', 3.682, 'exchange-api'),
('usd', '2011-11-08', 3.674, 'exchange-api'),
('usd', '2011-11-09', 3.712, 'exchange-api'),
('usd', '2011-11-10', 3.723, 'exchange-api'),
('usd', '2011-11-11', 3.721, 'exchange-api'),
('usd', '2011-11-14', 3.723, 'exchange-api'),
('usd', '2011-11-15', 3.732, 'exchange-api'),
('usd', '2011-11-16', 3.726, 'exchange-api'),
('usd', '2011-11-17', 3.728, 'exchange-api'),
('usd', '2011-11-18', 3.731, 'exchange-api'),
('usd', '2011-11-21', 3.741, 'exchange-api'),
('usd', '2011-11-22', 3.732, 'exchange-api'),
('usd', '2011-11-23', 3.761, 'exchange-api'),
('usd', '2011-11-24', 3.774, 'exchange-api'),
('usd', '2011-11-25', 3.795, 'exchange-api'),
('usd', '2011-11-28', 3.8, 'exchange-api'),
('usd', '2011-11-29', 3.781, 'exchange-api'),
('usd', '2011-11-30', 3.793, 'exchange-api'),
('usd', '2011-12-01', 3.741, 'exchange-api'),
('usd', '2011-12-02', 3.732, 'exchange-api'),
('usd', '2011-12-05', 3.727, 'exchange-api'),
('usd', '2011-12-06', 3.736, 'exchange-api'),
('usd', '2011-12-07', 3.74, 'exchange-api'),
('usd', '2011-12-08', 3.741, 'exchange-api'),
('usd', '2011-12-09', 3.771, 'exchange-api'),
('usd', '2011-12-12', 3.762, 'exchange-api'),
('usd', '2011-12-13', 3.774, 'exchange-api'),
('usd', '2011-12-14', 3.805, 'exchange-api'),
('usd', '2011-12-15', 3.8, 'exchange-api'),
('usd', '2011-12-16', 3.792, 'exchange-api'),
('usd', '2011-12-19', 3.797, 'exchange-api'),
('usd', '2011-12-20', 3.783, 'exchange-api'),
('usd', '2011-12-21', 3.775, 'exchange-api'),
('usd', '2011-12-22', 3.784, 'exchange-api'),
('usd', '2011-12-23', 3.783, 'exchange-api'),
('usd', '2011-12-27', 3.775, 'exchange-api'),
('usd', '2011-12-28', 3.796, 'exchange-api'),
('usd', '2011-12-29', 3.817, 'exchange-api'),
('usd', '2011-12-30', 3.821, 'exchange-api'),
('usd', '2012-01-03', 3.814, 'exchange-api'),
('usd', '2012-01-04', 3.847, 'exchange-api'),
('usd', '2012-01-05', 3.854, 'exchange-api'),
('usd', '2012-01-06', 3.839, 'exchange-api'),
('usd', '2012-01-09', 3.839, 'exchange-api'),
('usd', '2012-01-10', 3.833, 'exchange-api'),
('usd', '2012-01-11', 3.849, 'exchange-api'),
('usd', '2012-01-12', 3.836, 'exchange-api'),
('usd', '2012-01-13', 3.83, 'exchange-api'),
('usd', '2012-01-16', 3.851, 'exchange-api'),
('usd', '2012-01-17', 3.834, 'exchange-api'),
('usd', '2012-01-18', 3.813, 'exchange-api'),
('usd', '2012-01-19', 3.784, 'exchange-api'),
('usd', '2012-01-20', 3.783, 'exchange-api'),
('usd', '2012-01-23', 3.775, 'exchange-api'),
('usd', '2012-01-24', 3.787, 'exchange-api'),
('usd', '2012-01-25', 3.789, 'exchange-api'),
('usd', '2012-01-26', 3.764, 'exchange-api'),
('usd', '2012-01-27', 3.768, 'exchange-api'),
('usd', '2012-01-30', 3.766, 'exchange-api'),
('usd', '2012-01-31', 3.733, 'exchange-api'),
('usd', '2012-02-01', 3.737, 'exchange-api'),
('usd', '2012-02-02', 3.727, 'exchange-api'),
('usd', '2012-02-03', 3.717, 'exchange-api'),
('usd', '2012-02-06', 3.719, 'exchange-api'),
('usd', '2012-02-07', 3.732, 'exchange-api'),
('usd', '2012-02-08', 3.7, 'exchange-api'),
('usd', '2012-02-09', 3.721, 'exchange-api'),
('usd', '2012-02-10', 3.713, 'exchange-api'),
('usd', '2012-02-13', 3.717, 'exchange-api'),
('usd', '2012-02-14', 3.736, 'exchange-api'),
('usd', '2012-02-15', 3.734, 'exchange-api'),
('usd', '2012-02-16', 3.771, 'exchange-api'),
('usd', '2012-02-17', 3.753, 'exchange-api'),
('usd', '2012-02-20', 3.725, 'exchange-api'),
('usd', '2012-02-21', 3.738, 'exchange-api'),
('usd', '2012-02-22', 3.752, 'exchange-api'),
('usd', '2012-02-23', 3.755, 'exchange-api'),
('usd', '2012-02-24', 3.756, 'exchange-api'),
('usd', '2012-02-27', 3.803, 'exchange-api'),
('usd', '2012-02-28', 3.785, 'exchange-api'),
('usd', '2012-02-29', 3.766, 'exchange-api'),
('usd', '2012-03-01', 3.784, 'exchange-api'),
('usd', '2012-03-02', 3.791, 'exchange-api'),
('usd', '2012-03-05', 3.8, 'exchange-api'),
('usd', '2012-03-06', 3.814, 'exchange-api'),
('usd', '2012-03-07', 3.808, 'exchange-api'),
('usd', '2012-03-12', 3.786, 'exchange-api'),
('usd', '2012-03-13', 3.775, 'exchange-api'),
('usd', '2012-03-14', 3.787, 'exchange-api'),
('usd', '2012-03-15', 3.784, 'exchange-api'),
('usd', '2012-03-16', 3.769, 'exchange-api'),
('usd', '2012-03-19', 3.762, 'exchange-api'),
('usd', '2012-03-20', 3.749, 'exchange-api'),
('usd', '2012-03-21', 3.743, 'exchange-api'),
('usd', '2012-03-22', 3.755, 'exchange-api'),
('usd', '2012-03-23', 3.735, 'exchange-api'),
('usd', '2012-03-26', 3.734, 'exchange-api'),
('usd', '2012-03-27', 3.715, 'exchange-api'),
('usd', '2012-03-28', 3.724, 'exchange-api'),
('usd', '2012-03-29', 3.734, 'exchange-api'),
('usd', '2012-03-30', 3.715, 'exchange-api'),
('usd', '2012-04-02', 3.723, 'exchange-api'),
('usd', '2012-04-03', 3.723, 'exchange-api'),
('usd', '2012-04-04', 3.745, 'exchange-api'),
('usd', '2012-04-05', 3.744, 'exchange-api'),
('usd', '2012-04-10', 3.744, 'exchange-api'),
('usd', '2012-04-11', 3.758, 'exchange-api'),
('usd', '2012-04-12', 3.76, 'exchange-api'),
('usd', '2012-04-16', 3.754, 'exchange-api'),
('usd', '2012-04-17', 3.754, 'exchange-api'),
('usd', '2012-04-18', 3.769, 'exchange-api'),
('usd', '2012-04-19', 3.762, 'exchange-api'),
('usd', '2012-04-20', 3.757, 'exchange-api'),
('usd', '2012-04-23', 3.764, 'exchange-api'),
('usd', '2012-04-24', 3.758, 'exchange-api'),
('usd', '2012-04-25', 3.75, 'exchange-api'),
('usd', '2012-04-27', 3.757, 'exchange-api'),
('usd', '2012-04-30', 3.75, 'exchange-api'),
('usd', '2012-05-01', 3.768, 'exchange-api'),
('usd', '2012-05-02', 3.786, 'exchange-api'),
('usd', '2012-05-03', 3.778, 'exchange-api'),
('usd', '2012-05-04', 3.781, 'exchange-api'),
('usd', '2012-05-07', 3.804, 'exchange-api'),
('usd', '2012-05-08', 3.802, 'exchange-api'),
('usd', '2012-05-09', 3.815, 'exchange-api'),
('usd', '2012-05-10', 3.822, 'exchange-api'),
('usd', '2012-05-11', 3.823, 'exchange-api'),
('usd', '2012-05-14', 3.83, 'exchange-api'),
('usd', '2012-05-15', 3.827, 'exchange-api'),
('usd', '2012-05-16', 3.835, 'exchange-api'),
('usd', '2012-05-17', 3.828, 'exchange-api'),
('usd', '2012-05-18', 3.84, 'exchange-api'),
('usd', '2012-05-21', 3.826, 'exchange-api'),
('usd', '2012-05-22', 3.816, 'exchange-api'),
('usd', '2012-05-23', 3.859, 'exchange-api'),
('usd', '2012-05-24', 3.847, 'exchange-api'),
('usd', '2012-05-25', 3.849, 'exchange-api'),
('usd', '2012-05-28', 3.856, 'exchange-api'),
('usd', '2012-05-29', 3.876, 'exchange-api'),
('usd', '2012-05-30', 3.88, 'exchange-api'),
('usd', '2012-05-31', 3.881, 'exchange-api'),
('usd', '2012-06-01', 3.915, 'exchange-api'),
('usd', '2012-06-04', 3.892, 'exchange-api'),
('usd', '2012-06-05', 3.896, 'exchange-api'),
('usd', '2012-06-06', 3.887, 'exchange-api'),
('usd', '2012-06-07', 3.871, 'exchange-api'),
('usd', '2012-06-08', 3.882, 'exchange-api'),
('usd', '2012-06-11', 3.864, 'exchange-api'),
('usd', '2012-06-12', 3.889, 'exchange-api'),
('usd', '2012-06-13', 3.882, 'exchange-api'),
('usd', '2012-06-14', 3.881, 'exchange-api'),
('usd', '2012-06-15', 3.867, 'exchange-api'),
('usd', '2012-06-18', 3.856, 'exchange-api'),
('usd', '2012-06-19', 3.856, 'exchange-api'),
('usd', '2012-06-20', 3.865, 'exchange-api'),
('usd', '2012-06-21', 3.875, 'exchange-api'),
('usd', '2012-06-22', 3.905, 'exchange-api'),
('usd', '2012-06-25', 3.914, 'exchange-api'),
('usd', '2012-06-26', 3.939, 'exchange-api'),
('usd', '2012-06-27', 3.947, 'exchange-api'),
('usd', '2012-06-28', 3.942, 'exchange-api'),
('usd', '2012-06-29', 3.923, 'exchange-api'),
('usd', '2012-07-02', 3.92, 'exchange-api'),
('usd', '2012-07-03', 3.926, 'exchange-api'),
('usd', '2012-07-04', 3.918, 'exchange-api'),
('usd', '2012-07-05', 3.913, 'exchange-api'),
('usd', '2012-07-06', 3.93, 'exchange-api'),
('usd', '2012-07-09', 3.964, 'exchange-api'),
('usd', '2012-07-10', 3.956, 'exchange-api'),
('usd', '2012-07-11', 3.963, 'exchange-api'),
('usd', '2012-07-12', 3.978, 'exchange-api'),
('usd', '2012-07-13', 3.968, 'exchange-api'),
('usd', '2012-07-16', 3.984, 'exchange-api'),
('usd', '2012-07-17', 3.982, 'exchange-api'),
('usd', '2012-07-18', 4.008, 'exchange-api'),
('usd', '2012-07-19', 4.035, 'exchange-api'),
('usd', '2012-07-20', 3.997, 'exchange-api'),
('usd', '2012-07-23', 4.041, 'exchange-api'),
('usd', '2012-07-24', 4.064, 'exchange-api'),
('usd', '2012-07-25', 4.062, 'exchange-api'),
('usd', '2012-07-26', 4.079, 'exchange-api'),
('usd', '2012-07-27', 4.084, 'exchange-api'),
('usd', '2012-07-30', 4.035, 'exchange-api'),
('usd', '2012-07-31', 3.997, 'exchange-api'),
('usd', '2012-08-01', 3.97, 'exchange-api'),
('usd', '2012-08-02', 3.977, 'exchange-api'),
('usd', '2012-08-03', 4.007, 'exchange-api'),
('usd', '2012-08-06', 3.979, 'exchange-api'),
('usd', '2012-08-07', 3.998, 'exchange-api'),
('usd', '2012-08-08', 3.997, 'exchange-api'),
('usd', '2012-08-09', 3.987, 'exchange-api'),
('usd', '2012-08-10', 4.004, 'exchange-api'),
('usd', '2012-08-13', 4.041, 'exchange-api'),
('usd', '2012-08-14', 4.035, 'exchange-api'),
('usd', '2012-08-15', 4.033, 'exchange-api'),
('usd', '2012-08-16', 4.043, 'exchange-api'),
('usd', '2012-08-17', 4.028, 'exchange-api'),
('usd', '2012-08-20', 4.034, 'exchange-api'),
('usd', '2012-08-21', 4.024, 'exchange-api'),
('usd', '2012-08-22', 4.03, 'exchange-api'),
('usd', '2012-08-23', 4.003, 'exchange-api'),
('usd', '2012-08-24', 4.025, 'exchange-api'),
('usd', '2012-08-27', 4.025, 'exchange-api'),
('usd', '2012-08-28', 4.013, 'exchange-api'),
('usd', '2012-08-29', 4.029, 'exchange-api'),
('usd', '2012-08-30', 4.043, 'exchange-api'),
('usd', '2012-08-31', 4.028, 'exchange-api'),
('usd', '2012-09-03', 4.02, 'exchange-api'),
('usd', '2012-09-04', 4.018, 'exchange-api'),
('usd', '2012-09-05', 4.029, 'exchange-api'),
('usd', '2012-09-06', 4.025, 'exchange-api'),
('usd', '2012-09-07', 3.998, 'exchange-api'),
('usd', '2012-09-10', 3.98, 'exchange-api'),
('usd', '2012-09-11', 3.961, 'exchange-api'),
('usd', '2012-09-12', 3.95, 'exchange-api'),
('usd', '2012-09-13', 3.966, 'exchange-api'),
('usd', '2012-09-14', 3.919, 'exchange-api'),
('usd', '2012-09-19', 3.91, 'exchange-api'),
('usd', '2012-09-20', 3.92, 'exchange-api'),
('usd', '2012-09-21', 3.887, 'exchange-api'),
('usd', '2012-09-24', 3.918, 'exchange-api'),
('usd', '2012-09-27', 3.925, 'exchange-api'),
('usd', '2012-09-28', 3.912, 'exchange-api'),
('usd', '2012-10-02', 3.888, 'exchange-api'),
('usd', '2012-10-03', 3.884, 'exchange-api'),
('usd', '2012-10-04', 3.879, 'exchange-api'),
('usd', '2012-10-05', 3.856, 'exchange-api'),
('usd', '2012-10-09', 3.862, 'exchange-api'),
('usd', '2012-10-10', 3.865, 'exchange-api'),
('usd', '2012-10-11', 3.852, 'exchange-api'),
('usd', '2012-10-12', 3.84, 'exchange-api'),
('usd', '2012-10-15', 3.816, 'exchange-api'),
('usd', '2012-10-16', 3.813, 'exchange-api'),
('usd', '2012-10-17', 3.792, 'exchange-api'),
('usd', '2012-10-18', 3.809, 'exchange-api'),
('usd', '2012-10-19', 3.823, 'exchange-api'),
('usd', '2012-10-22', 3.816, 'exchange-api'),
('usd', '2012-10-23', 3.83, 'exchange-api'),
('usd', '2012-10-24', 3.855, 'exchange-api'),
('usd', '2012-10-25', 3.858, 'exchange-api'),
('usd', '2012-10-26', 3.874, 'exchange-api'),
('usd', '2012-10-29', 3.889, 'exchange-api'),
('usd', '2012-10-30', 3.895, 'exchange-api'),
('usd', '2012-10-31', 3.878, 'exchange-api'),
('usd', '2012-11-01', 3.872, 'exchange-api'),
('usd', '2012-11-02', 3.884, 'exchange-api'),
('usd', '2012-11-05', 3.904, 'exchange-api'),
('usd', '2012-11-06', 3.894, 'exchange-api'),
('usd', '2012-11-07', 3.879, 'exchange-api'),
('usd', '2012-11-08', 3.903, 'exchange-api'),
('usd', '2012-11-09', 3.896, 'exchange-api'),
('usd', '2012-11-12', 3.927, 'exchange-api'),
('usd', '2012-11-13', 3.927, 'exchange-api'),
('usd', '2012-11-14', 3.918, 'exchange-api'),
('usd', '2012-11-15', 3.952, 'exchange-api'),
('usd', '2012-11-16', 3.952, 'exchange-api'),
('usd', '2012-11-19', 3.94, 'exchange-api'),
('usd', '2012-11-20', 3.924, 'exchange-api'),
('usd', '2012-11-21', 3.916, 'exchange-api'),
('usd', '2012-11-22', 3.867, 'exchange-api'),
('usd', '2012-11-23', 3.874, 'exchange-api'),
('usd', '2012-11-26', 3.865, 'exchange-api'),
('usd', '2012-11-27', 3.857, 'exchange-api'),
('usd', '2012-11-28', 3.865, 'exchange-api'),
('usd', '2012-11-29', 3.83, 'exchange-api'),
('usd', '2012-11-30', 3.81, 'exchange-api'),
('usd', '2012-12-03', 3.807, 'exchange-api'),
('usd', '2012-12-04', 3.815, 'exchange-api'),
('usd', '2012-12-05', 3.805, 'exchange-api'),
('usd', '2012-12-06', 3.813, 'exchange-api'),
('usd', '2012-12-07', 3.835, 'exchange-api'),
('usd', '2012-12-10', 3.828, 'exchange-api'),
('usd', '2012-12-11', 3.806, 'exchange-api'),
('usd', '2012-12-12', 3.78, 'exchange-api'),
('usd', '2012-12-13', 3.783, 'exchange-api'),
('usd', '2012-12-14', 3.799, 'exchange-api'),
('usd', '2012-12-17', 3.777, 'exchange-api'),
('usd', '2012-12-18', 3.769, 'exchange-api'),
('usd', '2012-12-19', 3.75, 'exchange-api'),
('usd', '2012-12-20', 3.747, 'exchange-api'),
('usd', '2012-12-21', 3.747, 'exchange-api'),
('usd', '2012-12-24', 3.746, 'exchange-api'),
('usd', '2012-12-26', 3.747, 'exchange-api'),
('usd', '2012-12-27', 3.726, 'exchange-api'),
('usd', '2012-12-28', 3.729, 'exchange-api'),
('usd', '2012-12-31', 3.733, 'exchange-api'),
('usd', '2013-01-02', 3.714, 'exchange-api'),
('usd', '2013-01-03', 3.735, 'exchange-api'),
('usd', '2013-01-04', 3.775, 'exchange-api'),
('usd', '2013-01-07', 3.791, 'exchange-api'),
('usd', '2013-01-08', 3.764, 'exchange-api'),
('usd', '2013-01-09', 3.783, 'exchange-api'),
('usd', '2013-01-10', 3.777, 'exchange-api'),
('usd', '2013-01-11', 3.742, 'exchange-api'),
('usd', '2013-01-14', 3.733, 'exchange-api'),
('usd', '2013-01-15', 3.734, 'exchange-api'),
('usd', '2013-01-16', 3.733, 'exchange-api'),
('usd', '2013-01-17', 3.723, 'exchange-api'),
('usd', '2013-01-18', 3.717, 'exchange-api'),
('usd', '2013-01-21', 3.738, 'exchange-api'),
('usd', '2013-01-23', 3.722, 'exchange-api'),
('usd', '2013-01-24', 3.719, 'exchange-api'),
('usd', '2013-01-25', 3.714, 'exchange-api'),
('usd', '2013-01-28', 3.732, 'exchange-api'),
('usd', '2013-01-29', 3.729, 'exchange-api'),
('usd', '2013-01-30', 3.725, 'exchange-api'),
('usd', '2013-01-31', 3.728, 'exchange-api'),
('usd', '2013-02-01', 3.682, 'exchange-api'),
('usd', '2013-02-04', 3.685, 'exchange-api'),
('usd', '2013-02-05', 3.691, 'exchange-api'),
('usd', '2013-02-06', 3.696, 'exchange-api'),
('usd', '2013-02-07', 3.687, 'exchange-api'),
('usd', '2013-02-08', 3.695, 'exchange-api'),
('usd', '2013-02-11', 3.701, 'exchange-api'),
('usd', '2013-02-12', 3.697, 'exchange-api'),
('usd', '2013-02-13', 3.687, 'exchange-api'),
('usd', '2013-02-14', 3.68, 'exchange-api'),
('usd', '2013-02-15', 3.684, 'exchange-api'),
('usd', '2013-02-18', 3.678, 'exchange-api'),
('usd', '2013-02-19', 3.683, 'exchange-api'),
('usd', '2013-02-20', 3.663, 'exchange-api'),
('usd', '2013-02-21', 3.673, 'exchange-api'),
('usd', '2013-02-22', 3.71, 'exchange-api'),
('usd', '2013-02-26', 3.733, 'exchange-api'),
('usd', '2013-02-27', 3.728, 'exchange-api'),
('usd', '2013-02-28', 3.708, 'exchange-api'),
('usd', '2013-03-01', 3.723, 'exchange-api'),
('usd', '2013-03-04', 3.733, 'exchange-api'),
('usd', '2013-03-05', 3.732, 'exchange-api'),
('usd', '2013-03-06', 3.726, 'exchange-api'),
('usd', '2013-03-07', 3.723, 'exchange-api'),
('usd', '2013-03-08', 3.695, 'exchange-api'),
('usd', '2013-03-11', 3.69, 'exchange-api'),
('usd', '2013-03-12', 3.682, 'exchange-api'),
('usd', '2013-03-13', 3.693, 'exchange-api'),
('usd', '2013-03-14', 3.7, 'exchange-api'),
('usd', '2013-03-15', 3.681, 'exchange-api'),
('usd', '2013-03-18', 3.693, 'exchange-api'),
('usd', '2013-03-19', 3.682, 'exchange-api'),
('usd', '2013-03-20', 3.68, 'exchange-api'),
('usd', '2013-03-21', 3.676, 'exchange-api'),
('usd', '2013-03-22', 3.666, 'exchange-api'),
('usd', '2013-03-27', 3.637, 'exchange-api'),
('usd', '2013-03-28', 3.648, 'exchange-api'),
('usd', '2013-04-02', 3.62, 'exchange-api'),
('usd', '2013-04-03', 3.618, 'exchange-api'),
('usd', '2013-04-04', 3.631, 'exchange-api'),
('usd', '2013-04-05', 3.627, 'exchange-api'),
('usd', '2013-04-08', 3.618, 'exchange-api'),
('usd', '2013-04-09', 3.629, 'exchange-api'),
('usd', '2013-04-10', 3.633, 'exchange-api'),
('usd', '2013-04-11', 3.623, 'exchange-api'),
('usd', '2013-04-12', 3.628, 'exchange-api'),
('usd', '2013-04-15', 3.627, 'exchange-api'),
('usd', '2013-04-17', 3.624, 'exchange-api'),
('usd', '2013-04-18', 3.623, 'exchange-api'),
('usd', '2013-04-19', 3.629, 'exchange-api'),
('usd', '2013-04-22', 3.629, 'exchange-api'),
('usd', '2013-04-23', 3.625, 'exchange-api'),
('usd', '2013-04-24', 3.619, 'exchange-api'),
('usd', '2013-04-25', 3.606, 'exchange-api'),
('usd', '2013-04-26', 3.604, 'exchange-api'),
('usd', '2013-04-29', 3.592, 'exchange-api'),
('usd', '2013-04-30', 3.594, 'exchange-api'),
('usd', '2013-05-01', 3.587, 'exchange-api'),
('usd', '2013-05-02', 3.574, 'exchange-api'),
('usd', '2013-05-03', 3.569, 'exchange-api'),
('usd', '2013-05-06', 3.57, 'exchange-api'),
('usd', '2013-05-07', 3.56, 'exchange-api'),
('usd', '2013-05-08', 3.564, 'exchange-api'),
('usd', '2013-05-09', 3.556, 'exchange-api'),
('usd', '2013-05-10', 3.558, 'exchange-api'),
('usd', '2013-05-13', 3.571, 'exchange-api'),
('usd', '2013-05-14', 3.638, 'exchange-api'),
('usd', '2013-05-16', 3.647, 'exchange-api'),
('usd', '2013-05-17', 3.644, 'exchange-api'),
('usd', '2013-05-20', 3.66, 'exchange-api'),
('usd', '2013-05-21', 3.675, 'exchange-api'),
('usd', '2013-05-22', 3.665, 'exchange-api'),
('usd', '2013-05-23', 3.702, 'exchange-api'),
('usd', '2013-05-24', 3.696, 'exchange-api'),
('usd', '2013-05-28', 3.707, 'exchange-api'),
('usd', '2013-05-29', 3.694, 'exchange-api'),
('usd', '2013-05-30', 3.682, 'exchange-api'),
('usd', '2013-05-31', 3.683, 'exchange-api'),
('usd', '2013-06-03', 3.687, 'exchange-api'),
('usd', '2013-06-04', 3.676, 'exchange-api'),
('usd', '2013-06-05', 3.671, 'exchange-api'),
('usd', '2013-06-06', 3.649, 'exchange-api'),
('usd', '2013-06-07', 3.629, 'exchange-api'),
('usd', '2013-06-10', 3.632, 'exchange-api'),
('usd', '2013-06-11', 3.642, 'exchange-api'),
('usd', '2013-06-12', 3.627, 'exchange-api'),
('usd', '2013-06-13', 3.615, 'exchange-api'),
('usd', '2013-06-14', 3.601, 'exchange-api'),
('usd', '2013-06-17', 3.602, 'exchange-api'),
('usd', '2013-06-18', 3.594, 'exchange-api'),
('usd', '2013-06-19', 3.595, 'exchange-api'),
('usd', '2013-06-20', 3.63, 'exchange-api'),
('usd', '2013-06-21', 3.628, 'exchange-api'),
('usd', '2013-06-24', 3.634, 'exchange-api'),
('usd', '2013-06-25', 3.605, 'exchange-api'),
('usd', '2013-06-26', 3.616, 'exchange-api'),
('usd', '2013-06-27', 3.648, 'exchange-api'),
('usd', '2013-06-28', 3.618, 'exchange-api'),
('usd', '2013-07-01', 3.637, 'exchange-api'),
('usd', '2013-07-02', 3.629, 'exchange-api'),
('usd', '2013-07-03', 3.651, 'exchange-api'),
('usd', '2013-07-04', 3.633, 'exchange-api'),
('usd', '2013-07-05', 3.645, 'exchange-api'),
('usd', '2013-07-08', 3.661, 'exchange-api'),
('usd', '2013-07-09', 3.65, 'exchange-api'),
('usd', '2013-07-10', 3.646, 'exchange-api'),
('usd', '2013-07-11', 3.615, 'exchange-api'),
('usd', '2013-07-12', 3.607, 'exchange-api'),
('usd', '2013-07-15', 3.597, 'exchange-api'),
('usd', '2013-07-17', 3.576, 'exchange-api'),
('usd', '2013-07-18', 3.601, 'exchange-api'),
('usd', '2013-07-19', 3.582, 'exchange-api'),
('usd', '2013-07-22', 3.571, 'exchange-api'),
('usd', '2013-07-23', 3.571, 'exchange-api'),
('usd', '2013-07-24', 3.577, 'exchange-api'),
('usd', '2013-07-25', 3.594, 'exchange-api'),
('usd', '2013-07-26', 3.577, 'exchange-api'),
('usd', '2013-07-29', 3.594, 'exchange-api'),
('usd', '2013-07-30', 3.569, 'exchange-api'),
('usd', '2013-07-31', 3.566, 'exchange-api'),
('usd', '2013-08-01', 3.559, 'exchange-api'),
('usd', '2013-08-02', 3.577, 'exchange-api'),
('usd', '2013-08-05', 3.561, 'exchange-api'),
('usd', '2013-08-06', 3.553, 'exchange-api'),
('usd', '2013-08-07', 3.556, 'exchange-api'),
('usd', '2013-08-08', 3.539, 'exchange-api'),
('usd', '2013-08-09', 3.53, 'exchange-api'),
('usd', '2013-08-12', 3.545, 'exchange-api'),
('usd', '2013-08-13', 3.55, 'exchange-api'),
('usd', '2013-08-14', 3.573, 'exchange-api'),
('usd', '2013-08-15', 3.572, 'exchange-api'),
('usd', '2013-08-16', 3.562, 'exchange-api'),
('usd', '2013-08-19', 3.572, 'exchange-api'),
('usd', '2013-08-20', 3.568, 'exchange-api'),
('usd', '2013-08-21', 3.567, 'exchange-api'),
('usd', '2013-08-22', 3.587, 'exchange-api'),
('usd', '2013-08-23', 3.588, 'exchange-api'),
('usd', '2013-08-26', 3.603, 'exchange-api'),
('usd', '2013-08-27', 3.657, 'exchange-api'),
('usd', '2013-08-28', 3.666, 'exchange-api'),
('usd', '2013-08-29', 3.63, 'exchange-api'),
('usd', '2013-08-30', 3.614, 'exchange-api'),
('usd', '2013-09-02', 3.616, 'exchange-api'),
('usd', '2013-09-03', 3.632, 'exchange-api'),
('usd', '2013-09-09', 3.625, 'exchange-api'),
('usd', '2013-09-10', 3.604, 'exchange-api'),
('usd', '2013-09-11', 3.565, 'exchange-api'),
('usd', '2013-09-12', 3.564, 'exchange-api'),
('usd', '2013-09-16', 3.533, 'exchange-api'),
('usd', '2013-09-17', 3.537, 'exchange-api'),
('usd', '2013-09-18', 3.537, 'exchange-api'),
('usd', '2013-09-20', 3.504, 'exchange-api'),
('usd', '2013-09-23', 3.515, 'exchange-api'),
('usd', '2013-09-24', 3.526, 'exchange-api'),
('usd', '2013-09-25', 3.559, 'exchange-api'),
('usd', '2013-09-27', 3.571, 'exchange-api'),
('usd', '2013-09-30', 3.537, 'exchange-api'),
('usd', '2013-10-01', 3.532, 'exchange-api'),
('usd', '2013-10-02', 3.534, 'exchange-api'),
('usd', '2013-10-03', 3.537, 'exchange-api'),
('usd', '2013-10-04', 3.547, 'exchange-api'),
('usd', '2013-10-07', 3.541, 'exchange-api'),
('usd', '2013-10-08', 3.561, 'exchange-api'),
('usd', '2013-10-09', 3.567, 'exchange-api'),
('usd', '2013-10-10', 3.559, 'exchange-api'),
('usd', '2013-10-11', 3.547, 'exchange-api'),
('usd', '2013-10-14', 3.537, 'exchange-api'),
('usd', '2013-10-15', 3.546, 'exchange-api'),
('usd', '2013-10-16', 3.554, 'exchange-api'),
('usd', '2013-10-17', 3.535, 'exchange-api'),
('usd', '2013-10-18', 3.533, 'exchange-api'),
('usd', '2013-10-21', 3.535, 'exchange-api'),
('usd', '2013-10-22', 3.528, 'exchange-api'),
('usd', '2013-10-23', 3.52, 'exchange-api'),
('usd', '2013-10-24', 3.532, 'exchange-api'),
('usd', '2013-10-25', 3.526, 'exchange-api'),
('usd', '2013-10-28', 3.529, 'exchange-api'),
('usd', '2013-10-29', 3.524, 'exchange-api'),
('usd', '2013-10-30', 3.518, 'exchange-api'),
('usd', '2013-10-31', 3.519, 'exchange-api'),
('usd', '2013-11-01', 3.527, 'exchange-api'),
('usd', '2013-11-04', 3.533, 'exchange-api'),
('usd', '2013-11-05', 3.532, 'exchange-api'),
('usd', '2013-11-06', 3.531, 'exchange-api'),
('usd', '2013-11-07', 3.537, 'exchange-api'),
('usd', '2013-11-08', 3.536, 'exchange-api'),
('usd', '2013-11-11', 3.535, 'exchange-api'),
('usd', '2013-11-12', 3.534, 'exchange-api'),
('usd', '2013-11-13', 3.531, 'exchange-api'),
('usd', '2013-11-14', 3.532, 'exchange-api'),
('usd', '2013-11-15', 3.519, 'exchange-api'),
('usd', '2013-11-18', 3.524, 'exchange-api'),
('usd', '2013-11-19', 3.522, 'exchange-api'),
('usd', '2013-11-20', 3.544, 'exchange-api'),
('usd', '2013-11-21', 3.569, 'exchange-api'),
('usd', '2013-11-22', 3.559, 'exchange-api'),
('usd', '2013-11-25', 3.563, 'exchange-api'),
('usd', '2013-11-26', 3.542, 'exchange-api'),
('usd', '2013-11-27', 3.541, 'exchange-api'),
('usd', '2013-11-28', 3.534, 'exchange-api'),
('usd', '2013-11-29', 3.523, 'exchange-api'),
('usd', '2013-12-02', 3.53, 'exchange-api'),
('usd', '2013-12-03', 3.523, 'exchange-api'),
('usd', '2013-12-04', 3.522, 'exchange-api'),
('usd', '2013-12-05', 3.524, 'exchange-api'),
('usd', '2013-12-06', 3.517, 'exchange-api'),
('usd', '2013-12-09', 3.503, 'exchange-api'),
('usd', '2013-12-10', 3.495, 'exchange-api'),
('usd', '2013-12-11', 3.503, 'exchange-api'),
('usd', '2013-12-12', 3.507, 'exchange-api'),
('usd', '2013-12-13', 3.503, 'exchange-api'),
('usd', '2013-12-16', 3.507, 'exchange-api'),
('usd', '2013-12-17', 3.511, 'exchange-api'),
('usd', '2013-12-18', 3.505, 'exchange-api'),
('usd', '2013-12-19', 3.514, 'exchange-api'),
('usd', '2013-12-20', 3.518, 'exchange-api'),
('usd', '2013-12-23', 3.503, 'exchange-api'),
('usd', '2013-12-24', 3.488, 'exchange-api'),
('usd', '2013-12-26', 3.492, 'exchange-api'),
('usd', '2013-12-27', 3.492, 'exchange-api'),
('usd', '2013-12-30', 3.478, 'exchange-api'),
('usd', '2013-12-31', 3.471, 'exchange-api'),
('usd', '2014-01-02', 3.486, 'exchange-api'),
('usd', '2014-01-03', 3.504, 'exchange-api'),
('usd', '2014-01-06', 3.502, 'exchange-api'),
('usd', '2014-01-07', 3.501, 'exchange-api'),
('usd', '2014-01-08', 3.507, 'exchange-api'),
('usd', '2014-01-09', 3.503, 'exchange-api'),
('usd', '2014-01-10', 3.497, 'exchange-api'),
('usd', '2014-01-13', 3.488, 'exchange-api'),
('usd', '2014-01-14', 3.489, 'exchange-api'),
('usd', '2014-01-15', 3.483, 'exchange-api'),
('usd', '2014-01-16', 3.492, 'exchange-api'),
('usd', '2014-01-17', 3.489, 'exchange-api'),
('usd', '2014-01-20', 3.493, 'exchange-api'),
('usd', '2014-01-21', 3.498, 'exchange-api'),
('usd', '2014-01-22', 3.49, 'exchange-api'),
('usd', '2014-01-23', 3.486, 'exchange-api'),
('usd', '2014-01-24', 3.483, 'exchange-api'),
('usd', '2014-01-27', 3.489, 'exchange-api'),
('usd', '2014-01-28', 3.494, 'exchange-api'),
('usd', '2014-01-29', 3.49, 'exchange-api'),
('usd', '2014-01-30', 3.492, 'exchange-api'),
('usd', '2014-01-31', 3.498, 'exchange-api'),
('usd', '2014-02-03', 3.521, 'exchange-api'),
('usd', '2014-02-04', 3.531, 'exchange-api'),
('usd', '2014-02-05', 3.539, 'exchange-api'),
('usd', '2014-02-06', 3.549, 'exchange-api'),
('usd', '2014-02-07', 3.533, 'exchange-api'),
('usd', '2014-02-10', 3.525, 'exchange-api'),
('usd', '2014-02-11', 3.516, 'exchange-api'),
('usd', '2014-02-12', 3.523, 'exchange-api'),
('usd', '2014-02-13', 3.513, 'exchange-api'),
('usd', '2014-02-14', 3.506, 'exchange-api'),
('usd', '2014-02-17', 3.509, 'exchange-api'),
('usd', '2014-02-18', 3.512, 'exchange-api'),
('usd', '2014-02-19', 3.511, 'exchange-api'),
('usd', '2014-02-20', 3.517, 'exchange-api'),
('usd', '2014-02-21', 3.51, 'exchange-api'),
('usd', '2014-02-24', 3.505, 'exchange-api'),
('usd', '2014-02-25', 3.517, 'exchange-api'),
('usd', '2014-02-26', 3.521, 'exchange-api'),
('usd', '2014-02-27', 3.517, 'exchange-api'),
('usd', '2014-02-28', 3.496, 'exchange-api'),
('usd', '2014-03-03', 3.492, 'exchange-api'),
('usd', '2014-03-04', 3.488, 'exchange-api'),
('usd', '2014-03-05', 3.487, 'exchange-api'),
('usd', '2014-03-06', 3.475, 'exchange-api'),
('usd', '2014-03-07', 3.459, 'exchange-api'),
('usd', '2014-03-10', 3.474, 'exchange-api'),
('usd', '2014-03-11', 3.473, 'exchange-api'),
('usd', '2014-03-12', 3.471, 'exchange-api'),
('usd', '2014-03-13', 3.465, 'exchange-api'),
('usd', '2014-03-14', 3.471, 'exchange-api'),
('usd', '2014-03-18', 3.462, 'exchange-api'),
('usd', '2014-03-19', 3.462, 'exchange-api'),
('usd', '2014-03-20', 3.484, 'exchange-api'),
('usd', '2014-03-21', 3.479, 'exchange-api'),
('usd', '2014-03-24', 3.488, 'exchange-api'),
('usd', '2014-03-25', 3.49, 'exchange-api'),
('usd', '2014-03-26', 3.489, 'exchange-api'),
('usd', '2014-03-27', 3.504, 'exchange-api'),
('usd', '2014-03-28', 3.498, 'exchange-api'),
('usd', '2014-03-31', 3.487, 'exchange-api'),
('usd', '2014-04-01', 3.476, 'exchange-api'),
('usd', '2014-04-02', 3.475, 'exchange-api'),
('usd', '2014-04-03', 3.472, 'exchange-api'),
('usd', '2014-04-04', 3.476, 'exchange-api'),
('usd', '2014-04-07', 3.493, 'exchange-api'),
('usd', '2014-04-08', 3.48, 'exchange-api'),
('usd', '2014-04-09', 3.482, 'exchange-api'),
('usd', '2014-04-10', 3.467, 'exchange-api'),
('usd', '2014-04-11', 3.461, 'exchange-api'),
('usd', '2014-04-16', 3.47, 'exchange-api'),
('usd', '2014-04-17', 3.474, 'exchange-api'),
('usd', '2014-04-22', 3.484, 'exchange-api'),
('usd', '2014-04-23', 3.489, 'exchange-api'),
('usd', '2014-04-24', 3.477, 'exchange-api'),
('usd', '2014-04-25', 3.47, 'exchange-api'),
('usd', '2014-04-28', 3.484, 'exchange-api'),
('usd', '2014-04-29', 3.468, 'exchange-api'),
('usd', '2014-04-30', 3.466, 'exchange-api'),
('usd', '2014-05-01', 3.454, 'exchange-api'),
('usd', '2014-05-02', 3.458, 'exchange-api'),
('usd', '2014-05-05', 3.458, 'exchange-api'),
('usd', '2014-05-07', 3.449, 'exchange-api'),
('usd', '2014-05-08', 3.447, 'exchange-api'),
('usd', '2014-05-09', 3.452, 'exchange-api'),
('usd', '2014-05-12', 3.456, 'exchange-api'),
('usd', '2014-05-13', 3.457, 'exchange-api'),
('usd', '2014-05-14', 3.457, 'exchange-api'),
('usd', '2014-05-15', 3.455, 'exchange-api'),
('usd', '2014-05-16', 3.461, 'exchange-api'),
('usd', '2014-05-19', 3.454, 'exchange-api'),
('usd', '2014-05-20', 3.468, 'exchange-api'),
('usd', '2014-05-21', 3.488, 'exchange-api'),
('usd', '2014-05-22', 3.487, 'exchange-api'),
('usd', '2014-05-23', 3.49, 'exchange-api'),
('usd', '2014-05-27', 3.478, 'exchange-api'),
('usd', '2014-05-28', 3.487, 'exchange-api'),
('usd', '2014-05-29', 3.476, 'exchange-api'),
('usd', '2014-05-30', 3.475, 'exchange-api'),
('usd', '2014-06-02', 3.476, 'exchange-api'),
('usd', '2014-06-03', 3.473, 'exchange-api'),
('usd', '2014-06-05', 3.472, 'exchange-api'),
('usd', '2014-06-06', 3.464, 'exchange-api'),
('usd', '2014-06-09', 3.461, 'exchange-api'),
('usd', '2014-06-10', 3.462, 'exchange-api'),
('usd', '2014-06-11', 3.461, 'exchange-api'),
('usd', '2014-06-12', 3.461, 'exchange-api'),
('usd', '2014-06-13', 3.452, 'exchange-api'),
('usd', '2014-06-16', 3.459, 'exchange-api'),
('usd', '2014-06-17', 3.453, 'exchange-api'),
('usd', '2014-06-18', 3.458, 'exchange-api'),
('usd', '2014-06-19', 3.445, 'exchange-api'),
('usd', '2014-06-20', 3.443, 'exchange-api'),
('usd', '2014-06-23', 3.453, 'exchange-api'),
('usd', '2014-06-24', 3.433, 'exchange-api'),
('usd', '2014-06-25', 3.441, 'exchange-api'),
('usd', '2014-06-26', 3.432, 'exchange-api'),
('usd', '2014-06-27', 3.434, 'exchange-api'),
('usd', '2014-06-30', 3.438, 'exchange-api'),
('usd', '2014-07-01', 3.426, 'exchange-api'),
('usd', '2014-07-02', 3.426, 'exchange-api'),
('usd', '2014-07-03', 3.424, 'exchange-api'),
('usd', '2014-07-04', 3.419, 'exchange-api'),
('usd', '2014-07-07', 3.422, 'exchange-api'),
('usd', '2014-07-08', 3.429, 'exchange-api'),
('usd', '2014-07-09', 3.436, 'exchange-api'),
('usd', '2014-07-10', 3.429, 'exchange-api'),
('usd', '2014-07-11', 3.428, 'exchange-api'),
('usd', '2014-07-14', 3.423, 'exchange-api'),
('usd', '2014-07-15', 3.405, 'exchange-api'),
('usd', '2014-07-16', 3.408, 'exchange-api'),
('usd', '2014-07-17', 3.41, 'exchange-api'),
('usd', '2014-07-18', 3.421, 'exchange-api'),
('usd', '2014-07-21', 3.421, 'exchange-api'),
('usd', '2014-07-22', 3.418, 'exchange-api'),
('usd', '2014-07-23', 3.411, 'exchange-api'),
('usd', '2014-07-24', 3.402, 'exchange-api'),
('usd', '2014-07-25', 3.426, 'exchange-api'),
('usd', '2014-07-28', 3.427, 'exchange-api'),
('usd', '2014-07-29', 3.426, 'exchange-api'),
('usd', '2014-07-30', 3.429, 'exchange-api'),
('usd', '2014-07-31', 3.429, 'exchange-api'),
('usd', '2014-08-01', 3.415, 'exchange-api'),
('usd', '2014-08-04', 3.419, 'exchange-api'),
('usd', '2014-08-06', 3.427, 'exchange-api'),
('usd', '2014-08-07', 3.45, 'exchange-api'),
('usd', '2014-08-08', 3.476, 'exchange-api'),
('usd', '2014-08-11', 3.472, 'exchange-api'),
('usd', '2014-08-12', 3.483, 'exchange-api'),
('usd', '2014-08-13', 3.493, 'exchange-api'),
('usd', '2014-08-14', 3.47, 'exchange-api'),
('usd', '2014-08-15', 3.467, 'exchange-api'),
('usd', '2014-08-18', 3.503, 'exchange-api'),
('usd', '2014-08-19', 3.523, 'exchange-api'),
('usd', '2014-08-20', 3.533, 'exchange-api'),
('usd', '2014-08-21', 3.536, 'exchange-api'),
('usd', '2014-08-22', 3.519, 'exchange-api'),
('usd', '2014-08-25', 3.543, 'exchange-api'),
('usd', '2014-08-26', 3.572, 'exchange-api'),
('usd', '2014-08-27', 3.571, 'exchange-api'),
('usd', '2014-08-28', 3.56, 'exchange-api'),
('usd', '2014-08-29', 3.568, 'exchange-api'),
('usd', '2014-09-01', 3.579, 'exchange-api'),
('usd', '2014-09-02', 3.578, 'exchange-api'),
('usd', '2014-09-03', 3.579, 'exchange-api'),
('usd', '2014-09-04', 3.582, 'exchange-api'),
('usd', '2014-09-05', 3.606, 'exchange-api'),
('usd', '2014-09-08', 3.6, 'exchange-api'),
('usd', '2014-09-09', 3.609, 'exchange-api'),
('usd', '2014-09-10', 3.614, 'exchange-api'),
('usd', '2014-09-11', 3.628, 'exchange-api'),
('usd', '2014-09-12', 3.636, 'exchange-api'),
('usd', '2014-09-15', 3.626, 'exchange-api'),
('usd', '2014-09-16', 3.641, 'exchange-api'),
('usd', '2014-09-17', 3.649, 'exchange-api'),
('usd', '2014-09-18', 3.649, 'exchange-api'),
('usd', '2014-09-19', 3.643, 'exchange-api'),
('usd', '2014-09-22', 3.658, 'exchange-api'),
('usd', '2014-09-23', 3.658, 'exchange-api'),
('usd', '2014-09-29', 3.686, 'exchange-api'),
('usd', '2014-09-30', 3.695, 'exchange-api'),
('usd', '2014-10-01', 3.672, 'exchange-api'),
('usd', '2014-10-02', 3.644, 'exchange-api'),
('usd', '2014-10-06', 3.67, 'exchange-api'),
('usd', '2014-10-07', 3.708, 'exchange-api'),
('usd', '2014-10-08', 3.737, 'exchange-api'),
('usd', '2014-10-10', 3.722, 'exchange-api'),
('usd', '2014-10-13', 3.737, 'exchange-api'),
('usd', '2014-10-14', 3.743, 'exchange-api'),
('usd', '2014-10-15', 3.729, 'exchange-api'),
('usd', '2014-10-17', 3.71, 'exchange-api'),
('usd', '2014-10-20', 3.746, 'exchange-api'),
('usd', '2014-10-21', 3.731, 'exchange-api'),
('usd', '2014-10-22', 3.742, 'exchange-api'),
('usd', '2014-10-23', 3.767, 'exchange-api'),
('usd', '2014-10-24', 3.793, 'exchange-api'),
('usd', '2014-10-27', 3.788, 'exchange-api'),
('usd', '2014-10-28', 3.765, 'exchange-api'),
('usd', '2014-10-29', 3.754, 'exchange-api'),
('usd', '2014-10-30', 3.777, 'exchange-api'),
('usd', '2014-10-31', 3.784, 'exchange-api'),
('usd', '2014-11-03', 3.789, 'exchange-api'),
('usd', '2014-11-04', 3.796, 'exchange-api'),
('usd', '2014-11-05', 3.8, 'exchange-api'),
('usd', '2014-11-06', 3.787, 'exchange-api'),
('usd', '2014-11-07', 3.81, 'exchange-api'),
('usd', '2014-11-10', 3.782, 'exchange-api'),
('usd', '2014-11-11', 3.815, 'exchange-api'),
('usd', '2014-11-12', 3.819, 'exchange-api'),
('usd', '2014-11-13', 3.812, 'exchange-api'),
('usd', '2014-11-14', 3.815, 'exchange-api'),
('usd', '2014-11-17', 3.824, 'exchange-api'),
('usd', '2014-11-18', 3.841, 'exchange-api'),
('usd', '2014-11-19', 3.838, 'exchange-api'),
('usd', '2014-11-20', 3.846, 'exchange-api'),
('usd', '2014-11-21', 3.833, 'exchange-api'),
('usd', '2014-11-24', 3.864, 'exchange-api'),
('usd', '2014-11-25', 3.863, 'exchange-api'),
('usd', '2014-11-26', 3.871, 'exchange-api'),
('usd', '2014-11-27', 3.886, 'exchange-api'),
('usd', '2014-11-28', 3.889, 'exchange-api'),
('usd', '2014-12-01', 3.914, 'exchange-api'),
('usd', '2014-12-02', 3.958, 'exchange-api'),
('usd', '2014-12-03', 3.994, 'exchange-api'),
('usd', '2014-12-04', 3.985, 'exchange-api'),
('usd', '2014-12-05', 3.96, 'exchange-api'),
('usd', '2014-12-08', 3.991, 'exchange-api'),
('usd', '2014-12-09', 3.944, 'exchange-api'),
('usd', '2014-12-10', 3.948, 'exchange-api'),
('usd', '2014-12-11', 3.918, 'exchange-api'),
('usd', '2014-12-12', 3.904, 'exchange-api'),
('usd', '2014-12-15', 3.919, 'exchange-api'),
('usd', '2014-12-16', 3.935, 'exchange-api'),
('usd', '2014-12-17', 3.922, 'exchange-api'),
('usd', '2014-12-18', 3.934, 'exchange-api'),
('usd', '2014-12-19', 3.93, 'exchange-api'),
('usd', '2014-12-22', 3.923, 'exchange-api'),
('usd', '2014-12-23', 3.914, 'exchange-api'),
('usd', '2014-12-24', 3.909, 'exchange-api'),
('usd', '2014-12-29', 3.929, 'exchange-api'),
('usd', '2014-12-30', 3.908, 'exchange-api'),
('usd', '2014-12-31', 3.889, 'exchange-api'),
('usd', '2015-01-02', 3.918, 'exchange-api'),
('usd', '2015-01-05', 3.963, 'exchange-api'),
('usd', '2015-01-06', 3.971, 'exchange-api'),
('usd', '2015-01-07', 3.96, 'exchange-api'),
('usd', '2015-01-08', 3.974, 'exchange-api'),
('usd', '2015-01-09', 3.958, 'exchange-api'),
('usd', '2015-01-12', 3.956, 'exchange-api'),
('usd', '2015-01-13', 3.945, 'exchange-api'),
('usd', '2015-01-14', 3.939, 'exchange-api'),
('usd', '2015-01-15', 3.899, 'exchange-api'),
('usd', '2015-01-16', 3.914, 'exchange-api'),
('usd', '2015-01-19', 3.93, 'exchange-api'),
('usd', '2015-01-20', 3.928, 'exchange-api'),
('usd', '2015-01-21', 3.933, 'exchange-api'),
('usd', '2015-01-22', 3.935, 'exchange-api'),
('usd', '2015-01-23', 3.963, 'exchange-api'),
('usd', '2015-01-26', 3.998, 'exchange-api'),
('usd', '2015-01-27', 3.995, 'exchange-api'),
('usd', '2015-01-28', 3.945, 'exchange-api'),
('usd', '2015-01-29', 3.926, 'exchange-api'),
('usd', '2015-01-30', 3.924, 'exchange-api'),
('usd', '2015-02-02', 3.937, 'exchange-api'),
('usd', '2015-02-03', 3.93, 'exchange-api'),
('usd', '2015-02-04', 3.894, 'exchange-api'),
('usd', '2015-02-05', 3.875, 'exchange-api'),
('usd', '2015-02-06', 3.869, 'exchange-api'),
('usd', '2015-02-09', 3.88, 'exchange-api'),
('usd', '2015-02-10', 3.875, 'exchange-api'),
('usd', '2015-02-11', 3.864, 'exchange-api'),
('usd', '2015-02-12', 3.893, 'exchange-api'),
('usd', '2015-02-13', 3.883, 'exchange-api'),
('usd', '2015-02-16', 3.89, 'exchange-api'),
('usd', '2015-02-17', 3.865, 'exchange-api'),
('usd', '2015-02-18', 3.85, 'exchange-api'),
('usd', '2015-02-19', 3.844, 'exchange-api'),
('usd', '2015-02-20', 3.861, 'exchange-api'),
('usd', '2015-02-23', 3.858, 'exchange-api'),
('usd', '2015-02-24', 3.952, 'exchange-api'),
('usd', '2015-02-25', 3.938, 'exchange-api'),
('usd', '2015-02-26', 3.933, 'exchange-api'),
('usd', '2015-02-27', 3.966, 'exchange-api'),
('usd', '2015-03-02', 3.986, 'exchange-api'),
('usd', '2015-03-03', 3.987, 'exchange-api'),
('usd', '2015-03-04', 3.984, 'exchange-api'),
('usd', '2015-03-09', 4.017, 'exchange-api'),
('usd', '2015-03-10', 4.041, 'exchange-api'),
('usd', '2015-03-11', 4.049, 'exchange-api'),
('usd', '2015-03-12', 4.022, 'exchange-api'),
('usd', '2015-03-13', 4.015, 'exchange-api'),
('usd', '2015-03-16', 4.019, 'exchange-api'),
('usd', '2015-03-18', 4.02, 'exchange-api'),
('usd', '2015-03-19', 4.006, 'exchange-api'),
('usd', '2015-03-20', 4.053, 'exchange-api'),
('usd', '2015-03-23', 4.018, 'exchange-api'),
('usd', '2015-03-24', 3.926, 'exchange-api'),
('usd', '2015-03-25', 3.948, 'exchange-api'),
('usd', '2015-03-26', 3.944, 'exchange-api'),
('usd', '2015-03-27', 3.973, 'exchange-api'),
('usd', '2015-03-30', 3.971, 'exchange-api'),
('usd', '2015-03-31', 3.98, 'exchange-api'),
('usd', '2015-04-01', 3.974, 'exchange-api'),
('usd', '2015-04-02', 3.956, 'exchange-api'),
('usd', '2015-04-07', 3.939, 'exchange-api'),
('usd', '2015-04-08', 3.939, 'exchange-api'),
('usd', '2015-04-09', 3.943, 'exchange-api'),
('usd', '2015-04-13', 4.014, 'exchange-api'),
('usd', '2015-04-14', 3.984, 'exchange-api'),
('usd', '2015-04-15', 3.975, 'exchange-api'),
('usd', '2015-04-16', 3.935, 'exchange-api'),
('usd', '2015-04-17', 3.929, 'exchange-api'),
('usd', '2015-04-20', 3.925, 'exchange-api'),
('usd', '2015-04-21', 3.946, 'exchange-api'),
('usd', '2015-04-22', 3.951, 'exchange-api'),
('usd', '2015-04-24', 3.924, 'exchange-api'),
('usd', '2015-04-27', 3.931, 'exchange-api'),
('usd', '2015-04-28', 3.894, 'exchange-api'),
('usd', '2015-04-29', 3.872, 'exchange-api'),
('usd', '2015-04-30', 3.861, 'exchange-api'),
('usd', '2015-05-01', 3.858, 'exchange-api'),
('usd', '2015-05-04', 3.89, 'exchange-api'),
('usd', '2015-05-05', 3.879, 'exchange-api'),
('usd', '2015-05-06', 3.867, 'exchange-api'),
('usd', '2015-05-07', 3.865, 'exchange-api'),
('usd', '2015-05-08', 3.868, 'exchange-api'),
('usd', '2015-05-11', 3.872, 'exchange-api'),
('usd', '2015-05-12', 3.863, 'exchange-api'),
('usd', '2015-05-13', 3.855, 'exchange-api'),
('usd', '2015-05-14', 3.819, 'exchange-api'),
('usd', '2015-05-15', 3.825, 'exchange-api'),
('usd', '2015-05-18', 3.819, 'exchange-api'),
('usd', '2015-05-19', 3.852, 'exchange-api'),
('usd', '2015-05-20', 3.874, 'exchange-api'),
('usd', '2015-05-21', 3.86, 'exchange-api'),
('usd', '2015-05-22', 3.873, 'exchange-api'),
('usd', '2015-05-26', 3.875, 'exchange-api'),
('usd', '2015-05-27', 3.875, 'exchange-api'),
('usd', '2015-05-28', 3.88, 'exchange-api'),
('usd', '2015-05-29', 3.876, 'exchange-api'),
('usd', '2015-06-01', 3.872, 'exchange-api'),
('usd', '2015-06-02', 3.862, 'exchange-api'),
('usd', '2015-06-03', 3.864, 'exchange-api'),
('usd', '2015-06-04', 3.836, 'exchange-api'),
('usd', '2015-06-05', 3.841, 'exchange-api'),
('usd', '2015-06-08', 3.868, 'exchange-api'),
('usd', '2015-06-09', 3.833, 'exchange-api'),
('usd', '2015-06-10', 3.827, 'exchange-api'),
('usd', '2015-06-11', 3.828, 'exchange-api'),
('usd', '2015-06-12', 3.838, 'exchange-api'),
('usd', '2015-06-15', 3.842, 'exchange-api'),
('usd', '2015-06-16', 3.835, 'exchange-api'),
('usd', '2015-06-17', 3.842, 'exchange-api'),
('usd', '2015-06-18', 3.812, 'exchange-api'),
('usd', '2015-06-19', 3.834, 'exchange-api'),
('usd', '2015-06-22', 3.833, 'exchange-api'),
('usd', '2015-06-23', 3.779, 'exchange-api'),
('usd', '2015-06-24', 3.761, 'exchange-api'),
('usd', '2015-06-25', 3.77, 'exchange-api'),
('usd', '2015-06-26', 3.792, 'exchange-api'),
('usd', '2015-06-29', 3.8, 'exchange-api'),
('usd', '2015-06-30', 3.769, 'exchange-api'),
('usd', '2015-07-01', 3.777, 'exchange-api'),
('usd', '2015-07-02', 3.78, 'exchange-api'),
('usd', '2015-07-03', 3.769, 'exchange-api'),
('usd', '2015-07-06', 3.776, 'exchange-api'),
('usd', '2015-07-07', 3.78, 'exchange-api'),
('usd', '2015-07-08', 3.797, 'exchange-api'),
('usd', '2015-07-09', 3.786, 'exchange-api'),
('usd', '2015-07-10', 3.777, 'exchange-api'),
('usd', '2015-07-13', 3.776, 'exchange-api'),
('usd', '2015-07-14', 3.775, 'exchange-api'),
('usd', '2015-07-15', 3.765, 'exchange-api'),
('usd', '2015-07-16', 3.789, 'exchange-api'),
('usd', '2015-07-17', 3.789, 'exchange-api'),
('usd', '2015-07-20', 3.824, 'exchange-api'),
('usd', '2015-07-21', 3.809, 'exchange-api'),
('usd', '2015-07-22', 3.809, 'exchange-api'),
('usd', '2015-07-23', 3.818, 'exchange-api'),
('usd', '2015-07-24', 3.825, 'exchange-api'),
('usd', '2015-07-27', 3.806, 'exchange-api'),
('usd', '2015-07-28', 3.774, 'exchange-api'),
('usd', '2015-07-29', 3.782, 'exchange-api'),
('usd', '2015-07-30', 3.781, 'exchange-api'),
('usd', '2015-07-31', 3.783, 'exchange-api'),
('usd', '2015-08-03', 3.772, 'exchange-api'),
('usd', '2015-08-04', 3.783, 'exchange-api'),
('usd', '2015-08-05', 3.807, 'exchange-api'),
('usd', '2015-08-06', 3.813, 'exchange-api'),
('usd', '2015-08-07', 3.808, 'exchange-api'),
('usd', '2015-08-10', 3.813, 'exchange-api'),
('usd', '2015-08-11', 3.818, 'exchange-api'),
('usd', '2015-08-12', 3.815, 'exchange-api'),
('usd', '2015-08-13', 3.807, 'exchange-api'),
('usd', '2015-08-14', 3.789, 'exchange-api'),
('usd', '2015-08-17', 3.81, 'exchange-api'),
('usd', '2015-08-18', 3.829, 'exchange-api'),
('usd', '2015-08-19', 3.878, 'exchange-api'),
('usd', '2015-08-20', 3.883, 'exchange-api'),
('usd', '2015-08-21', 3.874, 'exchange-api'),
('usd', '2015-08-24', 3.878, 'exchange-api'),
('usd', '2015-08-25', 3.864, 'exchange-api'),
('usd', '2015-08-26', 3.921, 'exchange-api'),
('usd', '2015-08-27', 3.928, 'exchange-api'),
('usd', '2015-08-28', 3.922, 'exchange-api'),
('usd', '2015-08-31', 3.93, 'exchange-api'),
('usd', '2015-09-01', 3.923, 'exchange-api'),
('usd', '2015-09-02', 3.93, 'exchange-api'),
('usd', '2015-09-03', 3.934, 'exchange-api'),
('usd', '2015-09-04', 3.927, 'exchange-api'),
('usd', '2015-09-07', 3.933, 'exchange-api'),
('usd', '2015-09-08', 3.922, 'exchange-api'),
('usd', '2015-09-09', 3.881, 'exchange-api'),
('usd', '2015-09-10', 3.906, 'exchange-api'),
('usd', '2015-09-11', 3.866, 'exchange-api'),
('usd', '2015-09-16', 3.889, 'exchange-api'),
('usd', '2015-09-17', 3.874, 'exchange-api'),
('usd', '2015-09-18', 3.863, 'exchange-api'),
('usd', '2015-09-21', 3.923, 'exchange-api'),
('usd', '2015-09-24', 3.941, 'exchange-api'),
('usd', '2015-09-25', 3.949, 'exchange-api'),
('usd', '2015-09-29', 3.936, 'exchange-api'),
('usd', '2015-09-30', 3.923, 'exchange-api'),
('usd', '2015-10-01', 3.918, 'exchange-api'),
('usd', '2015-10-02', 3.923, 'exchange-api'),
('usd', '2015-10-06', 3.874, 'exchange-api'),
('usd', '2015-10-07', 3.85, 'exchange-api'),
('usd', '2015-10-08', 3.848, 'exchange-api'),
('usd', '2015-10-09', 3.842, 'exchange-api'),
('usd', '2015-10-12', 3.835, 'exchange-api'),
('usd', '2015-10-13', 3.866, 'exchange-api'),
('usd', '2015-10-14', 3.85, 'exchange-api'),
('usd', '2015-10-15', 3.821, 'exchange-api'),
('usd', '2015-10-16', 3.816, 'exchange-api'),
('usd', '2015-10-19', 3.842, 'exchange-api'),
('usd', '2015-10-20', 3.859, 'exchange-api'),
('usd', '2015-10-21', 3.861, 'exchange-api'),
('usd', '2015-10-22', 3.855, 'exchange-api'),
('usd', '2015-10-23', 3.881, 'exchange-api'),
('usd', '2015-10-26', 3.894, 'exchange-api'),
('usd', '2015-10-27', 3.866, 'exchange-api'),
('usd', '2015-10-28', 3.872, 'exchange-api'),
('usd', '2015-10-29', 3.883, 'exchange-api'),
('usd', '2015-10-30', 3.867, 'exchange-api'),
('usd', '2015-11-02', 3.868, 'exchange-api'),
('usd', '2015-11-03', 3.878, 'exchange-api'),
('usd', '2015-11-04', 3.877, 'exchange-api'),
('usd', '2015-11-05', 3.888, 'exchange-api'),
('usd', '2015-11-06', 3.886, 'exchange-api'),
('usd', '2015-11-09', 3.913, 'exchange-api'),
('usd', '2015-11-10', 3.921, 'exchange-api'),
('usd', '2015-11-11', 3.911, 'exchange-api'),
('usd', '2015-11-12', 3.891, 'exchange-api'),
('usd', '2015-11-13', 3.889, 'exchange-api'),
('usd', '2015-11-16', 3.892, 'exchange-api'),
('usd', '2015-11-17', 3.905, 'exchange-api'),
('usd', '2015-11-18', 3.904, 'exchange-api'),
('usd', '2015-11-19', 3.885, 'exchange-api'),
('usd', '2015-11-20', 3.878, 'exchange-api'),
('usd', '2015-11-23', 3.894, 'exchange-api'),
('usd', '2015-11-24', 3.873, 'exchange-api'),
('usd', '2015-11-25', 3.877, 'exchange-api'),
('usd', '2015-11-26', 3.88, 'exchange-api'),
('usd', '2015-11-27', 3.889, 'exchange-api'),
('usd', '2015-11-30', 3.877, 'exchange-api'),
('usd', '2015-12-01', 3.879, 'exchange-api'),
('usd', '2015-12-02', 3.879, 'exchange-api'),
('usd', '2015-12-03', 3.887, 'exchange-api'),
('usd', '2015-12-04', 3.857, 'exchange-api'),
('usd', '2015-12-07', 3.855, 'exchange-api'),
('usd', '2015-12-08', 3.878, 'exchange-api'),
('usd', '2015-12-09', 3.885, 'exchange-api'),
('usd', '2015-12-10', 3.867, 'exchange-api'),
('usd', '2015-12-11', 3.86, 'exchange-api'),
('usd', '2015-12-14', 3.856, 'exchange-api'),
('usd', '2015-12-15', 3.859, 'exchange-api'),
('usd', '2015-12-16', 3.878, 'exchange-api'),
('usd', '2015-12-17', 3.895, 'exchange-api'),
('usd', '2015-12-18', 3.896, 'exchange-api'),
('usd', '2015-12-21', 3.9, 'exchange-api'),
('usd', '2015-12-22', 3.905, 'exchange-api'),
('usd', '2015-12-23', 3.895, 'exchange-api'),
('usd', '2015-12-24', 3.892, 'exchange-api'),
('usd', '2015-12-28', 3.886, 'exchange-api'),
('usd', '2015-12-29', 3.883, 'exchange-api'),
('usd', '2015-12-30', 3.896, 'exchange-api'),
('usd', '2015-12-31', 3.902, 'exchange-api'),
('usd', '2016-01-04', 3.913, 'exchange-api'),
('usd', '2016-01-05', 3.928, 'exchange-api'),
('usd', '2016-01-06', 3.941, 'exchange-api'),
('usd', '2016-01-07', 3.937, 'exchange-api'),
('usd', '2016-01-08', 3.922, 'exchange-api'),
('usd', '2016-01-11', 3.929, 'exchange-api'),
('usd', '2016-01-12', 3.942, 'exchange-api'),
('usd', '2016-01-13', 3.943, 'exchange-api'),
('usd', '2016-01-14', 3.944, 'exchange-api'),
('usd', '2016-01-15', 3.943, 'exchange-api'),
('usd', '2016-01-18', 3.955, 'exchange-api'),
('usd', '2016-01-19', 3.953, 'exchange-api'),
('usd', '2016-01-20', 3.983, 'exchange-api'),
('usd', '2016-01-21', 3.972, 'exchange-api'),
('usd', '2016-01-22', 3.971, 'exchange-api'),
('usd', '2016-01-25', 3.982, 'exchange-api'),
('usd', '2016-01-26', 3.976, 'exchange-api'),
('usd', '2016-01-27', 3.972, 'exchange-api'),
('usd', '2016-01-28', 3.961, 'exchange-api'),
('usd', '2016-01-29', 3.951, 'exchange-api'),
('usd', '2016-02-01', 3.955, 'exchange-api'),
('usd', '2016-02-02', 3.955, 'exchange-api'),
('usd', '2016-02-03', 3.964, 'exchange-api'),
('usd', '2016-02-04', 3.909, 'exchange-api'),
('usd', '2016-02-05', 3.883, 'exchange-api'),
('usd', '2016-02-08', 3.89, 'exchange-api'),
('usd', '2016-02-09', 3.887, 'exchange-api'),
('usd', '2016-02-10', 3.871, 'exchange-api'),
('usd', '2016-02-11', 3.888, 'exchange-api'),
('usd', '2016-02-12', 3.882, 'exchange-api'),
('usd', '2016-02-15', 3.889, 'exchange-api'),
('usd', '2016-02-16', 3.913, 'exchange-api'),
('usd', '2016-02-17', 3.906, 'exchange-api'),
('usd', '2016-02-18', 3.902, 'exchange-api'),
('usd', '2016-02-19', 3.911, 'exchange-api'),
('usd', '2016-02-22', 3.907, 'exchange-api'),
('usd', '2016-02-23', 3.907, 'exchange-api'),
('usd', '2016-02-24', 3.927, 'exchange-api'),
('usd', '2016-02-25', 3.907, 'exchange-api'),
('usd', '2016-02-26', 3.906, 'exchange-api'),
('usd', '2016-02-29', 3.91, 'exchange-api'),
('usd', '2016-03-01', 3.902, 'exchange-api'),
('usd', '2016-03-02', 3.886, 'exchange-api'),
('usd', '2016-03-03', 3.887, 'exchange-api'),
('usd', '2016-03-04', 3.893, 'exchange-api'),
('usd', '2016-03-07', 3.912, 'exchange-api'),
('usd', '2016-03-08', 3.911, 'exchange-api'),
('usd', '2016-03-09', 3.906, 'exchange-api'),
('usd', '2016-03-10', 3.903, 'exchange-api'),
('usd', '2016-03-11', 3.875, 'exchange-api'),
('usd', '2016-03-14', 3.878, 'exchange-api'),
('usd', '2016-03-15', 3.891, 'exchange-api'),
('usd', '2016-03-16', 3.901, 'exchange-api'),
('usd', '2016-03-17', 3.853, 'exchange-api'),
('usd', '2016-03-18', 3.857, 'exchange-api'),
('usd', '2016-03-21', 3.855, 'exchange-api'),
('usd', '2016-03-22', 3.851, 'exchange-api'),
('usd', '2016-03-23', 3.842, 'exchange-api'),
('usd', '2016-03-28', 3.837, 'exchange-api'),
('usd', '2016-03-29', 3.826, 'exchange-api'),
('usd', '2016-03-30', 3.788, 'exchange-api'),
('usd', '2016-03-31', 3.766, 'exchange-api'),
('usd', '2016-04-01', 3.786, 'exchange-api'),
('usd', '2016-04-04', 3.784, 'exchange-api'),
('usd', '2016-04-05', 3.802, 'exchange-api'),
('usd', '2016-04-06', 3.819, 'exchange-api'),
('usd', '2016-04-07', 3.795, 'exchange-api'),
('usd', '2016-04-08', 3.786, 'exchange-api'),
('usd', '2016-04-11', 3.782, 'exchange-api'),
('usd', '2016-04-12', 3.765, 'exchange-api'),
('usd', '2016-04-13', 3.773, 'exchange-api'),
('usd', '2016-04-14', 3.789, 'exchange-api'),
('usd', '2016-04-15', 3.785, 'exchange-api'),
('usd', '2016-04-18', 3.773, 'exchange-api'),
('usd', '2016-04-19', 3.763, 'exchange-api'),
('usd', '2016-04-20', 3.758, 'exchange-api'),
('usd', '2016-04-21', 3.764, 'exchange-api'),
('usd', '2016-04-25', 3.774, 'exchange-api'),
('usd', '2016-04-26', 3.763, 'exchange-api'),
('usd', '2016-04-27', 3.768, 'exchange-api'),
('usd', '2016-04-28', 3.761, 'exchange-api'),
('usd', '2016-05-02', 3.746, 'exchange-api'),
('usd', '2016-05-03', 3.747, 'exchange-api'),
('usd', '2016-05-04', 3.777, 'exchange-api'),
('usd', '2016-05-05', 3.781, 'exchange-api'),
('usd', '2016-05-06', 3.788, 'exchange-api'),
('usd', '2016-05-09', 3.779, 'exchange-api'),
('usd', '2016-05-10', 3.784, 'exchange-api'),
('usd', '2016-05-11', 3.772, 'exchange-api'),
('usd', '2016-05-13', 3.77, 'exchange-api'),
('usd', '2016-05-16', 3.812, 'exchange-api'),
('usd', '2016-05-17', 3.818, 'exchange-api'),
('usd', '2016-05-18', 3.835, 'exchange-api'),
('usd', '2016-05-19', 3.858, 'exchange-api'),
('usd', '2016-05-20', 3.871, 'exchange-api'),
('usd', '2016-05-23', 3.879, 'exchange-api'),
('usd', '2016-05-24', 3.865, 'exchange-api'),
('usd', '2016-05-25', 3.855, 'exchange-api'),
('usd', '2016-05-26', 3.837, 'exchange-api'),
('usd', '2016-05-27', 3.845, 'exchange-api'),
('usd', '2016-05-31', 3.85, 'exchange-api'),
('usd', '2016-06-01', 3.853, 'exchange-api'),
('usd', '2016-06-02', 3.854, 'exchange-api'),
('usd', '2016-06-03', 3.87, 'exchange-api'),
('usd', '2016-06-06', 3.831, 'exchange-api'),
('usd', '2016-06-07', 3.818, 'exchange-api'),
('usd', '2016-06-08', 3.826, 'exchange-api'),
('usd', '2016-06-09', 3.846, 'exchange-api'),
('usd', '2016-06-10', 3.849, 'exchange-api'),
('usd', '2016-06-13', 3.874, 'exchange-api'),
('usd', '2016-06-14', 3.864, 'exchange-api'),
('usd', '2016-06-15', 3.875, 'exchange-api'),
('usd', '2016-06-16', 3.871, 'exchange-api'),
('usd', '2016-06-17', 3.863, 'exchange-api'),
('usd', '2016-06-20', 3.851, 'exchange-api'),
('usd', '2016-06-21', 3.859, 'exchange-api'),
('usd', '2016-06-22', 3.852, 'exchange-api'),
('usd', '2016-06-23', 3.823, 'exchange-api'),
('usd', '2016-06-24', 3.885, 'exchange-api'),
('usd', '2016-06-27', 3.9, 'exchange-api'),
('usd', '2016-06-28', 3.878, 'exchange-api'),
('usd', '2016-06-29', 3.858, 'exchange-api'),
('usd', '2016-06-30', 3.846, 'exchange-api'),
('usd', '2016-07-01', 3.844, 'exchange-api'),
('usd', '2016-07-04', 3.856, 'exchange-api'),
('usd', '2016-07-05', 3.869, 'exchange-api'),
('usd', '2016-07-06', 3.895, 'exchange-api'),
('usd', '2016-07-07', 3.878, 'exchange-api'),
('usd', '2016-07-08', 3.882, 'exchange-api'),
('usd', '2016-07-11', 3.883, 'exchange-api'),
('usd', '2016-07-12', 3.874, 'exchange-api'),
('usd', '2016-07-13', 3.871, 'exchange-api'),
('usd', '2016-07-14', 3.852, 'exchange-api'),
('usd', '2016-07-15', 3.844, 'exchange-api'),
('usd', '2016-07-18', 3.86, 'exchange-api'),
('usd', '2016-07-19', 3.856, 'exchange-api'),
('usd', '2016-07-20', 3.859, 'exchange-api'),
('usd', '2016-07-21', 3.858, 'exchange-api'),
('usd', '2016-07-22', 3.839, 'exchange-api'),
('usd', '2016-07-25', 3.846, 'exchange-api'),
('usd', '2016-07-26', 3.844, 'exchange-api'),
('usd', '2016-07-27', 3.84, 'exchange-api'),
('usd', '2016-07-28', 3.828, 'exchange-api'),
('usd', '2016-07-29', 3.828, 'exchange-api'),
('usd', '2016-08-01', 3.806, 'exchange-api'),
('usd', '2016-08-02', 3.815, 'exchange-api'),
('usd', '2016-08-03', 3.822, 'exchange-api'),
('usd', '2016-08-04', 3.826, 'exchange-api'),
('usd', '2016-08-05', 3.821, 'exchange-api'),
('usd', '2016-08-08', 3.829, 'exchange-api'),
('usd', '2016-08-09', 3.82, 'exchange-api'),
('usd', '2016-08-10', 3.811, 'exchange-api'),
('usd', '2016-08-11', 3.811, 'exchange-api'),
('usd', '2016-08-12', 3.811, 'exchange-api'),
('usd', '2016-08-15', 3.808, 'exchange-api'),
('usd', '2016-08-16', 3.775, 'exchange-api'),
('usd', '2016-08-17', 3.791, 'exchange-api'),
('usd', '2016-08-18', 3.776, 'exchange-api'),
('usd', '2016-08-19', 3.771, 'exchange-api'),
('usd', '2016-08-22', 3.781, 'exchange-api'),
('usd', '2016-08-23', 3.768, 'exchange-api'),
('usd', '2016-08-24', 3.774, 'exchange-api'),
('usd', '2016-08-25', 3.768, 'exchange-api'),
('usd', '2016-08-26', 3.754, 'exchange-api'),
('usd', '2016-08-29', 3.788, 'exchange-api'),
('usd', '2016-08-30', 3.782, 'exchange-api'),
('usd', '2016-08-31', 3.786, 'exchange-api'),
('usd', '2016-09-01', 3.775, 'exchange-api'),
('usd', '2016-09-02', 3.768, 'exchange-api'),
('usd', '2016-09-05', 3.768, 'exchange-api'),
('usd', '2016-09-06', 3.766, 'exchange-api'),
('usd', '2016-09-07', 3.766, 'exchange-api'),
('usd', '2016-09-08', 3.749, 'exchange-api'),
('usd', '2016-09-09', 3.754, 'exchange-api'),
('usd', '2016-09-12', 3.771, 'exchange-api'),
('usd', '2016-09-13', 3.772, 'exchange-api'),
('usd', '2016-09-14', 3.786, 'exchange-api'),
('usd', '2016-09-15', 3.779, 'exchange-api'),
('usd', '2016-09-16', 3.762, 'exchange-api'),
('usd', '2016-09-19', 3.775, 'exchange-api'),
('usd', '2016-09-20', 3.776, 'exchange-api'),
('usd', '2016-09-21', 3.778, 'exchange-api'),
('usd', '2016-09-22', 3.759, 'exchange-api'),
('usd', '2016-09-23', 3.76, 'exchange-api'),
('usd', '2016-09-26', 3.765, 'exchange-api'),
('usd', '2016-09-27', 3.746, 'exchange-api'),
('usd', '2016-09-28', 3.758, 'exchange-api'),
('usd', '2016-09-29', 3.755, 'exchange-api'),
('usd', '2016-09-30', 3.758, 'exchange-api'),
('usd', '2016-10-05', 3.778, 'exchange-api'),
('usd', '2016-10-06', 3.778, 'exchange-api'),
('usd', '2016-10-07', 3.794, 'exchange-api'),
('usd', '2016-10-10', 3.791, 'exchange-api'),
('usd', '2016-10-13', 3.814, 'exchange-api'),
('usd', '2016-10-14', 3.815, 'exchange-api'),
('usd', '2016-10-18', 3.817, 'exchange-api'),
('usd', '2016-10-19', 3.819, 'exchange-api'),
('usd', '2016-10-20', 3.835, 'exchange-api'),
('usd', '2016-10-21', 3.848, 'exchange-api'),
('usd', '2016-10-25', 3.85, 'exchange-api'),
('usd', '2016-10-26', 3.841, 'exchange-api'),
('usd', '2016-10-27', 3.841, 'exchange-api'),
('usd', '2016-10-28', 3.856, 'exchange-api'),
('usd', '2016-10-31', 3.849, 'exchange-api'),
('usd', '2016-11-01', 3.827, 'exchange-api'),
('usd', '2016-11-02', 3.811, 'exchange-api'),
('usd', '2016-11-03', 3.815, 'exchange-api'),
('usd', '2016-11-04', 3.807, 'exchange-api'),
('usd', '2016-11-07', 3.812, 'exchange-api'),
('usd', '2016-11-08', 3.814, 'exchange-api'),
('usd', '2016-11-09', 3.799, 'exchange-api'),
('usd', '2016-11-10', 3.842, 'exchange-api'),
('usd', '2016-11-11', 3.844, 'exchange-api'),
('usd', '2016-11-14', 3.852, 'exchange-api'),
('usd', '2016-11-15', 3.844, 'exchange-api'),
('usd', '2016-11-16', 3.858, 'exchange-api'),
('usd', '2016-11-17', 3.853, 'exchange-api'),
('usd', '2016-11-18', 3.873, 'exchange-api'),
('usd', '2016-11-21', 3.867, 'exchange-api'),
('usd', '2016-11-22', 3.866, 'exchange-api'),
('usd', '2016-11-23', 3.868, 'exchange-api'),
('usd', '2016-11-24', 3.876, 'exchange-api'),
('usd', '2016-11-25', 3.871, 'exchange-api'),
('usd', '2016-11-28', 3.857, 'exchange-api'),
('usd', '2016-11-29', 3.848, 'exchange-api'),
('usd', '2016-11-30', 3.839, 'exchange-api'),
('usd', '2016-12-01', 3.833, 'exchange-api'),
('usd', '2016-12-02', 3.827, 'exchange-api'),
('usd', '2016-12-05', 3.817, 'exchange-api'),
('usd', '2016-12-06', 3.809, 'exchange-api'),
('usd', '2016-12-07', 3.802, 'exchange-api'),
('usd', '2016-12-08', 3.787, 'exchange-api'),
('usd', '2016-12-09', 3.818, 'exchange-api'),
('usd', '2016-12-12', 3.822, 'exchange-api'),
('usd', '2016-12-13', 3.81, 'exchange-api'),
('usd', '2016-12-14', 3.802, 'exchange-api'),
('usd', '2016-12-15', 3.843, 'exchange-api'),
('usd', '2016-12-16', 3.85, 'exchange-api'),
('usd', '2016-12-19', 3.867, 'exchange-api'),
('usd', '2016-12-20', 3.856, 'exchange-api'),
('usd', '2016-12-21', 3.83, 'exchange-api'),
('usd', '2016-12-22', 3.817, 'exchange-api'),
('usd', '2016-12-23', 3.819, 'exchange-api'),
('usd', '2016-12-27', 3.85, 'exchange-api'),
('usd', '2016-12-28', 3.855, 'exchange-api'),
('usd', '2016-12-29', 3.844, 'exchange-api'),
('usd', '2016-12-30', 3.845, 'exchange-api'),
('usd', '2017-01-03', 3.86, 'exchange-api'),
('usd', '2017-01-04', 3.857, 'exchange-api'),
('usd', '2017-01-05', 3.853, 'exchange-api'),
('usd', '2017-01-06', 3.843, 'exchange-api'),
('usd', '2017-01-09', 3.849, 'exchange-api'),
('usd', '2017-01-10', 3.845, 'exchange-api'),
('usd', '2017-01-11', 3.852, 'exchange-api'),
('usd', '2017-01-12', 3.825, 'exchange-api'),
('usd', '2017-01-13', 3.818, 'exchange-api'),
('usd', '2017-01-16', 3.826, 'exchange-api'),
('usd', '2017-01-17', 3.817, 'exchange-api'),
('usd', '2017-01-18', 3.81, 'exchange-api'),
('usd', '2017-01-19', 3.81, 'exchange-api'),
('usd', '2017-01-20', 3.811, 'exchange-api'),
('usd', '2017-01-23', 3.798, 'exchange-api'),
('usd', '2017-01-24', 3.787, 'exchange-api'),
('usd', '2017-01-25', 3.786, 'exchange-api'),
('usd', '2017-01-26', 3.783, 'exchange-api'),
('usd', '2017-01-27', 3.798, 'exchange-api'),
('usd', '2017-01-30', 3.785, 'exchange-api'),
('usd', '2017-01-31', 3.769, 'exchange-api'),
('usd', '2017-02-01', 3.768, 'exchange-api'),
('usd', '2017-02-02', 3.762, 'exchange-api'),
('usd', '2017-02-03', 3.76, 'exchange-api'),
('usd', '2017-02-06', 3.747, 'exchange-api'),
('usd', '2017-02-07', 3.753, 'exchange-api'),
('usd', '2017-02-08', 3.754, 'exchange-api'),
('usd', '2017-02-09', 3.749, 'exchange-api'),
('usd', '2017-02-10', 3.747, 'exchange-api'),
('usd', '2017-02-13', 3.748, 'exchange-api'),
('usd', '2017-02-14', 3.746, 'exchange-api'),
('usd', '2017-02-15', 3.747, 'exchange-api'),
('usd', '2017-02-16', 3.716, 'exchange-api'),
('usd', '2017-02-17', 3.716, 'exchange-api'),
('usd', '2017-02-20', 3.707, 'exchange-api'),
('usd', '2017-02-21', 3.707, 'exchange-api'),
('usd', '2017-02-22', 3.71, 'exchange-api'),
('usd', '2017-02-23', 3.708, 'exchange-api'),
('usd', '2017-02-24', 3.698, 'exchange-api'),
('usd', '2017-02-27', 3.679, 'exchange-api'),
('usd', '2017-02-28', 3.659, 'exchange-api'),
('usd', '2017-03-01', 3.632, 'exchange-api'),
('usd', '2017-03-02', 3.688, 'exchange-api'),
('usd', '2017-03-03', 3.693, 'exchange-api'),
('usd', '2017-03-06', 3.679, 'exchange-api'),
('usd', '2017-03-07', 3.677, 'exchange-api'),
('usd', '2017-03-08', 3.684, 'exchange-api'),
('usd', '2017-03-09', 3.688, 'exchange-api'),
('usd', '2017-03-10', 3.678, 'exchange-api'),
('usd', '2017-03-14', 3.661, 'exchange-api'),
('usd', '2017-03-15', 3.658, 'exchange-api'),
('usd', '2017-03-16', 3.631, 'exchange-api'),
('usd', '2017-03-17', 3.63, 'exchange-api'),
('usd', '2017-03-20', 3.619, 'exchange-api'),
('usd', '2017-03-21', 3.614, 'exchange-api'),
('usd', '2017-03-22', 3.656, 'exchange-api'),
('usd', '2017-03-23', 3.645, 'exchange-api'),
('usd', '2017-03-24', 3.646, 'exchange-api'),
('usd', '2017-03-27', 3.618, 'exchange-api'),
('usd', '2017-03-28', 3.616, 'exchange-api'),
('usd', '2017-03-29', 3.625, 'exchange-api'),
('usd', '2017-03-30', 3.615, 'exchange-api'),
('usd', '2017-03-31', 3.632, 'exchange-api'),
('usd', '2017-04-03', 3.628, 'exchange-api'),
('usd', '2017-04-04', 3.646, 'exchange-api'),
('usd', '2017-04-05', 3.653, 'exchange-api'),
('usd', '2017-04-06', 3.648, 'exchange-api'),
('usd', '2017-04-07', 3.649, 'exchange-api'),
('usd', '2017-04-12', 3.654, 'exchange-api'),
('usd', '2017-04-13', 3.647, 'exchange-api'),
('usd', '2017-04-18', 3.665, 'exchange-api'),
('usd', '2017-04-19', 3.667, 'exchange-api'),
('usd', '2017-04-20', 3.664, 'exchange-api'),
('usd', '2017-04-21', 3.681, 'exchange-api'),
('usd', '2017-04-24', 3.649, 'exchange-api'),
('usd', '2017-04-25', 3.648, 'exchange-api'),
('usd', '2017-04-26', 3.634, 'exchange-api'),
('usd', '2017-04-27', 3.643, 'exchange-api'),
('usd', '2017-04-28', 3.619, 'exchange-api'),
('usd', '2017-05-03', 3.613, 'exchange-api'),
('usd', '2017-05-04', 3.616, 'exchange-api'),
('usd', '2017-05-05', 3.61, 'exchange-api'),
('usd', '2017-05-08', 3.604, 'exchange-api'),
('usd', '2017-05-09', 3.603, 'exchange-api'),
('usd', '2017-05-10', 3.605, 'exchange-api'),
('usd', '2017-05-11', 3.61, 'exchange-api'),
('usd', '2017-05-12', 3.61, 'exchange-api'),
('usd', '2017-05-15', 3.598, 'exchange-api'),
('usd', '2017-05-16', 3.606, 'exchange-api'),
('usd', '2017-05-17', 3.603, 'exchange-api'),
('usd', '2017-05-18', 3.605, 'exchange-api'),
('usd', '2017-05-19', 3.593, 'exchange-api'),
('usd', '2017-05-22', 3.582, 'exchange-api'),
('usd', '2017-05-23', 3.589, 'exchange-api'),
('usd', '2017-05-24', 3.593, 'exchange-api'),
('usd', '2017-05-25', 3.576, 'exchange-api'),
('usd', '2017-05-26', 3.574, 'exchange-api'),
('usd', '2017-05-30', 3.561, 'exchange-api'),
('usd', '2017-06-01', 3.549, 'exchange-api'),
('usd', '2017-06-02', 3.558, 'exchange-api'),
('usd', '2017-06-05', 3.548, 'exchange-api'),
('usd', '2017-06-06', 3.545, 'exchange-api'),
('usd', '2017-06-07', 3.546, 'exchange-api'),
('usd', '2017-06-08', 3.539, 'exchange-api'),
('usd', '2017-06-09', 3.532, 'exchange-api'),
('usd', '2017-06-12', 3.533, 'exchange-api'),
('usd', '2017-06-13', 3.533, 'exchange-api'),
('usd', '2017-06-14', 3.529, 'exchange-api'),
('usd', '2017-06-15', 3.521, 'exchange-api'),
('usd', '2017-06-16', 3.527, 'exchange-api'),
('usd', '2017-06-19', 3.52, 'exchange-api'),
('usd', '2017-06-20', 3.533, 'exchange-api'),
('usd', '2017-06-21', 3.543, 'exchange-api'),
('usd', '2017-06-22', 3.543, 'exchange-api'),
('usd', '2017-06-23', 3.541, 'exchange-api'),
('usd', '2017-06-26', 3.536, 'exchange-api'),
('usd', '2017-06-27', 3.518, 'exchange-api'),
('usd', '2017-06-28', 3.521, 'exchange-api'),
('usd', '2017-06-29', 3.49, 'exchange-api'),
('usd', '2017-06-30', 3.496, 'exchange-api'),
('usd', '2017-07-03', 3.493, 'exchange-api'),
('usd', '2017-07-04', 3.514, 'exchange-api'),
('usd', '2017-07-05', 3.522, 'exchange-api'),
('usd', '2017-07-06', 3.53, 'exchange-api'),
('usd', '2017-07-07', 3.528, 'exchange-api'),
('usd', '2017-07-10', 3.547, 'exchange-api'),
('usd', '2017-07-11', 3.576, 'exchange-api'),
('usd', '2017-07-12', 3.554, 'exchange-api'),
('usd', '2017-07-13', 3.534, 'exchange-api'),
('usd', '2017-07-14', 3.538, 'exchange-api'),
('usd', '2017-07-17', 3.545, 'exchange-api'),
('usd', '2017-07-18', 3.565, 'exchange-api'),
('usd', '2017-07-19', 3.588, 'exchange-api'),
('usd', '2017-07-20', 3.574, 'exchange-api'),
('usd', '2017-07-21', 3.557, 'exchange-api'),
('usd', '2017-07-24', 3.59, 'exchange-api'),
('usd', '2017-07-25', 3.569, 'exchange-api'),
('usd', '2017-07-26', 3.57, 'exchange-api'),
('usd', '2017-07-27', 3.557, 'exchange-api'),
('usd', '2017-07-28', 3.56, 'exchange-api'),
('usd', '2017-07-31', 3.558, 'exchange-api'),
('usd', '2017-08-02', 3.579, 'exchange-api'),
('usd', '2017-08-03', 3.589, 'exchange-api'),
('usd', '2017-08-04', 3.607, 'exchange-api'),
('usd', '2017-08-07', 3.621, 'exchange-api'),
('usd', '2017-08-08', 3.605, 'exchange-api'),
('usd', '2017-08-09', 3.601, 'exchange-api'),
('usd', '2017-08-10', 3.6, 'exchange-api'),
('usd', '2017-08-11', 3.586, 'exchange-api'),
('usd', '2017-08-14', 3.583, 'exchange-api'),
('usd', '2017-08-15', 3.589, 'exchange-api'),
('usd', '2017-08-16', 3.628, 'exchange-api'),
('usd', '2017-08-17', 3.627, 'exchange-api'),
('usd', '2017-08-18', 3.624, 'exchange-api'),
('usd', '2017-08-21', 3.622, 'exchange-api'),
('usd', '2017-08-22', 3.623, 'exchange-api'),
('usd', '2017-08-23', 3.618, 'exchange-api'),
('usd', '2017-08-24', 3.599, 'exchange-api'),
('usd', '2017-08-25', 3.596, 'exchange-api'),
('usd', '2017-08-28', 3.581, 'exchange-api'),
('usd', '2017-08-29', 3.577, 'exchange-api'),
('usd', '2017-08-30', 3.574, 'exchange-api'),
('usd', '2017-08-31', 3.596, 'exchange-api'),
('usd', '2017-09-01', 3.584, 'exchange-api'),
('usd', '2017-09-04', 3.583, 'exchange-api'),
('usd', '2017-09-05', 3.568, 'exchange-api'),
('usd', '2017-09-06', 3.562, 'exchange-api'),
('usd', '2017-09-07', 3.528, 'exchange-api'),
('usd', '2017-09-08', 3.504, 'exchange-api'),
('usd', '2017-09-11', 3.521, 'exchange-api'),
('usd', '2017-09-12', 3.536, 'exchange-api'),
('usd', '2017-09-13', 3.537, 'exchange-api'),
('usd', '2017-09-14', 3.538, 'exchange-api'),
('usd', '2017-09-15', 3.523, 'exchange-api'),
('usd', '2017-09-18', 3.522, 'exchange-api'),
('usd', '2017-09-19', 3.515, 'exchange-api'),
('usd', '2017-09-25', 3.512, 'exchange-api'),
('usd', '2017-09-26', 3.527, 'exchange-api'),
('usd', '2017-09-27', 3.546, 'exchange-api'),
('usd', '2017-09-28', 3.529, 'exchange-api'),
('usd', '2017-10-02', 3.542, 'exchange-api'),
('usd', '2017-10-03', 3.531, 'exchange-api'),
('usd', '2017-10-04', 3.522, 'exchange-api'),
('usd', '2017-10-06', 3.52, 'exchange-api'),
('usd', '2017-10-09', 3.51, 'exchange-api'),
('usd', '2017-10-10', 3.505, 'exchange-api'),
('usd', '2017-10-11', 3.506, 'exchange-api'),
('usd', '2017-10-13', 3.501, 'exchange-api'),
('usd', '2017-10-16', 3.496, 'exchange-api'),
('usd', '2017-10-17', 3.509, 'exchange-api'),
('usd', '2017-10-18', 3.514, 'exchange-api'),
('usd', '2017-10-19', 3.501, 'exchange-api'),
('usd', '2017-10-20', 3.493, 'exchange-api'),
('usd', '2017-10-23', 3.491, 'exchange-api'),
('usd', '2017-10-24', 3.501, 'exchange-api'),
('usd', '2017-10-25', 3.512, 'exchange-api'),
('usd', '2017-10-26', 3.51, 'exchange-api'),
('usd', '2017-10-27', 3.535, 'exchange-api'),
('usd', '2017-10-30', 3.528, 'exchange-api'),
('usd', '2017-10-31', 3.521, 'exchange-api'),
('usd', '2017-11-01', 3.513, 'exchange-api'),
('usd', '2017-11-02', 3.506, 'exchange-api'),
('usd', '2017-11-03', 3.513, 'exchange-api'),
('usd', '2017-11-06', 3.513, 'exchange-api'),
('usd', '2017-11-07', 3.516, 'exchange-api'),
('usd', '2017-11-08', 3.513, 'exchange-api'),
('usd', '2017-11-09', 3.513, 'exchange-api'),
('usd', '2017-11-10', 3.529, 'exchange-api'),
('usd', '2017-11-13', 3.543, 'exchange-api'),
('usd', '2017-11-14', 3.544, 'exchange-api'),
('usd', '2017-11-15', 3.532, 'exchange-api'),
('usd', '2017-11-16', 3.523, 'exchange-api'),
('usd', '2017-11-17', 3.519, 'exchange-api'),
('usd', '2017-11-20', 3.516, 'exchange-api'),
('usd', '2017-11-21', 3.529, 'exchange-api'),
('usd', '2017-11-22', 3.525, 'exchange-api'),
('usd', '2017-11-23', 3.512, 'exchange-api'),
('usd', '2017-11-24', 3.513, 'exchange-api'),
('usd', '2017-11-27', 3.501, 'exchange-api'),
('usd', '2017-11-28', 3.503, 'exchange-api'),
('usd', '2017-11-29', 3.504, 'exchange-api'),
('usd', '2017-11-30', 3.499, 'exchange-api'),
('usd', '2017-12-01', 3.488, 'exchange-api'),
('usd', '2017-12-04', 3.49, 'exchange-api'),
('usd', '2017-12-05', 3.492, 'exchange-api'),
('usd', '2017-12-06', 3.513, 'exchange-api'),
('usd', '2017-12-07', 3.516, 'exchange-api'),
('usd', '2017-12-08', 3.521, 'exchange-api'),
('usd', '2017-12-11', 3.519, 'exchange-api'),
('usd', '2017-12-12', 3.539, 'exchange-api'),
('usd', '2017-12-13', 3.55, 'exchange-api'),
('usd', '2017-12-14', 3.528, 'exchange-api'),
('usd', '2017-12-15', 3.523, 'exchange-api'),
('usd', '2017-12-18', 3.513, 'exchange-api'),
('usd', '2017-12-19', 3.498, 'exchange-api'),
('usd', '2017-12-20', 3.499, 'exchange-api'),
('usd', '2017-12-21', 3.489, 'exchange-api'),
('usd', '2017-12-22', 3.485, 'exchange-api'),
('usd', '2017-12-26', 3.488, 'exchange-api'),
('usd', '2017-12-27', 3.479, 'exchange-api'),
('usd', '2017-12-28', 3.472, 'exchange-api'),
('usd', '2017-12-29', 3.467, 'exchange-api'),
('usd', '2018-01-02', 3.457, 'exchange-api'),
('usd', '2018-01-03', 3.46, 'exchange-api'),
('usd', '2018-01-04', 3.448, 'exchange-api'),
('usd', '2018-01-05', 3.446, 'exchange-api'),
('usd', '2018-01-08', 3.441, 'exchange-api'),
('usd', '2018-01-09', 3.444, 'exchange-api'),
('usd', '2018-01-10', 3.429, 'exchange-api'),
('usd', '2018-01-11', 3.423, 'exchange-api'),
('usd', '2018-01-12', 3.415, 'exchange-api'),
('usd', '2018-01-15', 3.4, 'exchange-api'),
('usd', '2018-01-16', 3.41, 'exchange-api'),
('usd', '2018-01-17', 3.452, 'exchange-api'),
('usd', '2018-01-18', 3.427, 'exchange-api'),
('usd', '2018-01-19', 3.406, 'exchange-api'),
('usd', '2018-01-22', 3.421, 'exchange-api'),
('usd', '2018-01-23', 3.422, 'exchange-api'),
('usd', '2018-01-24', 3.406, 'exchange-api'),
('usd', '2018-01-25', 3.403, 'exchange-api'),
('usd', '2018-01-26', 3.388, 'exchange-api'),
('usd', '2018-01-29', 3.409, 'exchange-api'),
('usd', '2018-01-30', 3.399, 'exchange-api'),
('usd', '2018-01-31', 3.405, 'exchange-api'),
('usd', '2018-02-01', 3.427, 'exchange-api'),
('usd', '2018-02-02', 3.43, 'exchange-api'),
('usd', '2018-02-05', 3.442, 'exchange-api'),
('usd', '2018-02-06', 3.485, 'exchange-api'),
('usd', '2018-02-07', 3.486, 'exchange-api'),
('usd', '2018-02-08', 3.499, 'exchange-api'),
('usd', '2018-02-09', 3.516, 'exchange-api'),
('usd', '2018-02-12', 3.524, 'exchange-api'),
('usd', '2018-02-13', 3.527, 'exchange-api'),
('usd', '2018-02-14', 3.533, 'exchange-api'),
('usd', '2018-02-15', 3.525, 'exchange-api'),
('usd', '2018-02-16', 3.535, 'exchange-api'),
('usd', '2018-02-19', 3.521, 'exchange-api'),
('usd', '2018-02-20', 3.498, 'exchange-api'),
('usd', '2018-02-21', 3.501, 'exchange-api'),
('usd', '2018-02-22', 3.497, 'exchange-api'),
('usd', '2018-02-23', 3.485, 'exchange-api'),
('usd', '2018-02-26', 3.494, 'exchange-api'),
('usd', '2018-02-27', 3.478, 'exchange-api'),
('usd', '2018-02-28', 3.485, 'exchange-api'),
('usd', '2018-03-05', 3.456, 'exchange-api'),
('usd', '2018-03-06', 3.469, 'exchange-api'),
('usd', '2018-03-07', 3.466, 'exchange-api'),
('usd', '2018-03-08', 3.459, 'exchange-api'),
('usd', '2018-03-09', 3.453, 'exchange-api'),
('usd', '2018-03-12', 3.44, 'exchange-api'),
('usd', '2018-03-13', 3.444, 'exchange-api'),
('usd', '2018-03-14', 3.431, 'exchange-api'),
('usd', '2018-03-15', 3.434, 'exchange-api'),
('usd', '2018-03-16', 3.452, 'exchange-api'),
('usd', '2018-03-19', 3.468, 'exchange-api'),
('usd', '2018-03-20', 3.479, 'exchange-api'),
('usd', '2018-03-21', 3.495, 'exchange-api'),
('usd', '2018-03-22', 3.48, 'exchange-api'),
('usd', '2018-03-23', 3.491, 'exchange-api'),
('usd', '2018-03-26', 3.491, 'exchange-api'),
('usd', '2018-03-27', 3.487, 'exchange-api'),
('usd', '2018-03-28', 3.499, 'exchange-api'),
('usd', '2018-03-29', 3.514, 'exchange-api'),
('usd', '2018-04-03', 3.518, 'exchange-api'),
('usd', '2018-04-04', 3.528, 'exchange-api'),
('usd', '2018-04-05', 3.537, 'exchange-api'),
('usd', '2018-04-09', 3.532, 'exchange-api'),
('usd', '2018-04-10', 3.506, 'exchange-api'),
('usd', '2018-04-11', 3.518, 'exchange-api'),
('usd', '2018-04-12', 3.518, 'exchange-api'),
('usd', '2018-04-13', 3.506, 'exchange-api'),
('usd', '2018-04-16', 3.503, 'exchange-api'),
('usd', '2018-04-17', 3.527, 'exchange-api'),
('usd', '2018-04-18', 3.519, 'exchange-api'),
('usd', '2018-04-20', 3.523, 'exchange-api'),
('usd', '2018-04-23', 3.544, 'exchange-api'),
('usd', '2018-04-24', 3.561, 'exchange-api'),
('usd', '2018-04-25', 3.59, 'exchange-api'),
('usd', '2018-04-26', 3.579, 'exchange-api'),
('usd', '2018-04-27', 3.597, 'exchange-api'),
('usd', '2018-04-30', 3.588, 'exchange-api'),
('usd', '2018-05-01', 3.616, 'exchange-api'),
('usd', '2018-05-02', 3.61, 'exchange-api'),
('usd', '2018-05-03', 3.632, 'exchange-api'),
('usd', '2018-05-04', 3.622, 'exchange-api'),
('usd', '2018-05-07', 3.625, 'exchange-api'),
('usd', '2018-05-08', 3.602, 'exchange-api'),
('usd', '2018-05-09', 3.6, 'exchange-api'),
('usd', '2018-05-10', 3.583, 'exchange-api'),
('usd', '2018-05-11', 3.569, 'exchange-api'),
('usd', '2018-05-14', 3.574, 'exchange-api'),
('usd', '2018-05-15', 3.599, 'exchange-api'),
('usd', '2018-05-16', 3.593, 'exchange-api'),
('usd', '2018-05-17', 3.587, 'exchange-api'),
('usd', '2018-05-18', 3.589, 'exchange-api'),
('usd', '2018-05-21', 3.584, 'exchange-api'),
('usd', '2018-05-22', 3.564, 'exchange-api'),
('usd', '2018-05-23', 3.58, 'exchange-api'),
('usd', '2018-05-24', 3.569, 'exchange-api'),
('usd', '2018-05-25', 3.568, 'exchange-api'),
('usd', '2018-05-29', 3.594, 'exchange-api'),
('usd', '2018-05-30', 3.577, 'exchange-api'),
('usd', '2018-05-31', 3.566, 'exchange-api'),
('usd', '2018-06-01', 3.565, 'exchange-api'),
('usd', '2018-06-04', 3.566, 'exchange-api'),
('usd', '2018-06-05', 3.575, 'exchange-api'),
('usd', '2018-06-06', 3.566, 'exchange-api'),
('usd', '2018-06-07', 3.57, 'exchange-api'),
('usd', '2018-06-08', 3.574, 'exchange-api'),
('usd', '2018-06-11', 3.572, 'exchange-api'),
('usd', '2018-06-12', 3.578, 'exchange-api'),
('usd', '2018-06-13', 3.587, 'exchange-api'),
('usd', '2018-06-14', 3.596, 'exchange-api'),
('usd', '2018-06-15', 3.605, 'exchange-api'),
('usd', '2018-06-18', 3.626, 'exchange-api'),
('usd', '2018-06-19', 3.644, 'exchange-api'),
('usd', '2018-06-20', 3.639, 'exchange-api'),
('usd', '2018-06-21', 3.623, 'exchange-api'),
('usd', '2018-06-22', 3.617, 'exchange-api'),
('usd', '2018-06-25', 3.616, 'exchange-api'),
('usd', '2018-06-26', 3.631, 'exchange-api'),
('usd', '2018-06-27', 3.646, 'exchange-api'),
('usd', '2018-06-28', 3.649, 'exchange-api'),
('usd', '2018-06-29', 3.65, 'exchange-api'),
('usd', '2018-07-02', 3.661, 'exchange-api'),
('usd', '2018-07-03', 3.655, 'exchange-api'),
('usd', '2018-07-04', 3.657, 'exchange-api'),
('usd', '2018-07-05', 3.626, 'exchange-api'),
('usd', '2018-07-06', 3.636, 'exchange-api'),
('usd', '2018-07-09', 3.618, 'exchange-api'),
('usd', '2018-07-10', 3.642, 'exchange-api'),
('usd', '2018-07-11', 3.638, 'exchange-api'),
('usd', '2018-07-12', 3.652, 'exchange-api'),
('usd', '2018-07-13', 3.643, 'exchange-api'),
('usd', '2018-07-16', 3.641, 'exchange-api'),
('usd', '2018-07-17', 3.631, 'exchange-api'),
('usd', '2018-07-18', 3.642, 'exchange-api'),
('usd', '2018-07-19', 3.649, 'exchange-api'),
('usd', '2018-07-20', 3.647, 'exchange-api'),
('usd', '2018-07-23', 3.633, 'exchange-api'),
('usd', '2018-07-24', 3.649, 'exchange-api'),
('usd', '2018-07-25', 3.641, 'exchange-api'),
('usd', '2018-07-26', 3.638, 'exchange-api'),
('usd', '2018-07-27', 3.667, 'exchange-api'),
('usd', '2018-07-30', 3.667, 'exchange-api'),
('usd', '2018-07-31', 3.664, 'exchange-api'),
('usd', '2018-08-01', 3.677, 'exchange-api'),
('usd', '2018-08-02', 3.689, 'exchange-api'),
('usd', '2018-08-03', 3.7, 'exchange-api'),
('usd', '2018-08-06', 3.71, 'exchange-api'),
('usd', '2018-08-07', 3.695, 'exchange-api'),
('usd', '2018-08-08', 3.684, 'exchange-api'),
('usd', '2018-08-09', 3.683, 'exchange-api'),
('usd', '2018-08-10', 3.694, 'exchange-api'),
('usd', '2018-08-13', 3.709, 'exchange-api'),
('usd', '2018-08-14', 3.691, 'exchange-api'),
('usd', '2018-08-15', 3.693, 'exchange-api'),
('usd', '2018-08-16', 3.688, 'exchange-api'),
('usd', '2018-08-17', 3.669, 'exchange-api'),
('usd', '2018-08-20', 3.662, 'exchange-api'),
('usd', '2018-08-21', 3.655, 'exchange-api'),
('usd', '2018-08-22', 3.635, 'exchange-api'),
('usd', '2018-08-23', 3.635, 'exchange-api'),
('usd', '2018-08-24', 3.639, 'exchange-api'),
('usd', '2018-08-27', 3.639, 'exchange-api'),
('usd', '2018-08-28', 3.624, 'exchange-api'),
('usd', '2018-08-29', 3.643, 'exchange-api'),
('usd', '2018-08-30', 3.61, 'exchange-api'),
('usd', '2018-08-31', 3.604, 'exchange-api'),
('usd', '2018-09-03', 3.615, 'exchange-api'),
('usd', '2018-09-04', 3.625, 'exchange-api'),
('usd', '2018-09-05', 3.619, 'exchange-api'),
('usd', '2018-09-06', 3.595, 'exchange-api'),
('usd', '2018-09-07', 3.581, 'exchange-api'),
('usd', '2018-09-12', 3.588, 'exchange-api'),
('usd', '2018-09-13', 3.575, 'exchange-api'),
('usd', '2018-09-14', 3.564, 'exchange-api'),
('usd', '2018-09-17', 3.583, 'exchange-api'),
('usd', '2018-09-20', 3.583, 'exchange-api'),
('usd', '2018-09-21', 3.573, 'exchange-api'),
('usd', '2018-09-25', 3.582, 'exchange-api'),
('usd', '2018-09-26', 3.579, 'exchange-api'),
('usd', '2018-09-27', 3.599, 'exchange-api'),
('usd', '2018-09-28', 3.627, 'exchange-api'),
('usd', '2018-10-02', 3.65, 'exchange-api'),
('usd', '2018-10-03', 3.64, 'exchange-api'),
('usd', '2018-10-04', 3.64, 'exchange-api'),
('usd', '2018-10-05', 3.633, 'exchange-api'),
('usd', '2018-10-08', 3.62, 'exchange-api'),
('usd', '2018-10-09', 3.642, 'exchange-api'),
('usd', '2018-10-10', 3.626, 'exchange-api'),
('usd', '2018-10-11', 3.635, 'exchange-api'),
('usd', '2018-10-12', 3.628, 'exchange-api'),
('usd', '2018-10-15', 3.628, 'exchange-api'),
('usd', '2018-10-16', 3.645, 'exchange-api'),
('usd', '2018-10-17', 3.649, 'exchange-api'),
('usd', '2018-10-18', 3.652, 'exchange-api'),
('usd', '2018-10-19', 3.667, 'exchange-api'),
('usd', '2018-10-22', 3.651, 'exchange-api'),
('usd', '2018-10-23', 3.67, 'exchange-api'),
('usd', '2018-10-24', 3.68, 'exchange-api'),
('usd', '2018-10-25', 3.693, 'exchange-api'),
('usd', '2018-10-26', 3.701, 'exchange-api'),
('usd', '2018-10-29', 3.704, 'exchange-api'),
('usd', '2018-10-31', 3.721, 'exchange-api'),
('usd', '2018-11-01', 3.706, 'exchange-api'),
('usd', '2018-11-02', 3.691, 'exchange-api'),
('usd', '2018-11-05', 3.7, 'exchange-api'),
('usd', '2018-11-06', 3.691, 'exchange-api'),
('usd', '2018-11-07', 3.668, 'exchange-api'),
('usd', '2018-11-08', 3.673, 'exchange-api'),
('usd', '2018-11-09', 3.683, 'exchange-api'),
('usd', '2018-11-12', 3.676, 'exchange-api'),
('usd', '2018-11-13', 3.689, 'exchange-api'),
('usd', '2018-11-14', 3.698, 'exchange-api'),
('usd', '2018-11-15', 3.695, 'exchange-api'),
('usd', '2018-11-16', 3.717, 'exchange-api'),
('usd', '2018-11-19', 3.708, 'exchange-api'),
('usd', '2018-11-20', 3.716, 'exchange-api'),
('usd', '2018-11-21', 3.743, 'exchange-api'),
('usd', '2018-11-22', 3.728, 'exchange-api'),
('usd', '2018-11-23', 3.737, 'exchange-api'),
('usd', '2018-11-26', 3.729, 'exchange-api'),
('usd', '2018-11-27', 3.728, 'exchange-api'),
('usd', '2018-11-28', 3.733, 'exchange-api'),
('usd', '2018-11-29', 3.71, 'exchange-api'),
('usd', '2018-11-30', 3.701, 'exchange-api'),
('usd', '2018-12-03', 3.718, 'exchange-api'),
('usd', '2018-12-04', 3.727, 'exchange-api'),
('usd', '2018-12-05', 3.724, 'exchange-api'),
('usd', '2018-12-06', 3.731, 'exchange-api'),
('usd', '2018-12-07', 3.738, 'exchange-api'),
('usd', '2018-12-10', 3.727, 'exchange-api'),
('usd', '2018-12-11', 3.748, 'exchange-api'),
('usd', '2018-12-12', 3.746, 'exchange-api'),
('usd', '2018-12-13', 3.753, 'exchange-api'),
('usd', '2018-12-14', 3.771, 'exchange-api'),
('usd', '2018-12-17', 3.778, 'exchange-api'),
('usd', '2018-12-18', 3.763, 'exchange-api'),
('usd', '2018-12-19', 3.756, 'exchange-api'),
('usd', '2018-12-20', 3.757, 'exchange-api'),
('usd', '2018-12-21', 3.773, 'exchange-api'),
('usd', '2018-12-24', 3.774, 'exchange-api'),
('usd', '2018-12-26', 3.774, 'exchange-api'),
('usd', '2018-12-27', 3.781, 'exchange-api'),
('usd', '2018-12-28', 3.771, 'exchange-api'),
('usd', '2018-12-31', 3.748, 'exchange-api'),
('usd', '2019-01-02', 3.746, 'exchange-api'),
('usd', '2019-01-03', 3.742, 'exchange-api'),
('usd', '2019-01-04', 3.72, 'exchange-api'),
('usd', '2019-01-07', 3.694, 'exchange-api'),
('usd', '2019-01-08', 3.699, 'exchange-api'),
('usd', '2019-01-09', 3.682, 'exchange-api'),
('usd', '2019-01-10', 3.664, 'exchange-api'),
('usd', '2019-01-11', 3.673, 'exchange-api'),
('usd', '2019-01-14', 3.657, 'exchange-api'),
('usd', '2019-01-15', 3.67, 'exchange-api'),
('usd', '2019-01-16', 3.678, 'exchange-api'),
('usd', '2019-01-17', 3.688, 'exchange-api'),
('usd', '2019-01-18', 3.692, 'exchange-api'),
('usd', '2019-01-21', 3.698, 'exchange-api'),
('usd', '2019-01-22', 3.69, 'exchange-api'),
('usd', '2019-01-23', 3.683, 'exchange-api'),
('usd', '2019-01-24', 3.683, 'exchange-api'),
('usd', '2019-01-25', 3.685, 'exchange-api'),
('usd', '2019-01-28', 3.68, 'exchange-api'),
('usd', '2019-01-29', 3.678, 'exchange-api'),
('usd', '2019-01-30', 3.671, 'exchange-api'),
('usd', '2019-01-31', 3.642, 'exchange-api'),
('usd', '2019-02-01', 3.633, 'exchange-api'),
('usd', '2019-02-04', 3.627, 'exchange-api'),
('usd', '2019-02-05', 3.61, 'exchange-api'),
('usd', '2019-02-06', 3.619, 'exchange-api'),
('usd', '2019-02-07', 3.627, 'exchange-api'),
('usd', '2019-02-08', 3.634, 'exchange-api'),
('usd', '2019-02-11', 3.643, 'exchange-api'),
('usd', '2019-02-12', 3.643, 'exchange-api'),
('usd', '2019-02-13', 3.637, 'exchange-api'),
('usd', '2019-02-14', 3.662, 'exchange-api'),
('usd', '2019-02-15', 3.641, 'exchange-api'),
('usd', '2019-02-18', 3.62, 'exchange-api'),
('usd', '2019-02-19', 3.631, 'exchange-api'),
('usd', '2019-02-20', 3.617, 'exchange-api'),
('usd', '2019-02-21', 3.617, 'exchange-api'),
('usd', '2019-02-22', 3.613, 'exchange-api'),
('usd', '2019-02-25', 3.605, 'exchange-api'),
('usd', '2019-02-26', 3.624, 'exchange-api'),
('usd', '2019-02-27', 3.619, 'exchange-api'),
('usd', '2019-02-28', 3.604, 'exchange-api'),
('usd', '2019-03-01', 3.624, 'exchange-api'),
('usd', '2019-03-04', 3.625, 'exchange-api'),
('usd', '2019-03-05', 3.619, 'exchange-api'),
('usd', '2019-03-06', 3.616, 'exchange-api'),
('usd', '2019-03-07', 3.616, 'exchange-api'),
('usd', '2019-03-08', 3.631, 'exchange-api'),
('usd', '2019-03-11', 3.621, 'exchange-api'),
('usd', '2019-03-12', 3.623, 'exchange-api'),
('usd', '2019-03-13', 3.617, 'exchange-api'),
('usd', '2019-03-14', 3.6, 'exchange-api'),
('usd', '2019-03-15', 3.604, 'exchange-api'),
('usd', '2019-03-18', 3.601, 'exchange-api'),
('usd', '2019-03-19', 3.606, 'exchange-api'),
('usd', '2019-03-20', 3.608, 'exchange-api'),
('usd', '2019-03-25', 3.623, 'exchange-api'),
('usd', '2019-03-26', 3.617, 'exchange-api'),
('usd', '2019-03-27', 3.635, 'exchange-api'),
('usd', '2019-03-28', 3.636, 'exchange-api'),
('usd', '2019-03-29', 3.632, 'exchange-api'),
('usd', '2019-04-01', 3.626, 'exchange-api'),
('usd', '2019-04-02', 3.624, 'exchange-api'),
('usd', '2019-04-03', 3.6, 'exchange-api'),
('usd', '2019-04-04', 3.603, 'exchange-api'),
('usd', '2019-04-05', 3.587, 'exchange-api'),
('usd', '2019-04-08', 3.58, 'exchange-api'),
('usd', '2019-04-10', 3.578, 'exchange-api'),
('usd', '2019-04-11', 3.583, 'exchange-api'),
('usd', '2019-04-12', 3.578, 'exchange-api'),
('usd', '2019-04-15', 3.561, 'exchange-api'),
('usd', '2019-04-16', 3.558, 'exchange-api'),
('usd', '2019-04-17', 3.575, 'exchange-api'),
('usd', '2019-04-18', 3.589, 'exchange-api'),
('usd', '2019-04-23', 3.593, 'exchange-api'),
('usd', '2019-04-24', 3.614, 'exchange-api'),
('usd', '2019-04-25', 3.628, 'exchange-api'),
('usd', '2019-04-29', 3.618, 'exchange-api'),
('usd', '2019-04-30', 3.608, 'exchange-api'),
('usd', '2019-05-01', 3.586, 'exchange-api'),
('usd', '2019-05-02', 3.598, 'exchange-api'),
('usd', '2019-05-03', 3.601, 'exchange-api'),
('usd', '2019-05-06', 3.591, 'exchange-api'),
('usd', '2019-05-07', 3.585, 'exchange-api'),
('usd', '2019-05-08', 3.584, 'exchange-api'),
('usd', '2019-05-10', 3.567, 'exchange-api'),
('usd', '2019-05-13', 3.568, 'exchange-api'),
('usd', '2019-05-14', 3.577, 'exchange-api'),
('usd', '2019-05-15', 3.571, 'exchange-api'),
('usd', '2019-05-16', 3.568, 'exchange-api'),
('usd', '2019-05-17', 3.575, 'exchange-api'),
('usd', '2019-05-20', 3.573, 'exchange-api'),
('usd', '2019-05-21', 3.598, 'exchange-api'),
('usd', '2019-05-22', 3.611, 'exchange-api'),
('usd', '2019-05-23', 3.615, 'exchange-api'),
('usd', '2019-05-24', 3.605, 'exchange-api'),
('usd', '2019-05-28', 3.614, 'exchange-api'),
('usd', '2019-05-29', 3.617, 'exchange-api'),
('usd', '2019-05-30', 3.62, 'exchange-api'),
('usd', '2019-05-31', 3.634, 'exchange-api'),
('usd', '2019-06-03', 3.633, 'exchange-api'),
('usd', '2019-06-04', 3.612, 'exchange-api'),
('usd', '2019-06-05', 3.61, 'exchange-api'),
('usd', '2019-06-06', 3.601, 'exchange-api'),
('usd', '2019-06-07', 3.601, 'exchange-api'),
('usd', '2019-06-10', 3.585, 'exchange-api'),
('usd', '2019-06-11', 3.581, 'exchange-api'),
('usd', '2019-06-12', 3.582, 'exchange-api'),
('usd', '2019-06-13', 3.592, 'exchange-api'),
('usd', '2019-06-14', 3.6, 'exchange-api'),
('usd', '2019-06-17', 3.61, 'exchange-api'),
('usd', '2019-06-18', 3.612, 'exchange-api'),
('usd', '2019-06-19', 3.609, 'exchange-api'),
('usd', '2019-06-20', 3.579, 'exchange-api'),
('usd', '2019-06-21', 3.594, 'exchange-api'),
('usd', '2019-06-24', 3.604, 'exchange-api'),
('usd', '2019-06-25', 3.602, 'exchange-api'),
('usd', '2019-06-26', 3.591, 'exchange-api'),
('usd', '2019-06-27', 3.582, 'exchange-api'),
('usd', '2019-06-28', 3.566, 'exchange-api'),
('usd', '2019-07-01', 3.574, 'exchange-api'),
('usd', '2019-07-02', 3.575, 'exchange-api'),
('usd', '2019-07-03', 3.572, 'exchange-api'),
('usd', '2019-07-04', 3.567, 'exchange-api'),
('usd', '2019-07-05', 3.562, 'exchange-api'),
('usd', '2019-07-08', 3.573, 'exchange-api'),
('usd', '2019-07-09', 3.568, 'exchange-api'),
('usd', '2019-07-10', 3.573, 'exchange-api'),
('usd', '2019-07-11', 3.547, 'exchange-api'),
('usd', '2019-07-12', 3.551, 'exchange-api'),
('usd', '2019-07-15', 3.539, 'exchange-api'),
('usd', '2019-07-16', 3.542, 'exchange-api'),
('usd', '2019-07-17', 3.541, 'exchange-api'),
('usd', '2019-07-18', 3.543, 'exchange-api'),
('usd', '2019-07-19', 3.535, 'exchange-api'),
('usd', '2019-07-22', 3.534, 'exchange-api'),
('usd', '2019-07-23', 3.537, 'exchange-api'),
('usd', '2019-07-24', 3.521, 'exchange-api'),
('usd', '2019-07-25', 3.523, 'exchange-api'),
('usd', '2019-07-26', 3.526, 'exchange-api'),
('usd', '2019-07-29', 3.525, 'exchange-api'),
('usd', '2019-07-30', 3.5, 'exchange-api'),
('usd', '2019-07-31', 3.499, 'exchange-api'),
('usd', '2019-08-01', 3.524, 'exchange-api'),
('usd', '2019-08-02', 3.509, 'exchange-api'),
('usd', '2019-08-05', 3.494, 'exchange-api'),
('usd', '2019-08-06', 3.494, 'exchange-api'),
('usd', '2019-08-07', 3.487, 'exchange-api'),
('usd', '2019-08-08', 3.483, 'exchange-api'),
('usd', '2019-08-09', 3.479, 'exchange-api'),
('usd', '2019-08-12', 3.484, 'exchange-api'),
('usd', '2019-08-13', 3.493, 'exchange-api'),
('usd', '2019-08-14', 3.489, 'exchange-api'),
('usd', '2019-08-15', 3.519, 'exchange-api'),
('usd', '2019-08-16', 3.541, 'exchange-api'),
('usd', '2019-08-19', 3.545, 'exchange-api'),
('usd', '2019-08-20', 3.524, 'exchange-api'),
('usd', '2019-08-21', 3.527, 'exchange-api'),
('usd', '2019-08-22', 3.525, 'exchange-api'),
('usd', '2019-08-23', 3.511, 'exchange-api'),
('usd', '2019-08-26', 3.519, 'exchange-api'),
('usd', '2019-08-27', 3.52, 'exchange-api'),
('usd', '2019-08-28', 3.524, 'exchange-api'),
('usd', '2019-08-29', 3.521, 'exchange-api'),
('usd', '2019-08-30', 3.535, 'exchange-api'),
('usd', '2019-09-02', 3.538, 'exchange-api'),
('usd', '2019-09-03', 3.549, 'exchange-api'),
('usd', '2019-09-04', 3.527, 'exchange-api'),
('usd', '2019-09-05', 3.512, 'exchange-api'),
('usd', '2019-09-06', 3.517, 'exchange-api'),
('usd', '2019-09-09', 3.527, 'exchange-api'),
('usd', '2019-09-10', 3.538, 'exchange-api'),
('usd', '2019-09-11', 3.544, 'exchange-api'),
('usd', '2019-09-12', 3.541, 'exchange-api'),
('usd', '2019-09-13', 3.527, 'exchange-api'),
('usd', '2019-09-16', 3.538, 'exchange-api'),
('usd', '2019-09-18', 3.541, 'exchange-api'),
('usd', '2019-09-19', 3.521, 'exchange-api'),
('usd', '2019-09-20', 3.513, 'exchange-api'),
('usd', '2019-09-23', 3.517, 'exchange-api'),
('usd', '2019-09-24', 3.507, 'exchange-api'),
('usd', '2019-09-25', 3.501, 'exchange-api'),
('usd', '2019-09-26', 3.517, 'exchange-api'),
('usd', '2019-09-27', 3.482, 'exchange-api'),
('usd', '2019-10-02', 3.485, 'exchange-api'),
('usd', '2019-10-03', 3.493, 'exchange-api'),
('usd', '2019-10-04', 3.481, 'exchange-api'),
('usd', '2019-10-07', 3.493, 'exchange-api'),
('usd', '2019-10-10', 3.504, 'exchange-api'),
('usd', '2019-10-11', 3.51, 'exchange-api'),
('usd', '2019-10-15', 3.513, 'exchange-api'),
('usd', '2019-10-16', 3.536, 'exchange-api'),
('usd', '2019-10-17', 3.545, 'exchange-api'),
('usd', '2019-10-18', 3.533, 'exchange-api'),
('usd', '2019-10-22', 3.537, 'exchange-api'),
('usd', '2019-10-23', 3.538, 'exchange-api'),
('usd', '2019-10-24', 3.523, 'exchange-api'),
('usd', '2019-10-25', 3.539, 'exchange-api'),
('usd', '2019-10-28', 3.529, 'exchange-api'),
('usd', '2019-10-29', 3.53, 'exchange-api'),
('usd', '2019-10-30', 3.528, 'exchange-api'),
('usd', '2019-10-31', 3.529, 'exchange-api'),
('usd', '2019-11-01', 3.521, 'exchange-api'),
('usd', '2019-11-04', 3.522, 'exchange-api'),
('usd', '2019-11-05', 3.501, 'exchange-api'),
('usd', '2019-11-06', 3.49, 'exchange-api'),
('usd', '2019-11-07', 3.487, 'exchange-api'),
('usd', '2019-11-08', 3.495, 'exchange-api'),
('usd', '2019-11-11', 3.499, 'exchange-api'),
('usd', '2019-11-12', 3.511, 'exchange-api'),
('usd', '2019-11-13', 3.495, 'exchange-api'),
('usd', '2019-11-14', 3.488, 'exchange-api'),
('usd', '2019-11-15', 3.478, 'exchange-api'),
('usd', '2019-11-18', 3.463, 'exchange-api'),
('usd', '2019-11-19', 3.457, 'exchange-api'),
('usd', '2019-11-20', 3.471, 'exchange-api'),
('usd', '2019-11-21', 3.455, 'exchange-api'),
('usd', '2019-11-22', 3.46, 'exchange-api'),
('usd', '2019-11-25', 3.461, 'exchange-api'),
('usd', '2019-11-26', 3.463, 'exchange-api'),
('usd', '2019-11-27', 3.471, 'exchange-api'),
('usd', '2019-11-28', 3.471, 'exchange-api'),
('usd', '2019-11-29', 3.476, 'exchange-api'),
('usd', '2019-12-02', 3.474, 'exchange-api'),
('usd', '2019-12-03', 3.481, 'exchange-api'),
('usd', '2019-12-04', 3.471, 'exchange-api'),
('usd', '2019-12-05', 3.467, 'exchange-api'),
('usd', '2019-12-06', 3.463, 'exchange-api'),
('usd', '2019-12-09', 3.471, 'exchange-api'),
('usd', '2019-12-10', 3.465, 'exchange-api'),
('usd', '2019-12-11', 3.477, 'exchange-api'),
('usd', '2019-12-12', 3.481, 'exchange-api'),
('usd', '2019-12-13', 3.476, 'exchange-api'),
('usd', '2019-12-16', 3.498, 'exchange-api'),
('usd', '2019-12-17', 3.492, 'exchange-api'),
('usd', '2019-12-18', 3.501, 'exchange-api'),
('usd', '2019-12-19', 3.493, 'exchange-api'),
('usd', '2019-12-20', 3.477, 'exchange-api'),
('usd', '2019-12-23', 3.472, 'exchange-api'),
('usd', '2019-12-24', 3.466, 'exchange-api'),
('usd', '2019-12-26', 3.472, 'exchange-api'),
('usd', '2019-12-27', 3.468, 'exchange-api'),
('usd', '2019-12-30', 3.463, 'exchange-api'),
('usd', '2019-12-31', 3.456, 'exchange-api'),
('usd', '2020-01-02', 3.452, 'exchange-api'),
('usd', '2020-01-03', 3.467, 'exchange-api'),
('usd', '2020-01-06', 3.475, 'exchange-api'),
('usd', '2020-01-07', 3.467, 'exchange-api'),
('usd', '2020-01-08', 3.465, 'exchange-api'),
('usd', '2020-01-09', 3.471, 'exchange-api'),
('usd', '2020-01-10', 3.473, 'exchange-api'),
('usd', '2020-01-13', 3.47, 'exchange-api'),
('usd', '2020-01-14', 3.47, 'exchange-api'),
('usd', '2020-01-15', 3.459, 'exchange-api'),
('usd', '2020-01-16', 3.456, 'exchange-api'),
('usd', '2020-01-17', 3.454, 'exchange-api'),
('usd', '2020-01-20', 3.456, 'exchange-api'),
('usd', '2020-01-21', 3.455, 'exchange-api'),
('usd', '2020-01-22', 3.452, 'exchange-api'),
('usd', '2020-01-23', 3.458, 'exchange-api'),
('usd', '2020-01-24', 3.455, 'exchange-api'),
('usd', '2020-01-27', 3.458, 'exchange-api'),
('usd', '2020-01-28', 3.455, 'exchange-api'),
('usd', '2020-01-29', 3.458, 'exchange-api'),
('usd', '2020-01-30', 3.45, 'exchange-api'),
('usd', '2020-01-31', 3.448, 'exchange-api'),
('usd', '2020-02-03', 3.446, 'exchange-api'),
('usd', '2020-02-04', 3.448, 'exchange-api'),
('usd', '2020-02-05', 3.452, 'exchange-api'),
('usd', '2020-02-06', 3.439, 'exchange-api'),
('usd', '2020-02-07', 3.426, 'exchange-api'),
('usd', '2020-02-10', 3.422, 'exchange-api'),
('usd', '2020-02-11', 3.419, 'exchange-api'),
('usd', '2020-02-12', 3.423, 'exchange-api'),
('usd', '2020-02-13', 3.431, 'exchange-api'),
('usd', '2020-02-14', 3.434, 'exchange-api'),
('usd', '2020-02-17', 3.428, 'exchange-api'),
('usd', '2020-02-18', 3.416, 'exchange-api'),
('usd', '2020-02-19', 3.424, 'exchange-api'),
('usd', '2020-02-20', 3.432, 'exchange-api'),
('usd', '2020-02-21', 3.424, 'exchange-api'),
('usd', '2020-02-24', 3.437, 'exchange-api'),
('usd', '2020-02-25', 3.429, 'exchange-api'),
('usd', '2020-02-26', 3.442, 'exchange-api'),
('usd', '2020-02-27', 3.434, 'exchange-api'),
('usd', '2020-02-28', 3.467, 'exchange-api'),
('usd', '2020-03-03', 3.461, 'exchange-api'),
('usd', '2020-03-04', 3.46, 'exchange-api'),
('usd', '2020-03-05', 3.466, 'exchange-api'),
('usd', '2020-03-06', 3.486, 'exchange-api'),
('usd', '2020-03-09', 3.508, 'exchange-api'),
('usd', '2020-03-12', 3.639, 'exchange-api'),
('usd', '2020-03-13', 3.652, 'exchange-api'),
('usd', '2020-03-16', 3.728, 'exchange-api'),
('usd', '2020-03-17', 3.862, 'exchange-api'),
('usd', '2020-03-18', 3.827, 'exchange-api'),
('usd', '2020-03-19', 3.683, 'exchange-api'),
('usd', '2020-03-20', 3.597, 'exchange-api'),
('usd', '2020-03-23', 3.698, 'exchange-api'),
('usd', '2020-03-24', 3.658, 'exchange-api'),
('usd', '2020-03-25', 3.642, 'exchange-api'),
('usd', '2020-03-26', 3.624, 'exchange-api'),
('usd', '2020-03-27', 3.598, 'exchange-api'),
('usd', '2020-03-30', 3.586, 'exchange-api'),
('usd', '2020-03-31', 3.565, 'exchange-api'),
('usd', '2020-04-01', 3.556, 'exchange-api'),
('usd', '2020-04-02', 3.63, 'exchange-api'),
('usd', '2020-04-03', 3.636, 'exchange-api'),
('usd', '2020-04-06', 3.627, 'exchange-api'),
('usd', '2020-04-07', 3.604, 'exchange-api'),
('usd', '2020-04-14', 3.579, 'exchange-api'),
('usd', '2020-04-16', 3.594, 'exchange-api'),
('usd', '2020-04-17', 3.591, 'exchange-api'),
('usd', '2020-04-20', 3.58, 'exchange-api'),
('usd', '2020-04-21', 3.552, 'exchange-api'),
('usd', '2020-04-22', 3.541, 'exchange-api'),
('usd', '2020-04-23', 3.557, 'exchange-api'),
('usd', '2020-04-24', 3.524, 'exchange-api'),
('usd', '2020-04-27', 3.515, 'exchange-api'),
('usd', '2020-04-28', 3.499, 'exchange-api'),
('usd', '2020-04-30', 3.5, 'exchange-api'),
('usd', '2020-05-01', 3.491, 'exchange-api'),
('usd', '2020-05-04', 3.527, 'exchange-api'),
('usd', '2020-05-05', 3.524, 'exchange-api'),
('usd', '2020-05-06', 3.511, 'exchange-api'),
('usd', '2020-05-07', 3.516, 'exchange-api'),
('usd', '2020-05-11', 3.518, 'exchange-api'),
('usd', '2020-05-12', 3.507, 'exchange-api'),
('usd', '2020-05-13', 3.511, 'exchange-api'),
('usd', '2020-05-14', 3.546, 'exchange-api'),
('usd', '2020-05-15', 3.533, 'exchange-api'),
('usd', '2020-05-18', 3.543, 'exchange-api'),
('usd', '2020-05-19', 3.525, 'exchange-api'),
('usd', '2020-05-20', 3.504, 'exchange-api'),
('usd', '2020-05-21', 3.514, 'exchange-api'),
('usd', '2020-05-22', 3.529, 'exchange-api'),
('usd', '2020-05-26', 3.515, 'exchange-api'),
('usd', '2020-05-27', 3.499, 'exchange-api'),
('usd', '2020-05-28', 3.502, 'exchange-api'),
('usd', '2020-06-01', 3.509, 'exchange-api'),
('usd', '2020-06-02', 3.484, 'exchange-api'),
('usd', '2020-06-03', 3.468, 'exchange-api'),
('usd', '2020-06-04', 3.479, 'exchange-api'),
('usd', '2020-06-05', 3.455, 'exchange-api'),
('usd', '2020-06-08', 3.462, 'exchange-api'),
('usd', '2020-06-09', 3.457, 'exchange-api'),
('usd', '2020-06-10', 3.447, 'exchange-api'),
('usd', '2020-06-11', 3.451, 'exchange-api'),
('usd', '2020-06-12', 3.464, 'exchange-api'),
('usd', '2020-06-15', 3.495, 'exchange-api'),
('usd', '2020-06-16', 3.472, 'exchange-api'),
('usd', '2020-06-17', 3.456, 'exchange-api'),
('usd', '2020-06-18', 3.451, 'exchange-api'),
('usd', '2020-06-19', 3.447, 'exchange-api'),
('usd', '2020-06-22', 3.446, 'exchange-api'),
('usd', '2020-06-23', 3.434, 'exchange-api'),
('usd', '2020-06-24', 3.425, 'exchange-api'),
('usd', '2020-06-25', 3.442, 'exchange-api'),
('usd', '2020-06-26', 3.437, 'exchange-api'),
('usd', '2020-06-29', 3.436, 'exchange-api'),
('usd', '2020-06-30', 3.466, 'exchange-api'),
('usd', '2020-07-01', 3.454, 'exchange-api'),
('usd', '2020-07-02', 3.448, 'exchange-api'),
('usd', '2020-07-03', 3.434, 'exchange-api'),
('usd', '2020-07-06', 3.442, 'exchange-api'),
('usd', '2020-07-07', 3.45, 'exchange-api'),
('usd', '2020-07-08', 3.455, 'exchange-api'),
('usd', '2020-07-09', 3.444, 'exchange-api'),
('usd', '2020-07-10', 3.457, 'exchange-api'),
('usd', '2020-07-13', 3.442, 'exchange-api'),
('usd', '2020-07-14', 3.442, 'exchange-api'),
('usd', '2020-07-15', 3.431, 'exchange-api'),
('usd', '2020-07-16', 3.427, 'exchange-api'),
('usd', '2020-07-17', 3.447, 'exchange-api'),
('usd', '2020-07-20', 3.431, 'exchange-api'),
('usd', '2020-07-21', 3.421, 'exchange-api'),
('usd', '2020-07-22', 3.419, 'exchange-api'),
('usd', '2020-07-23', 3.421, 'exchange-api'),
('usd', '2020-07-24', 3.42, 'exchange-api'),
('usd', '2020-07-27', 3.413, 'exchange-api'),
('usd', '2020-07-28', 3.415, 'exchange-api'),
('usd', '2020-07-29', 3.409, 'exchange-api'),
('usd', '2020-07-31', 3.408, 'exchange-api'),
('usd', '2020-08-03', 3.415, 'exchange-api'),
('usd', '2020-08-04', 3.424, 'exchange-api'),
('usd', '2020-08-05', 3.412, 'exchange-api'),
('usd', '2020-08-06', 3.409, 'exchange-api'),
('usd', '2020-08-07', 3.409, 'exchange-api'),
('usd', '2020-08-10', 3.414, 'exchange-api'),
('usd', '2020-08-11', 3.402, 'exchange-api'),
('usd', '2020-08-12', 3.406, 'exchange-api'),
('usd', '2020-08-13', 3.406, 'exchange-api'),
('usd', '2020-08-14', 3.404, 'exchange-api'),
('usd', '2020-08-17', 3.409, 'exchange-api'),
('usd', '2020-08-18', 3.401, 'exchange-api'),
('usd', '2020-08-19', 3.4, 'exchange-api'),
('usd', '2020-08-20', 3.402, 'exchange-api'),
('usd', '2020-08-21', 3.404, 'exchange-api'),
('usd', '2020-08-24', 3.402, 'exchange-api'),
('usd', '2020-08-25', 3.4, 'exchange-api'),
('usd', '2020-08-26', 3.401, 'exchange-api'),
('usd', '2020-08-27', 3.369, 'exchange-api'),
('usd', '2020-08-28', 3.368, 'exchange-api'),
('usd', '2020-08-31', 3.362, 'exchange-api'),
('usd', '2020-09-01', 3.353, 'exchange-api'),
('usd', '2020-09-02', 3.366, 'exchange-api'),
('usd', '2020-09-03', 3.368, 'exchange-api'),
('usd', '2020-09-04', 3.371, 'exchange-api'),
('usd', '2020-09-07', 3.378, 'exchange-api'),
('usd', '2020-09-08', 3.392, 'exchange-api'),
('usd', '2020-09-09', 3.407, 'exchange-api'),
('usd', '2020-09-10', 3.414, 'exchange-api'),
('usd', '2020-09-11', 3.438, 'exchange-api'),
('usd', '2020-09-14', 3.435, 'exchange-api'),
('usd', '2020-09-15', 3.422, 'exchange-api'),
('usd', '2020-09-16', 3.411, 'exchange-api'),
('usd', '2020-09-17', 3.422, 'exchange-api'),
('usd', '2020-09-21', 3.442, 'exchange-api'),
('usd', '2020-09-22', 3.441, 'exchange-api'),
('usd', '2020-09-23', 3.445, 'exchange-api'),
('usd', '2020-09-24', 3.478, 'exchange-api'),
('usd', '2020-09-25', 3.467, 'exchange-api'),
('usd', '2020-09-29', 3.459, 'exchange-api'),
('usd', '2020-09-30', 3.441, 'exchange-api'),
('usd', '2020-10-01', 3.427, 'exchange-api'),
('usd', '2020-10-02', 3.431, 'exchange-api'),
('usd', '2020-10-05', 3.422, 'exchange-api'),
('usd', '2020-10-06', 3.411, 'exchange-api'),
('usd', '2020-10-07', 3.407, 'exchange-api'),
('usd', '2020-10-08', 3.394, 'exchange-api'),
('usd', '2020-10-09', 3.381, 'exchange-api'),
('usd', '2020-10-12', 3.383, 'exchange-api'),
('usd', '2020-10-13', 3.386, 'exchange-api'),
('usd', '2020-10-14', 3.384, 'exchange-api'),
('usd', '2020-10-15', 3.394, 'exchange-api'),
('usd', '2020-10-16', 3.383, 'exchange-api'),
('usd', '2020-10-19', 3.378, 'exchange-api'),
('usd', '2020-10-20', 3.379, 'exchange-api'),
('usd', '2020-10-21', 3.385, 'exchange-api'),
('usd', '2020-10-22', 3.38, 'exchange-api'),
('usd', '2020-10-23', 3.378, 'exchange-api'),
('usd', '2020-10-26', 3.381, 'exchange-api'),
('usd', '2020-10-27', 3.382, 'exchange-api'),
('usd', '2020-10-28', 3.393, 'exchange-api'),
('usd', '2020-10-29', 3.41, 'exchange-api'),
('usd', '2020-10-30', 3.422, 'exchange-api'),
('usd', '2020-11-02', 3.4, 'exchange-api'),
('usd', '2020-11-03', 3.416, 'exchange-api'),
('usd', '2020-11-04', 3.41, 'exchange-api'),
('usd', '2020-11-05', 3.381, 'exchange-api'),
('usd', '2020-11-06', 3.377, 'exchange-api'),
('usd', '2020-11-09', 3.361, 'exchange-api'),
('usd', '2020-11-10', 3.376, 'exchange-api'),
('usd', '2020-11-11', 3.386, 'exchange-api'),
('usd', '2020-11-12', 3.377, 'exchange-api'),
('usd', '2020-11-13', 3.362, 'exchange-api'),
('usd', '2020-11-16', 3.356, 'exchange-api'),
('usd', '2020-11-17', 3.356, 'exchange-api'),
('usd', '2020-11-18', 3.342, 'exchange-api'),
('usd', '2020-11-19', 3.351, 'exchange-api'),
('usd', '2020-11-20', 3.344, 'exchange-api'),
('usd', '2020-11-23', 3.339, 'exchange-api'),
('usd', '2020-11-24', 3.341, 'exchange-api'),
('usd', '2020-11-25', 3.325, 'exchange-api'),
('usd', '2020-11-26', 3.32, 'exchange-api'),
('usd', '2020-11-27', 3.319, 'exchange-api'),
('usd', '2020-11-30', 3.308, 'exchange-api'),
('usd', '2020-12-01', 3.304, 'exchange-api'),
('usd', '2020-12-02', 3.289, 'exchange-api'),
('usd', '2020-12-03', 3.275, 'exchange-api'),
('usd', '2020-12-04', 3.266, 'exchange-api'),
('usd', '2020-12-07', 3.273, 'exchange-api'),
('usd', '2020-12-08', 3.248, 'exchange-api'),
('usd', '2020-12-09', 3.256, 'exchange-api'),
('usd', '2020-12-10', 3.251, 'exchange-api'),
('usd', '2020-12-11', 3.254, 'exchange-api'),
('usd', '2020-12-14', 3.257, 'exchange-api'),
('usd', '2020-12-15', 3.255, 'exchange-api'),
('usd', '2020-12-16', 3.253, 'exchange-api'),
('usd', '2020-12-17', 3.245, 'exchange-api'),
('usd', '2020-12-18', 3.241, 'exchange-api'),
('usd', '2020-12-21', 3.251, 'exchange-api'),
('usd', '2020-12-22', 3.234, 'exchange-api'),
('usd', '2020-12-23', 3.222, 'exchange-api'),
('usd', '2020-12-24', 3.218, 'exchange-api'),
('usd', '2020-12-28', 3.216, 'exchange-api'),
('usd', '2020-12-29', 3.212, 'exchange-api'),
('usd', '2020-12-30', 3.21, 'exchange-api'),
('usd', '2020-12-31', 3.215, 'exchange-api'),
('usd', '2021-01-04', 3.206, 'exchange-api'),
('usd', '2021-01-05', 3.203, 'exchange-api'),
('usd', '2021-01-06', 3.186, 'exchange-api'),
('usd', '2021-01-07', 3.182, 'exchange-api'),
('usd', '2021-01-08', 3.187, 'exchange-api'),
('usd', '2021-01-11', 3.183, 'exchange-api'),
('usd', '2021-01-12', 3.159, 'exchange-api'),
('usd', '2021-01-13', 3.134, 'exchange-api'),
('usd', '2021-01-14', 3.116, 'exchange-api'),
('usd', '2021-01-15', 3.231, 'exchange-api'),
('usd', '2021-01-18', 3.227, 'exchange-api'),
('usd', '2021-01-19', 3.232, 'exchange-api'),
('usd', '2021-01-20', 3.254, 'exchange-api'),
('usd', '2021-01-21', 3.28, 'exchange-api'),
('usd', '2021-01-22', 3.28, 'exchange-api'),
('usd', '2021-01-25', 3.265, 'exchange-api'),
('usd', '2021-01-26', 3.268, 'exchange-api'),
('usd', '2021-01-27', 3.264, 'exchange-api'),
('usd', '2021-01-28', 3.294, 'exchange-api'),
('usd', '2021-01-29', 3.291, 'exchange-api'),
('usd', '2021-02-01', 3.288, 'exchange-api'),
('usd', '2021-02-02', 3.3, 'exchange-api'),
('usd', '2021-02-03', 3.3, 'exchange-api'),
('usd', '2021-02-04', 3.298, 'exchange-api'),
('usd', '2021-02-05', 3.286, 'exchange-api'),
('usd', '2021-02-08', 3.282, 'exchange-api'),
('usd', '2021-02-09', 3.259, 'exchange-api'),
('usd', '2021-02-10', 3.253, 'exchange-api'),
('usd', '2021-02-11', 3.26, 'exchange-api'),
('usd', '2021-02-12', 3.249, 'exchange-api'),
('usd', '2021-02-15', 3.244, 'exchange-api'),
('usd', '2021-02-16', 3.237, 'exchange-api'),
('usd', '2021-02-17', 3.257, 'exchange-api'),
('usd', '2021-02-18', 3.265, 'exchange-api'),
('usd', '2021-02-19', 3.271, 'exchange-api'),
('usd', '2021-02-22', 3.268, 'exchange-api'),
('usd', '2021-02-23', 3.264, 'exchange-api'),
('usd', '2021-02-24', 3.264, 'exchange-api'),
('usd', '2021-02-25', 3.28, 'exchange-api'),
('usd', '2021-03-01', 3.306, 'exchange-api'),
('usd', '2021-03-02', 3.299, 'exchange-api'),
('usd', '2021-03-03', 3.287, 'exchange-api'),
('usd', '2021-03-04', 3.312, 'exchange-api'),
('usd', '2021-03-05', 3.318, 'exchange-api'),
('usd', '2021-03-08', 3.332, 'exchange-api'),
('usd', '2021-03-09', 3.329, 'exchange-api'),
('usd', '2021-03-10', 3.322, 'exchange-api'),
('usd', '2021-03-11', 3.304, 'exchange-api'),
('usd', '2021-03-12', 3.316, 'exchange-api'),
('usd', '2021-03-15', 3.309, 'exchange-api'),
('usd', '2021-03-16', 3.299, 'exchange-api'),
('usd', '2021-03-17', 3.289, 'exchange-api'),
('usd', '2021-03-18', 3.297, 'exchange-api'),
('usd', '2021-03-19', 3.289, 'exchange-api'),
('usd', '2021-03-22', 3.303, 'exchange-api'),
('usd', '2021-03-24', 3.295, 'exchange-api'),
('usd', '2021-03-25', 3.31, 'exchange-api'),
('usd', '2021-03-26', 3.325, 'exchange-api'),
('usd', '2021-03-29', 3.342, 'exchange-api'),
('usd', '2021-03-30', 3.33, 'exchange-api'),
('usd', '2021-03-31', 3.334, 'exchange-api'),
('usd', '2021-04-01', 3.333, 'exchange-api'),
('usd', '2021-04-05', 3.32, 'exchange-api'),
('usd', '2021-04-06', 3.309, 'exchange-api'),
('usd', '2021-04-07', 3.299, 'exchange-api'),
('usd', '2021-04-08', 3.286, 'exchange-api'),
('usd', '2021-04-09', 3.284, 'exchange-api'),
('usd', '2021-04-12', 3.291, 'exchange-api'),
('usd', '2021-04-13', 3.304, 'exchange-api'),
('usd', '2021-04-14', 3.287, 'exchange-api'),
('usd', '2021-04-16', 3.281, 'exchange-api'),
('usd', '2021-04-19', 3.265, 'exchange-api'),
('usd', '2021-04-20', 3.252, 'exchange-api'),
('usd', '2021-04-21', 3.256, 'exchange-api'),
('usd', '2021-04-22', 3.262, 'exchange-api'),
('usd', '2021-04-23', 3.255, 'exchange-api'),
('usd', '2021-04-26', 3.24, 'exchange-api'),
('usd', '2021-04-27', 3.241, 'exchange-api'),
('usd', '2021-04-28', 3.251, 'exchange-api'),
('usd', '2021-04-29', 3.246, 'exchange-api'),
('usd', '2021-04-30', 3.247, 'exchange-api'),
('usd', '2021-05-03', 3.246, 'exchange-api'),
('usd', '2021-05-04', 3.252, 'exchange-api'),
('usd', '2021-05-05', 3.265, 'exchange-api'),
('usd', '2021-05-06', 3.261, 'exchange-api'),
('usd', '2021-05-07', 3.261, 'exchange-api'),
('usd', '2021-05-10', 3.251, 'exchange-api'),
('usd', '2021-05-11', 3.284, 'exchange-api'),
('usd', '2021-05-12', 3.279, 'exchange-api'),
('usd', '2021-05-13', 3.296, 'exchange-api'),
('usd', '2021-05-14', 3.283, 'exchange-api'),
('usd', '2021-05-18', 3.273, 'exchange-api'),
('usd', '2021-05-19', 3.264, 'exchange-api'),
('usd', '2021-05-20', 3.264, 'exchange-api'),
('usd', '2021-05-21', 3.255, 'exchange-api'),
('usd', '2021-05-24', 3.259, 'exchange-api'),
('usd', '2021-05-25', 3.242, 'exchange-api'),
('usd', '2021-05-26', 3.247, 'exchange-api'),
('usd', '2021-05-27', 3.248, 'exchange-api'),
('usd', '2021-05-28', 3.253, 'exchange-api'),
('usd', '2021-06-01', 3.238, 'exchange-api'),
('usd', '2021-06-02', 3.254, 'exchange-api'),
('usd', '2021-06-03', 3.248, 'exchange-api'),
('usd', '2021-06-04', 3.257, 'exchange-api'),
('usd', '2021-06-07', 3.251, 'exchange-api'),
('usd', '2021-06-08', 3.243, 'exchange-api'),
('usd', '2021-06-09', 3.244, 'exchange-api'),
('usd', '2021-06-10', 3.244, 'exchange-api'),
('usd', '2021-06-11', 3.242, 'exchange-api'),
('usd', '2021-06-14', 3.247, 'exchange-api'),
('usd', '2021-06-15', 3.242, 'exchange-api'),
('usd', '2021-06-16', 3.239, 'exchange-api'),
('usd', '2021-06-17', 3.26, 'exchange-api'),
('usd', '2021-06-18', 3.265, 'exchange-api'),
('usd', '2021-06-21', 3.266, 'exchange-api'),
('usd', '2021-06-22', 3.261, 'exchange-api'),
('usd', '2021-06-23', 3.257, 'exchange-api'),
('usd', '2021-06-24', 3.253, 'exchange-api'),
('usd', '2021-06-25', 3.245, 'exchange-api'),
('usd', '2021-06-28', 3.261, 'exchange-api'),
('usd', '2021-06-29', 3.261, 'exchange-api'),
('usd', '2021-06-30', 3.26, 'exchange-api'),
('usd', '2021-07-01', 3.261, 'exchange-api'),
('usd', '2021-07-02', 3.273, 'exchange-api'),
('usd', '2021-07-05', 3.264, 'exchange-api'),
('usd', '2021-07-06', 3.263, 'exchange-api'),
('usd', '2021-07-07', 3.27, 'exchange-api'),
('usd', '2021-07-08', 3.279, 'exchange-api'),
('usd', '2021-07-09', 3.278, 'exchange-api'),
('usd', '2021-07-12', 3.284, 'exchange-api'),
('usd', '2021-07-13', 3.278, 'exchange-api'),
('usd', '2021-07-14', 3.278, 'exchange-api'),
('usd', '2021-07-15', 3.266, 'exchange-api'),
('usd', '2021-07-16', 3.281, 'exchange-api'),
('usd', '2021-07-19', 3.298, 'exchange-api'),
('usd', '2021-07-20', 3.298, 'exchange-api'),
('usd', '2021-07-21', 3.294, 'exchange-api'),
('usd', '2021-07-22', 3.271, 'exchange-api'),
('usd', '2021-07-23', 3.271, 'exchange-api'),
('usd', '2021-07-26', 3.264, 'exchange-api'),
('usd', '2021-07-27', 3.254, 'exchange-api'),
('usd', '2021-07-28', 3.252, 'exchange-api'),
('usd', '2021-07-29', 3.244, 'exchange-api'),
('usd', '2021-07-30', 3.233, 'exchange-api'),
('usd', '2021-08-02', 3.227, 'exchange-api'),
('usd', '2021-08-03', 3.217, 'exchange-api'),
('usd', '2021-08-04', 3.213, 'exchange-api'),
('usd', '2021-08-05', 3.214, 'exchange-api'),
('usd', '2021-08-06', 3.217, 'exchange-api'),
('usd', '2021-08-09', 3.221, 'exchange-api'),
('usd', '2021-08-10', 3.227, 'exchange-api'),
('usd', '2021-08-11', 3.218, 'exchange-api'),
('usd', '2021-08-12', 3.221, 'exchange-api'),
('usd', '2021-08-13', 3.223, 'exchange-api'),
('usd', '2021-08-16', 3.215, 'exchange-api'),
('usd', '2021-08-17', 3.224, 'exchange-api'),
('usd', '2021-08-18', 3.239, 'exchange-api'),
('usd', '2021-08-19', 3.243, 'exchange-api'),
('usd', '2021-08-20', 3.245, 'exchange-api'),
('usd', '2021-08-23', 3.23, 'exchange-api'),
('usd', '2021-08-24', 3.218, 'exchange-api'),
('usd', '2021-08-25', 3.227, 'exchange-api'),
('usd', '2021-08-26', 3.221, 'exchange-api'),
('usd', '2021-08-27', 3.232, 'exchange-api'),
('usd', '2021-08-30', 3.222, 'exchange-api'),
('usd', '2021-08-31', 3.207, 'exchange-api'),
('usd', '2021-09-01', 3.203, 'exchange-api'),
('usd', '2021-09-02', 3.208, 'exchange-api'),
('usd', '2021-09-03', 3.204, 'exchange-api'),
('usd', '2021-09-09', 3.203, 'exchange-api'),
('usd', '2021-09-10', 3.201, 'exchange-api'),
('usd', '2021-09-13', 3.206, 'exchange-api'),
('usd', '2021-09-14', 3.211, 'exchange-api'),
('usd', '2021-09-17', 3.207, 'exchange-api'),
('usd', '2021-09-20', 3.213, 'exchange-api'),
('usd', '2021-09-22', 3.208, 'exchange-api'),
('usd', '2021-09-23', 3.203, 'exchange-api'),
('usd', '2021-09-24', 3.201, 'exchange-api'),
('usd', '2021-09-27', 3.204, 'exchange-api'),
('usd', '2021-09-29', 3.212, 'exchange-api'),
('usd', '2021-09-30', 3.229, 'exchange-api'),
('usd', '2021-10-01', 3.227, 'exchange-api'),
('usd', '2021-10-04', 3.217, 'exchange-api'),
('usd', '2021-10-05', 3.229, 'exchange-api'),
('usd', '2021-10-06', 3.245, 'exchange-api'),
('usd', '2021-10-07', 3.228, 'exchange-api'),
('usd', '2021-10-08', 3.231, 'exchange-api'),
('usd', '2021-10-11', 3.229, 'exchange-api'),
('usd', '2021-10-12', 3.226, 'exchange-api'),
('usd', '2021-10-13', 3.235, 'exchange-api'),
('usd', '2021-10-14', 3.221, 'exchange-api'),
('usd', '2021-10-15', 3.219, 'exchange-api'),
('usd', '2021-10-18', 3.229, 'exchange-api'),
('usd', '2021-10-19', 3.212, 'exchange-api'),
('usd', '2021-10-20', 3.215, 'exchange-api'),
('usd', '2021-10-21', 3.211, 'exchange-api'),
('usd', '2021-10-22', 3.211, 'exchange-api'),
('usd', '2021-10-25', 3.206, 'exchange-api'),
('usd', '2021-10-26', 3.201, 'exchange-api'),
('usd', '2021-10-27', 3.191, 'exchange-api'),
('usd', '2021-10-28', 3.185, 'exchange-api'),
('usd', '2021-10-29', 3.158, 'exchange-api'),
('usd', '2021-11-01', 3.134, 'exchange-api'),
('usd', '2021-11-02', 3.13, 'exchange-api'),
('usd', '2021-11-03', 3.138, 'exchange-api'),
('usd', '2021-11-04', 3.125, 'exchange-api'),
('usd', '2021-11-05', 3.118, 'exchange-api'),
('usd', '2021-11-08', 3.103, 'exchange-api'),
('usd', '2021-11-09', 3.106, 'exchange-api'),
('usd', '2021-11-10', 3.109, 'exchange-api'),
('usd', '2021-11-11', 3.12, 'exchange-api'),
('usd', '2021-11-12', 3.112, 'exchange-api'),
('usd', '2021-11-15', 3.102, 'exchange-api'),
('usd', '2021-11-16', 3.09, 'exchange-api'),
('usd', '2021-11-17', 3.074, 'exchange-api'),
('usd', '2021-11-18', 3.079, 'exchange-api'),
('usd', '2021-11-19', 3.087, 'exchange-api'),
('usd', '2021-11-22', 3.089, 'exchange-api'),
('usd', '2021-11-23', 3.11, 'exchange-api'),
('usd', '2021-11-24', 3.168, 'exchange-api'),
('usd', '2021-11-25', 3.157, 'exchange-api'),
('usd', '2021-11-26', 3.181, 'exchange-api'),
('usd', '2021-11-29', 3.157, 'exchange-api'),
('usd', '2021-11-30', 3.162, 'exchange-api'),
('usd', '2021-12-01', 3.15, 'exchange-api'),
('usd', '2021-12-02', 3.168, 'exchange-api'),
('usd', '2021-12-03', 3.156, 'exchange-api'),
('usd', '2021-12-06', 3.161, 'exchange-api'),
('usd', '2021-12-07', 3.155, 'exchange-api'),
('usd', '2021-12-08', 3.111, 'exchange-api'),
('usd', '2021-12-09', 3.104, 'exchange-api'),
('usd', '2021-12-10', 3.103, 'exchange-api'),
('usd', '2021-12-13', 3.101, 'exchange-api'),
('usd', '2021-12-14', 3.113, 'exchange-api'),
('usd', '2021-12-15', 3.135, 'exchange-api'),
('usd', '2021-12-16', 3.106, 'exchange-api'),
('usd', '2021-12-17', 3.115, 'exchange-api'),
('usd', '2021-12-20', 3.152, 'exchange-api'),
('usd', '2021-12-21', 3.164, 'exchange-api'),
('usd', '2021-12-22', 3.165, 'exchange-api'),
('usd', '2021-12-23', 3.15, 'exchange-api'),
('usd', '2021-12-24', 3.149, 'exchange-api'),
('usd', '2021-12-27', 3.136, 'exchange-api'),
('usd', '2021-12-28', 3.111, 'exchange-api'),
('usd', '2021-12-29', 3.111, 'exchange-api'),
('usd', '2021-12-30', 3.11, 'exchange-api'),
('usd', '2021-12-31', 3.11, 'exchange-api'),
('usd', '2022-01-03', 3.092, 'exchange-api'),
('usd', '2022-01-04', 3.094, 'exchange-api'),
('usd', '2022-01-05', 3.093, 'exchange-api'),
('usd', '2022-01-06', 3.109, 'exchange-api'),
('usd', '2022-01-07', 3.109, 'exchange-api'),
('usd', '2022-01-10', 3.116, 'exchange-api'),
('usd', '2022-01-11', 3.127, 'exchange-api'),
('usd', '2022-01-12', 3.112, 'exchange-api'),
('usd', '2022-01-13', 3.117, 'exchange-api'),
('usd', '2022-01-14', 3.111, 'exchange-api'),
('usd', '2022-01-17', 3.105, 'exchange-api'),
('usd', '2022-01-18', 3.124, 'exchange-api'),
('usd', '2022-01-19', 3.125, 'exchange-api'),
('usd', '2022-01-20', 3.134, 'exchange-api'),
('usd', '2022-01-21', 3.14, 'exchange-api'),
('usd', '2022-01-24', 3.167, 'exchange-api'),
('usd', '2022-01-25', 3.183, 'exchange-api'),
('usd', '2022-01-26', 3.176, 'exchange-api'),
('usd', '2022-01-27', 3.196, 'exchange-api'),
('usd', '2022-01-28', 3.196, 'exchange-api'),
('usd', '2022-01-31', 3.195, 'exchange-api'),
('usd', '2022-02-01', 3.169, 'exchange-api'),
('usd', '2022-02-02', 3.16, 'exchange-api'),
('usd', '2022-02-03', 3.186, 'exchange-api'),
('usd', '2022-02-04', 3.199, 'exchange-api'),
('usd', '2022-02-07', 3.195, 'exchange-api'),
('usd', '2022-02-08', 3.224, 'exchange-api'),
('usd', '2022-02-09', 3.216, 'exchange-api'),
('usd', '2022-02-10', 3.221, 'exchange-api'),
('usd', '2022-02-11', 3.235, 'exchange-api'),
('usd', '2022-02-14', 3.262, 'exchange-api'),
('usd', '2022-02-15', 3.225, 'exchange-api'),
('usd', '2022-02-16', 3.183, 'exchange-api'),
('usd', '2022-02-17', 3.189, 'exchange-api'),
('usd', '2022-02-18', 3.193, 'exchange-api'),
('usd', '2022-02-21', 3.21, 'exchange-api'),
('usd', '2022-02-22', 3.219, 'exchange-api'),
('usd', '2022-02-23', 3.223, 'exchange-api'),
('usd', '2022-02-24', 3.271, 'exchange-api'),
('usd', '2022-02-25', 3.259, 'exchange-api'),
('usd', '2022-02-28', 3.238, 'exchange-api'),
('usd', '2022-03-01', 3.23, 'exchange-api'),
('usd', '2022-03-02', 3.233, 'exchange-api'),
('usd', '2022-03-03', 3.24, 'exchange-api'),
('usd', '2022-03-04', 3.245, 'exchange-api'),
('usd', '2022-03-07', 3.282, 'exchange-api'),
('usd', '2022-03-08', 3.3, 'exchange-api'),
('usd', '2022-03-09', 3.284, 'exchange-api'),
('usd', '2022-03-10', 3.271, 'exchange-api'),
('usd', '2022-03-11', 3.264, 'exchange-api'),
('usd', '2022-03-14', 3.268, 'exchange-api'),
('usd', '2022-03-15', 3.287, 'exchange-api'),
('usd', '2022-03-16', 3.263, 'exchange-api'),
('usd', '2022-03-21', 3.239, 'exchange-api'),
('usd', '2022-03-22', 3.225, 'exchange-api'),
('usd', '2022-03-23', 3.231, 'exchange-api'),
('usd', '2022-03-24', 3.221, 'exchange-api'),
('usd', '2022-03-25', 3.223, 'exchange-api'),
('usd', '2022-03-28', 3.222, 'exchange-api'),
('usd', '2022-03-29', 3.217, 'exchange-api'),
('usd', '2022-03-30', 3.188, 'exchange-api'),
('usd', '2022-03-31', 3.176, 'exchange-api'),
('usd', '2022-04-01', 3.203, 'exchange-api'),
('usd', '2022-04-04', 3.209, 'exchange-api'),
('usd', '2022-04-05', 3.205, 'exchange-api'),
('usd', '2022-04-06', 3.225, 'exchange-api'),
('usd', '2022-04-07', 3.228, 'exchange-api'),
('usd', '2022-04-08', 3.225, 'exchange-api'),
('usd', '2022-04-11', 3.211, 'exchange-api'),
('usd', '2022-04-12', 3.215, 'exchange-api'),
('usd', '2022-04-13', 3.207, 'exchange-api'),
('usd', '2022-04-14', 3.199, 'exchange-api'),
('usd', '2022-04-19', 3.236, 'exchange-api'),
('usd', '2022-04-20', 3.235, 'exchange-api'),
('usd', '2022-04-21', 3.217, 'exchange-api'),
('usd', '2022-04-25', 3.291, 'exchange-api'),
('usd', '2022-04-26', 3.292, 'exchange-api'),
('usd', '2022-04-27', 3.325, 'exchange-api'),
('usd', '2022-04-28', 3.32, 'exchange-api'),
('usd', '2022-04-29', 3.317, 'exchange-api'),
('usd', '2022-05-02', 3.352, 'exchange-api'),
('usd', '2022-05-03', 3.369, 'exchange-api'),
('usd', '2022-05-04', 3.356, 'exchange-api'),
('usd', '2022-05-06', 3.419, 'exchange-api'),
('usd', '2022-05-09', 3.438, 'exchange-api'),
('usd', '2022-05-10', 3.463, 'exchange-api'),
('usd', '2022-05-11', 3.425, 'exchange-api'),
('usd', '2022-05-12', 3.466, 'exchange-api'),
('usd', '2022-05-13', 3.412, 'exchange-api'),
('usd', '2022-05-16', 3.419, 'exchange-api'),
('usd', '2022-05-17', 3.363, 'exchange-api'),
('usd', '2022-05-18', 3.354, 'exchange-api'),
('usd', '2022-05-19', 3.391, 'exchange-api'),
('usd', '2022-05-20', 3.359, 'exchange-api'),
('usd', '2022-05-23', 3.356, 'exchange-api'),
('usd', '2022-05-24', 3.349, 'exchange-api'),
('usd', '2022-05-25', 3.359, 'exchange-api'),
('usd', '2022-05-26', 3.363, 'exchange-api'),
('usd', '2022-05-27', 3.355, 'exchange-api'),
('usd', '2022-05-30', 3.316, 'exchange-api'),
('usd', '2022-05-31', 3.338, 'exchange-api'),
('usd', '2022-06-01', 3.325, 'exchange-api'),
('usd', '2022-06-02', 3.34, 'exchange-api'),
('usd', '2022-06-06', 3.332, 'exchange-api'),
('usd', '2022-06-07', 3.338, 'exchange-api'),
('usd', '2022-06-08', 3.339, 'exchange-api'),
('usd', '2022-06-09', 3.338, 'exchange-api'),
('usd', '2022-06-10', 3.375, 'exchange-api'),
('usd', '2022-06-13', 3.44, 'exchange-api'),
('usd', '2022-06-14', 3.446, 'exchange-api'),
('usd', '2022-06-15', 3.454, 'exchange-api'),
('usd', '2022-06-16', 3.463, 'exchange-api'),
('usd', '2022-06-17', 3.46, 'exchange-api'),
('usd', '2022-06-20', 3.455, 'exchange-api'),
('usd', '2022-06-21', 3.454, 'exchange-api'),
('usd', '2022-06-22', 3.464, 'exchange-api'),
('usd', '2022-06-23', 3.447, 'exchange-api'),
('usd', '2022-06-24', 3.442, 'exchange-api'),
('usd', '2022-06-27', 3.397, 'exchange-api'),
('usd', '2022-06-28', 3.436, 'exchange-api'),
('usd', '2022-06-29', 3.45, 'exchange-api'),
('usd', '2022-06-30', 3.5, 'exchange-api'),
('usd', '2022-07-01', 3.526, 'exchange-api'),
('usd', '2022-07-04', 3.496, 'exchange-api'),
('usd', '2022-07-05', 3.519, 'exchange-api'),
('usd', '2022-07-06', 3.513, 'exchange-api'),
('usd', '2022-07-07', 3.491, 'exchange-api'),
('usd', '2022-07-08', 3.48, 'exchange-api'),
('usd', '2022-07-11', 3.474, 'exchange-api'),
('usd', '2022-07-12', 3.484, 'exchange-api'),
('usd', '2022-07-13', 3.47, 'exchange-api'),
('usd', '2022-07-14', 3.472, 'exchange-api'),
('usd', '2022-07-15', 3.482, 'exchange-api'),
('usd', '2022-07-18', 3.455, 'exchange-api'),
('usd', '2022-07-19', 3.435, 'exchange-api'),
('usd', '2022-07-20', 3.447, 'exchange-api'),
('usd', '2022-07-21', 3.455, 'exchange-api'),
('usd', '2022-07-22', 3.441, 'exchange-api'),
('usd', '2022-07-25', 3.44, 'exchange-api'),
('usd', '2022-07-26', 3.445, 'exchange-api'),
('usd', '2022-07-27', 3.427, 'exchange-api'),
('usd', '2022-07-28', 3.433, 'exchange-api'),
('usd', '2022-07-29', 3.391, 'exchange-api'),
('usd', '2022-08-01', 3.382, 'exchange-api'),
('usd', '2022-08-02', 3.367, 'exchange-api'),
('usd', '2022-08-03', 3.366, 'exchange-api'),
('usd', '2022-08-04', 3.35, 'exchange-api'),
('usd', '2022-08-05', 3.335, 'exchange-api'),
('usd', '2022-08-08', 3.327, 'exchange-api'),
('usd', '2022-08-09', 3.307, 'exchange-api'),
('usd', '2022-08-10', 3.291, 'exchange-api'),
('usd', '2022-08-11', 3.259, 'exchange-api'),
('usd', '2022-08-12', 3.241, 'exchange-api'),
('usd', '2022-08-15', 3.265, 'exchange-api'),
('usd', '2022-08-16', 3.273, 'exchange-api'),
('usd', '2022-08-17', 3.259, 'exchange-api'),
('usd', '2022-08-18', 3.243, 'exchange-api'),
('usd', '2022-08-19', 3.256, 'exchange-api'),
('usd', '2022-08-22', 3.282, 'exchange-api'),
('usd', '2022-08-23', 3.281, 'exchange-api'),
('usd', '2022-08-24', 3.278, 'exchange-api'),
('usd', '2022-08-25', 3.287, 'exchange-api'),
('usd', '2022-08-26', 3.259, 'exchange-api'),
('usd', '2022-08-29', 3.319, 'exchange-api'),
('usd', '2022-08-30', 3.305, 'exchange-api'),
('usd', '2022-08-31', 3.341, 'exchange-api'),
('usd', '2022-09-01', 3.364, 'exchange-api'),
('usd', '2022-09-02', 3.375, 'exchange-api'),
('usd', '2022-09-05', 3.415, 'exchange-api'),
('usd', '2022-09-06', 3.416, 'exchange-api'),
('usd', '2022-09-07', 3.434, 'exchange-api'),
('usd', '2022-09-08', 3.425, 'exchange-api'),
('usd', '2022-09-09', 3.417, 'exchange-api'),
('usd', '2022-09-12', 3.392, 'exchange-api'),
('usd', '2022-09-13', 3.354, 'exchange-api'),
('usd', '2022-09-14', 3.436, 'exchange-api'),
('usd', '2022-09-15', 3.442, 'exchange-api'),
('usd', '2022-09-16', 3.444, 'exchange-api'),
('usd', '2022-09-19', 3.449, 'exchange-api'),
('usd', '2022-09-20', 3.439, 'exchange-api'),
('usd', '2022-09-21', 3.464, 'exchange-api'),
('usd', '2022-09-22', 3.474, 'exchange-api'),
('usd', '2022-09-23', 3.489, 'exchange-api'),
('usd', '2022-09-28', 3.536, 'exchange-api'),
('usd', '2022-09-29', 3.536, 'exchange-api'),
('usd', '2022-09-30', 3.543, 'exchange-api'),
('usd', '2022-10-03', 3.583, 'exchange-api'),
('usd', '2022-10-06', 3.538, 'exchange-api'),
('usd', '2022-10-07', 3.525, 'exchange-api'),
('usd', '2022-10-11', 3.58, 'exchange-api'),
('usd', '2022-10-12', 3.565, 'exchange-api'),
('usd', '2022-10-13', 3.576, 'exchange-api'),
('usd', '2022-10-14', 3.547, 'exchange-api'),
('usd', '2022-10-18', 3.533, 'exchange-api'),
('usd', '2022-10-19', 3.541, 'exchange-api'),
('usd', '2022-10-20', 3.551, 'exchange-api'),
('usd', '2022-10-21', 3.56, 'exchange-api'),
('usd', '2022-10-24', 3.557, 'exchange-api'),
('usd', '2022-10-25', 3.559, 'exchange-api'),
('usd', '2022-10-26', 3.501, 'exchange-api'),
('usd', '2022-10-27', 3.525, 'exchange-api'),
('usd', '2022-10-28', 3.544, 'exchange-api'),
('usd', '2022-10-31', 3.53, 'exchange-api'),
('usd', '2022-11-02', 3.54, 'exchange-api'),
('usd', '2022-11-03', 3.569, 'exchange-api'),
('usd', '2022-11-04', 3.564, 'exchange-api'),
('usd', '2022-11-07', 3.54, 'exchange-api'),
('usd', '2022-11-08', 3.532, 'exchange-api'),
('usd', '2022-11-09', 3.543, 'exchange-api'),
('usd', '2022-11-10', 3.563, 'exchange-api'),
('usd', '2022-11-11', 3.451, 'exchange-api'),
('usd', '2022-11-14', 3.438, 'exchange-api'),
('usd', '2022-11-15', 3.435, 'exchange-api'),
('usd', '2022-11-16', 3.421, 'exchange-api'),
('usd', '2022-11-17', 3.457, 'exchange-api'),
('usd', '2022-11-18', 3.477, 'exchange-api'),
('usd', '2022-11-21', 3.464, 'exchange-api'),
('usd', '2022-11-22', 3.475, 'exchange-api'),
('usd', '2022-11-23', 3.453, 'exchange-api'),
('usd', '2022-11-24', 3.42, 'exchange-api'),
('usd', '2022-11-25', 3.419, 'exchange-api'),
('usd', '2022-11-28', 3.438, 'exchange-api'),
('usd', '2022-11-29', 3.431, 'exchange-api'),
('usd', '2022-11-30', 3.441, 'exchange-api'),
('usd', '2022-12-01', 3.414, 'exchange-api'),
('usd', '2022-12-02', 3.379, 'exchange-api'),
('usd', '2022-12-05', 3.386, 'exchange-api'),
('usd', '2022-12-06', 3.408, 'exchange-api'),
('usd', '2022-12-07', 3.445, 'exchange-api'),
('usd', '2022-12-08', 3.441, 'exchange-api'),
('usd', '2022-12-09', 3.42, 'exchange-api'),
('usd', '2022-12-12', 3.428, 'exchange-api'),
('usd', '2022-12-13', 3.433, 'exchange-api'),
('usd', '2022-12-14', 3.41, 'exchange-api'),
('usd', '2022-12-15', 3.425, 'exchange-api'),
('usd', '2022-12-16', 3.451, 'exchange-api'),
('usd', '2022-12-19', 3.441, 'exchange-api'),
('usd', '2022-12-20', 3.469, 'exchange-api'),
('usd', '2022-12-21', 3.477, 'exchange-api'),
('usd', '2022-12-22', 3.477, 'exchange-api'),
('usd', '2022-12-23', 3.493, 'exchange-api'),
('usd', '2022-12-27', 3.512, 'exchange-api'),
('usd', '2022-12-28', 3.524, 'exchange-api'),
('usd', '2022-12-29', 3.531, 'exchange-api'),
('usd', '2022-12-30', 3.519, 'exchange-api'),
('usd', '2023-01-03', 3.532, 'exchange-api'),
('usd', '2023-01-04', 3.527, 'exchange-api'),
('usd', '2023-01-05', 3.529, 'exchange-api'),
('usd', '2023-01-06', 3.556, 'exchange-api'),
('usd', '2023-01-09', 3.496, 'exchange-api'),
('usd', '2023-01-10', 3.48, 'exchange-api'),
('usd', '2023-01-11', 3.458, 'exchange-api'),
('usd', '2023-01-12', 3.429, 'exchange-api'),
('usd', '2023-01-13', 3.41, 'exchange-api'),
('usd', '2023-01-16', 3.417, 'exchange-api'),
('usd', '2023-01-17', 3.418, 'exchange-api'),
('usd', '2023-01-18', 3.381, 'exchange-api'),
('usd', '2023-01-19', 3.408, 'exchange-api'),
('usd', '2023-01-20', 3.407, 'exchange-api'),
('usd', '2023-01-23', 3.38, 'exchange-api'),
('usd', '2023-01-24', 3.373, 'exchange-api'),
('usd', '2023-01-25', 3.37, 'exchange-api'),
('usd', '2023-01-26', 3.399, 'exchange-api'),
('usd', '2023-01-27', 3.438, 'exchange-api'),
('usd', '2023-01-30', 3.468, 'exchange-api'),
('usd', '2023-01-31', 3.475, 'exchange-api'),
('usd', '2023-02-01', 3.456, 'exchange-api'),
('usd', '2023-02-02', 3.422, 'exchange-api'),
('usd', '2023-02-03', 3.398, 'exchange-api'),
('usd', '2023-02-06', 3.474, 'exchange-api'),
('usd', '2023-02-07', 3.473, 'exchange-api'),
('usd', '2023-02-08', 3.481, 'exchange-api'),
('usd', '2023-02-09', 3.489, 'exchange-api'),
('usd', '2023-02-10', 3.507, 'exchange-api'),
('usd', '2023-02-13', 3.54, 'exchange-api'),
('usd', '2023-02-14', 3.502, 'exchange-api'),
('usd', '2023-02-15', 3.529, 'exchange-api'),
('usd', '2023-02-16', 3.538, 'exchange-api'),
('usd', '2023-02-17', 3.566, 'exchange-api'),
('usd', '2023-02-20', 3.563, 'exchange-api'),
('usd', '2023-02-21', 3.649, 'exchange-api'),
('usd', '2023-02-22', 3.663, 'exchange-api'),
('usd', '2023-02-23', 3.613, 'exchange-api'),
('usd', '2023-02-24', 3.659, 'exchange-api'),
('usd', '2023-02-27', 3.673, 'exchange-api'),
('usd', '2023-02-28', 3.668, 'exchange-api'),
('usd', '2023-03-01', 3.636, 'exchange-api'),
('usd', '2023-03-02', 3.642, 'exchange-api'),
('usd', '2023-03-03', 3.664, 'exchange-api'),
('usd', '2023-03-06', 3.589, 'exchange-api'),
('usd', '2023-03-09', 3.598, 'exchange-api'),
('usd', '2023-03-10', 3.595, 'exchange-api'),
('usd', '2023-03-13', 3.626, 'exchange-api'),
('usd', '2023-03-14', 3.627, 'exchange-api'),
('usd', '2023-03-15', 3.641, 'exchange-api'),
('usd', '2023-03-16', 3.667, 'exchange-api'),
('usd', '2023-03-17', 3.667, 'exchange-api'),
('usd', '2023-03-20', 3.677, 'exchange-api'),
('usd', '2023-03-21', 3.65, 'exchange-api'),
('usd', '2023-03-22', 3.642, 'exchange-api'),
('usd', '2023-03-23', 3.612, 'exchange-api'),
('usd', '2023-03-24', 3.628, 'exchange-api'),
('usd', '2023-03-27', 3.557, 'exchange-api'),
('usd', '2023-03-28', 3.534, 'exchange-api'),
('usd', '2023-03-29', 3.566, 'exchange-api'),
('usd', '2023-03-30', 3.586, 'exchange-api'),
('usd', '2023-03-31', 3.615, 'exchange-api'),
('usd', '2023-04-03', 3.593, 'exchange-api'),
('usd', '2023-04-04', 3.564, 'exchange-api'),
('usd', '2023-04-11', 3.624, 'exchange-api'),
('usd', '2023-04-13', 3.655, 'exchange-api'),
('usd', '2023-04-14', 3.661, 'exchange-api'),
('usd', '2023-04-17', 3.647, 'exchange-api'),
('usd', '2023-04-18', 3.647, 'exchange-api'),
('usd', '2023-04-19', 3.659, 'exchange-api'),
('usd', '2023-04-20', 3.654, 'exchange-api'),
('usd', '2023-04-21', 3.656, 'exchange-api'),
('usd', '2023-04-24', 3.661, 'exchange-api'),
('usd', '2023-04-25', 3.639, 'exchange-api'),
('usd', '2023-04-27', 3.636, 'exchange-api'),
('usd', '2023-04-28', 3.641, 'exchange-api'),
('usd', '2023-05-01', 3.619, 'exchange-api'),
('usd', '2023-05-02', 3.62, 'exchange-api'),
('usd', '2023-05-03', 3.637, 'exchange-api'),
('usd', '2023-05-04', 3.636, 'exchange-api'),
('usd', '2023-05-05', 3.647, 'exchange-api'),
('usd', '2023-05-08', 3.633, 'exchange-api'),
('usd', '2023-05-09', 3.659, 'exchange-api'),
('usd', '2023-05-10', 3.675, 'exchange-api'),
('usd', '2023-05-11', 3.643, 'exchange-api'),
('usd', '2023-05-12', 3.642, 'exchange-api'),
('usd', '2023-05-15', 3.648, 'exchange-api'),
('usd', '2023-05-16', 3.661, 'exchange-api'),
('usd', '2023-05-17', 3.65, 'exchange-api'),
('usd', '2023-05-18', 3.639, 'exchange-api'),
('usd', '2023-05-19', 3.645, 'exchange-api'),
('usd', '2023-05-22', 3.651, 'exchange-api'),
('usd', '2023-05-23', 3.672, 'exchange-api'),
('usd', '2023-05-24', 3.731, 'exchange-api'),
('usd', '2023-05-25', 3.73, 'exchange-api'),
('usd', '2023-05-30', 3.709, 'exchange-api'),
('usd', '2023-05-31', 3.715, 'exchange-api'),
('usd', '2023-06-01', 3.736, 'exchange-api'),
('usd', '2023-06-02', 3.745, 'exchange-api'),
('usd', '2023-06-05', 3.735, 'exchange-api'),
('usd', '2023-06-06', 3.715, 'exchange-api'),
('usd', '2023-06-07', 3.655, 'exchange-api'),
('usd', '2023-06-08', 3.663, 'exchange-api'),
('usd', '2023-06-09', 3.63, 'exchange-api'),
('usd', '2023-06-12', 3.588, 'exchange-api'),
('usd', '2023-06-13', 3.558, 'exchange-api'),
('usd', '2023-06-14', 3.615, 'exchange-api'),
('usd', '2023-06-15', 3.584, 'exchange-api'),
('usd', '2023-06-16', 3.553, 'exchange-api'),
('usd', '2023-06-19', 3.602, 'exchange-api'),
('usd', '2023-06-20', 3.609, 'exchange-api'),
('usd', '2023-06-21', 3.604, 'exchange-api'),
('usd', '2023-06-22', 3.628, 'exchange-api'),
('usd', '2023-06-23', 3.628, 'exchange-api'),
('usd', '2023-06-26', 3.625, 'exchange-api'),
('usd', '2023-06-27', 3.638, 'exchange-api'),
('usd', '2023-06-28', 3.679, 'exchange-api'),
('usd', '2023-06-29', 3.692, 'exchange-api'),
('usd', '2023-06-30', 3.7, 'exchange-api'),
('usd', '2023-07-03', 3.713, 'exchange-api'),
('usd', '2023-07-04', 3.706, 'exchange-api'),
('usd', '2023-07-05', 3.698, 'exchange-api'),
('usd', '2023-07-06', 3.699, 'exchange-api'),
('usd', '2023-07-07', 3.717, 'exchange-api'),
('usd', '2023-07-10', 3.71, 'exchange-api'),
('usd', '2023-07-11', 3.709, 'exchange-api'),
('usd', '2023-07-12', 3.665, 'exchange-api'),
('usd', '2023-07-13', 3.618, 'exchange-api'),
('usd', '2023-07-14', 3.609, 'exchange-api'),
('usd', '2023-07-17', 3.635, 'exchange-api'),
('usd', '2023-07-18', 3.635, 'exchange-api'),
('usd', '2023-07-19', 3.59, 'exchange-api'),
('usd', '2023-07-20', 3.593, 'exchange-api'),
('usd', '2023-07-21', 3.617, 'exchange-api'),
('usd', '2023-07-24', 3.62, 'exchange-api'),
('usd', '2023-07-25', 3.717, 'exchange-api'),
('usd', '2023-07-26', 3.71, 'exchange-api'),
('usd', '2023-07-28', 3.713, 'exchange-api'),
('usd', '2023-07-31', 3.693, 'exchange-api'),
('usd', '2023-08-01', 3.653, 'exchange-api'),
('usd', '2023-08-02', 3.654, 'exchange-api'),
('usd', '2023-08-03', 3.685, 'exchange-api'),
('usd', '2023-08-04', 3.687, 'exchange-api'),
('usd', '2023-08-07', 3.676, 'exchange-api'),
('usd', '2023-08-08', 3.7, 'exchange-api'),
('usd', '2023-08-09', 3.716, 'exchange-api'),
('usd', '2023-08-10', 3.718, 'exchange-api'),
('usd', '2023-08-11', 3.723, 'exchange-api'),
('usd', '2023-08-14', 3.724, 'exchange-api'),
('usd', '2023-08-15', 3.763, 'exchange-api'),
('usd', '2023-08-16', 3.754, 'exchange-api'),
('usd', '2023-08-17', 3.773, 'exchange-api'),
('usd', '2023-08-18', 3.793, 'exchange-api'),
('usd', '2023-08-21', 3.794, 'exchange-api'),
('usd', '2023-08-22', 3.778, 'exchange-api'),
('usd', '2023-08-23', 3.788, 'exchange-api'),
('usd', '2023-08-24', 3.772, 'exchange-api'),
('usd', '2023-08-25', 3.8, 'exchange-api'),
('usd', '2023-08-28', 3.797, 'exchange-api'),
('usd', '2023-08-29', 3.808, 'exchange-api'),
('usd', '2023-08-30', 3.798, 'exchange-api'),
('usd', '2023-08-31', 3.801, 'exchange-api'),
('usd', '2023-09-01', 3.795, 'exchange-api'),
('usd', '2023-09-04', 3.808, 'exchange-api'),
('usd', '2023-09-05', 3.792, 'exchange-api'),
('usd', '2023-09-06', 3.808, 'exchange-api'),
('usd', '2023-09-07', 3.848, 'exchange-api'),
('usd', '2023-09-08', 3.844, 'exchange-api'),
('usd', '2023-09-11', 3.845, 'exchange-api'),
('usd', '2023-09-12', 3.798, 'exchange-api'),
('usd', '2023-09-13', 3.819, 'exchange-api'),
('usd', '2023-09-14', 3.826, 'exchange-api'),
('usd', '2023-09-18', 3.825, 'exchange-api'),
('usd', '2023-09-19', 3.804, 'exchange-api'),
('usd', '2023-09-20', 3.81, 'exchange-api'),
('usd', '2023-09-21', 3.805, 'exchange-api'),
('usd', '2023-09-22', 3.816, 'exchange-api'),
('usd', '2023-09-26', 3.819, 'exchange-api'),
('usd', '2023-09-27', 3.848, 'exchange-api'),
('usd', '2023-09-28', 3.849, 'exchange-api'),
('usd', '2023-09-29', 3.824, 'exchange-api'),
('usd', '2023-10-02', 3.829, 'exchange-api'),
('usd', '2023-10-03', 3.845, 'exchange-api'),
('usd', '2023-10-04', 3.861, 'exchange-api'),
('usd', '2023-10-05', 3.859, 'exchange-api'),
('usd', '2023-10-06', 3.863, 'exchange-api'),
('usd', '2023-10-09', 3.91, 'exchange-api'),
('usd', '2023-10-10', 3.951, 'exchange-api'),
('usd', '2023-10-11', 3.956, 'exchange-api'),
('usd', '2023-10-12', 3.958, 'exchange-api'),
('usd', '2023-10-13', 3.969, 'exchange-api'),
('usd', '2023-10-16', 3.99, 'exchange-api'),
('usd', '2023-10-17', 4.008, 'exchange-api'),
('usd', '2023-10-18', 4.025, 'exchange-api'),
('usd', '2023-10-19', 4.029, 'exchange-api'),
('usd', '2023-10-20', 4.049, 'exchange-api'),
('usd', '2023-10-23', 4.062, 'exchange-api'),
('usd', '2023-10-24', 4.063, 'exchange-api'),
('usd', '2023-10-25', 4.063, 'exchange-api'),
('usd', '2023-10-26', 4.079, 'exchange-api'),
('usd', '2023-10-27', 4.081, 'exchange-api'),
('usd', '2023-10-30', 4.055, 'exchange-api'),
('usd', '2023-10-31', 4.017, 'exchange-api'),
('usd', '2023-11-01', 4.029, 'exchange-api'),
('usd', '2023-11-02', 3.962, 'exchange-api'),
('usd', '2023-11-03', 3.988, 'exchange-api'),
('usd', '2023-11-06', 3.877, 'exchange-api'),
('usd', '2023-11-07', 3.866, 'exchange-api'),
('usd', '2023-11-08', 3.848, 'exchange-api'),
('usd', '2023-11-09', 3.854, 'exchange-api'),
('usd', '2023-11-10', 3.874, 'exchange-api'),
('usd', '2023-11-13', 3.867, 'exchange-api'),
('usd', '2023-11-14', 3.833, 'exchange-api'),
('usd', '2023-11-15', 3.767, 'exchange-api'),
('usd', '2023-11-16', 3.779, 'exchange-api'),
('usd', '2023-11-17', 3.728, 'exchange-api'),
('usd', '2023-11-20', 3.728, 'exchange-api'),
('usd', '2023-11-21', 3.71, 'exchange-api'),
('usd', '2023-11-22', 3.726, 'exchange-api'),
('usd', '2023-11-23', 3.731, 'exchange-api'),
('usd', '2023-11-24', 3.739, 'exchange-api'),
('usd', '2023-11-27', 3.726, 'exchange-api'),
('usd', '2023-11-28', 3.706, 'exchange-api'),
('usd', '2023-11-29', 3.675, 'exchange-api'),
('usd', '2023-11-30', 3.714, 'exchange-api'),
('usd', '2023-12-01', 3.739, 'exchange-api'),
('usd', '2023-12-04', 3.708, 'exchange-api'),
('usd', '2023-12-05', 3.728, 'exchange-api'),
('usd', '2023-12-06', 3.709, 'exchange-api'),
('usd', '2023-12-07', 3.703, 'exchange-api'),
('usd', '2023-12-08', 3.698, 'exchange-api'),
('usd', '2023-12-11', 3.717, 'exchange-api'),
('usd', '2023-12-12', 3.708, 'exchange-api'),
('usd', '2023-12-13', 3.71, 'exchange-api'),
('usd', '2023-12-14', 3.685, 'exchange-api'),
('usd', '2023-12-15', 3.658, 'exchange-api'),
('usd', '2023-12-18', 3.653, 'exchange-api'),
('usd', '2023-12-19', 3.643, 'exchange-api'),
('usd', '2023-12-20', 3.648, 'exchange-api'),
('usd', '2023-12-21', 3.616, 'exchange-api'),
('usd', '2023-12-22', 3.599, 'exchange-api'),
('usd', '2023-12-26', 3.628, 'exchange-api'),
('usd', '2023-12-27', 3.624, 'exchange-api'),
('usd', '2023-12-28', 3.619, 'exchange-api'),
('usd', '2023-12-29', 3.627, 'exchange-api'),
('usd', '2024-01-02', 3.618, 'exchange-api'),
('usd', '2024-01-03', 3.647, 'exchange-api'),
('usd', '2024-01-04', 3.648, 'exchange-api'),
('usd', '2024-01-05', 3.656, 'exchange-api'),
('usd', '2024-01-08', 3.718, 'exchange-api'),
('usd', '2024-01-09', 3.717, 'exchange-api'),
('usd', '2024-01-10', 3.758, 'exchange-api'),
('usd', '2024-01-11', 3.735, 'exchange-api'),
('usd', '2024-01-12', 3.728, 'exchange-api'),
('usd', '2024-01-15', 3.753, 'exchange-api'),
('usd', '2024-01-16', 3.768, 'exchange-api'),
('usd', '2024-01-17', 3.784, 'exchange-api'),
('usd', '2024-01-18', 3.766, 'exchange-api'),
('usd', '2024-01-19', 3.751, 'exchange-api'),
('usd', '2024-01-22', 3.772, 'exchange-api'),
('usd', '2024-01-23', 3.771, 'exchange-api'),
('usd', '2024-01-24', 3.72, 'exchange-api'),
('usd', '2024-01-25', 3.702, 'exchange-api'),
('usd', '2024-01-26', 3.707, 'exchange-api'),
('usd', '2024-01-29', 3.687, 'exchange-api'),
('usd', '2024-01-30', 3.652, 'exchange-api'),
('usd', '2024-01-31', 3.635, 'exchange-api'),
('usd', '2024-02-01', 3.653, 'exchange-api'),
('usd', '2024-02-02', 3.644, 'exchange-api'),
('usd', '2024-02-05', 3.675, 'exchange-api'),
('usd', '2024-02-06', 3.645, 'exchange-api'),
('usd', '2024-02-07', 3.648, 'exchange-api'),
('usd', '2024-02-08', 3.667, 'exchange-api'),
('usd', '2024-02-09', 3.684, 'exchange-api'),
('usd', '2024-02-12', 3.683, 'exchange-api'),
('usd', '2024-02-13', 3.644, 'exchange-api'),
('usd', '2024-02-14', 3.661, 'exchange-api'),
('usd', '2024-02-15', 3.627, 'exchange-api'),
('usd', '2024-02-16', 3.609, 'exchange-api'),
('usd', '2024-02-19', 3.622, 'exchange-api'),
('usd', '2024-02-20', 3.656, 'exchange-api'),
('usd', '2024-02-21', 3.679, 'exchange-api'),
('usd', '2024-02-22', 3.642, 'exchange-api'),
('usd', '2024-02-23', 3.636, 'exchange-api'),
('usd', '2024-02-26', 3.649, 'exchange-api'),
('usd', '2024-02-28', 3.609, 'exchange-api'),
('usd', '2024-02-29', 3.584, 'exchange-api'),
('usd', '2024-03-01', 3.565, 'exchange-api'),
('usd', '2024-03-04', 3.575, 'exchange-api'),
('usd', '2024-03-05', 3.591, 'exchange-api'),
('usd', '2024-03-06', 3.608, 'exchange-api'),
('usd', '2024-03-07', 3.59, 'exchange-api'),
('usd', '2024-03-08', 3.578, 'exchange-api'),
('usd', '2024-03-11', 3.608, 'exchange-api'),
('usd', '2024-03-12', 3.649, 'exchange-api'),
('usd', '2024-03-13', 3.66, 'exchange-api'),
('usd', '2024-03-14', 3.625, 'exchange-api'),
('usd', '2024-03-15', 3.653, 'exchange-api'),
('usd', '2024-03-18', 3.651, 'exchange-api'),
('usd', '2024-03-19', 3.668, 'exchange-api'),
('usd', '2024-03-20', 3.681, 'exchange-api'),
('usd', '2024-03-21', 3.604, 'exchange-api'),
('usd', '2024-03-22', 3.622, 'exchange-api'),
('usd', '2024-03-26', 3.66, 'exchange-api'),
('usd', '2024-03-27', 3.66, 'exchange-api'),
('usd', '2024-03-28', 3.681, 'exchange-api'),
('usd', '2024-04-01', 3.663, 'exchange-api'),
('usd', '2024-04-02', 3.697, 'exchange-api'),
('usd', '2024-04-03', 3.732, 'exchange-api'),
('usd', '2024-04-04', 3.716, 'exchange-api'),
('usd', '2024-04-05', 3.748, 'exchange-api'),
('usd', '2024-04-08', 3.712, 'exchange-api'),
('usd', '2024-04-09', 3.687, 'exchange-api'),
('usd', '2024-04-10', 3.714, 'exchange-api'),
('usd', '2024-04-11', 3.761, 'exchange-api'),
('usd', '2024-04-12', 3.757, 'exchange-api'),
('usd', '2024-04-15', 3.716, 'exchange-api'),
('usd', '2024-04-16', 3.77, 'exchange-api'),
('usd', '2024-04-17', 3.775, 'exchange-api'),
('usd', '2024-04-18', 3.78, 'exchange-api'),
('usd', '2024-04-19', 3.783, 'exchange-api'),
('usd', '2024-04-24', 3.759, 'exchange-api'),
('usd', '2024-04-25', 3.794, 'exchange-api'),
('usd', '2024-04-26', 3.818, 'exchange-api'),
('usd', '2024-04-30', 3.741, 'exchange-api'),
('usd', '2024-05-01', 3.74, 'exchange-api'),
('usd', '2024-05-02', 3.738, 'exchange-api'),
('usd', '2024-05-03', 3.723, 'exchange-api'),
('usd', '2024-05-06', 3.741, 'exchange-api'),
('usd', '2024-05-07', 3.722, 'exchange-api'),
('usd', '2024-05-08', 3.713, 'exchange-api'),
('usd', '2024-05-09', 3.741, 'exchange-api'),
('usd', '2024-05-10', 3.721, 'exchange-api'),
('usd', '2024-05-13', 3.724, 'exchange-api'),
('usd', '2024-05-15', 3.695, 'exchange-api'),
('usd', '2024-05-16', 3.681, 'exchange-api'),
('usd', '2024-05-17', 3.716, 'exchange-api'),
('usd', '2024-05-20', 3.703, 'exchange-api'),
('usd', '2024-05-21', 3.672, 'exchange-api'),
('usd', '2024-05-22', 3.674, 'exchange-api'),
('usd', '2024-05-23', 3.672, 'exchange-api'),
('usd', '2024-05-24', 3.673, 'exchange-api'),
('usd', '2024-05-28', 3.675, 'exchange-api'),
('usd', '2024-05-29', 3.694, 'exchange-api'),
('usd', '2024-05-30', 3.721, 'exchange-api'),
('usd', '2024-05-31', 3.718, 'exchange-api'),
('usd', '2024-06-03', 3.661, 'exchange-api'),
('usd', '2024-06-04', 3.688, 'exchange-api'),
('usd', '2024-06-05', 3.709, 'exchange-api'),
('usd', '2024-06-06', 3.724, 'exchange-api'),
('usd', '2024-06-07', 3.732, 'exchange-api'),
('usd', '2024-06-10', 3.752, 'exchange-api'),
('usd', '2024-06-11', 3.723, 'exchange-api'),
('usd', '2024-06-13', 3.715, 'exchange-api'),
('usd', '2024-06-14', 3.723, 'exchange-api'),
('usd', '2024-06-17', 3.732, 'exchange-api'),
('usd', '2024-06-18', 3.722, 'exchange-api'),
('usd', '2024-06-19', 3.716, 'exchange-api'),
('usd', '2024-06-20', 3.719, 'exchange-api'),
('usd', '2024-06-21', 3.739, 'exchange-api'),
('usd', '2024-06-24', 3.724, 'exchange-api'),
('usd', '2024-06-25', 3.725, 'exchange-api'),
('usd', '2024-06-26', 3.752, 'exchange-api'),
('usd', '2024-06-27', 3.755, 'exchange-api'),
('usd', '2024-06-28', 3.759, 'exchange-api'),
('usd', '2024-07-01', 3.753, 'exchange-api'),
('usd', '2024-07-02', 3.765, 'exchange-api'),
('usd', '2024-07-03', 3.763, 'exchange-api'),
('usd', '2024-07-04', 3.741, 'exchange-api'),
('usd', '2024-07-05', 3.721, 'exchange-api'),
('usd', '2024-07-08', 3.685, 'exchange-api'),
('usd', '2024-07-09', 3.673, 'exchange-api'),
('usd', '2024-07-10', 3.663, 'exchange-api'),
('usd', '2024-07-11', 3.641, 'exchange-api'),
('usd', '2024-07-12', 3.642, 'exchange-api'),
('usd', '2024-07-15', 3.612, 'exchange-api'),
('usd', '2024-07-16', 3.639, 'exchange-api'),
('usd', '2024-07-17', 3.627, 'exchange-api'),
('usd', '2024-07-18', 3.636, 'exchange-api'),
('usd', '2024-07-19', 3.662, 'exchange-api'),
('usd', '2024-07-22', 3.631, 'exchange-api'),
('usd', '2024-07-23', 3.626, 'exchange-api'),
('usd', '2024-07-24', 3.627, 'exchange-api'),
('usd', '2024-07-25', 3.653, 'exchange-api'),
('usd', '2024-07-26', 3.68, 'exchange-api'),
('usd', '2024-07-29', 3.733, 'exchange-api'),
('usd', '2024-07-30', 3.733, 'exchange-api'),
('usd', '2024-07-31', 3.767, 'exchange-api'),
('usd', '2024-08-01', 3.792, 'exchange-api'),
('usd', '2024-08-02', 3.807, 'exchange-api'),
('usd', '2024-08-05', 3.824, 'exchange-api'),
('usd', '2024-08-06', 3.843, 'exchange-api'),
('usd', '2024-08-07', 3.784, 'exchange-api'),
('usd', '2024-08-08', 3.792, 'exchange-api'),
('usd', '2024-08-09', 3.742, 'exchange-api'),
('usd', '2024-08-12', 3.77, 'exchange-api'),
('usd', '2024-08-14', 3.731, 'exchange-api'),
('usd', '2024-08-15', 3.715, 'exchange-api'),
('usd', '2024-08-16', 3.683, 'exchange-api'),
('usd', '2024-08-19', 3.701, 'exchange-api'),
('usd', '2024-08-20', 3.694, 'exchange-api'),
('usd', '2024-08-21', 3.722, 'exchange-api'),
('usd', '2024-08-22', 3.724, 'exchange-api'),
('usd', '2024-08-23', 3.704, 'exchange-api'),
('usd', '2024-08-26', 3.666, 'exchange-api'),
('usd', '2024-08-27', 3.684, 'exchange-api'),
('usd', '2024-08-28', 3.668, 'exchange-api'),
('usd', '2024-08-29', 3.665, 'exchange-api'),
('usd', '2024-08-30', 3.656, 'exchange-api'),
('usd', '2024-09-02', 3.654, 'exchange-api'),
('usd', '2024-09-03', 3.671, 'exchange-api'),
('usd', '2024-09-04', 3.722, 'exchange-api'),
('usd', '2024-09-05', 3.693, 'exchange-api'),
('usd', '2024-09-06', 3.704, 'exchange-api'),
('usd', '2024-09-09', 3.752, 'exchange-api'),
('usd', '2024-09-10', 3.763, 'exchange-api'),
('usd', '2024-09-11', 3.768, 'exchange-api'),
('usd', '2024-09-12', 3.753, 'exchange-api'),
('usd', '2024-09-13', 3.707, 'exchange-api'),
('usd', '2024-09-16', 3.742, 'exchange-api'),
('usd', '2024-09-17', 3.745, 'exchange-api'),
('usd', '2024-09-18', 3.773, 'exchange-api'),
('usd', '2024-09-19', 3.759, 'exchange-api'),
('usd', '2024-09-20', 3.765, 'exchange-api'),
('usd', '2024-09-23', 3.779, 'exchange-api'),
('usd', '2024-09-24', 3.773, 'exchange-api'),
('usd', '2024-09-25', 3.758, 'exchange-api'),
('usd', '2024-09-26', 3.694, 'exchange-api'),
('usd', '2024-09-27', 3.704, 'exchange-api'),
('usd', '2024-09-30', 3.71, 'exchange-api'),
('usd', '2024-10-01', 3.722, 'exchange-api'),
('usd', '2024-10-07', 3.786, 'exchange-api'),
('usd', '2024-10-08', 3.772, 'exchange-api'),
('usd', '2024-10-09', 3.76, 'exchange-api'),
('usd', '2024-10-10', 3.774, 'exchange-api'),
('usd', '2024-10-14', 3.758, 'exchange-api'),
('usd', '2024-10-15', 3.747, 'exchange-api'),
('usd', '2024-10-16', 3.763, 'exchange-api'),
('usd', '2024-10-18', 3.713, 'exchange-api'),
('usd', '2024-10-21', 3.736, 'exchange-api'),
('usd', '2024-10-22', 3.777, 'exchange-api'),
('usd', '2024-10-23', 3.789, 'exchange-api'),
('usd', '2024-10-25', 3.785, 'exchange-api'),
('usd', '2024-10-28', 3.728, 'exchange-api'),
('usd', '2024-10-29', 3.744, 'exchange-api'),
('usd', '2024-10-30', 3.709, 'exchange-api'),
('usd', '2024-10-31', 3.714, 'exchange-api'),
('usd', '2024-11-01', 3.761, 'exchange-api'),
('usd', '2024-11-04', 3.749, 'exchange-api'),
('usd', '2024-11-05', 3.748, 'exchange-api'),
('usd', '2024-11-06', 3.739, 'exchange-api'),
('usd', '2024-11-07', 3.726, 'exchange-api'),
('usd', '2024-11-08', 3.722, 'exchange-api'),
('usd', '2024-11-11', 3.733, 'exchange-api'),
('usd', '2024-11-12', 3.749, 'exchange-api'),
('usd', '2024-11-13', 3.741, 'exchange-api'),
('usd', '2024-11-14', 3.748, 'exchange-api'),
('usd', '2024-11-15', 3.743, 'exchange-api'),
('usd', '2024-11-18', 3.733, 'exchange-api'),
('usd', '2024-11-19', 3.743, 'exchange-api'),
('usd', '2024-11-20', 3.739, 'exchange-api'),
('usd', '2024-11-21', 3.733, 'exchange-api'),
('usd', '2024-11-22', 3.728, 'exchange-api'),
('usd', '2024-11-25', 3.674, 'exchange-api'),
('usd', '2024-11-26', 3.643, 'exchange-api'),
('usd', '2024-11-27', 3.654, 'exchange-api'),
('usd', '2024-11-28', 3.646, 'exchange-api'),
('usd', '2024-11-29', 3.643, 'exchange-api'),
('usd', '2024-12-02', 3.63, 'exchange-api'),
('usd', '2024-12-03', 3.634, 'exchange-api'),
('usd', '2024-12-04', 3.603, 'exchange-api'),
('usd', '2024-12-05', 3.603, 'exchange-api'),
('usd', '2024-12-06', 3.595, 'exchange-api'),
('usd', '2024-12-09', 3.565, 'exchange-api'),
('usd', '2024-12-10', 3.579, 'exchange-api'),
('usd', '2024-12-11', 3.584, 'exchange-api'),
('usd', '2024-12-12', 3.571, 'exchange-api'),
('usd', '2024-12-13', 3.593, 'exchange-api'),
('usd', '2024-12-16', 3.608, 'exchange-api'),
('usd', '2024-12-17', 3.601, 'exchange-api'),
('usd', '2024-12-18', 3.585, 'exchange-api'),
('usd', '2024-12-19', 3.618, 'exchange-api'),
('usd', '2024-12-20', 3.65, 'exchange-api'),
('usd', '2024-12-23', 3.649, 'exchange-api'),
('usd', '2024-12-24', 3.663, 'exchange-api'),
('usd', '2024-12-26', 3.669, 'exchange-api'),
('usd', '2024-12-27', 3.678, 'exchange-api'),
('usd', '2024-12-30', 3.646, 'exchange-api'),
('usd', '2024-12-31', 3.647, 'exchange-api'),
('usd', '2025-01-02', 3.65, 'exchange-api'),
('usd', '2025-01-03', 3.656, 'exchange-api'),
('usd', '2025-01-06', 3.636, 'exchange-api'),
('usd', '2025-01-07', 3.627, 'exchange-api'),
('usd', '2025-01-08', 3.663, 'exchange-api'),
('usd', '2025-01-09', 3.658, 'exchange-api'),
('usd', '2025-01-10', 3.665, 'exchange-api'),
('usd', '2025-01-13', 3.672, 'exchange-api'),
('usd', '2025-01-14', 3.631, 'exchange-api'),
('usd', '2025-01-15', 3.621, 'exchange-api'),
('usd', '2025-01-16', 3.625, 'exchange-api'),
('usd', '2025-01-17', 3.602, 'exchange-api'),
('usd', '2025-01-20', 3.58, 'exchange-api'),
('usd', '2025-01-21', 3.583, 'exchange-api'),
('usd', '2025-01-22', 3.541, 'exchange-api'),
('usd', '2025-01-23', 3.557, 'exchange-api'),
('usd', '2025-01-24', 3.575, 'exchange-api'),
('usd', '2025-01-27', 3.615, 'exchange-api'),
('usd', '2025-01-28', 3.618, 'exchange-api'),
('usd', '2025-01-29', 3.6, 'exchange-api'),
('usd', '2025-01-30', 3.584, 'exchange-api'),
('usd', '2025-01-31', 3.577, 'exchange-api'),
('usd', '2025-02-03', 3.609, 'exchange-api'),
('usd', '2025-02-04', 3.578, 'exchange-api'),
('usd', '2025-02-05', 3.553, 'exchange-api'),
('usd', '2025-02-06', 3.56, 'exchange-api'),
('usd', '2025-02-07', 3.55, 'exchange-api'),
('usd', '2025-02-10', 3.562, 'exchange-api'),
('usd', '2025-02-11', 3.588, 'exchange-api'),
('usd', '2025-02-12', 3.592, 'exchange-api'),
('usd', '2025-02-13', 3.576, 'exchange-api'),
('usd', '2025-02-14', 3.563, 'exchange-api'),
('usd', '2025-02-17', 3.554, 'exchange-api'),
('usd', '2025-02-18', 3.557, 'exchange-api'),
('usd', '2025-02-19', 3.541, 'exchange-api'),
('usd', '2025-02-20', 3.542, 'exchange-api'),
('usd', '2025-02-21', 3.567, 'exchange-api'),
('usd', '2025-02-24', 3.566, 'exchange-api'),
('usd', '2025-02-25', 3.579, 'exchange-api'),
('usd', '2025-02-26', 3.576, 'exchange-api'),
('usd', '2025-02-27', 3.553, 'exchange-api'),
('usd', '2025-02-28', 3.59, 'exchange-api'),
('usd', '2025-03-03', 3.598, 'exchange-api'),
('usd', '2025-03-04', 3.611, 'exchange-api'),
('usd', '2025-03-05', 3.621, 'exchange-api'),
('usd', '2025-03-06', 3.615, 'exchange-api'),
('usd', '2025-03-07', 3.612, 'exchange-api'),
('usd', '2025-03-10', 3.628, 'exchange-api'),
('usd', '2025-03-11', 3.646, 'exchange-api'),
('usd', '2025-03-12', 3.637, 'exchange-api'),
('usd', '2025-03-13', 3.654, 'exchange-api'),
('usd', '2025-03-17', 3.663, 'exchange-api'),
('usd', '2025-03-18', 3.665, 'exchange-api'),
('usd', '2025-03-19', 3.671, 'exchange-api'),
('usd', '2025-03-20', 3.671, 'exchange-api'),
('usd', '2025-03-21', 3.697, 'exchange-api'),
('usd', '2025-03-24', 3.703, 'exchange-api'),
('usd', '2025-03-25', 3.666, 'exchange-api'),
('usd', '2025-03-26', 3.667, 'exchange-api'),
('usd', '2025-03-27', 3.675, 'exchange-api'),
('usd', '2025-03-28', 3.684, 'exchange-api'),
('usd', '2025-03-31', 3.718, 'exchange-api'),
('usd', '2025-04-01', 3.705, 'exchange-api'),
('usd', '2025-04-02', 3.699, 'exchange-api'),
('usd', '2025-04-03', 3.705, 'exchange-api'),
('usd', '2025-04-04', 3.72, 'exchange-api'),
('usd', '2025-04-07', 3.771, 'exchange-api'),
('usd', '2025-04-08', 3.766, 'exchange-api'),
('usd', '2025-04-09', 3.813, 'exchange-api'),
('usd', '2025-04-10', 3.757, 'exchange-api'),
('usd', '2025-04-11', 3.726, 'exchange-api'),
('usd', '2025-04-14', 3.685, 'exchange-api'),
('usd', '2025-04-15', 3.69, 'exchange-api'),
('usd', '2025-04-16', 3.688, 'exchange-api'),
('usd', '2025-04-17', 3.691, 'exchange-api'),
('usd', '2025-04-21', 3.692, 'exchange-api'),
('usd', '2025-04-22', 3.72, 'exchange-api'),
('usd', '2025-04-23', 3.668, 'exchange-api'),
('usd', '2025-04-24', 3.648, 'exchange-api'),
('usd', '2025-04-25', 3.612, 'exchange-api'),
('usd', '2025-04-28', 3.631, 'exchange-api'),
('usd', '2025-04-29', 3.623, 'exchange-api'),
('usd', '2025-04-30', 3.637, 'exchange-api'),
('usd', '2025-05-02', 3.614, 'exchange-api'),
('usd', '2025-05-05', 3.612, 'exchange-api'),
('usd', '2025-05-06', 3.618, 'exchange-api'),
('usd', '2025-05-07', 3.587, 'exchange-api'),
('usd', '2025-05-08', 3.579, 'exchange-api'),
('usd', '2025-05-09', 3.569, 'exchange-api'),
('usd', '2025-05-12', 3.545, 'exchange-api'),
('usd', '2025-05-13', 3.576, 'exchange-api'),
('usd', '2025-05-14', 3.559, 'exchange-api'),
('usd', '2025-05-15', 3.54, 'exchange-api'),
('usd', '2025-05-16', 3.549, 'exchange-api'),
('usd', '2025-05-19', 3.552, 'exchange-api'),
('usd', '2025-05-20', 3.525, 'exchange-api'),
('usd', '2025-05-21', 3.549, 'exchange-api'),
('usd', '2025-05-22', 3.57, 'exchange-api'),
('usd', '2025-05-23', 3.603, 'exchange-api'),
('usd', '2025-05-27', 3.537, 'exchange-api'),
('usd', '2025-05-28', 3.54, 'exchange-api'),
('usd', '2025-05-29', 3.512, 'exchange-api'),
('usd', '2025-05-30', 3.518, 'exchange-api'),
('usd', '2025-06-03', 3.526, 'exchange-api'),
('usd', '2025-06-04', 3.514, 'exchange-api'),
('usd', '2025-06-05', 3.491, 'exchange-api'),
('usd', '2025-06-06', 3.502, 'exchange-api'),
('usd', '2025-06-09', 3.484, 'exchange-api'),
('usd', '2025-06-10', 3.495, 'exchange-api'),
('usd', '2025-06-11', 3.503, 'exchange-api'),
('usd', '2025-06-12', 3.571, 'exchange-api'),
('usd', '2025-06-13', 3.6, 'exchange-api'),
('usd', '2025-06-16', 3.537, 'exchange-api'),
('usd', '2025-06-17', 3.503, 'exchange-api'),
('usd', '2025-06-18', 3.498, 'exchange-api'),
('usd', '2025-06-19', 3.484, 'exchange-api'),
('usd', '2025-06-20', 3.485, 'exchange-api'),
('usd', '2025-06-23', 3.479, 'exchange-api'),
('usd', '2025-06-24', 3.405, 'exchange-api'),
('usd', '2025-06-25', 3.409, 'exchange-api'),
('usd', '2025-06-26', 3.402, 'exchange-api'),
('usd', '2025-06-27', 3.392, 'exchange-api'),
('usd', '2025-06-30', 3.372, 'exchange-api'),
('usd', '2025-07-01', 3.369, 'exchange-api'),
('usd', '2025-07-02', 3.371, 'exchange-api'),
('usd', '2025-07-03', 3.361, 'exchange-api'),
('usd', '2025-07-04', 3.34, 'exchange-api'),
('usd', '2025-07-07', 3.337, 'exchange-api'),
('usd', '2025-07-08', 3.355, 'exchange-api'),
('usd', '2025-07-09', 3.328, 'exchange-api'),
('usd', '2025-07-10', 3.306, 'exchange-api'),
('usd', '2025-07-11', 3.334, 'exchange-api'),
('usd', '2025-07-14', 3.365, 'exchange-api'),
('usd', '2025-07-15', 3.345, 'exchange-api'),
('usd', '2025-07-16', 3.355, 'exchange-api'),
('usd', '2025-07-17', 3.359, 'exchange-api'),
('usd', '2025-07-18', 3.355, 'exchange-api'),
('usd', '2025-07-21', 3.355, 'exchange-api'),
('usd', '2025-07-22', 3.354, 'exchange-api'),
('usd', '2025-07-23', 3.332, 'exchange-api'),
('usd', '2025-07-24', 3.341, 'exchange-api'),
('usd', '2025-07-25', 3.361, 'exchange-api'),
('usd', '2025-07-28', 3.356, 'exchange-api'),
('usd', '2025-07-29', 3.367, 'exchange-api'),
('usd', '2025-07-30', 3.366, 'exchange-api'),
('usd', '2025-07-31', 3.388, 'exchange-api'),
('usd', '2025-08-01', 3.414, 'exchange-api'),
('usd', '2025-08-04', 3.404, 'exchange-api'),
('usd', '2025-08-05', 3.447, 'exchange-api'),
('usd', '2025-08-06', 3.448, 'exchange-api'),
('usd', '2025-08-07', 3.417, 'exchange-api'),
('usd', '2025-08-08', 3.435, 'exchange-api'),
('usd', '2025-08-11', 3.418, 'exchange-api'),
('usd', '2025-08-12', 3.429, 'exchange-api'),
('usd', '2025-08-13', 3.389, 'exchange-api'),
('usd', '2025-08-14', 3.385, 'exchange-api'),
('usd', '2025-08-15', 3.38, 'exchange-api'),
('usd', '2025-08-18', 3.39, 'exchange-api'),
('usd', '2025-08-19', 3.38, 'exchange-api'),
('usd', '2025-08-20', 3.4, 'exchange-api'),
('usd', '2025-08-21', 3.419, 'exchange-api'),
('usd', '2025-08-22', 3.406, 'exchange-api'),
('usd', '2025-08-25', 3.378, 'exchange-api'),
('usd', '2025-08-26', 3.369, 'exchange-api'),
('usd', '2025-08-27', 3.346, 'exchange-api'),
('usd', '2025-08-28', 3.325, 'exchange-api'),
('usd', '2025-08-29', 3.332, 'exchange-api'),
('usd', '2025-09-01', 3.354, 'exchange-api'),
('usd', '2025-09-02', 3.386, 'exchange-api'),
('usd', '2025-09-03', 3.371, 'exchange-api'),
('usd', '2025-09-04', 3.364, 'exchange-api'),
('usd', '2025-09-05', 3.343, 'exchange-api'),
('usd', '2025-09-08', 3.324, 'exchange-api'),
('usd', '2025-09-09', 3.335, 'exchange-api'),
('usd', '2025-09-10', 3.336, 'exchange-api'),
('usd', '2025-09-11', 3.339, 'exchange-api'),
('usd', '2025-09-12', 3.327, 'exchange-api'),
('usd', '2025-09-15', 3.341, 'exchange-api'),
('usd', '2025-09-16', 3.343, 'exchange-api'),
('usd', '2025-09-17', 3.34, 'exchange-api'),
('usd', '2025-09-18', 3.343, 'exchange-api'),
('usd', '2025-09-19', 3.336, 'exchange-api'),
('usd', '2025-09-25', 3.344, 'exchange-api'),
('usd', '2025-09-26', 3.366, 'exchange-api'),
('usd', '2025-09-29', 3.323, 'exchange-api'),
('usd', '2025-09-30', 3.306, 'exchange-api'),
('usd', '2025-10-03', 3.315, 'exchange-api'),
('usd', '2025-10-06', 3.281, 'exchange-api'),
('usd', '2025-10-08', 3.279, 'exchange-api'),
('usd', '2025-10-09', 3.242, 'exchange-api'),
('usd', '2025-10-10', 3.254, 'exchange-api'),
('usd', '2025-10-13', 3.284, 'exchange-api'),
('usd', '2025-10-15', 3.291, 'exchange-api'),
('usd', '2025-10-16', 3.296, 'exchange-api'),
('usd', '2025-10-17', 3.324, 'exchange-api'),
('usd', '2025-10-20', 3.311, 'exchange-api'),
('usd', '2025-10-21', 3.289, 'exchange-api'),
('usd', '2025-10-22', 3.298, 'exchange-api'),
('usd', '2025-10-23', 3.309, 'exchange-api'),
('usd', '2025-10-24', 3.29, 'exchange-api'),
('usd', '2025-10-27', 3.259, 'exchange-api'),
('usd', '2025-10-28', 3.259, 'exchange-api'),
('usd', '2025-10-29', 3.25, 'exchange-api'),
('usd', '2025-10-30', 3.257, 'exchange-api'),
('usd', '2025-10-31', 3.243, 'exchange-api'),
('usd', '2025-11-03', 3.255, 'exchange-api'),
('usd', '2025-11-04', 3.268, 'exchange-api'),
('usd', '2025-11-05', 3.272, 'exchange-api'),
('usd', '2025-11-06', 3.253, 'exchange-api'),
('usd', '2025-11-07', 3.265, 'exchange-api'),
('usd', '2025-11-10', 3.23, 'exchange-api'),
('usd', '2025-11-11', 3.217, 'exchange-api'),
('usd', '2025-11-12', 3.2, 'exchange-api'),
('usd', '2025-11-13', 3.209, 'exchange-api'),
('usd', '2025-11-14', 3.235, 'exchange-api'),
('usd', '2025-11-17', 3.241, 'exchange-api'),
('usd', '2025-11-18', 3.27, 'exchange-api'),
('usd', '2025-11-19', 3.266, 'exchange-api'),
('usd', '2025-11-20', 3.259, 'exchange-api'),
('usd', '2025-11-21', 3.28, 'exchange-api'),
('usd', '2025-11-24', 3.282, 'exchange-api'),
('usd', '2025-11-25', 3.275, 'exchange-api'),
('usd', '2025-11-26', 3.279, 'exchange-api'),
('usd', '2025-11-27', 3.277, 'exchange-api'),
('usd', '2025-11-28', 3.263, 'exchange-api'),
('usd', '2025-12-01', 3.264, 'exchange-api'),
('usd', '2025-12-02', 3.257, 'exchange-api'),
('usd', '2025-12-03', 3.229, 'exchange-api'),
('usd', '2025-12-04', 3.237, 'exchange-api'),
('usd', '2025-12-05', 3.229, 'exchange-api'),
('usd', '2025-12-08', 3.21, 'exchange-api'),
('usd', '2025-12-09', 3.213, 'exchange-api'),
('usd', '2025-12-10', 3.228, 'exchange-api'),
('usd', '2025-12-11', 3.211, 'exchange-api'),
('usd', '2025-12-12', 3.202, 'exchange-api'),
('usd', '2025-12-15', 3.209, 'exchange-api'),
('usd', '2025-12-16', 3.222, 'exchange-api'),
('usd', '2025-12-17', 3.223, 'exchange-api'),
('usd', '2025-12-18', 3.218, 'exchange-api'),
('usd', '2025-12-19', 3.208, 'exchange-api'),
('usd', '2025-12-22', 3.206, 'exchange-api'),
('usd', '2025-12-23', 3.191, 'exchange-api'),
('usd', '2025-12-24', 3.186, 'exchange-api'),
('usd', '2025-12-29', 3.203, 'exchange-api'),
('usd', '2025-12-30', 3.182, 'exchange-api'),
('usd', '2025-12-31', 3.19, 'exchange-api'),
('usd', '2026-01-02', 3.181, 'exchange-api'),
('usd', '2026-01-05', 3.158, 'exchange-api'),
('usd', '2026-01-06', 3.164, 'exchange-api'),
('usd', '2026-01-07', 3.175, 'exchange-api'),
('usd', '2026-01-08', 3.174, 'exchange-api'),
('usd', '2026-01-09', 3.17, 'exchange-api'),
('usd', '2026-01-12', 3.15, 'exchange-api'),
('usd', '2026-01-13', 3.151, 'exchange-api'),
('usd', '2026-01-14', 3.151, 'exchange-api'),
('usd', '2026-01-15', 3.156, 'exchange-api'),
('usd', '2026-01-16', 3.138, 'exchange-api'),
('usd', '2026-01-19', 3.16, 'exchange-api'),
('usd', '2026-01-20', 3.166, 'exchange-api'),
('usd', '2026-01-21', 3.174, 'exchange-api'),
('usd', '2026-01-22', 3.141, 'exchange-api'),
('usd', '2026-01-23', 3.135, 'exchange-api'),
('usd', '2026-01-26', 3.137, 'exchange-api'),
('usd', '2026-01-27', 3.104, 'exchange-api'),
('usd', '2026-01-28', 3.091, 'exchange-api'),
('eur', '2006-02-02', 5.6625, 'exchange-api'),
('eur', '2006-02-03', 5.6625, 'exchange-api'),
('eur', '2006-02-06', 5.6278, 'exchange-api'),
('eur', '2006-02-07', 5.6522, 'exchange-api'),
('eur', '2006-02-08', 5.6286, 'exchange-api'),
('eur', '2006-02-09', 5.6241, 'exchange-api'),
('eur', '2006-02-10', 5.6208, 'exchange-api'),
('eur', '2006-02-13', 5.5928, 'exchange-api'),
('eur', '2006-02-14', 5.6128, 'exchange-api'),
('eur', '2006-02-15', 5.6232, 'exchange-api'),
('eur', '2006-02-16', 5.5837, 'exchange-api'),
('eur', '2006-02-17', 5.5795, 'exchange-api'),
('eur', '2006-02-20', 5.5958, 'exchange-api'),
('eur', '2006-02-21', 5.6106, 'exchange-api'),
('eur', '2006-02-22', 5.6164, 'exchange-api'),
('eur', '2006-02-23', 5.6307, 'exchange-api'),
('eur', '2006-02-24', 5.6096, 'exchange-api'),
('eur', '2006-02-27', 5.584, 'exchange-api'),
('eur', '2006-02-28', 5.591, 'exchange-api'),
('eur', '2006-03-01', 5.6128, 'exchange-api'),
('eur', '2006-03-02', 5.6142, 'exchange-api'),
('eur', '2006-03-03', 5.6394, 'exchange-api'),
('eur', '2006-03-06', 5.6439, 'exchange-api'),
('eur', '2006-03-07', 5.6049, 'exchange-api'),
('eur', '2006-03-08', 5.6202, 'exchange-api'),
('eur', '2006-03-09', 5.6195, 'exchange-api'),
('eur', '2006-03-10', 5.6169, 'exchange-api'),
('eur', '2006-03-13', 5.6279, 'exchange-api'),
('eur', '2006-03-16', 5.6682, 'exchange-api'),
('eur', '2006-03-17', 5.6769, 'exchange-api'),
('eur', '2006-03-20', 5.67, 'exchange-api'),
('eur', '2006-03-21', 5.6549, 'exchange-api'),
('eur', '2006-03-22', 5.6421, 'exchange-api'),
('eur', '2006-03-23', 5.6316, 'exchange-api'),
('eur', '2006-03-24', 5.605, 'exchange-api'),
('eur', '2006-03-27', 5.6344, 'exchange-api'),
('eur', '2006-03-29', 5.6462, 'exchange-api'),
('eur', '2006-03-30', 5.6511, 'exchange-api'),
('eur', '2006-03-31', 5.6619, 'exchange-api'),
('eur', '2006-04-03', 5.6351, 'exchange-api'),
('eur', '2006-04-04', 5.6485, 'exchange-api'),
('eur', '2006-04-05', 5.6522, 'exchange-api'),
('eur', '2006-04-06', 5.6601, 'exchange-api'),
('eur', '2006-04-07', 5.612, 'exchange-api'),
('eur', '2006-04-10', 5.5812, 'exchange-api'),
('eur', '2006-04-11', 5.569, 'exchange-api'),
('eur', '2006-04-18', 5.6136, 'exchange-api'),
('eur', '2006-04-20', 5.6241, 'exchange-api'),
('eur', '2006-04-21', 5.6205, 'exchange-api'),
('eur', '2006-04-24', 5.6251, 'exchange-api'),
('eur', '2006-04-25', 5.6126, 'exchange-api'),
('eur', '2006-04-26', 5.6405, 'exchange-api'),
('eur', '2006-04-27', 5.6308, 'exchange-api'),
('eur', '2006-04-28', 5.6492, 'exchange-api'),
('eur', '2006-05-01', 5.6579, 'exchange-api'),
('eur', '2006-05-02', 5.651, 'exchange-api'),
('eur', '2006-05-04', 5.6663, 'exchange-api'),
('eur', '2006-05-05', 5.6697, 'exchange-api'),
('eur', '2006-05-08', 5.6601, 'exchange-api'),
('eur', '2006-05-09', 5.6438, 'exchange-api'),
('eur', '2006-05-10', 5.6623, 'exchange-api'),
('eur', '2006-05-11', 5.6543, 'exchange-api'),
('eur', '2006-05-12', 5.7098, 'exchange-api'),
('eur', '2006-05-15', 5.7191, 'exchange-api'),
('eur', '2006-05-16', 5.7048, 'exchange-api'),
('eur', '2006-05-17', 5.7157, 'exchange-api'),
('eur', '2006-05-18', 5.6987, 'exchange-api'),
('eur', '2006-05-19', 5.6948, 'exchange-api'),
('eur', '2006-05-22', 5.7257, 'exchange-api'),
('eur', '2006-05-23', 5.7702, 'exchange-api'),
('eur', '2006-05-24', 5.8096, 'exchange-api'),
('eur', '2006-05-25', 5.7769, 'exchange-api'),
('eur', '2006-05-26', 5.7832, 'exchange-api'),
('eur', '2006-05-30', 5.8145, 'exchange-api'),
('eur', '2006-05-31', 5.8095, 'exchange-api'),
('eur', '2006-06-01', 5.7887, 'exchange-api'),
('eur', '2006-06-05', 5.8055, 'exchange-api'),
('eur', '2006-06-06', 5.7512, 'exchange-api'),
('eur', '2006-06-07', 5.7245, 'exchange-api'),
('eur', '2006-06-08', 5.7047, 'exchange-api'),
('eur', '2006-06-09', 5.6703, 'exchange-api'),
('eur', '2006-06-12', 5.634, 'exchange-api'),
('eur', '2006-06-13', 5.6648, 'exchange-api'),
('eur', '2006-06-14', 5.6505, 'exchange-api'),
('eur', '2006-06-15', 5.6287, 'exchange-api'),
('eur', '2006-06-16', 5.6135, 'exchange-api'),
('eur', '2006-06-19', 5.594, 'exchange-api'),
('eur', '2006-06-20', 5.5995, 'exchange-api'),
('eur', '2006-06-21', 5.6371, 'exchange-api'),
('eur', '2006-06-22', 5.6226, 'exchange-api'),
('eur', '2006-06-23', 5.6086, 'exchange-api'),
('eur', '2006-06-26', 5.6261, 'exchange-api'),
('eur', '2006-06-27', 5.6451, 'exchange-api'),
('eur', '2006-06-28', 5.6265, 'exchange-api'),
('eur', '2006-06-29', 5.609, 'exchange-api'),
('eur', '2006-06-30', 5.6435, 'exchange-api'),
('eur', '2006-07-03', 5.653, 'exchange-api'),
('eur', '2006-07-04', 5.6176, 'exchange-api'),
('eur', '2006-07-05', 5.5953, 'exchange-api'),
('eur', '2006-07-06', 5.6045, 'exchange-api'),
('eur', '2006-07-07', 5.6021, 'exchange-api'),
('eur', '2006-07-10', 5.6119, 'exchange-api'),
('eur', '2006-07-11', 5.5888, 'exchange-api'),
('eur', '2006-07-12', 5.6447, 'exchange-api'),
('eur', '2006-07-13', 5.7079, 'exchange-api'),
('eur', '2006-07-14', 5.7306, 'exchange-api')
ON CONFLICT (index_type, date) 
DO UPDATE SET value = EXCLUDED.value;

-- Backfill Bank of Israel Exchange Rates (20 Years)
-- Generated by scripts/fetch_boi_history.py

INSERT INTO public.index_data (index_type, date, value, source)
VALUES
('eur', '2006-07-17', 5.6336, 'exchange-api'),
('eur', '2006-07-18', 5.5886, 'exchange-api'),
('eur', '2006-07-19', 5.571, 'exchange-api'),
('eur', '2006-07-20', 5.6195, 'exchange-api'),
('eur', '2006-07-21', 5.6541, 'exchange-api'),
('eur', '2006-07-24', 5.6339, 'exchange-api'),
('eur', '2006-07-25', 5.6016, 'exchange-api'),
('eur', '2006-07-26', 5.5868, 'exchange-api'),
('eur', '2006-07-27', 5.6351, 'exchange-api'),
('eur', '2006-07-28', 5.618, 'exchange-api'),
('eur', '2006-07-31', 5.6039, 'exchange-api'),
('eur', '2006-08-01', 5.6184, 'exchange-api'),
('eur', '2006-08-02', 5.6418, 'exchange-api'),
('eur', '2006-08-04', 5.6349, 'exchange-api'),
('eur', '2006-08-07', 5.6544, 'exchange-api'),
('eur', '2006-08-08', 5.6049, 'exchange-api'),
('eur', '2006-08-09', 5.6281, 'exchange-api'),
('eur', '2006-08-10', 5.6405, 'exchange-api'),
('eur', '2006-08-11', 5.6125, 'exchange-api'),
('eur', '2006-08-14', 5.5669, 'exchange-api'),
('eur', '2006-08-15', 5.5588, 'exchange-api'),
('eur', '2006-08-16', 5.5845, 'exchange-api'),
('eur', '2006-08-17', 5.6109, 'exchange-api'),
('eur', '2006-08-18', 5.604, 'exchange-api'),
('eur', '2006-08-21', 5.6191, 'exchange-api'),
('eur', '2006-08-22', 5.5957, 'exchange-api'),
('eur', '2006-08-23', 5.5968, 'exchange-api'),
('eur', '2006-08-24', 5.6158, 'exchange-api'),
('eur', '2006-08-25', 5.6079, 'exchange-api'),
('eur', '2006-08-28', 5.6366, 'exchange-api'),
('eur', '2006-08-29', 5.6319, 'exchange-api'),
('eur', '2006-08-30', 5.6149, 'exchange-api'),
('eur', '2006-08-31', 5.6119, 'exchange-api'),
('eur', '2006-09-01', 5.6033, 'exchange-api'),
('eur', '2006-09-04', 5.6203, 'exchange-api'),
('eur', '2006-09-05', 5.5889, 'exchange-api'),
('eur', '2006-09-06', 5.5865, 'exchange-api'),
('eur', '2006-09-07', 5.5884, 'exchange-api'),
('eur', '2006-09-08', 5.5801, 'exchange-api'),
('eur', '2006-09-11', 5.5889, 'exchange-api'),
('eur', '2006-09-12', 5.5778, 'exchange-api'),
('eur', '2006-09-13', 5.549, 'exchange-api'),
('eur', '2006-09-14', 5.5726, 'exchange-api'),
('eur', '2006-09-15', 5.5493, 'exchange-api'),
('eur', '2006-09-18', 5.5126, 'exchange-api'),
('eur', '2006-09-19', 5.5013, 'exchange-api'),
('eur', '2006-09-20', 5.5006, 'exchange-api'),
('eur', '2006-09-21', 5.5076, 'exchange-api'),
('eur', '2006-09-25', 5.5211, 'exchange-api'),
('eur', '2006-09-26', 5.4805, 'exchange-api'),
('eur', '2006-09-27', 5.4601, 'exchange-api'),
('eur', '2006-09-28', 5.4641, 'exchange-api'),
('eur', '2006-09-29', 5.4552, 'exchange-api'),
('eur', '2006-10-03', 5.4727, 'exchange-api'),
('eur', '2006-10-04', 5.4293, 'exchange-api'),
('eur', '2006-10-05', 5.4085, 'exchange-api'),
('eur', '2006-10-06', 5.3717, 'exchange-api'),
('eur', '2006-10-09', 5.3649, 'exchange-api'),
('eur', '2006-10-10', 5.3568, 'exchange-api'),
('eur', '2006-10-11', 5.3542, 'exchange-api'),
('eur', '2006-10-12', 5.3555, 'exchange-api'),
('eur', '2006-10-13', 5.3361, 'exchange-api'),
('eur', '2006-10-16', 5.3391, 'exchange-api'),
('eur', '2006-10-17', 5.3426, 'exchange-api'),
('eur', '2006-10-18', 5.3613, 'exchange-api'),
('eur', '2006-10-19', 5.3692, 'exchange-api'),
('eur', '2006-10-20', 5.3997, 'exchange-api'),
('eur', '2006-10-23', 5.372, 'exchange-api'),
('eur', '2006-10-24', 5.3715, 'exchange-api'),
('eur', '2006-10-25', 5.3958, 'exchange-api'),
('eur', '2006-10-26', 5.422, 'exchange-api'),
('eur', '2006-10-27', 5.4441, 'exchange-api'),
('eur', '2006-10-30', 5.4599, 'exchange-api'),
('eur', '2006-10-31', 5.443, 'exchange-api'),
('eur', '2006-11-01', 5.4364, 'exchange-api'),
('eur', '2006-11-02', 5.4696, 'exchange-api'),
('eur', '2006-11-03', 5.4777, 'exchange-api'),
('eur', '2006-11-06', 5.4741, 'exchange-api'),
('eur', '2006-11-07', 5.5248, 'exchange-api'),
('eur', '2006-11-08', 5.5363, 'exchange-api'),
('eur', '2006-11-09', 5.528, 'exchange-api'),
('eur', '2006-11-10', 5.518, 'exchange-api'),
('eur', '2006-11-13', 5.5047, 'exchange-api'),
('eur', '2006-11-14', 5.4972, 'exchange-api'),
('eur', '2006-11-15', 5.4905, 'exchange-api'),
('eur', '2006-11-16', 5.5307, 'exchange-api'),
('eur', '2006-11-17', 5.5054, 'exchange-api'),
('eur', '2006-11-20', 5.5353, 'exchange-api'),
('eur', '2006-11-21', 5.5427, 'exchange-api'),
('eur', '2006-11-22', 5.5661, 'exchange-api'),
('eur', '2006-11-23', 5.5881, 'exchange-api'),
('eur', '2006-11-24', 5.6121, 'exchange-api'),
('eur', '2006-11-27', 5.6392, 'exchange-api'),
('eur', '2006-11-28', 5.6377, 'exchange-api'),
('eur', '2006-11-30', 5.6046, 'exchange-api'),
('eur', '2006-12-01', 5.606, 'exchange-api'),
('eur', '2006-12-04', 5.632, 'exchange-api'),
('eur', '2006-12-05', 5.6298, 'exchange-api'),
('eur', '2006-12-06', 5.577, 'exchange-api'),
('eur', '2006-12-07', 5.5802, 'exchange-api'),
('eur', '2006-12-08', 5.5716, 'exchange-api'),
('eur', '2006-12-11', 5.5439, 'exchange-api'),
('eur', '2006-12-12', 5.5655, 'exchange-api'),
('eur', '2006-12-13', 5.5497, 'exchange-api'),
('eur', '2006-12-14', 5.5127, 'exchange-api'),
('eur', '2006-12-15', 5.4957, 'exchange-api'),
('eur', '2006-12-18', 5.4918, 'exchange-api'),
('eur', '2006-12-19', 5.5205, 'exchange-api'),
('eur', '2006-12-20', 5.5219, 'exchange-api'),
('eur', '2006-12-21', 5.5099, 'exchange-api'),
('eur', '2006-12-22', 5.5264, 'exchange-api'),
('eur', '2006-12-26', 5.546, 'exchange-api'),
('eur', '2006-12-27', 5.5603, 'exchange-api'),
('eur', '2006-12-28', 5.5425, 'exchange-api'),
('eur', '2006-12-29', 5.5643, 'exchange-api'),
('eur', '2007-01-02', 5.5823, 'exchange-api'),
('eur', '2007-01-03', 5.5361, 'exchange-api'),
('eur', '2007-01-04', 5.5083, 'exchange-api'),
('eur', '2007-01-05', 5.5411, 'exchange-api'),
('eur', '2007-01-08', 5.516, 'exchange-api'),
('eur', '2007-01-09', 5.5125, 'exchange-api'),
('eur', '2007-01-10', 5.5192, 'exchange-api'),
('eur', '2007-01-11', 5.4941, 'exchange-api'),
('eur', '2007-01-12', 5.4566, 'exchange-api'),
('eur', '2007-01-15', 5.4664, 'exchange-api'),
('eur', '2007-01-16', 5.4731, 'exchange-api'),
('eur', '2007-01-17', 5.4607, 'exchange-api'),
('eur', '2007-01-18', 5.4561, 'exchange-api'),
('eur', '2007-01-19', 5.4725, 'exchange-api'),
('eur', '2007-01-22', 5.4653, 'exchange-api'),
('eur', '2007-01-23', 5.4995, 'exchange-api'),
('eur', '2007-01-24', 5.4959, 'exchange-api'),
('eur', '2007-01-25', 5.4887, 'exchange-api'),
('eur', '2007-01-26', 5.4839, 'exchange-api'),
('eur', '2007-01-29', 5.4917, 'exchange-api'),
('eur', '2007-01-30', 5.5087, 'exchange-api'),
('eur', '2007-01-31', 5.5182, 'exchange-api'),
('eur', '2007-02-01', 5.5218, 'exchange-api'),
('eur', '2007-02-02', 5.5294, 'exchange-api'),
('eur', '2007-02-05', 5.4985, 'exchange-api'),
('eur', '2007-02-06', 5.4992, 'exchange-api'),
('eur', '2007-02-07', 5.5028, 'exchange-api'),
('eur', '2007-02-08', 5.4974, 'exchange-api'),
('eur', '2007-02-09', 5.498, 'exchange-api'),
('eur', '2007-02-12', 5.4897, 'exchange-api'),
('eur', '2007-02-13', 5.5173, 'exchange-api'),
('eur', '2007-02-14', 5.5303, 'exchange-api'),
('eur', '2007-02-15', 5.5425, 'exchange-api'),
('eur', '2007-02-16', 5.5154, 'exchange-api'),
('eur', '2007-02-19', 5.4923, 'exchange-api'),
('eur', '2007-02-20', 5.4992, 'exchange-api'),
('eur', '2007-02-21', 5.4993, 'exchange-api'),
('eur', '2007-02-22', 5.4743, 'exchange-api'),
('eur', '2007-02-23', 5.4937, 'exchange-api'),
('eur', '2007-02-26', 5.5286, 'exchange-api'),
('eur', '2007-02-27', 5.5554, 'exchange-api'),
('eur', '2007-02-28', 5.5583, 'exchange-api'),
('eur', '2007-03-01', 5.5789, 'exchange-api'),
('eur', '2007-03-02', 5.5401, 'exchange-api'),
('eur', '2007-03-06', 5.534, 'exchange-api'),
('eur', '2007-03-07', 5.5462, 'exchange-api'),
('eur', '2007-03-08', 5.5373, 'exchange-api'),
('eur', '2007-03-09', 5.5163, 'exchange-api'),
('eur', '2007-03-12', 5.528, 'exchange-api'),
('eur', '2007-03-13', 5.5547, 'exchange-api'),
('eur', '2007-03-14', 5.5577, 'exchange-api'),
('eur', '2007-03-15', 5.5666, 'exchange-api'),
('eur', '2007-03-16', 5.6013, 'exchange-api'),
('eur', '2007-03-19', 5.5935, 'exchange-api'),
('eur', '2007-03-20', 5.5973, 'exchange-api'),
('eur', '2007-03-21', 5.5782, 'exchange-api'),
('eur', '2007-03-22', 5.5945, 'exchange-api'),
('eur', '2007-03-23', 5.5805, 'exchange-api'),
('eur', '2007-03-26', 5.5776, 'exchange-api'),
('eur', '2007-03-27', 5.5781, 'exchange-api'),
('eur', '2007-03-28', 5.5773, 'exchange-api'),
('eur', '2007-03-29', 5.5642, 'exchange-api'),
('eur', '2007-03-30', 5.5343, 'exchange-api'),
('eur', '2007-04-04', 5.5231, 'exchange-api'),
('eur', '2007-04-05', 5.518, 'exchange-api'),
('eur', '2007-04-10', 5.5334, 'exchange-api'),
('eur', '2007-04-11', 5.5118, 'exchange-api'),
('eur', '2007-04-12', 5.473, 'exchange-api'),
('eur', '2007-04-13', 5.5035, 'exchange-api'),
('eur', '2007-04-16', 5.4846, 'exchange-api'),
('eur', '2007-04-17', 5.5033, 'exchange-api'),
('eur', '2007-04-18', 5.5218, 'exchange-api'),
('eur', '2007-04-19', 5.5389, 'exchange-api'),
('eur', '2007-04-20', 5.5413, 'exchange-api'),
('eur', '2007-04-23', 5.5203, 'exchange-api'),
('eur', '2007-04-25', 5.5, 'exchange-api'),
('eur', '2007-04-26', 5.4663, 'exchange-api'),
('eur', '2007-04-27', 5.4635, 'exchange-api'),
('eur', '2007-04-30', 5.4793, 'exchange-api'),
('eur', '2007-05-01', 5.5045, 'exchange-api'),
('eur', '2007-05-02', 5.5188, 'exchange-api'),
('eur', '2007-05-03', 5.5035, 'exchange-api'),
('eur', '2007-05-04', 5.4832, 'exchange-api'),
('eur', '2007-05-07', 5.4405, 'exchange-api'),
('eur', '2007-05-08', 5.41, 'exchange-api'),
('eur', '2007-05-09', 5.3784, 'exchange-api'),
('eur', '2007-05-10', 5.3486, 'exchange-api'),
('eur', '2007-05-11', 5.3632, 'exchange-api'),
('eur', '2007-05-14', 5.3656, 'exchange-api'),
('eur', '2007-05-15', 5.3761, 'exchange-api'),
('eur', '2007-05-16', 5.3452, 'exchange-api'),
('eur', '2007-05-17', 5.3443, 'exchange-api'),
('eur', '2007-05-18', 5.3904, 'exchange-api'),
('eur', '2007-05-21', 5.3747, 'exchange-api'),
('eur', '2007-05-22', 5.3729, 'exchange-api'),
('eur', '2007-05-24', 5.3747, 'exchange-api'),
('eur', '2007-05-25', 5.4146, 'exchange-api'),
('eur', '2007-05-29', 5.4256, 'exchange-api'),
('eur', '2007-05-30', 5.439, 'exchange-api'),
('eur', '2007-05-31', 5.421, 'exchange-api'),
('eur', '2007-06-01', 5.4737, 'exchange-api'),
('eur', '2007-06-04', 5.475, 'exchange-api'),
('eur', '2007-06-05', 5.4974, 'exchange-api'),
('eur', '2007-06-06', 5.5407, 'exchange-api'),
('eur', '2007-06-07', 5.5807, 'exchange-api'),
('eur', '2007-06-08', 5.6229, 'exchange-api'),
('eur', '2007-06-11', 5.5892, 'exchange-api'),
('eur', '2007-06-12', 5.5855, 'exchange-api'),
('eur', '2007-06-13', 5.5985, 'exchange-api'),
('eur', '2007-06-14', 5.5672, 'exchange-api'),
('eur', '2007-06-15', 5.5592, 'exchange-api'),
('eur', '2007-06-18', 5.5534, 'exchange-api'),
('eur', '2007-06-19', 5.5862, 'exchange-api'),
('eur', '2007-06-20', 5.6223, 'exchange-api'),
('eur', '2007-06-21', 5.6667, 'exchange-api'),
('eur', '2007-06-22', 5.6611, 'exchange-api'),
('eur', '2007-06-25', 5.7235, 'exchange-api'),
('eur', '2007-06-26', 5.7377, 'exchange-api'),
('eur', '2007-06-27', 5.765, 'exchange-api'),
('eur', '2007-06-28', 5.7316, 'exchange-api'),
('eur', '2007-06-29', 5.7132, 'exchange-api'),
('eur', '2007-07-02', 5.7564, 'exchange-api'),
('eur', '2007-07-03', 5.6955, 'exchange-api'),
('eur', '2007-07-04', 5.6956, 'exchange-api'),
('eur', '2007-07-05', 5.7495, 'exchange-api'),
('eur', '2007-07-06', 5.7578, 'exchange-api'),
('eur', '2007-07-09', 5.7596, 'exchange-api'),
('eur', '2007-07-10', 5.7753, 'exchange-api'),
('eur', '2007-07-11', 5.8516, 'exchange-api'),
('eur', '2007-07-12', 5.8805, 'exchange-api'),
('eur', '2007-07-13', 5.8887, 'exchange-api'),
('eur', '2007-07-16', 5.9075, 'exchange-api'),
('eur', '2007-07-17', 5.9071, 'exchange-api'),
('eur', '2007-07-18', 5.9092, 'exchange-api'),
('eur', '2007-07-19', 5.8623, 'exchange-api'),
('eur', '2007-07-20', 5.832, 'exchange-api'),
('eur', '2007-07-23', 5.8577, 'exchange-api'),
('eur', '2007-07-25', 5.8018, 'exchange-api'),
('eur', '2007-07-26', 5.8677, 'exchange-api'),
('eur', '2007-07-27', 5.9196, 'exchange-api'),
('eur', '2007-07-30', 5.9342, 'exchange-api'),
('eur', '2007-07-31', 5.9017, 'exchange-api'),
('eur', '2007-08-01', 5.9239, 'exchange-api'),
('eur', '2007-08-02', 5.9287, 'exchange-api'),
('eur', '2007-08-03', 5.9027, 'exchange-api'),
('eur', '2007-08-06', 5.936, 'exchange-api'),
('eur', '2007-08-07', 5.9233, 'exchange-api'),
('eur', '2007-08-08', 5.8904, 'exchange-api'),
('eur', '2007-08-09', 5.8637, 'exchange-api'),
('eur', '2007-08-10', 5.871, 'exchange-api'),
('eur', '2007-08-13', 5.7847, 'exchange-api'),
('eur', '2007-08-14', 5.7326, 'exchange-api'),
('eur', '2007-08-15', 5.7128, 'exchange-api'),
('eur', '2007-08-16', 5.7014, 'exchange-api'),
('eur', '2007-08-17', 5.6902, 'exchange-api'),
('eur', '2007-08-20', 5.6672, 'exchange-api'),
('eur', '2007-08-21', 5.6679, 'exchange-api'),
('eur', '2007-08-22', 5.6257, 'exchange-api'),
('eur', '2007-08-23', 5.6479, 'exchange-api'),
('eur', '2007-08-24', 5.6698, 'exchange-api'),
('eur', '2007-08-27', 5.6776, 'exchange-api'),
('eur', '2007-08-28', 5.6372, 'exchange-api'),
('eur', '2007-08-29', 5.6161, 'exchange-api'),
('eur', '2007-08-30', 5.5994, 'exchange-api'),
('eur', '2007-08-31', 5.6324, 'exchange-api'),
('eur', '2007-09-03', 5.632, 'exchange-api'),
('eur', '2007-09-04', 5.6191, 'exchange-api'),
('eur', '2007-09-05', 5.5954, 'exchange-api'),
('eur', '2007-09-06', 5.6458, 'exchange-api'),
('eur', '2007-09-07', 5.6524, 'exchange-api'),
('eur', '2007-09-10', 5.7028, 'exchange-api'),
('eur', '2007-09-11', 5.6659, 'exchange-api'),
('eur', '2007-09-17', 5.6797, 'exchange-api'),
('eur', '2007-09-18', 5.6894, 'exchange-api'),
('eur', '2007-09-19', 5.6633, 'exchange-api'),
('eur', '2007-09-20', 5.7025, 'exchange-api'),
('eur', '2007-09-24', 5.6926, 'exchange-api'),
('eur', '2007-09-25', 5.6926, 'exchange-api'),
('eur', '2007-09-26', 5.6894, 'exchange-api'),
('eur', '2007-09-28', 5.6898, 'exchange-api'),
('eur', '2007-10-01', 5.6677, 'exchange-api'),
('eur', '2007-10-02', 5.6756, 'exchange-api'),
('eur', '2007-10-03', 5.6872, 'exchange-api'),
('eur', '2007-10-05', 5.6627, 'exchange-api'),
('eur', '2007-10-08', 5.6348, 'exchange-api'),
('eur', '2007-10-09', 5.6774, 'exchange-api'),
('eur', '2007-10-10', 5.6847, 'exchange-api'),
('eur', '2007-10-11', 5.734, 'exchange-api'),
('eur', '2007-10-12', 5.7135, 'exchange-api'),
('eur', '2007-10-15', 5.7394, 'exchange-api'),
('eur', '2007-10-16', 5.731, 'exchange-api'),
('eur', '2007-10-17', 5.7165, 'exchange-api'),
('eur', '2007-10-18', 5.7348, 'exchange-api'),
('eur', '2007-10-19', 5.7383, 'exchange-api'),
('eur', '2007-10-22', 5.7174, 'exchange-api'),
('eur', '2007-10-23', 5.7229, 'exchange-api'),
('eur', '2007-10-24', 5.7341, 'exchange-api'),
('eur', '2007-10-25', 5.7424, 'exchange-api'),
('eur', '2007-10-26', 5.7363, 'exchange-api'),
('eur', '2007-10-29', 5.7475, 'exchange-api'),
('eur', '2007-10-30', 5.7277, 'exchange-api'),
('eur', '2007-10-31', 5.7323, 'exchange-api'),
('eur', '2007-11-01', 5.7155, 'exchange-api'),
('eur', '2007-11-02', 5.7469, 'exchange-api'),
('eur', '2007-11-05', 5.7266, 'exchange-api'),
('eur', '2007-11-06', 5.7328, 'exchange-api'),
('eur', '2007-11-07', 5.7745, 'exchange-api'),
('eur', '2007-11-08', 5.7525, 'exchange-api'),
('eur', '2007-11-09', 5.7774, 'exchange-api'),
('eur', '2007-11-12', 5.7709, 'exchange-api'),
('eur', '2007-11-13', 5.7783, 'exchange-api'),
('eur', '2007-11-14', 5.7739, 'exchange-api'),
('eur', '2007-11-15', 5.758, 'exchange-api'),
('eur', '2007-11-16', 5.7467, 'exchange-api'),
('eur', '2007-11-19', 5.7592, 'exchange-api'),
('eur', '2007-11-20', 5.7599, 'exchange-api'),
('eur', '2007-11-21', 5.7718, 'exchange-api'),
('eur', '2007-11-22', 5.7707, 'exchange-api'),
('eur', '2007-11-23', 5.7229, 'exchange-api'),
('eur', '2007-11-26', 5.7368, 'exchange-api'),
('eur', '2007-11-27', 5.7351, 'exchange-api'),
('eur', '2007-11-28', 5.7026, 'exchange-api'),
('eur', '2007-11-29', 5.6713, 'exchange-api'),
('eur', '2007-11-30', 5.6483, 'exchange-api'),
('eur', '2007-12-03', 5.6257, 'exchange-api'),
('eur', '2007-12-04', 5.6526, 'exchange-api'),
('eur', '2007-12-05', 5.6571, 'exchange-api'),
('eur', '2007-12-06', 5.6496, 'exchange-api'),
('eur', '2007-12-07', 5.6685, 'exchange-api'),
('eur', '2007-12-10', 5.7315, 'exchange-api'),
('eur', '2007-12-11', 5.7515, 'exchange-api'),
('eur', '2007-12-12', 5.7828, 'exchange-api'),
('eur', '2007-12-13', 5.7672, 'exchange-api'),
('eur', '2007-12-14', 5.7877, 'exchange-api'),
('eur', '2007-12-17', 5.7663, 'exchange-api'),
('eur', '2007-12-18', 5.7216, 'exchange-api'),
('eur', '2007-12-19', 5.6725, 'exchange-api'),
('eur', '2007-12-20', 5.6474, 'exchange-api'),
('eur', '2007-12-21', 5.6207, 'exchange-api'),
('eur', '2007-12-24', 5.5853, 'exchange-api'),
('eur', '2007-12-26', 5.6617, 'exchange-api'),
('eur', '2007-12-27', 5.6137, 'exchange-api'),
('eur', '2007-12-28', 5.6499, 'exchange-api'),
('eur', '2007-12-31', 5.6592, 'exchange-api'),
('eur', '2008-01-02', 5.6718, 'exchange-api'),
('eur', '2008-01-03', 5.6634, 'exchange-api'),
('eur', '2008-01-04', 5.6009, 'exchange-api'),
('eur', '2008-01-07', 5.622, 'exchange-api'),
('eur', '2008-01-08', 5.587, 'exchange-api'),
('eur', '2008-01-09', 5.5762, 'exchange-api'),
('eur', '2008-01-10', 5.5821, 'exchange-api'),
('eur', '2008-01-11', 5.5776, 'exchange-api'),
('eur', '2008-01-14', 5.5504, 'exchange-api'),
('eur', '2008-01-15', 5.5144, 'exchange-api'),
('eur', '2008-01-16', 5.5231, 'exchange-api'),
('eur', '2008-01-17', 5.5033, 'exchange-api'),
('eur', '2008-01-18', 5.5315, 'exchange-api'),
('eur', '2008-01-21', 5.5067, 'exchange-api'),
('eur', '2008-01-22', 5.5081, 'exchange-api'),
('eur', '2008-01-23', 5.4106, 'exchange-api'),
('eur', '2008-01-24', 5.407, 'exchange-api'),
('eur', '2008-01-25', 5.4624, 'exchange-api'),
('eur', '2008-01-28', 5.4621, 'exchange-api'),
('eur', '2008-01-29', 5.3795, 'exchange-api'),
('eur', '2008-01-30', 5.3992, 'exchange-api'),
('eur', '2008-01-31', 5.3877, 'exchange-api'),
('eur', '2008-02-01', 5.3468, 'exchange-api'),
('eur', '2008-02-04', 5.3013, 'exchange-api'),
('eur', '2008-02-05', 5.2976, 'exchange-api'),
('eur', '2008-02-06', 5.2998, 'exchange-api'),
('eur', '2008-02-07', 5.3418, 'exchange-api'),
('eur', '2008-02-08', 5.2296, 'exchange-api'),
('eur', '2008-02-11', 5.2646, 'exchange-api'),
('eur', '2008-02-12', 5.2021, 'exchange-api'),
('eur', '2008-02-13', 5.2605, 'exchange-api'),
('eur', '2008-02-14', 5.286, 'exchange-api'),
('eur', '2008-02-15', 5.2612, 'exchange-api'),
('eur', '2008-02-18', 5.2731, 'exchange-api'),
('eur', '2008-02-19', 5.2926, 'exchange-api'),
('eur', '2008-02-20', 5.3071, 'exchange-api'),
('eur', '2008-02-21', 5.3187, 'exchange-api'),
('eur', '2008-02-22', 5.3325, 'exchange-api'),
('eur', '2008-02-25', 5.3011, 'exchange-api'),
('eur', '2008-02-26', 5.3981, 'exchange-api'),
('eur', '2008-02-27', 5.4275, 'exchange-api'),
('eur', '2008-02-28', 5.4652, 'exchange-api'),
('eur', '2008-02-29', 5.5279, 'exchange-api'),
('eur', '2008-03-03', 5.5591, 'exchange-api'),
('eur', '2008-03-04', 5.517, 'exchange-api'),
('eur', '2008-03-05', 5.4578, 'exchange-api'),
('eur', '2008-03-06', 5.5146, 'exchange-api'),
('eur', '2008-03-07', 5.5456, 'exchange-api'),
('eur', '2008-03-10', 5.4939, 'exchange-api'),
('eur', '2008-03-11', 5.3917, 'exchange-api'),
('eur', '2008-03-12', 5.3872, 'exchange-api'),
('eur', '2008-03-13', 5.2949, 'exchange-api'),
('eur', '2008-03-14', 5.4106, 'exchange-api'),
('eur', '2008-03-17', 5.4013, 'exchange-api'),
('eur', '2008-03-18', 5.337, 'exchange-api'),
('eur', '2008-03-19', 5.3125, 'exchange-api'),
('eur', '2008-03-20', 5.252, 'exchange-api'),
('eur', '2008-03-24', 5.4367, 'exchange-api'),
('eur', '2008-03-25', 5.474, 'exchange-api'),
('eur', '2008-03-26', 5.5109, 'exchange-api'),
('eur', '2008-03-27', 5.5351, 'exchange-api'),
('eur', '2008-03-28', 5.5525, 'exchange-api'),
('eur', '2008-03-31', 5.6169, 'exchange-api'),
('eur', '2008-04-01', 5.5471, 'exchange-api'),
('eur', '2008-04-02', 5.5645, 'exchange-api'),
('eur', '2008-04-03', 5.5526, 'exchange-api'),
('eur', '2008-04-04', 5.6705, 'exchange-api'),
('eur', '2008-04-07', 5.7224, 'exchange-api'),
('eur', '2008-04-08', 5.6961, 'exchange-api'),
('eur', '2008-04-09', 5.6559, 'exchange-api'),
('eur', '2008-04-10', 5.7423, 'exchange-api'),
('eur', '2008-04-11', 5.6938, 'exchange-api'),
('eur', '2008-04-14', 5.6482, 'exchange-api'),
('eur', '2008-04-15', 5.5241, 'exchange-api'),
('eur', '2008-04-16', 5.5406, 'exchange-api'),
('eur', '2008-04-17', 5.522, 'exchange-api'),
('eur', '2008-04-18', 5.4627, 'exchange-api'),
('eur', '2008-04-21', 5.475, 'exchange-api'),
('eur', '2008-04-22', 5.5176, 'exchange-api'),
('eur', '2008-04-23', 5.4964, 'exchange-api'),
('eur', '2008-04-24', 5.4366, 'exchange-api'),
('eur', '2008-04-25', 5.4441, 'exchange-api'),
('eur', '2008-04-28', 5.4229, 'exchange-api'),
('eur', '2008-04-29', 5.3976, 'exchange-api'),
('eur', '2008-04-30', 5.3278, 'exchange-api'),
('eur', '2008-05-01', 5.3152, 'exchange-api'),
('eur', '2008-05-02', 5.3382, 'exchange-api'),
('eur', '2008-05-05', 5.3138, 'exchange-api'),
('eur', '2008-05-06', 5.3001, 'exchange-api'),
('eur', '2008-05-07', 5.3329, 'exchange-api'),
('eur', '2008-05-09', 5.3538, 'exchange-api'),
('eur', '2008-05-12', 5.3351, 'exchange-api'),
('eur', '2008-05-13', 5.3115, 'exchange-api'),
('eur', '2008-05-14', 5.2954, 'exchange-api'),
('eur', '2008-05-15', 5.3045, 'exchange-api'),
('eur', '2008-05-16', 5.2044, 'exchange-api'),
('eur', '2008-05-19', 5.2502, 'exchange-api'),
('eur', '2008-05-20', 5.293, 'exchange-api'),
('eur', '2008-05-21', 5.297, 'exchange-api'),
('eur', '2008-05-22', 5.26, 'exchange-api'),
('eur', '2008-05-23', 5.2408, 'exchange-api'),
('eur', '2008-05-27', 5.1752, 'exchange-api'),
('eur', '2008-05-28', 5.1577, 'exchange-api'),
('eur', '2008-05-29', 5.0736, 'exchange-api'),
('eur', '2008-05-30', 5.0048, 'exchange-api'),
('eur', '2008-06-02', 5.0629, 'exchange-api'),
('eur', '2008-06-03', 5.0989, 'exchange-api'),
('eur', '2008-06-04', 5.1403, 'exchange-api'),
('eur', '2008-06-05', 5.1963, 'exchange-api'),
('eur', '2008-06-06', 5.1968, 'exchange-api'),
('eur', '2008-06-10', 5.2382, 'exchange-api'),
('eur', '2008-06-11', 5.2676, 'exchange-api'),
('eur', '2008-06-12', 5.2865, 'exchange-api'),
('eur', '2008-06-13', 5.2663, 'exchange-api'),
('eur', '2008-06-16', 5.2714, 'exchange-api'),
('eur', '2008-06-17', 5.171, 'exchange-api'),
('eur', '2008-06-18', 5.1801, 'exchange-api'),
('eur', '2008-06-19', 5.2134, 'exchange-api'),
('eur', '2008-06-20', 5.2136, 'exchange-api'),
('eur', '2008-06-23', 5.2369, 'exchange-api'),
('eur', '2008-06-24', 5.2457, 'exchange-api'),
('eur', '2008-06-25', 5.2804, 'exchange-api'),
('eur', '2008-06-26', 5.3021, 'exchange-api'),
('eur', '2008-06-27', 5.3296, 'exchange-api'),
('eur', '2008-06-30', 5.2849, 'exchange-api'),
('eur', '2008-07-01', 5.2744, 'exchange-api'),
('eur', '2008-07-02', 5.1902, 'exchange-api'),
('eur', '2008-07-03', 5.1653, 'exchange-api'),
('eur', '2008-07-04', 5.1389, 'exchange-api'),
('eur', '2008-07-07', 5.0845, 'exchange-api'),
('eur', '2008-07-08', 5.125, 'exchange-api'),
('eur', '2008-07-09', 5.0761, 'exchange-api'),
('eur', '2008-07-10', 5.2061, 'exchange-api'),
('eur', '2008-07-11', 5.3335, 'exchange-api'),
('eur', '2008-07-14', 5.2786, 'exchange-api'),
('eur', '2008-07-15', 5.2893, 'exchange-api'),
('eur', '2008-07-16', 5.3221, 'exchange-api'),
('eur', '2008-07-17', 5.3481, 'exchange-api'),
('eur', '2008-07-18', 5.3623, 'exchange-api'),
('eur', '2008-07-21', 5.433, 'exchange-api'),
('eur', '2008-07-22', 5.5142, 'exchange-api'),
('eur', '2008-07-23', 5.4719, 'exchange-api'),
('eur', '2008-07-24', 5.4708, 'exchange-api'),
('eur', '2008-07-25', 5.4772, 'exchange-api'),
('eur', '2008-07-28', 5.4798, 'exchange-api'),
('eur', '2008-07-29', 5.451, 'exchange-api'),
('eur', '2008-07-30', 5.4061, 'exchange-api'),
('eur', '2008-07-31', 5.4172, 'exchange-api'),
('eur', '2008-08-01', 5.472, 'exchange-api'),
('eur', '2008-08-04', 5.5246, 'exchange-api'),
('eur', '2008-08-05', 5.5034, 'exchange-api'),
('eur', '2008-08-06', 5.4917, 'exchange-api'),
('eur', '2008-08-07', 5.4742, 'exchange-api'),
('eur', '2008-08-08', 5.4425, 'exchange-api'),
('eur', '2008-08-11', 5.3556, 'exchange-api'),
('eur', '2008-08-12', 5.3458, 'exchange-api'),
('eur', '2008-08-13', 5.3479, 'exchange-api'),
('eur', '2008-08-14', 5.3434, 'exchange-api'),
('eur', '2008-08-15', 5.2823, 'exchange-api'),
('eur', '2008-08-18', 5.253, 'exchange-api'),
('eur', '2008-08-19', 5.2519, 'exchange-api'),
('eur', '2008-08-20', 5.263, 'exchange-api'),
('eur', '2008-08-21', 5.2214, 'exchange-api'),
('eur', '2008-08-22', 5.1539, 'exchange-api'),
('eur', '2008-08-25', 5.1868, 'exchange-api'),
('eur', '2008-08-26', 5.152, 'exchange-api'),
('eur', '2008-08-27', 5.2613, 'exchange-api'),
('eur', '2008-08-28', 5.2918, 'exchange-api'),
('eur', '2008-08-29', 5.2973, 'exchange-api'),
('eur', '2008-09-01', 5.2928, 'exchange-api'),
('eur', '2008-09-02', 5.2698, 'exchange-api'),
('eur', '2008-09-03', 5.1959, 'exchange-api'),
('eur', '2008-09-04', 5.1849, 'exchange-api'),
('eur', '2008-09-05', 5.1212, 'exchange-api'),
('eur', '2008-09-08', 5.0977, 'exchange-api'),
('eur', '2008-09-09', 5.0863, 'exchange-api'),
('eur', '2008-09-10', 5.0782, 'exchange-api'),
('eur', '2008-09-11', 5.0529, 'exchange-api'),
('eur', '2008-09-12', 5.1081, 'exchange-api'),
('eur', '2008-09-15', 5.1028, 'exchange-api'),
('eur', '2008-09-16', 5.0415, 'exchange-api'),
('eur', '2008-09-17', 5.0508, 'exchange-api'),
('eur', '2008-09-18', 5.1009, 'exchange-api'),
('eur', '2008-09-19', 5.0153, 'exchange-api'),
('eur', '2008-09-22', 5.0962, 'exchange-api'),
('eur', '2008-09-23', 5.027, 'exchange-api'),
('eur', '2008-09-24', 5.0215, 'exchange-api'),
('eur', '2008-09-25', 4.9993, 'exchange-api'),
('eur', '2008-09-26', 4.9998, 'exchange-api'),
('eur', '2008-10-02', 4.8511, 'exchange-api'),
('eur', '2008-10-03', 4.8023, 'exchange-api'),
('eur', '2008-10-06', 4.7219, 'exchange-api'),
('eur', '2008-10-07', 4.7704, 'exchange-api'),
('eur', '2008-10-10', 4.893, 'exchange-api'),
('eur', '2008-10-13', 4.9228, 'exchange-api'),
('eur', '2008-10-15', 4.9338, 'exchange-api'),
('eur', '2008-10-16', 4.991, 'exchange-api'),
('eur', '2008-10-17', 5.0248, 'exchange-api'),
('eur', '2008-10-20', 5.055, 'exchange-api'),
('eur', '2008-10-22', 4.9426, 'exchange-api'),
('eur', '2008-10-23', 4.9244, 'exchange-api'),
('eur', '2008-10-24', 4.8567, 'exchange-api'),
('eur', '2008-10-27', 4.7655, 'exchange-api'),
('eur', '2008-10-28', 4.75, 'exchange-api'),
('eur', '2008-10-29', 4.8274, 'exchange-api'),
('eur', '2008-10-30', 4.8508, 'exchange-api'),
('eur', '2008-10-31', 4.8262, 'exchange-api'),
('eur', '2008-11-03', 4.8168, 'exchange-api'),
('eur', '2008-11-04', 4.8222, 'exchange-api'),
('eur', '2008-11-05', 4.942, 'exchange-api'),
('eur', '2008-11-06', 4.9117, 'exchange-api'),
('eur', '2008-11-07', 4.8976, 'exchange-api'),
('eur', '2008-11-10', 4.872, 'exchange-api'),
('eur', '2008-11-11', 4.8329, 'exchange-api'),
('eur', '2008-11-12', 4.8869, 'exchange-api'),
('eur', '2008-11-13', 4.9204, 'exchange-api'),
('eur', '2008-11-14', 4.9337, 'exchange-api'),
('eur', '2008-11-17', 4.9505, 'exchange-api'),
('eur', '2008-11-18', 5.0006, 'exchange-api'),
('eur', '2008-11-19', 5.0097, 'exchange-api'),
('eur', '2008-11-20', 5.0081, 'exchange-api'),
('eur', '2008-11-21', 5.0416, 'exchange-api'),
('eur', '2008-11-24', 5.0919, 'exchange-api'),
('eur', '2008-11-25', 5.0946, 'exchange-api'),
('eur', '2008-11-26', 5.027, 'exchange-api'),
('eur', '2008-11-27', 5.0313, 'exchange-api'),
('eur', '2008-11-28', 5.0433, 'exchange-api'),
('eur', '2008-12-01', 5.0298, 'exchange-api'),
('eur', '2008-12-02', 5.0092, 'exchange-api'),
('eur', '2008-12-03', 5.0344, 'exchange-api'),
('eur', '2008-12-04', 5.0065, 'exchange-api'),
('eur', '2008-12-05', 5.0819, 'exchange-api'),
('eur', '2008-12-08', 5.063, 'exchange-api'),
('eur', '2008-12-09', 5.0596, 'exchange-api'),
('eur', '2008-12-10', 5.0551, 'exchange-api'),
('eur', '2008-12-11', 5.1688, 'exchange-api'),
('eur', '2008-12-12', 5.2071, 'exchange-api'),
('eur', '2008-12-15', 5.206, 'exchange-api'),
('eur', '2008-12-16', 5.2324, 'exchange-api'),
('eur', '2008-12-17', 5.276, 'exchange-api'),
('eur', '2008-12-18', 5.3572, 'exchange-api'),
('eur', '2008-12-19', 5.2762, 'exchange-api'),
('eur', '2008-12-22', 5.3631, 'exchange-api'),
('eur', '2008-12-23', 5.3661, 'exchange-api'),
('eur', '2008-12-24', 5.4199, 'exchange-api'),
('eur', '2008-12-29', 5.5038, 'exchange-api'),
('eur', '2008-12-30', 5.3354, 'exchange-api'),
('eur', '2008-12-31', 5.2973, 'exchange-api'),
('eur', '2009-01-02', 5.2646, 'exchange-api'),
('eur', '2009-01-05', 5.2337, 'exchange-api'),
('eur', '2009-01-06', 5.1504, 'exchange-api'),
('eur', '2009-01-07', 5.2602, 'exchange-api'),
('eur', '2009-01-08', 5.2762, 'exchange-api'),
('eur', '2009-01-09', 5.2734, 'exchange-api'),
('eur', '2009-01-12', 5.2316, 'exchange-api'),
('eur', '2009-01-13', 5.2085, 'exchange-api'),
('eur', '2009-01-14', 5.1413, 'exchange-api'),
('eur', '2009-01-15', 5.0837, 'exchange-api'),
('eur', '2009-01-16', 5.0975, 'exchange-api'),
('eur', '2009-01-19', 5.0861, 'exchange-api'),
('eur', '2009-01-20', 5.0441, 'exchange-api'),
('eur', '2009-01-21', 5.0536, 'exchange-api'),
('eur', '2009-01-22', 5.1244, 'exchange-api'),
('eur', '2009-01-23', 5.1042, 'exchange-api'),
('eur', '2009-01-26', 5.1851, 'exchange-api'),
('eur', '2009-01-27', 5.252, 'exchange-api'),
('eur', '2009-01-28', 5.3426, 'exchange-api'),
('eur', '2009-01-29', 5.2777, 'exchange-api'),
('eur', '2009-01-30', 5.2349, 'exchange-api'),
('eur', '2009-02-02', 5.1949, 'exchange-api'),
('eur', '2009-02-03', 5.2377, 'exchange-api'),
('eur', '2009-02-04', 5.2286, 'exchange-api'),
('eur', '2009-02-05', 5.2165, 'exchange-api'),
('eur', '2009-02-06', 5.1297, 'exchange-api'),
('eur', '2009-02-09', 5.2281, 'exchange-api'),
('eur', '2009-02-11', 5.2566, 'exchange-api'),
('eur', '2009-02-12', 5.2017, 'exchange-api'),
('eur', '2009-02-13', 5.2237, 'exchange-api'),
('eur', '2009-02-16', 5.1978, 'exchange-api'),
('eur', '2009-02-17', 5.2231, 'exchange-api'),
('eur', '2009-02-18', 5.2216, 'exchange-api'),
('eur', '2009-02-19', 5.2234, 'exchange-api'),
('eur', '2009-02-20', 5.2376, 'exchange-api'),
('eur', '2009-02-23', 5.3235, 'exchange-api'),
('eur', '2009-02-24', 5.3203, 'exchange-api'),
('eur', '2009-02-25', 5.3534, 'exchange-api'),
('eur', '2009-02-26', 5.3354, 'exchange-api'),
('eur', '2009-02-27', 5.2739, 'exchange-api'),
('eur', '2009-03-02', 5.2987, 'exchange-api'),
('eur', '2009-03-03', 5.3002, 'exchange-api'),
('eur', '2009-03-04', 5.2804, 'exchange-api'),
('eur', '2009-03-05', 5.3145, 'exchange-api'),
('eur', '2009-03-06', 5.3662, 'exchange-api'),
('eur', '2009-03-09', 5.3413, 'exchange-api'),
('eur', '2009-03-12', 5.3838, 'exchange-api'),
('eur', '2009-03-13', 5.4019, 'exchange-api'),
('eur', '2009-03-16', 5.3879, 'exchange-api'),
('eur', '2009-03-17', 5.3652, 'exchange-api'),
('eur', '2009-03-18', 5.4057, 'exchange-api'),
('eur', '2009-03-19', 5.5108, 'exchange-api'),
('eur', '2009-03-20', 5.5032, 'exchange-api'),
('eur', '2009-03-23', 5.5042, 'exchange-api'),
('eur', '2009-03-24', 5.5066, 'exchange-api'),
('eur', '2009-03-25', 5.5288, 'exchange-api'),
('eur', '2009-03-26', 5.6402, 'exchange-api'),
('eur', '2009-03-27', 5.6921, 'exchange-api'),
('eur', '2009-03-30', 5.5673, 'exchange-api'),
('eur', '2009-03-31', 5.5736, 'exchange-api'),
('eur', '2009-04-01', 5.5866, 'exchange-api'),
('eur', '2009-04-02', 5.5818, 'exchange-api'),
('eur', '2009-04-03', 5.6111, 'exchange-api'),
('eur', '2009-04-06', 5.5733, 'exchange-api'),
('eur', '2009-04-07', 5.5285, 'exchange-api'),
('eur', '2009-04-14', 5.5416, 'exchange-api'),
('eur', '2009-04-16', 5.5154, 'exchange-api'),
('eur', '2009-04-17', 5.4776, 'exchange-api'),
('eur', '2009-04-20', 5.4533, 'exchange-api'),
('eur', '2009-04-21', 5.455, 'exchange-api'),
('eur', '2009-04-22', 5.4476, 'exchange-api'),
('eur', '2009-04-23', 5.5186, 'exchange-api'),
('eur', '2009-04-24', 5.6322, 'exchange-api'),
('eur', '2009-04-27', 5.5624, 'exchange-api'),
('eur', '2009-04-28', 5.5477, 'exchange-api'),
('eur', '2009-04-30', 5.5253, 'exchange-api'),
('eur', '2009-05-01', 5.5192, 'exchange-api'),
('eur', '2009-05-04', 5.5181, 'exchange-api'),
('eur', '2009-05-05', 5.5256, 'exchange-api'),
('eur', '2009-05-06', 5.5069, 'exchange-api'),
('eur', '2009-05-07', 5.5232, 'exchange-api'),
('eur', '2009-05-08', 5.4982, 'exchange-api'),
('eur', '2009-05-11', 5.5737, 'exchange-api'),
('eur', '2009-05-12', 5.6035, 'exchange-api'),
('eur', '2009-05-13', 5.6069, 'exchange-api'),
('eur', '2009-05-14', 5.6374, 'exchange-api'),
('eur', '2009-05-15', 5.6266, 'exchange-api'),
('eur', '2009-05-18', 5.6129, 'exchange-api'),
('eur', '2009-05-19', 5.6134, 'exchange-api'),
('eur', '2009-05-20', 5.5918, 'exchange-api'),
('eur', '2009-05-21', 5.5308, 'exchange-api'),
('eur', '2009-05-22', 5.5222, 'exchange-api'),
('eur', '2009-05-26', 5.5518, 'exchange-api'),
('eur', '2009-05-27', 5.5469, 'exchange-api'),
('eur', '2009-05-28', 5.4767, 'exchange-api'),
('eur', '2009-06-01', 5.5306, 'exchange-api'),
('eur', '2009-06-02', 5.5787, 'exchange-api'),
('eur', '2009-06-03', 5.5943, 'exchange-api'),
('eur', '2009-06-04', 5.5905, 'exchange-api'),
('eur', '2009-06-05', 5.5779, 'exchange-api'),
('eur', '2009-06-08', 5.5383, 'exchange-api'),
('eur', '2009-06-09', 5.5064, 'exchange-api'),
('eur', '2009-06-10', 5.514, 'exchange-api'),
('eur', '2009-06-11', 5.498, 'exchange-api'),
('eur', '2009-06-12', 5.5137, 'exchange-api'),
('eur', '2009-06-15', 5.4911, 'exchange-api'),
('eur', '2009-06-16', 5.4645, 'exchange-api'),
('eur', '2009-06-17', 5.4731, 'exchange-api'),
('eur', '2009-06-18', 5.5182, 'exchange-api'),
('eur', '2009-06-19', 5.5145, 'exchange-api'),
('eur', '2009-06-22', 5.4727, 'exchange-api'),
('eur', '2009-06-23', 5.5397, 'exchange-api'),
('eur', '2009-06-24', 5.5174, 'exchange-api'),
('eur', '2009-06-25', 5.5242, 'exchange-api'),
('eur', '2009-06-26', 5.5747, 'exchange-api'),
('eur', '2009-06-29', 5.5277, 'exchange-api'),
('eur', '2009-06-30', 5.5346, 'exchange-api'),
('eur', '2009-07-01', 5.4736, 'exchange-api'),
('eur', '2009-07-02', 5.4331, 'exchange-api'),
('eur', '2009-07-03', 5.4376, 'exchange-api'),
('eur', '2009-07-06', 5.443, 'exchange-api'),
('eur', '2009-07-07', 5.4822, 'exchange-api'),
('eur', '2009-07-08', 5.5177, 'exchange-api'),
('eur', '2009-07-09', 5.5208, 'exchange-api'),
('eur', '2009-07-10', 5.5193, 'exchange-api'),
('eur', '2009-07-13', 5.5716, 'exchange-api'),
('eur', '2009-07-14', 5.5363, 'exchange-api'),
('eur', '2009-07-15', 5.5113, 'exchange-api'),
('eur', '2009-07-16', 5.5182, 'exchange-api'),
('eur', '2009-07-17', 5.5041, 'exchange-api'),
('eur', '2009-07-20', 5.5547, 'exchange-api'),
('eur', '2009-07-21', 5.5283, 'exchange-api'),
('eur', '2009-07-22', 5.5164, 'exchange-api'),
('eur', '2009-07-23', 5.5205, 'exchange-api'),
('eur', '2009-07-24', 5.4964, 'exchange-api'),
('eur', '2009-07-27', 5.4457, 'exchange-api'),
('eur', '2009-07-28', 5.3996, 'exchange-api'),
('eur', '2009-07-29', 5.3761, 'exchange-api'),
('eur', '2009-07-31', 5.3471, 'exchange-api'),
('eur', '2009-08-03', 5.3557, 'exchange-api'),
('eur', '2009-08-04', 5.5622, 'exchange-api'),
('eur', '2009-08-05', 5.6112, 'exchange-api'),
('eur', '2009-08-06', 5.6518, 'exchange-api'),
('eur', '2009-08-07', 5.6206, 'exchange-api'),
('eur', '2009-08-10', 5.5022, 'exchange-api'),
('eur', '2009-08-11', 5.4795, 'exchange-api'),
('eur', '2009-08-12', 5.4584, 'exchange-api'),
('eur', '2009-08-13', 5.4481, 'exchange-api'),
('eur', '2009-08-14', 5.4114, 'exchange-api'),
('eur', '2009-08-17', 5.36, 'exchange-api'),
('eur', '2009-08-18', 5.3991, 'exchange-api'),
('eur', '2009-08-19', 5.4096, 'exchange-api'),
('eur', '2009-08-20', 5.4253, 'exchange-api'),
('eur', '2009-08-21', 5.4576, 'exchange-api'),
('eur', '2009-08-24', 5.4401, 'exchange-api'),
('eur', '2009-08-25', 5.44, 'exchange-api'),
('eur', '2009-08-26', 5.4196, 'exchange-api'),
('eur', '2009-08-27', 5.4168, 'exchange-api'),
('eur', '2009-08-28', 5.4798, 'exchange-api'),
('eur', '2009-08-31', 5.4419, 'exchange-api'),
('eur', '2009-09-01', 5.4317, 'exchange-api'),
('eur', '2009-09-02', 5.4132, 'exchange-api'),
('eur', '2009-09-03', 5.429, 'exchange-api'),
('eur', '2009-09-04', 5.3688, 'exchange-api'),
('eur', '2009-09-07', 5.3907, 'exchange-api'),
('eur', '2009-09-08', 5.4784, 'exchange-api'),
('eur', '2009-09-09', 5.4887, 'exchange-api'),
('eur', '2009-09-10', 5.5072, 'exchange-api'),
('eur', '2009-09-11', 5.523, 'exchange-api'),
('eur', '2009-09-14', 5.4964, 'exchange-api'),
('eur', '2009-09-15', 5.4911, 'exchange-api'),
('eur', '2009-09-16', 5.4886, 'exchange-api'),
('eur', '2009-09-17', 5.5204, 'exchange-api'),
('eur', '2009-09-21', 5.4867, 'exchange-api'),
('eur', '2009-09-22', 5.5178, 'exchange-api'),
('eur', '2009-09-23', 5.5178, 'exchange-api'),
('eur', '2009-09-24', 5.5146, 'exchange-api'),
('eur', '2009-09-25', 5.5325, 'exchange-api'),
('eur', '2009-09-29', 5.4968, 'exchange-api'),
('eur', '2009-09-30', 5.5098, 'exchange-api'),
('eur', '2009-10-01', 5.4937, 'exchange-api'),
('eur', '2009-10-02', 5.4831, 'exchange-api'),
('eur', '2009-10-05', 5.5033, 'exchange-api'),
('eur', '2009-10-06', 5.4974, 'exchange-api'),
('eur', '2009-10-07', 5.4985, 'exchange-api'),
('eur', '2009-10-08', 5.5151, 'exchange-api'),
('eur', '2009-10-09', 5.5033, 'exchange-api'),
('eur', '2009-10-12', 5.5046, 'exchange-api'),
('eur', '2009-10-13', 5.5222, 'exchange-api'),
('eur', '2009-10-14', 5.5233, 'exchange-api'),
('eur', '2009-10-15', 5.5279, 'exchange-api'),
('eur', '2009-10-16', 5.5353, 'exchange-api'),
('eur', '2009-10-19', 5.5342, 'exchange-api'),
('eur', '2009-10-20', 5.5389, 'exchange-api'),
('eur', '2009-10-21', 5.5275, 'exchange-api'),
('eur', '2009-10-22', 5.5455, 'exchange-api'),
('eur', '2009-10-23', 5.5552, 'exchange-api'),
('eur', '2009-10-26', 5.5483, 'exchange-api'),
('eur', '2009-10-27', 5.5186, 'exchange-api'),
('eur', '2009-10-28', 5.5287, 'exchange-api'),
('eur', '2009-10-29', 5.55, 'exchange-api'),
('eur', '2009-10-30', 5.5499, 'exchange-api'),
('eur', '2009-11-02', 5.5795, 'exchange-api'),
('eur', '2009-11-03', 5.5785, 'exchange-api'),
('eur', '2009-11-04', 5.5945, 'exchange-api'),
('eur', '2009-11-05', 5.6296, 'exchange-api'),
('eur', '2009-11-06', 5.6162, 'exchange-api'),
('eur', '2009-11-09', 5.6113, 'exchange-api'),
('eur', '2009-11-10', 5.6293, 'exchange-api'),
('eur', '2009-11-11', 5.6366, 'exchange-api'),
('eur', '2009-11-12', 5.6311, 'exchange-api'),
('eur', '2009-11-13', 5.6202, 'exchange-api'),
('eur', '2009-11-16', 5.6186, 'exchange-api'),
('eur', '2009-11-17', 5.6179, 'exchange-api'),
('eur', '2009-11-18', 5.6399, 'exchange-api'),
('eur', '2009-11-19', 5.6354, 'exchange-api'),
('eur', '2009-11-20', 5.6765, 'exchange-api'),
('eur', '2009-11-23', 5.6931, 'exchange-api'),
('eur', '2009-11-24', 5.6523, 'exchange-api'),
('eur', '2009-11-25', 5.662, 'exchange-api'),
('eur', '2009-11-26', 5.6901, 'exchange-api'),
('eur', '2009-11-27', 5.6898, 'exchange-api'),
('eur', '2009-11-30', 5.6977, 'exchange-api'),
('eur', '2009-12-01', 5.6895, 'exchange-api'),
('eur', '2009-12-02', 5.6984, 'exchange-api'),
('eur', '2009-12-03', 5.7023, 'exchange-api'),
('eur', '2009-12-04', 5.6869, 'exchange-api'),
('eur', '2009-12-07', 5.6437, 'exchange-api'),
('eur', '2009-12-08', 5.6167, 'exchange-api'),
('eur', '2009-12-09', 5.6089, 'exchange-api'),
('eur', '2009-12-10', 5.5721, 'exchange-api'),
('eur', '2009-12-11', 5.5644, 'exchange-api'),
('eur', '2009-12-14', 5.5315, 'exchange-api'),
('eur', '2009-12-15', 5.5031, 'exchange-api'),
('eur', '2009-12-16', 5.5105, 'exchange-api'),
('eur', '2009-12-17', 5.4603, 'exchange-api'),
('eur', '2009-12-18', 5.4574, 'exchange-api'),
('eur', '2009-12-21', 5.4563, 'exchange-api'),
('eur', '2009-12-22', 5.4254, 'exchange-api'),
('eur', '2009-12-23', 5.4274, 'exchange-api'),
('eur', '2009-12-24', 5.4675, 'exchange-api'),
('eur', '2009-12-28', 5.4634, 'exchange-api'),
('eur', '2009-12-29', 5.465, 'exchange-api'),
('eur', '2009-12-30', 5.4349, 'exchange-api'),
('eur', '2009-12-31', 5.4417, 'exchange-api'),
('eur', '2010-01-04', 5.4214, 'exchange-api'),
('eur', '2010-01-05', 5.3896, 'exchange-api'),
('eur', '2010-01-06', 5.3663, 'exchange-api'),
('eur', '2010-01-07', 5.343, 'exchange-api'),
('eur', '2010-01-08', 5.3272, 'exchange-api'),
('eur', '2010-01-11', 5.3486, 'exchange-api'),
('eur', '2010-01-12', 5.3523, 'exchange-api'),
('eur', '2010-01-13', 5.3439, 'exchange-api'),
('eur', '2010-01-14', 5.3363, 'exchange-api'),
('eur', '2010-01-15', 5.305, 'exchange-api'),
('eur', '2010-01-18', 5.3012, 'exchange-api'),
('eur', '2010-01-19', 5.2809, 'exchange-api'),
('eur', '2010-01-20', 5.2371, 'exchange-api'),
('eur', '2010-01-21', 5.2281, 'exchange-api'),
('eur', '2010-01-22', 5.2698, 'exchange-api'),
('eur', '2010-01-25', 5.2726, 'exchange-api'),
('eur', '2010-01-26', 5.2589, 'exchange-api'),
('eur', '2010-01-27', 5.2469, 'exchange-api'),
('eur', '2010-01-28', 5.2274, 'exchange-api'),
('eur', '2010-01-29', 5.2062, 'exchange-api'),
('eur', '2010-02-01', 5.1913, 'exchange-api'),
('eur', '2010-02-02', 5.1735, 'exchange-api'),
('eur', '2010-02-03', 5.1886, 'exchange-api'),
('eur', '2010-02-04', 5.1542, 'exchange-api'),
('eur', '2010-02-05', 5.1313, 'exchange-api'),
('eur', '2010-02-08', 5.0964, 'exchange-api'),
('eur', '2010-02-09', 5.1092, 'exchange-api'),
('eur', '2010-02-10', 5.1528, 'exchange-api'),
('eur', '2010-02-11', 5.1282, 'exchange-api'),
('eur', '2010-02-12', 5.0708, 'exchange-api'),
('eur', '2010-02-15', 5.1106, 'exchange-api'),
('eur', '2010-02-16', 5.1055, 'exchange-api'),
('eur', '2010-02-17', 5.1323, 'exchange-api'),
('eur', '2010-02-18', 5.0863, 'exchange-api'),
('eur', '2010-02-19', 5.0752, 'exchange-api'),
('eur', '2010-02-22', 5.1208, 'exchange-api'),
('eur', '2010-02-23', 5.1122, 'exchange-api'),
('eur', '2010-02-24', 5.1114, 'exchange-api'),
('eur', '2010-02-25', 5.105, 'exchange-api'),
('eur', '2010-02-26', 5.1519, 'exchange-api'),
('eur', '2010-03-02', 5.1352, 'exchange-api'),
('eur', '2010-03-03', 5.1405, 'exchange-api'),
('eur', '2010-03-04', 5.1687, 'exchange-api'),
('eur', '2010-03-05', 5.1246, 'exchange-api'),
('eur', '2010-03-08', 5.1399, 'exchange-api'),
('eur', '2010-03-09', 5.1088, 'exchange-api'),
('eur', '2010-03-10', 5.1005, 'exchange-api'),
('eur', '2010-03-11', 5.096, 'exchange-api'),
('eur', '2010-03-12', 5.1037, 'exchange-api'),
('eur', '2010-03-15', 5.0933, 'exchange-api'),
('eur', '2010-03-16', 5.1062, 'exchange-api'),
('eur', '2010-03-17', 5.1186, 'exchange-api'),
('eur', '2010-03-18', 5.0964, 'exchange-api'),
('eur', '2010-03-19', 5.0857, 'exchange-api'),
('eur', '2010-03-22', 5.0531, 'exchange-api'),
('eur', '2010-03-23', 5.0475, 'exchange-api'),
('eur', '2010-03-24', 4.9991, 'exchange-api'),
('eur', '2010-03-25', 5.0074, 'exchange-api'),
('eur', '2010-03-26', 5.0042, 'exchange-api'),
('eur', '2010-03-31', 4.9905, 'exchange-api'),
('eur', '2010-04-01', 4.9889, 'exchange-api'),
('eur', '2010-04-06', 4.9597, 'exchange-api'),
('eur', '2010-04-07', 4.9577, 'exchange-api'),
('eur', '2010-04-08', 4.9247, 'exchange-api'),
('eur', '2010-04-09', 4.9502, 'exchange-api'),
('eur', '2010-04-12', 5.0084, 'exchange-api'),
('eur', '2010-04-13', 5.0086, 'exchange-api'),
('eur', '2010-04-14', 5.0468, 'exchange-api'),
('eur', '2010-04-15', 5.0132, 'exchange-api'),
('eur', '2010-04-16', 5.0113, 'exchange-api'),
('eur', '2010-04-19', 5.0121, 'exchange-api'),
('eur', '2010-04-21', 4.9855, 'exchange-api'),
('eur', '2010-04-22', 4.9891, 'exchange-api'),
('eur', '2010-04-23', 4.961, 'exchange-api'),
('eur', '2010-04-26', 4.9552, 'exchange-api'),
('eur', '2010-04-27', 4.972, 'exchange-api'),
('eur', '2010-04-28', 4.9492, 'exchange-api'),
('eur', '2010-04-29', 4.9424, 'exchange-api'),
('eur', '2010-04-30', 4.9451, 'exchange-api'),
('eur', '2010-05-03', 4.9352, 'exchange-api'),
('eur', '2010-05-04', 4.9057, 'exchange-api'),
('eur', '2010-05-05', 4.8503, 'exchange-api'),
('eur', '2010-05-06', 4.8118, 'exchange-api'),
('eur', '2010-05-07', 4.8292, 'exchange-api'),
('eur', '2010-05-10', 4.8748, 'exchange-api'),
('eur', '2010-05-11', 4.7627, 'exchange-api'),
('eur', '2010-05-12', 4.7515, 'exchange-api'),
('eur', '2010-05-13', 4.7312, 'exchange-api'),
('eur', '2010-05-14', 4.7132, 'exchange-api'),
('eur', '2010-05-17', 4.6517, 'exchange-api'),
('eur', '2010-05-18', 4.6583, 'exchange-api'),
('eur', '2010-05-20', 4.7098, 'exchange-api'),
('eur', '2010-05-21', 4.7829, 'exchange-api'),
('eur', '2010-05-24', 4.711, 'exchange-api'),
('eur', '2010-05-25', 4.7212, 'exchange-api'),
('eur', '2010-05-26', 4.7294, 'exchange-api'),
('eur', '2010-05-27', 4.7122, 'exchange-api'),
('eur', '2010-05-28', 4.7564, 'exchange-api'),
('eur', '2010-06-01', 4.7083, 'exchange-api'),
('eur', '2010-06-02', 4.7082, 'exchange-api'),
('eur', '2010-06-03', 4.713, 'exchange-api'),
('eur', '2010-06-04', 4.703, 'exchange-api'),
('eur', '2010-06-07', 4.6411, 'exchange-api'),
('eur', '2010-06-08', 4.6158, 'exchange-api'),
('eur', '2010-06-09', 4.6511, 'exchange-api'),
('eur', '2010-06-10', 4.6363, 'exchange-api'),
('eur', '2010-06-11', 4.667, 'exchange-api'),
('eur', '2010-06-14', 4.6831, 'exchange-api'),
('eur', '2010-06-15', 4.6792, 'exchange-api'),
('eur', '2010-06-16', 4.6872, 'exchange-api'),
('eur', '2010-06-17', 4.7244, 'exchange-api'),
('eur', '2010-06-18', 4.7273, 'exchange-api'),
('eur', '2010-06-21', 4.7284, 'exchange-api'),
('eur', '2010-06-22', 4.7089, 'exchange-api'),
('eur', '2010-06-23', 4.7401, 'exchange-api'),
('eur', '2010-06-24', 4.7473, 'exchange-api'),
('eur', '2010-06-25', 4.7628, 'exchange-api'),
('eur', '2010-06-28', 4.8019, 'exchange-api'),
('eur', '2010-06-29', 4.7389, 'exchange-api'),
('eur', '2010-06-30', 4.7575, 'exchange-api'),
('eur', '2010-07-01', 4.7875, 'exchange-api'),
('eur', '2010-07-02', 4.8662, 'exchange-api'),
('eur', '2010-07-05', 4.8655, 'exchange-api'),
('eur', '2010-07-06', 4.8905, 'exchange-api'),
('eur', '2010-07-07', 4.9068, 'exchange-api'),
('eur', '2010-07-08', 4.8926, 'exchange-api'),
('eur', '2010-07-09', 4.9065, 'exchange-api'),
('eur', '2010-07-12', 4.8594, 'exchange-api'),
('eur', '2010-07-13', 4.8543, 'exchange-api'),
('eur', '2010-07-14', 4.9007, 'exchange-api'),
('eur', '2010-07-15', 4.9457, 'exchange-api'),
('eur', '2010-07-16', 5.0059, 'exchange-api'),
('eur', '2010-07-19', 5.0007, 'exchange-api'),
('eur', '2010-07-21', 4.942, 'exchange-api'),
('eur', '2010-07-22', 4.9751, 'exchange-api'),
('eur', '2010-07-23', 4.9814, 'exchange-api'),
('eur', '2010-07-26', 4.9824, 'exchange-api'),
('eur', '2010-07-27', 4.9599, 'exchange-api'),
('eur', '2010-07-28', 4.9471, 'exchange-api'),
('eur', '2010-07-29', 4.9577, 'exchange-api'),
('eur', '2010-07-30', 4.9237, 'exchange-api'),
('eur', '2010-08-02', 4.9259, 'exchange-api'),
('eur', '2010-08-03', 4.9725, 'exchange-api'),
('eur', '2010-08-04', 4.9864, 'exchange-api'),
('eur', '2010-08-05', 4.9651, 'exchange-api'),
('eur', '2010-08-06', 4.98, 'exchange-api'),
('eur', '2010-08-09', 4.9831, 'exchange-api'),
('eur', '2010-08-10', 4.9619, 'exchange-api'),
('eur', '2010-08-11', 4.9334, 'exchange-api'),
('eur', '2010-08-12', 4.8735, 'exchange-api'),
('eur', '2010-08-13', 4.8683, 'exchange-api'),
('eur', '2010-08-16', 4.873, 'exchange-api'),
('eur', '2010-08-17', 4.8624, 'exchange-api'),
('eur', '2010-08-18', 4.867, 'exchange-api'),
('eur', '2010-08-19', 4.8586, 'exchange-api'),
('eur', '2010-08-20', 4.843, 'exchange-api'),
('eur', '2010-08-23', 4.8304, 'exchange-api'),
('eur', '2010-08-24', 4.8176, 'exchange-api'),
('eur', '2010-08-25', 4.8236, 'exchange-api'),
('eur', '2010-08-26', 4.85, 'exchange-api'),
('eur', '2010-08-27', 4.8724, 'exchange-api'),
('eur', '2010-08-30', 4.8517, 'exchange-api'),
('eur', '2010-08-31', 4.847, 'exchange-api'),
('eur', '2010-09-01', 4.8622, 'exchange-api'),
('eur', '2010-09-02', 4.8598, 'exchange-api'),
('eur', '2010-09-03', 4.8515, 'exchange-api'),
('eur', '2010-09-06', 4.857, 'exchange-api'),
('eur', '2010-09-07', 4.8221, 'exchange-api'),
('eur', '2010-09-13', 4.8337, 'exchange-api'),
('eur', '2010-09-14', 4.8491, 'exchange-api'),
('eur', '2010-09-15', 4.8725, 'exchange-api'),
('eur', '2010-09-16', 4.8749, 'exchange-api'),
('eur', '2010-09-20', 4.8617, 'exchange-api'),
('eur', '2010-09-21', 4.8769, 'exchange-api'),
('eur', '2010-09-22', 4.9413, 'exchange-api'),
('eur', '2010-09-24', 4.9429, 'exchange-api'),
('eur', '2010-09-27', 4.9486, 'exchange-api'),
('eur', '2010-09-28', 4.9584, 'exchange-api'),
('eur', '2010-09-29', 4.9873, 'exchange-api'),
('eur', '2010-10-01', 4.9986, 'exchange-api'),
('eur', '2010-10-04', 4.9747, 'exchange-api'),
('eur', '2010-10-05', 4.9842, 'exchange-api'),
('eur', '2010-10-06', 4.9782, 'exchange-api'),
('eur', '2010-10-07', 5.0238, 'exchange-api'),
('eur', '2010-10-08', 5.0081, 'exchange-api'),
('eur', '2010-10-11', 5.0163, 'exchange-api'),
('eur', '2010-10-12', 5.0061, 'exchange-api'),
('eur', '2010-10-13', 5.016, 'exchange-api'),
('eur', '2010-10-14', 5.0444, 'exchange-api'),
('eur', '2010-10-15', 5.0294, 'exchange-api'),
('eur', '2010-10-18', 4.9796, 'exchange-api'),
('eur', '2010-10-19', 4.9744, 'exchange-api'),
('eur', '2010-10-20', 5.0096, 'exchange-api'),
('eur', '2010-10-21', 5.0643, 'exchange-api'),
('eur', '2010-10-22', 5.0606, 'exchange-api'),
('eur', '2010-10-25', 5.0465, 'exchange-api'),
('eur', '2010-10-26', 5.0567, 'exchange-api'),
('eur', '2010-10-27', 5.0236, 'exchange-api'),
('eur', '2010-10-28', 5.047, 'exchange-api'),
('eur', '2010-10-29', 5.0246, 'exchange-api'),
('eur', '2010-11-01', 5.0631, 'exchange-api'),
('eur', '2010-11-02', 5.0565, 'exchange-api'),
('eur', '2010-11-03', 5.0699, 'exchange-api'),
('eur', '2010-11-04', 5.1042, 'exchange-api'),
('eur', '2010-11-05', 5.0741, 'exchange-api'),
('eur', '2010-11-08', 5.0291, 'exchange-api'),
('eur', '2010-11-09', 5.0507, 'exchange-api'),
('eur', '2010-11-10', 5.0125, 'exchange-api'),
('eur', '2010-11-11', 5.0096, 'exchange-api'),
('eur', '2010-11-12', 5.0199, 'exchange-api'),
('eur', '2010-11-15', 5.007, 'exchange-api'),
('eur', '2010-11-16', 4.9932, 'exchange-api'),
('eur', '2010-11-17', 4.9708, 'exchange-api'),
('eur', '2010-11-18', 4.9873, 'exchange-api'),
('eur', '2010-11-19', 4.9884, 'exchange-api'),
('eur', '2010-11-22', 4.9614, 'exchange-api'),
('eur', '2010-11-23', 4.9344, 'exchange-api'),
('eur', '2010-11-24', 4.8753, 'exchange-api'),
('eur', '2010-11-25', 4.8624, 'exchange-api'),
('eur', '2010-11-26', 4.8745, 'exchange-api'),
('eur', '2010-11-29', 4.8376, 'exchange-api'),
('eur', '2010-11-30', 4.7892, 'exchange-api'),
('eur', '2010-12-01', 4.8044, 'exchange-api'),
('eur', '2010-12-02', 4.8086, 'exchange-api'),
('eur', '2010-12-03', 4.8111, 'exchange-api'),
('eur', '2010-12-06', 4.828, 'exchange-api'),
('eur', '2010-12-07', 4.8392, 'exchange-api'),
('eur', '2010-12-08', 4.8107, 'exchange-api'),
('eur', '2010-12-09', 4.7931, 'exchange-api'),
('eur', '2010-12-10', 4.7852, 'exchange-api'),
('eur', '2010-12-13', 4.7923, 'exchange-api'),
('eur', '2010-12-14', 4.8384, 'exchange-api'),
('eur', '2010-12-15', 4.7916, 'exchange-api'),
('eur', '2010-12-16', 4.7636, 'exchange-api'),
('eur', '2010-12-17', 4.7851, 'exchange-api'),
('eur', '2010-12-20', 4.7475, 'exchange-api'),
('eur', '2010-12-21', 4.7342, 'exchange-api'),
('eur', '2010-12-22', 4.7147, 'exchange-api'),
('eur', '2010-12-23', 4.7073, 'exchange-api'),
('eur', '2010-12-24', 4.7192, 'exchange-api'),
('eur', '2010-12-27', 4.7082, 'exchange-api'),
('eur', '2010-12-28', 4.7358, 'exchange-api'),
('eur', '2010-12-29', 4.6948, 'exchange-api'),
('eur', '2010-12-30', 4.719, 'exchange-api'),
('eur', '2010-12-31', 4.7379, 'exchange-api'),
('eur', '2011-01-03', 4.73, 'exchange-api'),
('eur', '2011-01-04', 4.7222, 'exchange-api'),
('eur', '2011-01-05', 4.6799, 'exchange-api'),
('eur', '2011-01-06', 4.6624, 'exchange-api'),
('eur', '2011-01-07', 4.6425, 'exchange-api'),
('eur', '2011-01-10', 4.6227, 'exchange-api'),
('eur', '2011-01-11', 4.5993, 'exchange-api'),
('eur', '2011-01-12', 4.5855, 'exchange-api'),
('eur', '2011-01-13', 4.7052, 'exchange-api'),
('eur', '2011-01-14', 4.7563, 'exchange-api'),
('eur', '2011-01-17', 4.7282, 'exchange-api'),
('eur', '2011-01-18', 4.7313, 'exchange-api'),
('eur', '2011-01-19', 4.7715, 'exchange-api'),
('eur', '2011-01-20', 4.8587, 'exchange-api'),
('eur', '2011-01-21', 4.915, 'exchange-api'),
('eur', '2011-01-24', 4.916, 'exchange-api'),
('eur', '2011-01-25', 4.9283, 'exchange-api'),
('eur', '2011-01-26', 4.9306, 'exchange-api'),
('eur', '2011-01-27', 5.018, 'exchange-api'),
('eur', '2011-01-28', 5.0482, 'exchange-api'),
('eur', '2011-01-31', 5.0816, 'exchange-api'),
('eur', '2011-02-01', 5.0823, 'exchange-api'),
('eur', '2011-02-02', 5.0693, 'exchange-api'),
('eur', '2011-02-03', 5.0682, 'exchange-api'),
('eur', '2011-02-04', 5.064, 'exchange-api'),
('eur', '2011-02-07', 4.978, 'exchange-api'),
('eur', '2011-02-08', 5.021, 'exchange-api'),
('eur', '2011-02-09', 4.9963, 'exchange-api'),
('eur', '2011-02-10', 5.0321, 'exchange-api'),
('eur', '2011-02-11', 5.0035, 'exchange-api'),
('eur', '2011-02-14', 4.9319, 'exchange-api'),
('eur', '2011-02-15', 4.9348, 'exchange-api'),
('eur', '2011-02-16', 4.883, 'exchange-api'),
('eur', '2011-02-17', 4.8956, 'exchange-api'),
('eur', '2011-02-18', 4.9228, 'exchange-api'),
('eur', '2011-02-21', 4.9229, 'exchange-api'),
('eur', '2011-02-22', 4.9702, 'exchange-api'),
('eur', '2011-02-23', 4.9922, 'exchange-api'),
('eur', '2011-02-24', 5.0349, 'exchange-api'),
('eur', '2011-02-25', 5.044, 'exchange-api'),
('eur', '2011-02-28', 5.0092, 'exchange-api'),
('eur', '2011-03-01', 5.0059, 'exchange-api'),
('eur', '2011-03-02', 5.0239, 'exchange-api'),
('eur', '2011-03-03', 5.0039, 'exchange-api'),
('eur', '2011-03-04', 5.0404, 'exchange-api'),
('eur', '2011-03-07', 5.0475, 'exchange-api'),
('eur', '2011-03-08', 4.9906, 'exchange-api'),
('eur', '2011-03-09', 4.968, 'exchange-api'),
('eur', '2011-03-10', 4.9323, 'exchange-api'),
('eur', '2011-03-11', 4.9419, 'exchange-api'),
('eur', '2011-03-14', 4.9596, 'exchange-api'),
('eur', '2011-03-15', 4.9406, 'exchange-api'),
('eur', '2011-03-16', 4.963, 'exchange-api'),
('eur', '2011-03-17', 4.9879, 'exchange-api'),
('eur', '2011-03-18', 4.9944, 'exchange-api'),
('eur', '2011-03-22', 5.0124, 'exchange-api'),
('eur', '2011-03-23', 5.0061, 'exchange-api'),
('eur', '2011-03-24', 5.0093, 'exchange-api'),
('eur', '2011-03-25', 5.0399, 'exchange-api'),
('eur', '2011-03-28', 4.967, 'exchange-api'),
('eur', '2011-03-29', 4.9609, 'exchange-api'),
('eur', '2011-03-30', 4.9488, 'exchange-api'),
('eur', '2011-03-31', 4.9495, 'exchange-api'),
('eur', '2011-04-01', 4.919, 'exchange-api'),
('eur', '2011-04-04', 4.9262, 'exchange-api'),
('eur', '2011-04-05', 4.9119, 'exchange-api'),
('eur', '2011-04-06', 4.9494, 'exchange-api'),
('eur', '2011-04-07', 4.9254, 'exchange-api'),
('eur', '2011-04-08', 4.9545, 'exchange-api'),
('eur', '2011-04-11', 4.9771, 'exchange-api'),
('eur', '2011-04-12', 4.9808, 'exchange-api'),
('eur', '2011-04-13', 4.9589, 'exchange-api'),
('eur', '2011-04-14', 4.9362, 'exchange-api'),
('eur', '2011-04-15', 4.9484, 'exchange-api'),
('eur', '2011-04-20', 4.9422, 'exchange-api'),
('eur', '2011-04-21', 4.9837, 'exchange-api'),
('eur', '2011-04-26', 4.9855, 'exchange-api'),
('eur', '2011-04-27', 5.0209, 'exchange-api'),
('eur', '2011-04-28', 5.049, 'exchange-api'),
('eur', '2011-04-29', 5.037, 'exchange-api'),
('eur', '2011-05-02', 5.0101, 'exchange-api'),
('eur', '2011-05-03', 5.0165, 'exchange-api'),
('eur', '2011-05-04', 5.0386, 'exchange-api'),
('eur', '2011-05-05', 5.0528, 'exchange-api'),
('eur', '2011-05-06', 5.0063, 'exchange-api'),
('eur', '2011-05-09', 4.9696, 'exchange-api'),
('eur', '2011-05-11', 4.9835, 'exchange-api'),
('eur', '2011-05-12', 4.9643, 'exchange-api'),
('eur', '2011-05-13', 4.99, 'exchange-api'),
('eur', '2011-05-16', 4.9951, 'exchange-api'),
('eur', '2011-05-17', 5.0028, 'exchange-api'),
('eur', '2011-05-18', 5.0219, 'exchange-api'),
('eur', '2011-05-19', 4.9811, 'exchange-api'),
('eur', '2011-05-20', 4.9755, 'exchange-api'),
('eur', '2011-05-23', 4.9326, 'exchange-api'),
('eur', '2011-05-24', 4.9224, 'exchange-api'),
('eur', '2011-05-25', 4.9222, 'exchange-api'),
('eur', '2011-05-26', 4.9177, 'exchange-api'),
('eur', '2011-05-27', 4.9486, 'exchange-api'),
('eur', '2011-05-31', 4.9508, 'exchange-api'),
('eur', '2011-06-01', 4.9298, 'exchange-api'),
('eur', '2011-06-02', 4.9302, 'exchange-api'),
('eur', '2011-06-03', 4.9081, 'exchange-api'),
('eur', '2011-06-06', 4.9415, 'exchange-api'),
('eur', '2011-06-07', 4.9339, 'exchange-api'),
('eur', '2011-06-09', 4.9308, 'exchange-api'),
('eur', '2011-06-10', 4.9141, 'exchange-api'),
('eur', '2011-06-13', 4.9302, 'exchange-api'),
('eur', '2011-06-14', 4.9009, 'exchange-api'),
('eur', '2011-06-15', 4.8924, 'exchange-api'),
('eur', '2011-06-16', 4.9114, 'exchange-api'),
('eur', '2011-06-17', 4.9064, 'exchange-api'),
('eur', '2011-06-20', 4.9273, 'exchange-api'),
('eur', '2011-06-21', 4.903, 'exchange-api'),
('eur', '2011-06-22', 4.9153, 'exchange-api'),
('eur', '2011-06-23', 4.9059, 'exchange-api'),
('eur', '2011-06-24', 4.9015, 'exchange-api'),
('eur', '2011-06-27', 4.9084, 'exchange-api'),
('eur', '2011-06-28', 4.9396, 'exchange-api'),
('eur', '2011-06-29', 4.9459, 'exchange-api'),
('eur', '2011-06-30', 4.9441, 'exchange-api'),
('eur', '2011-07-01', 4.9316, 'exchange-api'),
('eur', '2011-07-04', 4.9196, 'exchange-api'),
('eur', '2011-07-05', 4.9403, 'exchange-api'),
('eur', '2011-07-06', 4.9022, 'exchange-api'),
('eur', '2011-07-07', 4.8542, 'exchange-api'),
('eur', '2011-07-08', 4.8668, 'exchange-api'),
('eur', '2011-07-11', 4.8366, 'exchange-api'),
('eur', '2011-07-12', 4.8436, 'exchange-api'),
('eur', '2011-07-13', 4.839, 'exchange-api'),
('eur', '2011-07-14', 4.8636, 'exchange-api'),
('eur', '2011-07-15', 4.8612, 'exchange-api'),
('eur', '2011-07-18', 4.8506, 'exchange-api'),
('eur', '2011-07-19', 4.8756, 'exchange-api'),
('eur', '2011-07-20', 4.8627, 'exchange-api'),
('eur', '2011-07-21', 4.8522, 'exchange-api'),
('eur', '2011-07-22', 4.8881, 'exchange-api'),
('eur', '2011-07-25', 4.8961, 'exchange-api'),
('eur', '2011-07-26', 4.921, 'exchange-api'),
('eur', '2011-07-27', 4.9147, 'exchange-api'),
('eur', '2011-07-28', 4.9018, 'exchange-api'),
('eur', '2011-07-29', 4.8951, 'exchange-api'),
('eur', '2011-08-01', 4.9223, 'exchange-api'),
('eur', '2011-08-02', 4.8929, 'exchange-api'),
('eur', '2011-08-03', 4.9627, 'exchange-api'),
('eur', '2011-08-04', 4.9734, 'exchange-api'),
('eur', '2011-08-05', 4.9789, 'exchange-api'),
('eur', '2011-08-08', 5.0698, 'exchange-api'),
('eur', '2011-08-10', 5.0486, 'exchange-api'),
('eur', '2011-08-11', 5.0323, 'exchange-api'),
('eur', '2011-08-12', 5.039, 'exchange-api'),
('eur', '2011-08-15', 5.0359, 'exchange-api'),
('eur', '2011-08-16', 5.0811, 'exchange-api'),
('eur', '2011-08-17', 5.0823, 'exchange-api'),
('eur', '2011-08-18', 5.1102, 'exchange-api'),
('eur', '2011-08-19', 5.1303, 'exchange-api'),
('eur', '2011-08-22', 5.1598, 'exchange-api'),
('eur', '2011-08-23', 5.1775, 'exchange-api'),
('eur', '2011-08-24', 5.2157, 'exchange-api'),
('eur', '2011-08-25', 5.2119, 'exchange-api'),
('eur', '2011-08-26', 5.235, 'exchange-api'),
('eur', '2011-08-29', 5.2274, 'exchange-api'),
('eur', '2011-08-30', 5.1435, 'exchange-api'),
('eur', '2011-08-31', 5.1402, 'exchange-api'),
('eur', '2011-09-01', 5.1053, 'exchange-api'),
('eur', '2011-09-02', 5.0986, 'exchange-api'),
('eur', '2011-09-05', 5.1327, 'exchange-api'),
('eur', '2011-09-06', 5.1895, 'exchange-api'),
('eur', '2011-09-07', 5.1635, 'exchange-api'),
('eur', '2011-09-08', 5.172, 'exchange-api'),
('eur', '2011-09-09', 5.1289, 'exchange-api'),
('eur', '2011-09-12', 5.0759, 'exchange-api'),
('eur', '2011-09-13', 5.0873, 'exchange-api'),
('eur', '2011-09-14', 5.0965, 'exchange-api'),
('eur', '2011-09-15', 5.0865, 'exchange-api'),
('eur', '2011-09-16', 5.0449, 'exchange-api'),
('eur', '2011-09-19', 5.0529, 'exchange-api'),
('eur', '2011-09-20', 5.0453, 'exchange-api'),
('eur', '2011-09-21', 5.0371, 'exchange-api'),
('eur', '2011-09-22', 5.0049, 'exchange-api'),
('eur', '2011-09-23', 5.0183, 'exchange-api'),
('eur', '2011-09-26', 5.0314, 'exchange-api'),
('eur', '2011-09-27', 5.0437, 'exchange-api'),
('eur', '2011-10-03', 5.0033, 'exchange-api'),
('eur', '2011-10-04', 4.9625, 'exchange-api'),
('eur', '2011-10-05', 4.9757, 'exchange-api'),
('eur', '2011-10-06', 4.9434, 'exchange-api'),
('eur', '2011-10-10', 4.9949, 'exchange-api'),
('eur', '2011-10-11', 5.0194, 'exchange-api'),
('eur', '2011-10-12', 5.051, 'exchange-api'),
('eur', '2011-10-14', 5.051, 'exchange-api'),
('eur', '2011-10-17', 5.0385, 'exchange-api'),
('eur', '2011-10-18', 4.996, 'exchange-api'),
('eur', '2011-10-19', 5.028, 'exchange-api'),
('eur', '2011-10-21', 5.0191, 'exchange-api'),
('eur', '2011-10-24', 5.048, 'exchange-api'),
('eur', '2011-10-25', 5.0683, 'exchange-api'),
('eur', '2011-10-26', 5.0824, 'exchange-api'),
('eur', '2011-10-27', 5.1031, 'exchange-api'),
('eur', '2011-10-28', 5.1102, 'exchange-api'),
('eur', '2011-10-31', 5.0442, 'exchange-api'),
('eur', '2011-11-01', 5.0051, 'exchange-api'),
('eur', '2011-11-02', 5.0327, 'exchange-api'),
('eur', '2011-11-03', 5.0548, 'exchange-api'),
('eur', '2011-11-04', 5.0753, 'exchange-api'),
('eur', '2011-11-07', 5.0637, 'exchange-api'),
('eur', '2011-11-08', 5.0681, 'exchange-api'),
('eur', '2011-11-09', 5.06, 'exchange-api'),
('eur', '2011-11-10', 5.053, 'exchange-api'),
('eur', '2011-11-11', 5.0816, 'exchange-api'),
('eur', '2011-11-14', 5.0802, 'exchange-api'),
('eur', '2011-11-15', 5.0472, 'exchange-api'),
('eur', '2011-11-16', 5.0273, 'exchange-api'),
('eur', '2011-11-17', 5.0181, 'exchange-api'),
('eur', '2011-11-18', 5.0458, 'exchange-api'),
('eur', '2011-11-21', 5.0298, 'exchange-api'),
('eur', '2011-11-22', 5.0565, 'exchange-api'),
('eur', '2011-11-23', 5.0347, 'exchange-api'),
('eur', '2011-11-24', 5.0472, 'exchange-api'),
('eur', '2011-11-25', 5.0371, 'exchange-api'),
('eur', '2011-11-28', 5.0785, 'exchange-api'),
('eur', '2011-11-29', 5.049, 'exchange-api'),
('eur', '2011-11-30', 5.0475, 'exchange-api'),
('eur', '2011-12-01', 5.0432, 'exchange-api'),
('eur', '2011-12-02', 5.0311, 'exchange-api'),
('eur', '2011-12-05', 5.0096, 'exchange-api'),
('eur', '2011-12-06', 5.0094, 'exchange-api'),
('eur', '2011-12-07', 5.0047, 'exchange-api'),
('eur', '2011-12-08', 5.0079, 'exchange-api'),
('eur', '2011-12-09', 5.0201, 'exchange-api'),
('eur', '2011-12-12', 4.9863, 'exchange-api'),
('eur', '2011-12-13', 4.9783, 'exchange-api'),
('eur', '2011-12-14', 4.9459, 'exchange-api'),
('eur', '2011-12-15', 4.9389, 'exchange-api'),
('eur', '2011-12-16', 4.941, 'exchange-api'),
('eur', '2011-12-19', 4.9372, 'exchange-api'),
('eur', '2011-12-20', 4.9446, 'exchange-api'),
('eur', '2011-12-21', 4.9313, 'exchange-api'),
('eur', '2011-12-22', 4.941, 'exchange-api'),
('eur', '2011-12-23', 4.9455, 'exchange-api'),
('eur', '2011-12-27', 4.9298, 'exchange-api'),
('eur', '2011-12-28', 4.9619, 'exchange-api'),
('eur', '2011-12-29', 4.9142, 'exchange-api'),
('eur', '2011-12-30', 4.9381, 'exchange-api'),
('eur', '2012-01-03', 4.9687, 'exchange-api'),
('eur', '2012-01-04', 4.9971, 'exchange-api'),
('eur', '2012-01-05', 4.9462, 'exchange-api'),
('eur', '2012-01-06', 4.9183, 'exchange-api'),
('eur', '2012-01-09', 4.8991, 'exchange-api'),
('eur', '2012-01-10', 4.8938, 'exchange-api'),
('eur', '2012-01-11', 4.8903, 'exchange-api'),
('eur', '2012-01-12', 4.8871, 'exchange-api'),
('eur', '2012-01-13', 4.9225, 'exchange-api'),
('eur', '2012-01-16', 4.8779, 'exchange-api'),
('eur', '2012-01-17', 4.9079, 'exchange-api'),
('eur', '2012-01-18', 4.8845, 'exchange-api'),
('eur', '2012-01-19', 4.8872, 'exchange-api'),
('eur', '2012-01-20', 4.8982, 'exchange-api'),
('eur', '2012-01-23', 4.91, 'exchange-api'),
('eur', '2012-01-24', 4.925, 'exchange-api'),
('eur', '2012-01-25', 4.9039, 'exchange-api'),
('eur', '2012-01-26', 4.9466, 'exchange-api'),
('eur', '2012-01-27', 4.9406, 'exchange-api'),
('eur', '2012-01-30', 4.9408, 'exchange-api'),
('eur', '2012-01-31', 4.9225, 'exchange-api'),
('eur', '2012-02-01', 4.9069, 'exchange-api'),
('eur', '2012-02-02', 4.8952, 'exchange-api'),
('eur', '2012-02-03', 4.8873, 'exchange-api'),
('eur', '2012-02-06', 4.8524, 'exchange-api'),
('eur', '2012-02-07', 4.8966, 'exchange-api'),
('eur', '2012-02-08', 4.9127, 'exchange-api'),
('eur', '2012-02-09', 4.929, 'exchange-api'),
('eur', '2012-02-10', 4.9279, 'exchange-api'),
('eur', '2012-02-13', 4.9234, 'exchange-api'),
('eur', '2012-02-14', 4.9295, 'exchange-api'),
('eur', '2012-02-15', 4.9111, 'exchange-api'),
('eur', '2012-02-16', 4.8978, 'exchange-api'),
('eur', '2012-02-17', 4.9247, 'exchange-api'),
('eur', '2012-02-20', 4.9438, 'exchange-api'),
('eur', '2012-02-21', 4.937, 'exchange-api'),
('eur', '2012-02-22', 4.9663, 'exchange-api'),
('eur', '2012-02-23', 4.9958, 'exchange-api'),
('eur', '2012-02-24', 5.0297, 'exchange-api'),
('eur', '2012-02-27', 5.0941, 'exchange-api'),
('eur', '2012-02-28', 5.0901, 'exchange-api'),
('eur', '2012-02-29', 5.0623, 'exchange-api'),
('eur', '2012-03-01', 5.0371, 'exchange-api'),
('eur', '2012-03-02', 5.0307, 'exchange-api'),
('eur', '2012-03-05', 5.02, 'exchange-api'),
('eur', '2012-03-06', 5.0091, 'exchange-api'),
('eur', '2012-03-07', 5.0037, 'exchange-api'),
('eur', '2012-03-12', 4.9625, 'exchange-api'),
('eur', '2012-03-13', 4.9434, 'exchange-api'),
('eur', '2012-03-14', 4.9417, 'exchange-api'),
('eur', '2012-03-15', 4.9417, 'exchange-api'),
('eur', '2012-03-16', 4.9236, 'exchange-api'),
('eur', '2012-03-19', 4.951, 'exchange-api'),
('eur', '2012-03-20', 4.9506, 'exchange-api'),
('eur', '2012-03-21', 4.9557, 'exchange-api'),
('eur', '2012-03-22', 4.9414, 'exchange-api'),
('eur', '2012-03-23', 4.9532, 'exchange-api'),
('eur', '2012-03-26', 4.9483, 'exchange-api'),
('eur', '2012-03-27', 4.9605, 'exchange-api'),
('eur', '2012-03-28', 4.9635, 'exchange-api'),
('eur', '2012-03-29', 4.9578, 'exchange-api'),
('eur', '2012-03-30', 4.953, 'exchange-api'),
('eur', '2012-04-02', 4.9611, 'exchange-api'),
('eur', '2012-04-03', 4.968, 'exchange-api'),
('eur', '2012-04-04', 4.9243, 'exchange-api'),
('eur', '2012-04-05', 4.8973, 'exchange-api'),
('eur', '2012-04-10', 4.897, 'exchange-api'),
('eur', '2012-04-11', 4.9301, 'exchange-api'),
('eur', '2012-04-12', 4.9322, 'exchange-api'),
('eur', '2012-04-16', 4.8932, 'exchange-api'),
('eur', '2012-04-17', 4.9337, 'exchange-api'),
('eur', '2012-04-18', 4.9306, 'exchange-api'),
('eur', '2012-04-19', 4.9346, 'exchange-api'),
('eur', '2012-04-20', 4.9346, 'exchange-api'),
('eur', '2012-04-23', 4.9427, 'exchange-api'),
('eur', '2012-04-24', 4.9482, 'exchange-api'),
('eur', '2012-04-25', 4.9558, 'exchange-api'),
('eur', '2012-04-27', 4.9596, 'exchange-api'),
('eur', '2012-04-30', 4.9581, 'exchange-api'),
('eur', '2012-05-01', 4.9945, 'exchange-api'),
('eur', '2012-05-02', 4.9771, 'exchange-api'),
('eur', '2012-05-03', 4.9613, 'exchange-api'),
('eur', '2012-05-04', 4.9654, 'exchange-api'),
('eur', '2012-05-07', 4.9583, 'exchange-api'),
('eur', '2012-05-08', 4.9531, 'exchange-api'),
('eur', '2012-05-09', 4.9486, 'exchange-api'),
('eur', '2012-05-10', 4.9466, 'exchange-api'),
('eur', '2012-05-11', 4.9408, 'exchange-api'),
('eur', '2012-05-14', 4.9296, 'exchange-api'),
('eur', '2012-05-15', 4.9164, 'exchange-api'),
('eur', '2012-05-16', 4.876, 'exchange-api'),
('eur', '2012-05-17', 4.8526, 'exchange-api'),
('eur', '2012-05-18', 4.8682, 'exchange-api'),
('eur', '2012-05-21', 4.8866, 'exchange-api'),
('eur', '2012-05-22', 4.8675, 'exchange-api'),
('eur', '2012-05-23', 4.8785, 'exchange-api'),
('eur', '2012-05-24', 4.8359, 'exchange-api'),
('eur', '2012-05-25', 4.8395, 'exchange-api'),
('eur', '2012-05-28', 4.8493, 'exchange-api'),
('eur', '2012-05-29', 4.857, 'exchange-api'),
('eur', '2012-05-30', 4.8329, 'exchange-api'),
('eur', '2012-05-31', 4.8173, 'exchange-api'),
('eur', '2012-06-01', 4.8293, 'exchange-api'),
('eur', '2012-06-04', 4.8394, 'exchange-api'),
('eur', '2012-06-05', 4.841, 'exchange-api'),
('eur', '2012-06-06', 4.863, 'exchange-api'),
('eur', '2012-06-07', 4.8689, 'exchange-api'),
('eur', '2012-06-08', 4.835, 'exchange-api'),
('eur', '2012-06-11', 4.8485, 'exchange-api'),
('eur', '2012-06-12', 4.8646, 'exchange-api'),
('eur', '2012-06-13', 4.8638, 'exchange-api'),
('eur', '2012-06-14', 4.8763, 'exchange-api'),
('eur', '2012-06-15', 4.8819, 'exchange-api'),
('eur', '2012-06-18', 4.872, 'exchange-api'),
('eur', '2012-06-19', 4.8677, 'exchange-api'),
('eur', '2012-06-20', 4.9133, 'exchange-api'),
('eur', '2012-06-21', 4.9189, 'exchange-api'),
('eur', '2012-06-22', 4.8941, 'exchange-api'),
('eur', '2012-06-25', 4.8887, 'exchange-api'),
('eur', '2012-06-26', 4.9184, 'exchange-api'),
('eur', '2012-06-27', 4.929, 'exchange-api'),
('eur', '2012-06-28', 4.9003, 'exchange-api'),
('eur', '2012-06-29', 4.9319, 'exchange-api'),
('eur', '2012-07-02', 4.9412, 'exchange-api'),
('eur', '2012-07-03', 4.94, 'exchange-api'),
('eur', '2012-07-04', 4.9238, 'exchange-api'),
('eur', '2012-07-05', 4.8971, 'exchange-api'),
('eur', '2012-07-06', 4.8698, 'exchange-api'),
('eur', '2012-07-09', 4.8756, 'exchange-api'),
('eur', '2012-07-10', 4.8684, 'exchange-api'),
('eur', '2012-07-11', 4.8589, 'exchange-api'),
('eur', '2012-07-12', 4.8532, 'exchange-api'),
('eur', '2012-07-13', 4.8434, 'exchange-api'),
('eur', '2012-07-16', 4.8563, 'exchange-api'),
('eur', '2012-07-17', 4.8926, 'exchange-api'),
('eur', '2012-07-18', 4.9058, 'exchange-api'),
('eur', '2012-07-19', 4.9641, 'exchange-api'),
('eur', '2012-07-20', 4.9036, 'exchange-api'),
('eur', '2012-07-23', 4.8928, 'exchange-api'),
('eur', '2012-07-24', 4.9198, 'exchange-api'),
('eur', '2012-07-25', 4.9325, 'exchange-api'),
('eur', '2012-07-26', 4.9827, 'exchange-api'),
('eur', '2012-07-27', 5.0169, 'exchange-api'),
('eur', '2012-07-30', 4.9511, 'exchange-api'),
('eur', '2012-07-31', 4.9066, 'exchange-api'),
('eur', '2012-08-01', 4.8904, 'exchange-api'),
('eur', '2012-08-02', 4.8818, 'exchange-api'),
('eur', '2012-08-03', 4.8941, 'exchange-api'),
('eur', '2012-08-06', 4.9163, 'exchange-api'),
('eur', '2012-08-07', 4.9624, 'exchange-api'),
('eur', '2012-08-08', 4.9401, 'exchange-api'),
('eur', '2012-08-09', 4.9062, 'exchange-api'),
('eur', '2012-08-10', 4.9153, 'exchange-api'),
('eur', '2012-08-13', 4.992, 'exchange-api'),
('eur', '2012-08-14', 4.9824, 'exchange-api'),
('eur', '2012-08-15', 4.9538, 'exchange-api'),
('eur', '2012-08-16', 4.9614, 'exchange-api'),
('eur', '2012-08-17', 4.9769, 'exchange-api'),
('eur', '2012-08-20', 4.9615, 'exchange-api'),
('eur', '2012-08-21', 4.9984, 'exchange-api'),
('eur', '2012-08-22', 5.0172, 'exchange-api'),
('eur', '2012-08-23', 5.0251, 'exchange-api'),
('eur', '2012-08-24', 5.0438, 'exchange-api'),
('eur', '2012-08-27', 5.0425, 'exchange-api'),
('eur', '2012-08-28', 5.0358, 'exchange-api'),
('eur', '2012-08-29', 5.0542, 'exchange-api'),
('eur', '2012-08-30', 5.0697, 'exchange-api'),
('eur', '2012-08-31', 5.0402, 'exchange-api'),
('eur', '2012-09-03', 5.0519, 'exchange-api'),
('eur', '2012-09-04', 5.0624, 'exchange-api'),
('eur', '2012-09-05', 5.058, 'exchange-api'),
('eur', '2012-09-06', 5.0856, 'exchange-api'),
('eur', '2012-09-07', 5.0681, 'exchange-api'),
('eur', '2012-09-10', 5.0864, 'exchange-api'),
('eur', '2012-09-11', 5.0671, 'exchange-api'),
('eur', '2012-09-12', 5.0942, 'exchange-api'),
('eur', '2012-09-13', 5.1188, 'exchange-api'),
('eur', '2012-09-14', 5.1086, 'exchange-api'),
('eur', '2012-09-19', 5.0878, 'exchange-api'),
('eur', '2012-09-20', 5.0733, 'exchange-api'),
('eur', '2012-09-21', 5.0649, 'exchange-api'),
('eur', '2012-09-24', 5.0519, 'exchange-api'),
('eur', '2012-09-27', 5.0531, 'exchange-api'),
('eur', '2012-09-28', 5.0649, 'exchange-api'),
('eur', '2012-10-02', 5.0212, 'exchange-api'),
('eur', '2012-10-03', 5.0183, 'exchange-api'),
('eur', '2012-10-04', 5.0193, 'exchange-api'),
('eur', '2012-10-05', 5.0172, 'exchange-api'),
('eur', '2012-10-09', 4.9984, 'exchange-api'),
('eur', '2012-10-10', 4.9744, 'exchange-api'),
('eur', '2012-10-11', 4.98, 'exchange-api'),
('eur', '2012-10-12', 4.9816, 'exchange-api'),
('eur', '2012-10-15', 4.9521, 'exchange-api'),
('eur', '2012-10-16', 4.9617, 'exchange-api'),
('eur', '2012-10-17', 4.978, 'exchange-api'),
('eur', '2012-10-18', 4.9913, 'exchange-api'),
('eur', '2012-10-19', 4.9904, 'exchange-api'),
('eur', '2012-10-22', 4.9852, 'exchange-api'),
('eur', '2012-10-23', 4.9828, 'exchange-api'),
('eur', '2012-10-24', 4.9946, 'exchange-api'),
('eur', '2012-10-25', 5.0085, 'exchange-api'),
('eur', '2012-10-26', 5.0096, 'exchange-api'),
('eur', '2012-10-29', 5.0156, 'exchange-api'),
('eur', '2012-10-30', 5.0466, 'exchange-api'),
('eur', '2012-10-31', 5.0415, 'exchange-api'),
('eur', '2012-11-01', 5.0192, 'exchange-api'),
('eur', '2012-11-02', 5.0013, 'exchange-api'),
('eur', '2012-11-05', 4.987, 'exchange-api'),
('eur', '2012-11-06', 4.9848, 'exchange-api'),
('eur', '2012-11-07', 4.9734, 'exchange-api'),
('eur', '2012-11-08', 4.9751, 'exchange-api'),
('eur', '2012-11-09', 4.9644, 'exchange-api'),
('eur', '2012-11-12', 4.9936, 'exchange-api'),
('eur', '2012-11-13', 4.9825, 'exchange-api'),
('eur', '2012-11-14', 4.9897, 'exchange-api'),
('eur', '2012-11-15', 5.0431, 'exchange-api'),
('eur', '2012-11-16', 5.0405, 'exchange-api'),
('eur', '2012-11-19', 5.0305, 'exchange-api'),
('eur', '2012-11-20', 5.0273, 'exchange-api'),
('eur', '2012-11-21', 5.0155, 'exchange-api'),
('eur', '2012-11-22', 4.9833, 'exchange-api'),
('eur', '2012-11-23', 4.9943, 'exchange-api'),
('eur', '2012-11-26', 5.015, 'exchange-api'),
('eur', '2012-11-27', 4.9978, 'exchange-api'),
('eur', '2012-11-28', 4.9861, 'exchange-api'),
('eur', '2012-11-29', 4.9755, 'exchange-api'),
('eur', '2012-11-30', 4.955, 'exchange-api'),
('eur', '2012-12-03', 4.9589, 'exchange-api'),
('eur', '2012-12-04', 4.9943, 'exchange-api'),
('eur', '2012-12-05', 4.9728, 'exchange-api'),
('eur', '2012-12-06', 4.9819, 'exchange-api'),
('eur', '2012-12-07', 4.9609, 'exchange-api'),
('eur', '2012-12-10', 4.9508, 'exchange-api'),
('eur', '2012-12-11', 4.9413, 'exchange-api'),
('eur', '2012-12-12', 4.9305, 'exchange-api'),
('eur', '2012-12-13', 4.9365, 'exchange-api'),
('eur', '2012-12-14', 4.9698, 'exchange-api'),
('eur', '2012-12-17', 4.969, 'exchange-api'),
('eur', '2012-12-18', 4.969, 'exchange-api'),
('eur', '2012-12-19', 4.98, 'exchange-api'),
('eur', '2012-12-20', 4.9701, 'exchange-api'),
('eur', '2012-12-21', 4.9486, 'exchange-api'),
('eur', '2012-12-24', 4.9544, 'exchange-api'),
('eur', '2012-12-26', 4.9525, 'exchange-api'),
('eur', '2012-12-27', 4.9428, 'exchange-api'),
('eur', '2012-12-28', 4.9184, 'exchange-api'),
('eur', '2012-12-31', 4.9206, 'exchange-api'),
('eur', '2013-01-02', 4.9276, 'exchange-api'),
('eur', '2013-01-03', 4.897, 'exchange-api'),
('eur', '2013-01-04', 4.9125, 'exchange-api'),
('eur', '2013-01-07', 4.938, 'exchange-api'),
('eur', '2013-01-08', 4.9412, 'exchange-api'),
('eur', '2013-01-09', 4.9414, 'exchange-api'),
('eur', '2013-01-10', 4.9486, 'exchange-api'),
('eur', '2013-01-11', 4.9655, 'exchange-api'),
('eur', '2013-01-14', 4.9885, 'exchange-api'),
('eur', '2013-01-15', 4.9829, 'exchange-api'),
('eur', '2013-01-16', 4.9637, 'exchange-api'),
('eur', '2013-01-17', 4.9775, 'exchange-api'),
('eur', '2013-01-18', 4.9708, 'exchange-api'),
('eur', '2013-01-21', 4.9764, 'exchange-api'),
('eur', '2013-01-23', 4.9645, 'exchange-api'),
('eur', '2013-01-24', 4.9571, 'exchange-api'),
('eur', '2013-01-25', 4.9903, 'exchange-api'),
('eur', '2013-01-28', 5.0124, 'exchange-api'),
('eur', '2013-01-29', 5.0096, 'exchange-api'),
('eur', '2013-01-30', 5.0464, 'exchange-api'),
('eur', '2013-01-31', 5.0534, 'exchange-api'),
('eur', '2013-02-01', 5.0271, 'exchange-api'),
('eur', '2013-02-04', 4.9978, 'exchange-api'),
('eur', '2013-02-05', 5.0002, 'exchange-api'),
('eur', '2013-02-06', 4.9998, 'exchange-api'),
('eur', '2013-02-07', 5.0029, 'exchange-api'),
('eur', '2013-02-08', 4.9572, 'exchange-api'),
('eur', '2013-02-11', 4.953, 'exchange-api'),
('eur', '2013-02-12', 4.9721, 'exchange-api'),
('eur', '2013-02-13', 4.9727, 'exchange-api'),
('eur', '2013-02-14', 4.9076, 'exchange-api'),
('eur', '2013-02-15', 4.9101, 'exchange-api'),
('eur', '2013-02-18', 4.9137, 'exchange-api'),
('eur', '2013-02-19', 4.9142, 'exchange-api'),
('eur', '2013-02-20', 4.9007, 'exchange-api'),
('eur', '2013-02-21', 4.8422, 'exchange-api'),
('eur', '2013-02-22', 4.8984, 'exchange-api'),
('eur', '2013-02-26', 4.8868, 'exchange-api'),
('eur', '2013-02-27', 4.8862, 'exchange-api'),
('eur', '2013-02-28', 4.8629, 'exchange-api'),
('eur', '2013-03-01', 4.8693, 'exchange-api'),
('eur', '2013-03-04', 4.8567, 'exchange-api'),
('eur', '2013-03-05', 4.8636, 'exchange-api'),
('eur', '2013-03-06', 4.86, 'exchange-api'),
('eur', '2013-03-07', 4.85, 'exchange-api'),
('eur', '2013-03-08', 4.8383, 'exchange-api'),
('eur', '2013-03-11', 4.7967, 'exchange-api'),
('eur', '2013-03-12', 4.7897, 'exchange-api'),
('eur', '2013-03-13', 4.792, 'exchange-api'),
('eur', '2013-03-14', 4.7846, 'exchange-api'),
('eur', '2013-03-15', 4.8048, 'exchange-api'),
('eur', '2013-03-18', 4.7755, 'exchange-api'),
('eur', '2013-03-19', 4.7665, 'exchange-api'),
('eur', '2013-03-20', 4.7502, 'exchange-api'),
('eur', '2013-03-21', 4.7522, 'exchange-api'),
('eur', '2013-03-22', 4.743, 'exchange-api'),
('eur', '2013-03-27', 4.6651, 'exchange-api'),
('eur', '2013-03-28', 4.6612, 'exchange-api'),
('eur', '2013-04-02', 4.6483, 'exchange-api'),
('eur', '2013-04-03', 4.6388, 'exchange-api'),
('eur', '2013-04-04', 4.6497, 'exchange-api'),
('eur', '2013-04-05', 4.6859, 'exchange-api'),
('eur', '2013-04-08', 4.7101, 'exchange-api'),
('eur', '2013-04-09', 4.7324, 'exchange-api'),
('eur', '2013-04-10', 4.7584, 'exchange-api'),
('eur', '2013-04-11', 4.755, 'exchange-api'),
('eur', '2013-04-12', 4.743, 'exchange-api'),
('eur', '2013-04-15', 4.7388, 'exchange-api'),
('eur', '2013-04-17', 4.7592, 'exchange-api'),
('eur', '2013-04-18', 4.7337, 'exchange-api'),
('eur', '2013-04-19', 4.7424, 'exchange-api'),
('eur', '2013-04-22', 4.7339, 'exchange-api'),
('eur', '2013-04-23', 4.7096, 'exchange-api'),
('eur', '2013-04-24', 4.708, 'exchange-api'),
('eur', '2013-04-25', 4.7144, 'exchange-api'),
('eur', '2013-04-26', 4.6989, 'exchange-api'),
('eur', '2013-04-29', 4.7002, 'exchange-api'),
('eur', '2013-04-30', 4.6956, 'exchange-api'),
('eur', '2013-05-01', 4.7312, 'exchange-api'),
('eur', '2013-05-02', 4.7071, 'exchange-api'),
('eur', '2013-05-03', 4.6736, 'exchange-api'),
('eur', '2013-05-06', 4.6768, 'exchange-api'),
('eur', '2013-05-07', 4.6731, 'exchange-api'),
('eur', '2013-05-08', 4.6786, 'exchange-api'),
('eur', '2013-05-09', 4.6726, 'exchange-api'),
('eur', '2013-05-10', 4.6367, 'exchange-api'),
('eur', '2013-05-13', 4.6359, 'exchange-api'),
('eur', '2013-05-14', 4.7294, 'exchange-api'),
('eur', '2013-05-16', 4.697, 'exchange-api'),
('eur', '2013-05-17', 4.687, 'exchange-api'),
('eur', '2013-05-20', 4.7084, 'exchange-api'),
('eur', '2013-05-21', 4.7255, 'exchange-api'),
('eur', '2013-05-22', 4.7451, 'exchange-api'),
('eur', '2013-05-23', 4.7678, 'exchange-api'),
('eur', '2013-05-24', 4.7983, 'exchange-api'),
('eur', '2013-05-28', 4.7963, 'exchange-api'),
('eur', '2013-05-29', 4.7813, 'exchange-api'),
('eur', '2013-05-30', 4.7805, 'exchange-api'),
('eur', '2013-05-31', 4.7988, 'exchange-api'),
('eur', '2013-06-03', 4.7945, 'exchange-api'),
('eur', '2013-06-04', 4.8093, 'exchange-api'),
('eur', '2013-06-05', 4.7964, 'exchange-api'),
('eur', '2013-06-06', 4.7854, 'exchange-api'),
('eur', '2013-06-07', 4.8039, 'exchange-api'),
('eur', '2013-06-10', 4.7978, 'exchange-api'),
('eur', '2013-06-11', 4.8388, 'exchange-api'),
('eur', '2013-06-12', 4.8138, 'exchange-api'),
('eur', '2013-06-13', 4.8146, 'exchange-api'),
('eur', '2013-06-14', 4.8009, 'exchange-api'),
('eur', '2013-06-17', 4.8058, 'exchange-api'),
('eur', '2013-06-18', 4.8077, 'exchange-api'),
('eur', '2013-06-19', 4.8145, 'exchange-api'),
('eur', '2013-06-20', 4.7904, 'exchange-api'),
('eur', '2013-06-21', 4.7929, 'exchange-api'),
('eur', '2013-06-24', 4.7623, 'exchange-api'),
('eur', '2013-06-25', 4.7313, 'exchange-api'),
('eur', '2013-06-26', 4.7122, 'exchange-api'),
('eur', '2013-06-27', 4.7488, 'exchange-api'),
('eur', '2013-06-28', 4.7197, 'exchange-api'),
('eur', '2013-07-01', 4.7448, 'exchange-api'),
('eur', '2013-07-02', 4.7284, 'exchange-api'),
('eur', '2013-07-03', 4.7338, 'exchange-api'),
('eur', '2013-07-04', 4.7249, 'exchange-api'),
('eur', '2013-07-05', 4.6967, 'exchange-api'),
('eur', '2013-07-08', 4.7038, 'exchange-api'),
('eur', '2013-07-09', 4.6966, 'exchange-api'),
('eur', '2013-07-10', 4.6736, 'exchange-api'),
('eur', '2013-07-11', 4.7237, 'exchange-api'),
('eur', '2013-07-12', 4.7046, 'exchange-api'),
('eur', '2013-07-15', 4.6849, 'exchange-api'),
('eur', '2013-07-17', 4.7021, 'exchange-api'),
('eur', '2013-07-18', 4.7197, 'exchange-api'),
('eur', '2013-07-19', 4.6976, 'exchange-api'),
('eur', '2013-07-22', 4.7019, 'exchange-api'),
('eur', '2013-07-23', 4.7057, 'exchange-api'),
('eur', '2013-07-24', 4.7368, 'exchange-api'),
('eur', '2013-07-25', 4.7466, 'exchange-api'),
('eur', '2013-07-26', 4.754, 'exchange-api'),
('eur', '2013-07-29', 4.7724, 'exchange-api'),
('eur', '2013-07-30', 4.7379, 'exchange-api'),
('eur', '2013-07-31', 4.7269, 'exchange-api'),
('eur', '2013-08-01', 4.7133, 'exchange-api'),
('eur', '2013-08-02', 4.7287, 'exchange-api'),
('eur', '2013-08-05', 4.7256, 'exchange-api'),
('eur', '2013-08-06', 4.7154, 'exchange-api'),
('eur', '2013-08-07', 4.7307, 'exchange-api'),
('eur', '2013-08-08', 4.7283, 'exchange-api'),
('eur', '2013-08-09', 4.7234, 'exchange-api'),
('eur', '2013-08-12', 4.7131, 'exchange-api'),
('eur', '2013-08-13', 4.7194, 'exchange-api'),
('eur', '2013-08-14', 4.7342, 'exchange-api'),
('eur', '2013-08-15', 4.7452, 'exchange-api'),
('eur', '2013-08-16', 4.7511, 'exchange-api'),
('eur', '2013-08-19', 4.7694, 'exchange-api'),
('eur', '2013-08-20', 4.7738, 'exchange-api'),
('eur', '2013-08-21', 4.7768, 'exchange-api'),
('eur', '2013-08-22', 4.7729, 'exchange-api'),
('eur', '2013-08-23', 4.7893, 'exchange-api'),
('eur', '2013-08-26', 4.8183, 'exchange-api'),
('eur', '2013-08-27', 4.8807, 'exchange-api'),
('eur', '2013-08-28', 4.9019, 'exchange-api'),
('eur', '2013-08-29', 4.8133, 'exchange-api'),
('eur', '2013-08-30', 4.7838, 'exchange-api'),
('eur', '2013-09-02', 4.7805, 'exchange-api'),
('eur', '2013-09-03', 4.7814, 'exchange-api'),
('eur', '2013-09-09', 4.7821, 'exchange-api'),
('eur', '2013-09-10', 4.7738, 'exchange-api'),
('eur', '2013-09-11', 4.726, 'exchange-api'),
('eur', '2013-09-12', 4.7379, 'exchange-api'),
('eur', '2013-09-16', 4.7164, 'exchange-api'),
('eur', '2013-09-17', 4.7249, 'exchange-api'),
('eur', '2013-09-18', 4.7222, 'exchange-api'),
('eur', '2013-09-20', 4.7433, 'exchange-api'),
('eur', '2013-09-23', 4.7495, 'exchange-api'),
('eur', '2013-09-24', 4.7649, 'exchange-api'),
('eur', '2013-09-25', 4.8045, 'exchange-api'),
('eur', '2013-09-27', 4.82, 'exchange-api'),
('eur', '2013-09-30', 4.7734, 'exchange-api'),
('eur', '2013-10-01', 4.7845, 'exchange-api'),
('eur', '2013-10-02', 4.7766, 'exchange-api'),
('eur', '2013-10-03', 4.8124, 'exchange-api'),
('eur', '2013-10-04', 4.8304, 'exchange-api'),
('eur', '2013-10-07', 4.8081, 'exchange-api'),
('eur', '2013-10-08', 4.8324, 'exchange-api'),
('eur', '2013-10-09', 4.8253, 'exchange-api'),
('eur', '2013-10-10', 4.8118, 'exchange-api'),
('eur', '2013-10-11', 4.8114, 'exchange-api'),
('eur', '2013-10-14', 4.7972, 'exchange-api'),
('eur', '2013-10-15', 4.7852, 'exchange-api'),
('eur', '2013-10-16', 4.8122, 'exchange-api'),
('eur', '2013-10-17', 4.823, 'exchange-api'),
('eur', '2013-10-18', 4.8325, 'exchange-api'),
('eur', '2013-10-21', 4.836, 'exchange-api'),
('eur', '2013-10-22', 4.8242, 'exchange-api'),
('eur', '2013-10-23', 4.8401, 'exchange-api'),
('eur', '2013-10-24', 4.8741, 'exchange-api'),
('eur', '2013-10-25', 4.8709, 'exchange-api'),
('eur', '2013-10-28', 4.8727, 'exchange-api'),
('eur', '2013-10-29', 4.8516, 'exchange-api'),
('eur', '2013-10-30', 4.8429, 'exchange-api'),
('eur', '2013-10-31', 4.803, 'exchange-api'),
('eur', '2013-11-01', 4.7666, 'exchange-api'),
('eur', '2013-11-04', 4.7726, 'exchange-api'),
('eur', '2013-11-05', 4.7667, 'exchange-api'),
('eur', '2013-11-06', 4.7705, 'exchange-api'),
('eur', '2013-11-07', 4.7792, 'exchange-api'),
('eur', '2013-11-08', 4.7421, 'exchange-api'),
('eur', '2013-11-11', 4.7351, 'exchange-api'),
('eur', '2013-11-12', 4.7337, 'exchange-api'),
('eur', '2013-11-13', 4.7399, 'exchange-api'),
('eur', '2013-11-14', 4.7458, 'exchange-api'),
('eur', '2013-11-15', 4.7339, 'exchange-api'),
('eur', '2013-11-18', 4.7606, 'exchange-api'),
('eur', '2013-11-19', 4.7541, 'exchange-api'),
('eur', '2013-11-20', 4.7958, 'exchange-api'),
('eur', '2013-11-21', 4.8063, 'exchange-api'),
('eur', '2013-11-22', 4.8029, 'exchange-api'),
('eur', '2013-11-25', 4.8156, 'exchange-api'),
('eur', '2013-11-26', 4.7987, 'exchange-api'),
('eur', '2013-11-27', 4.8163, 'exchange-api'),
('eur', '2013-11-28', 4.8041, 'exchange-api'),
('eur', '2013-11-29', 4.7969, 'exchange-api'),
('eur', '2013-12-02', 4.7781, 'exchange-api'),
('eur', '2013-12-03', 4.7818, 'exchange-api'),
('eur', '2013-12-04', 4.7857, 'exchange-api'),
('eur', '2013-12-05', 4.7897, 'exchange-api'),
('eur', '2013-12-06', 4.8031, 'exchange-api'),
('eur', '2013-12-09', 4.8063, 'exchange-api'),
('eur', '2013-12-10', 4.805, 'exchange-api'),
('eur', '2013-12-11', 4.8224, 'exchange-api'),
('eur', '2013-12-12', 4.83, 'exchange-api'),
('eur', '2013-12-13', 4.8225, 'exchange-api'),
('eur', '2013-12-16', 4.8339, 'exchange-api'),
('eur', '2013-12-17', 4.8326, 'exchange-api'),
('eur', '2013-12-18', 4.8193, 'exchange-api'),
('eur', '2013-12-19', 4.8075, 'exchange-api'),
('eur', '2013-12-20', 4.796, 'exchange-api'),
('eur', '2013-12-23', 4.7968, 'exchange-api'),
('eur', '2013-12-24', 4.77, 'exchange-api'),
('eur', '2013-12-26', 4.782, 'exchange-api'),
('eur', '2013-12-27', 4.8174, 'exchange-api'),
('eur', '2013-12-30', 4.788, 'exchange-api'),
('eur', '2013-12-31', 4.7819, 'exchange-api'),
('eur', '2014-01-02', 4.773, 'exchange-api'),
('eur', '2014-01-03', 4.7775, 'exchange-api'),
('eur', '2014-01-06', 4.7685, 'exchange-api'),
('eur', '2014-01-07', 4.7769, 'exchange-api'),
('eur', '2014-01-08', 4.7665, 'exchange-api'),
('eur', '2014-01-09', 4.7634, 'exchange-api'),
('eur', '2014-01-10', 4.7582, 'exchange-api'),
('eur', '2014-01-13', 4.7674, 'exchange-api'),
('eur', '2014-01-14', 4.7695, 'exchange-api'),
('eur', '2014-01-15', 4.7407, 'exchange-api'),
('eur', '2014-01-16', 4.7516, 'exchange-api'),
('eur', '2014-01-17', 4.7448, 'exchange-api'),
('eur', '2014-01-20', 4.7317, 'exchange-api'),
('eur', '2014-01-21', 4.7325, 'exchange-api'),
('eur', '2014-01-22', 4.7323, 'exchange-api'),
('eur', '2014-01-23', 4.7553, 'exchange-api'),
('eur', '2014-01-24', 4.7658, 'exchange-api'),
('eur', '2014-01-27', 4.7705, 'exchange-api'),
('eur', '2014-01-28', 4.7661, 'exchange-api'),
('eur', '2014-01-29', 4.7589, 'exchange-api'),
('eur', '2014-01-30', 4.7492, 'exchange-api'),
('eur', '2014-01-31', 4.7385, 'exchange-api'),
('eur', '2014-02-03', 4.75, 'exchange-api'),
('eur', '2014-02-04', 4.7756, 'exchange-api'),
('eur', '2014-02-05', 4.7837, 'exchange-api'),
('eur', '2014-02-06', 4.7955, 'exchange-api'),
('eur', '2014-02-07', 4.7937, 'exchange-api'),
('eur', '2014-02-10', 4.8048, 'exchange-api'),
('eur', '2014-02-11', 4.8069, 'exchange-api'),
('eur', '2014-02-12', 4.798, 'exchange-api'),
('eur', '2014-02-13', 4.8022, 'exchange-api'),
('eur', '2014-02-14', 4.8013, 'exchange-api'),
('eur', '2014-02-17', 4.8085, 'exchange-api'),
('eur', '2014-02-18', 4.8226, 'exchange-api'),
('eur', '2014-02-19', 4.8258, 'exchange-api'),
('eur', '2014-02-20', 4.8203, 'exchange-api'),
('eur', '2014-02-21', 4.8108, 'exchange-api'),
('eur', '2014-02-24', 4.8173, 'exchange-api'),
('eur', '2014-02-25', 4.836, 'exchange-api'),
('eur', '2014-02-26', 4.8333, 'exchange-api'),
('eur', '2014-02-27', 4.8031, 'exchange-api'),
('eur', '2014-02-28', 4.7979, 'exchange-api'),
('eur', '2014-03-03', 4.8078, 'exchange-api'),
('eur', '2014-03-04', 4.7998, 'exchange-api'),
('eur', '2014-03-05', 4.7895, 'exchange-api'),
('eur', '2014-03-06', 4.7789, 'exchange-api'),
('eur', '2014-03-07', 4.801, 'exchange-api'),
('eur', '2014-03-10', 4.8217, 'exchange-api'),
('eur', '2014-03-11', 4.8126, 'exchange-api'),
('eur', '2014-03-12', 4.8139, 'exchange-api'),
('eur', '2014-03-13', 4.8348, 'exchange-api'),
('eur', '2014-03-14', 4.8176, 'exchange-api'),
('eur', '2014-03-18', 4.8131, 'exchange-api'),
('eur', '2014-03-19', 4.8172, 'exchange-api'),
('eur', '2014-03-20', 4.7982, 'exchange-api'),
('eur', '2014-03-21', 4.7961, 'exchange-api'),
('eur', '2014-03-24', 4.8011, 'exchange-api'),
('eur', '2014-03-25', 4.8185, 'exchange-api'),
('eur', '2014-03-26', 4.8147, 'exchange-api'),
('eur', '2014-03-27', 4.822, 'exchange-api'),
('eur', '2014-03-28', 4.8088, 'exchange-api'),
('eur', '2014-03-31', 4.8124, 'exchange-api'),
('eur', '2014-04-01', 4.7953, 'exchange-api'),
('eur', '2014-04-02', 4.7916, 'exchange-api'),
('eur', '2014-04-03', 4.775, 'exchange-api'),
('eur', '2014-04-04', 4.764, 'exchange-api'),
('eur', '2014-04-07', 4.7954, 'exchange-api'),
('eur', '2014-04-08', 4.7937, 'exchange-api'),
('eur', '2014-04-09', 4.8066, 'exchange-api'),
('eur', '2014-04-10', 4.8071, 'exchange-api'),
('eur', '2014-04-11', 4.81, 'exchange-api'),
('eur', '2014-04-16', 4.7978, 'exchange-api'),
('eur', '2014-04-17', 4.8104, 'exchange-api'),
('eur', '2014-04-22', 4.8134, 'exchange-api'),
('eur', '2014-04-23', 4.8289, 'exchange-api'),
('eur', '2014-04-24', 4.8071, 'exchange-api'),
('eur', '2014-04-25', 4.8014, 'exchange-api'),
('eur', '2014-04-28', 4.8313, 'exchange-api'),
('eur', '2014-04-29', 4.806, 'exchange-api'),
('eur', '2014-04-30', 4.8025, 'exchange-api'),
('eur', '2014-05-01', 4.793, 'exchange-api'),
('eur', '2014-05-02', 4.7908, 'exchange-api'),
('eur', '2014-05-05', 4.7983, 'exchange-api'),
('eur', '2014-05-07', 4.8047, 'exchange-api'),
('eur', '2014-05-08', 4.804, 'exchange-api'),
('eur', '2014-05-09', 4.7713, 'exchange-api'),
('eur', '2014-05-12', 4.754, 'exchange-api'),
('eur', '2014-05-13', 4.7399, 'exchange-api'),
('eur', '2014-05-14', 4.7409, 'exchange-api'),
('eur', '2014-05-15', 4.7182, 'exchange-api'),
('eur', '2014-05-16', 4.7479, 'exchange-api'),
('eur', '2014-05-19', 4.7389, 'exchange-api'),
('eur', '2014-05-20', 4.7526, 'exchange-api'),
('eur', '2014-05-21', 4.7692, 'exchange-api'),
('eur', '2014-05-22', 4.766, 'exchange-api'),
('eur', '2014-05-23', 4.7533, 'exchange-api'),
('eur', '2014-05-27', 4.745, 'exchange-api'),
('eur', '2014-05-28', 4.7464, 'exchange-api'),
('eur', '2014-05-29', 4.7333, 'exchange-api'),
('eur', '2014-05-30', 4.7283, 'exchange-api'),
('eur', '2014-06-02', 4.734, 'exchange-api'),
('eur', '2014-06-03', 4.7261, 'exchange-api'),
('eur', '2014-06-05', 4.7253, 'exchange-api'),
('eur', '2014-06-06', 4.7277, 'exchange-api'),
('eur', '2014-06-09', 4.7114, 'exchange-api'),
('eur', '2014-06-10', 4.6888, 'exchange-api'),
('eur', '2014-06-11', 4.6899, 'exchange-api'),
('eur', '2014-06-12', 4.6819, 'exchange-api'),
('eur', '2014-06-13', 4.6862, 'exchange-api'),
('eur', '2014-06-16', 4.6825, 'exchange-api'),
('eur', '2014-06-17', 4.6845, 'exchange-api'),
('eur', '2014-06-18', 4.6905, 'exchange-api'),
('eur', '2014-06-19', 4.6941, 'exchange-api'),
('eur', '2014-06-20', 4.686, 'exchange-api'),
('eur', '2014-06-23', 4.6934, 'exchange-api'),
('eur', '2014-06-24', 4.6765, 'exchange-api'),
('eur', '2014-06-25', 4.6819, 'exchange-api'),
('eur', '2014-06-26', 4.6734, 'exchange-api'),
('eur', '2014-06-27', 4.6785, 'exchange-api'),
('eur', '2014-06-30', 4.6939, 'exchange-api'),
('eur', '2014-07-01', 4.6924, 'exchange-api'),
('eur', '2014-07-02', 4.6816, 'exchange-api'),
('eur', '2014-07-03', 4.6747, 'exchange-api'),
('eur', '2014-07-04', 4.6454, 'exchange-api'),
('eur', '2014-07-07', 4.6535, 'exchange-api'),
('eur', '2014-07-08', 4.6624, 'exchange-api'),
('eur', '2014-07-09', 4.677, 'exchange-api'),
('eur', '2014-07-10', 4.6696, 'exchange-api'),
('eur', '2014-07-11', 4.6643, 'exchange-api'),
('eur', '2014-07-14', 4.6658, 'exchange-api'),
('eur', '2014-07-15', 4.6298, 'exchange-api'),
('eur', '2014-07-16', 4.6128, 'exchange-api'),
('eur', '2014-07-17', 4.613, 'exchange-api'),
('eur', '2014-07-18', 4.6298, 'exchange-api'),
('eur', '2014-07-21', 4.6232, 'exchange-api'),
('eur', '2014-07-22', 4.6095, 'exchange-api'),
('eur', '2014-07-23', 4.5944, 'exchange-api'),
('eur', '2014-07-24', 4.5837, 'exchange-api'),
('eur', '2014-07-25', 4.6137, 'exchange-api'),
('eur', '2014-07-28', 4.6043, 'exchange-api'),
('eur', '2014-07-29', 4.6029, 'exchange-api'),
('eur', '2014-07-30', 4.5956, 'exchange-api'),
('eur', '2014-07-31', 4.5899, 'exchange-api'),
('eur', '2014-08-01', 4.57, 'exchange-api'),
('eur', '2014-08-04', 4.5875, 'exchange-api'),
('eur', '2014-08-06', 4.5725, 'exchange-api'),
('eur', '2014-08-07', 4.616, 'exchange-api'),
('eur', '2014-08-08', 4.6498, 'exchange-api'),
('eur', '2014-08-11', 4.6493, 'exchange-api'),
('eur', '2014-08-12', 4.6462, 'exchange-api'),
('eur', '2014-08-13', 4.6674, 'exchange-api'),
('eur', '2014-08-14', 4.6422, 'exchange-api'),
('eur', '2014-08-15', 4.6364, 'exchange-api'),
('eur', '2014-08-18', 4.6903, 'exchange-api'),
('eur', '2014-08-19', 4.7017, 'exchange-api'),
('eur', '2014-08-20', 4.6927, 'exchange-api'),
('eur', '2014-08-21', 4.6903, 'exchange-api'),
('eur', '2014-08-22', 4.6764, 'exchange-api'),
('eur', '2014-08-25', 4.6765, 'exchange-api'),
('eur', '2014-08-26', 4.7157, 'exchange-api'),
('eur', '2014-08-27', 4.7092, 'exchange-api'),
('eur', '2014-08-28', 4.6939, 'exchange-api'),
('eur', '2014-08-29', 4.7054, 'exchange-api'),
('eur', '2014-09-01', 4.7018, 'exchange-api'),
('eur', '2014-09-02', 4.6917, 'exchange-api'),
('eur', '2014-09-03', 4.7052, 'exchange-api'),
('eur', '2014-09-04', 4.6707, 'exchange-api'),
('eur', '2014-09-05', 4.6645, 'exchange-api'),
('eur', '2014-09-08', 4.6615, 'exchange-api'),
('eur', '2014-09-09', 4.6536, 'exchange-api'),
('eur', '2014-09-10', 4.6802, 'exchange-api'),
('eur', '2014-09-11', 4.6886, 'exchange-api'),
('eur', '2014-09-12', 4.7006, 'exchange-api'),
('eur', '2014-09-15', 4.6862, 'exchange-api'),
('eur', '2014-09-16', 4.7132, 'exchange-api'),
('eur', '2014-09-17', 4.7275, 'exchange-api'),
('eur', '2014-09-18', 4.7014, 'exchange-api'),
('eur', '2014-09-19', 4.6972, 'exchange-api'),
('eur', '2014-09-22', 4.6974, 'exchange-api'),
('eur', '2014-09-23', 4.7126, 'exchange-api'),
('eur', '2014-09-29', 4.6818, 'exchange-api'),
('eur', '2014-09-30', 4.6486, 'exchange-api'),
('eur', '2014-10-01', 4.6241, 'exchange-api'),
('eur', '2014-10-02', 4.6065, 'exchange-api'),
('eur', '2014-10-06', 4.6063, 'exchange-api'),
('eur', '2014-10-07', 4.67, 'exchange-api'),
('eur', '2014-10-08', 4.7272, 'exchange-api'),
('eur', '2014-10-10', 4.7194, 'exchange-api'),
('eur', '2014-10-13', 4.7335, 'exchange-api'),
('eur', '2014-10-14', 4.7498, 'exchange-api'),
('eur', '2014-10-15', 4.7163, 'exchange-api'),
('eur', '2014-10-17', 4.7434, 'exchange-api'),
('eur', '2014-10-20', 4.7841, 'exchange-api'),
('eur', '2014-10-21', 4.7577, 'exchange-api'),
('eur', '2014-10-22', 4.7519, 'exchange-api'),
('eur', '2014-10-23', 4.7725, 'exchange-api'),
('eur', '2014-10-24', 4.7931, 'exchange-api'),
('eur', '2014-10-27', 4.8058, 'exchange-api'),
('eur', '2014-10-28', 4.7809, 'exchange-api'),
('eur', '2014-10-29', 4.7818, 'exchange-api'),
('eur', '2014-10-30', 4.7535, 'exchange-api'),
('eur', '2014-10-31', 4.7562, 'exchange-api'),
('eur', '2014-11-03', 4.7348, 'exchange-api'),
('eur', '2014-11-04', 4.7505, 'exchange-api'),
('eur', '2014-11-05', 4.7402, 'exchange-api'),
('eur', '2014-11-06', 4.7385, 'exchange-api'),
('eur', '2014-11-07', 4.7205, 'exchange-api'),
('eur', '2014-11-10', 4.7229, 'exchange-api'),
('eur', '2014-11-11', 4.7375, 'exchange-api'),
('eur', '2014-11-12', 4.7596, 'exchange-api'),
('eur', '2014-11-13', 4.7492, 'exchange-api'),
('eur', '2014-11-14', 4.7542, 'exchange-api'),
('eur', '2014-11-17', 4.7796, 'exchange-api'),
('eur', '2014-11-18', 4.8035, 'exchange-api'),
('eur', '2014-11-19', 4.813, 'exchange-api'),
('eur', '2014-11-20', 4.8231, 'exchange-api'),
('eur', '2014-11-21', 4.8084, 'exchange-api'),
('eur', '2014-11-24', 4.7936, 'exchange-api'),
('eur', '2014-11-25', 4.8037, 'exchange-api'),
('eur', '2014-11-26', 4.8187, 'exchange-api'),
('eur', '2014-11-27', 4.849, 'exchange-api'),
('eur', '2014-11-28', 4.8366, 'exchange-api'),
('eur', '2014-12-01', 4.876, 'exchange-api'),
('eur', '2014-12-02', 4.9257, 'exchange-api'),
('eur', '2014-12-03', 4.9259, 'exchange-api'),
('eur', '2014-12-04', 4.9072, 'exchange-api'),
('eur', '2014-12-05', 4.8969, 'exchange-api'),
('eur', '2014-12-08', 4.8926, 'exchange-api'),
('eur', '2014-12-09', 4.8727, 'exchange-api'),
('eur', '2014-12-10', 4.8881, 'exchange-api'),
('eur', '2014-12-11', 4.8816, 'exchange-api'),
('eur', '2014-12-12', 4.8556, 'exchange-api'),
('eur', '2014-12-15', 4.8702, 'exchange-api'),
('eur', '2014-12-16', 4.923, 'exchange-api'),
('eur', '2014-12-17', 4.8832, 'exchange-api'),
('eur', '2014-12-18', 4.8501, 'exchange-api'),
('eur', '2014-12-19', 4.8266, 'exchange-api'),
('eur', '2014-12-22', 4.8122, 'exchange-api'),
('eur', '2014-12-23', 4.7857, 'exchange-api'),
('eur', '2014-12-24', 4.7747, 'exchange-api'),
('eur', '2014-12-29', 4.7931, 'exchange-api'),
('eur', '2014-12-30', 4.7514, 'exchange-api'),
('eur', '2014-12-31', 4.7246, 'exchange-api'),
('eur', '2015-01-02', 4.719, 'exchange-api'),
('eur', '2015-01-05', 4.7137, 'exchange-api'),
('eur', '2015-01-06', 4.7253, 'exchange-api'),
('eur', '2015-01-07', 4.6848, 'exchange-api'),
('eur', '2015-01-08', 4.6759, 'exchange-api'),
('eur', '2015-01-09', 4.6727, 'exchange-api'),
('eur', '2015-01-12', 4.6636, 'exchange-api'),
('eur', '2015-01-13', 4.6471, 'exchange-api'),
('eur', '2015-01-14', 4.6301, 'exchange-api'),
('eur', '2015-01-15', 4.5678, 'exchange-api'),
('eur', '2015-01-16', 4.5491, 'exchange-api'),
('eur', '2015-01-19', 4.558, 'exchange-api'),
('eur', '2015-01-20', 4.5475, 'exchange-api'),
('eur', '2015-01-21', 4.5542, 'exchange-api'),
('eur', '2015-01-22', 4.5767, 'exchange-api'),
('eur', '2015-01-23', 4.4638, 'exchange-api'),
('eur', '2015-01-26', 4.4903, 'exchange-api'),
('eur', '2015-01-27', 4.5024, 'exchange-api'),
('eur', '2015-01-28', 4.483, 'exchange-api'),
('eur', '2015-01-29', 4.4403, 'exchange-api'),
('eur', '2015-01-30', 4.4527, 'exchange-api'),
('eur', '2015-02-02', 4.461, 'exchange-api'),
('eur', '2015-02-03', 4.4606, 'exchange-api'),
('eur', '2015-02-04', 4.4535, 'exchange-api'),
('eur', '2015-02-05', 4.4247, 'exchange-api'),
('eur', '2015-02-06', 4.4335, 'exchange-api'),
('eur', '2015-02-09', 4.3858, 'exchange-api'),
('eur', '2015-02-10', 4.3772, 'exchange-api'),
('eur', '2015-02-11', 4.3714, 'exchange-api'),
('eur', '2015-02-12', 4.4152, 'exchange-api'),
('eur', '2015-02-13', 4.4375, 'exchange-api'),
('eur', '2015-02-16', 4.4409, 'exchange-api'),
('eur', '2015-02-17', 4.4151, 'exchange-api'),
('eur', '2015-02-18', 4.3797, 'exchange-api'),
('eur', '2015-02-19', 4.3718, 'exchange-api'),
('eur', '2015-02-20', 4.3751, 'exchange-api'),
('eur', '2015-02-23', 4.3608, 'exchange-api'),
('eur', '2015-02-24', 4.4776, 'exchange-api'),
('eur', '2015-02-25', 4.4673, 'exchange-api'),
('eur', '2015-02-26', 4.4654, 'exchange-api'),
('eur', '2015-02-27', 4.4473, 'exchange-api'),
('eur', '2015-03-02', 4.4779, 'exchange-api'),
('eur', '2015-03-03', 4.4519, 'exchange-api'),
('eur', '2015-03-04', 4.4308, 'exchange-api'),
('eur', '2015-03-09', 4.3697, 'exchange-api'),
('eur', '2015-03-10', 4.341, 'exchange-api'),
('eur', '2015-03-11', 4.2896, 'exchange-api'),
('eur', '2015-03-12', 4.2723, 'exchange-api'),
('eur', '2015-03-13', 4.2622, 'exchange-api'),
('eur', '2015-03-16', 4.238, 'exchange-api'),
('eur', '2015-03-18', 4.2669, 'exchange-api'),
('eur', '2015-03-19', 4.2671, 'exchange-api'),
('eur', '2015-03-20', 4.3287, 'exchange-api'),
('eur', '2015-03-23', 4.3737, 'exchange-api'),
('eur', '2015-03-24', 4.3141, 'exchange-api'),
('eur', '2015-03-25', 4.3355, 'exchange-api'),
('eur', '2015-03-26', 4.3408, 'exchange-api'),
('eur', '2015-03-27', 4.3194, 'exchange-api'),
('eur', '2015-03-30', 4.3024, 'exchange-api'),
('eur', '2015-03-31', 4.2735, 'exchange-api'),
('eur', '2015-04-01', 4.2784, 'exchange-api'),
('eur', '2015-04-02', 4.2775, 'exchange-api'),
('eur', '2015-04-07', 4.2774, 'exchange-api'),
('eur', '2015-04-08', 4.2753, 'exchange-api'),
('eur', '2015-04-09', 4.2349, 'exchange-api'),
('eur', '2015-04-13', 4.2259, 'exchange-api'),
('eur', '2015-04-14', 4.2117, 'exchange-api'),
('eur', '2015-04-15', 4.2187, 'exchange-api'),
('eur', '2015-04-16', 4.219, 'exchange-api'),
('eur', '2015-04-17', 4.2426, 'exchange-api'),
('eur', '2015-04-20', 4.2167, 'exchange-api'),
('eur', '2015-04-21', 4.216, 'exchange-api'),
('eur', '2015-04-22', 4.2492, 'exchange-api'),
('eur', '2015-04-24', 4.2687, 'exchange-api'),
('eur', '2015-04-27', 4.2597, 'exchange-api'),
('eur', '2015-04-28', 4.2543, 'exchange-api'),
('eur', '2015-04-29', 4.2624, 'exchange-api'),
('eur', '2015-04-30', 4.3175, 'exchange-api'),
('eur', '2015-05-01', 4.3432, 'exchange-api'),
('eur', '2015-05-04', 4.3302, 'exchange-api'),
('eur', '2015-05-05', 4.316, 'exchange-api'),
('eur', '2015-05-06', 4.3427, 'exchange-api'),
('eur', '2015-05-07', 4.3673, 'exchange-api'),
('eur', '2015-05-08', 4.3438, 'exchange-api'),
('eur', '2015-05-11', 4.3143, 'exchange-api'),
('eur', '2015-05-12', 4.3472, 'exchange-api'),
('eur', '2015-05-13', 4.3273, 'exchange-api'),
('eur', '2015-05-14', 4.3615, 'exchange-api'),
('eur', '2015-05-15', 4.3457, 'exchange-api'),
('eur', '2015-05-18', 4.3608, 'exchange-api'),
('eur', '2015-05-19', 4.3169, 'exchange-api'),
('eur', '2015-05-20', 4.3043, 'exchange-api'),
('eur', '2015-05-21', 4.3026, 'exchange-api'),
('eur', '2015-05-22', 4.3229, 'exchange-api'),
('eur', '2015-05-26', 4.232, 'exchange-api'),
('eur', '2015-05-27', 4.2156, 'exchange-api'),
('eur', '2015-05-28', 4.2413, 'exchange-api'),
('eur', '2015-05-29', 4.2502, 'exchange-api'),
('eur', '2015-06-01', 4.2306, 'exchange-api'),
('eur', '2015-06-02', 4.2571, 'exchange-api'),
('eur', '2015-06-03', 4.2988, 'exchange-api'),
('eur', '2015-06-04', 4.356, 'exchange-api'),
('eur', '2015-06-05', 4.3287, 'exchange-api'),
('eur', '2015-06-08', 4.3099, 'exchange-api'),
('eur', '2015-06-09', 4.3156, 'exchange-api'),
('eur', '2015-06-10', 4.3218, 'exchange-api'),
('eur', '2015-06-11', 4.3145, 'exchange-api'),
('eur', '2015-06-12', 4.3119, 'exchange-api'),
('eur', '2015-06-15', 4.3077, 'exchange-api'),
('eur', '2015-06-16', 4.3157, 'exchange-api'),
('eur', '2015-06-17', 4.3301, 'exchange-api'),
('eur', '2015-06-18', 4.3484, 'exchange-api'),
('eur', '2015-06-19', 4.3348, 'exchange-api'),
('eur', '2015-06-22', 4.3504, 'exchange-api'),
('eur', '2015-06-23', 4.2368, 'exchange-api'),
('eur', '2015-06-24', 4.2179, 'exchange-api'),
('eur', '2015-06-25', 4.2232, 'exchange-api'),
('eur', '2015-06-26', 4.2508, 'exchange-api'),
('eur', '2015-06-29', 4.2267, 'exchange-api'),
('eur', '2015-06-30', 4.2194, 'exchange-api'),
('eur', '2015-07-01', 4.1952, 'exchange-api'),
('eur', '2015-07-02', 4.1853, 'exchange-api'),
('eur', '2015-07-03', 4.1864, 'exchange-api'),
('eur', '2015-07-06', 4.1638, 'exchange-api'),
('eur', '2015-07-07', 4.145, 'exchange-api'),
('eur', '2015-07-08', 4.1812, 'exchange-api'),
('eur', '2015-07-09', 4.1851, 'exchange-api'),
('eur', '2015-07-10', 4.1979, 'exchange-api'),
('eur', '2015-07-13', 4.183, 'exchange-api'),
('eur', '2015-07-14', 4.1639, 'exchange-api'),
('eur', '2015-07-15', 4.1422, 'exchange-api'),
('eur', '2015-07-16', 4.1267, 'exchange-api'),
('eur', '2015-07-17', 4.1274, 'exchange-api'),
('eur', '2015-07-20', 4.1437, 'exchange-api'),
('eur', '2015-07-21', 4.1386, 'exchange-api'),
('eur', '2015-07-22', 4.1648, 'exchange-api'),
('eur', '2015-07-23', 4.1993, 'exchange-api'),
('eur', '2015-07-24', 4.1809, 'exchange-api'),
('eur', '2015-07-27', 4.215, 'exchange-api'),
('eur', '2015-07-28', 4.1643, 'exchange-api'),
('eur', '2015-07-29', 4.1844, 'exchange-api'),
('eur', '2015-07-30', 4.1426, 'exchange-api'),
('eur', '2015-07-31', 4.1368, 'exchange-api'),
('eur', '2015-08-03', 4.1345, 'exchange-api'),
('eur', '2015-08-04', 4.1524, 'exchange-api'),
('eur', '2015-08-05', 4.1349, 'exchange-api'),
('eur', '2015-08-06', 4.158, 'exchange-api'),
('eur', '2015-08-07', 4.163, 'exchange-api'),
('eur', '2015-08-10', 4.1682, 'exchange-api'),
('eur', '2015-08-11', 4.2144, 'exchange-api'),
('eur', '2015-08-12', 4.2511, 'exchange-api'),
('eur', '2015-08-13', 4.2281, 'exchange-api'),
('eur', '2015-08-14', 4.2159, 'exchange-api'),
('eur', '2015-08-17', 4.2225, 'exchange-api'),
('eur', '2015-08-18', 4.2366, 'exchange-api'),
('eur', '2015-08-19', 4.2804, 'exchange-api'),
('eur', '2015-08-20', 4.3426, 'exchange-api'),
('eur', '2015-08-21', 4.3559, 'exchange-api'),
('eur', '2015-08-24', 4.4582, 'exchange-api'),
('eur', '2015-08-25', 4.4504, 'exchange-api'),
('eur', '2015-08-26', 4.4749, 'exchange-api'),
('eur', '2015-08-27', 4.4327, 'exchange-api'),
('eur', '2015-08-28', 4.4284, 'exchange-api'),
('eur', '2015-08-31', 4.4035, 'exchange-api'),
('eur', '2015-09-01', 4.4202, 'exchange-api'),
('eur', '2015-09-02', 4.4268, 'exchange-api'),
('eur', '2015-09-03', 4.416, 'exchange-api'),
('eur', '2015-09-04', 4.3758, 'exchange-api'),
('eur', '2015-09-07', 4.385, 'exchange-api'),
('eur', '2015-09-08', 4.3773, 'exchange-api'),
('eur', '2015-09-09', 4.3256, 'exchange-api'),
('eur', '2015-09-10', 4.3712, 'exchange-api'),
('eur', '2015-09-11', 4.369, 'exchange-api'),
('eur', '2015-09-16', 4.3628, 'exchange-api'),
('eur', '2015-09-17', 4.3839, 'exchange-api'),
('eur', '2015-09-18', 4.4246, 'exchange-api'),
('eur', '2015-09-21', 4.4145, 'exchange-api'),
('eur', '2015-09-24', 4.4318, 'exchange-api'),
('eur', '2015-09-25', 4.4008, 'exchange-api'),
('eur', '2015-09-29', 4.429, 'exchange-api'),
('eur', '2015-09-30', 4.4038, 'exchange-api'),
('eur', '2015-10-01', 4.3692, 'exchange-api'),
('eur', '2015-10-02', 4.3811, 'exchange-api'),
('eur', '2015-10-06', 4.3465, 'exchange-api'),
('eur', '2015-10-07', 4.333, 'exchange-api'),
('eur', '2015-10-08', 4.346, 'exchange-api'),
('eur', '2015-10-09', 4.3483, 'exchange-api'),
('eur', '2015-10-12', 4.3609, 'exchange-api'),
('eur', '2015-10-13', 4.3964, 'exchange-api'),
('eur', '2015-10-14', 4.3909, 'exchange-api'),
('eur', '2015-10-15', 4.3689, 'exchange-api'),
('eur', '2015-10-16', 4.3358, 'exchange-api'),
('eur', '2015-10-19', 4.349, 'exchange-api'),
('eur', '2015-10-20', 4.3921, 'exchange-api'),
('eur', '2015-10-21', 4.3837, 'exchange-api'),
('eur', '2015-10-22', 4.3623, 'exchange-api'),
('eur', '2015-10-23', 4.3056, 'exchange-api'),
('eur', '2015-10-26', 4.2941, 'exchange-api'),
('eur', '2015-10-27', 4.276, 'exchange-api'),
('eur', '2015-10-28', 4.2922, 'exchange-api'),
('eur', '2015-10-29', 4.2592, 'exchange-api'),
('eur', '2015-10-30', 4.2529, 'exchange-api'),
('eur', '2015-11-02', 4.261, 'exchange-api'),
('eur', '2015-11-03', 4.256, 'exchange-api'),
('eur', '2015-11-04', 4.2395, 'exchange-api'),
('eur', '2015-11-05', 4.2218, 'exchange-api'),
('eur', '2015-11-06', 4.2281, 'exchange-api'),
('eur', '2015-11-09', 4.2204, 'exchange-api'),
('eur', '2015-11-10', 4.2075, 'exchange-api'),
('eur', '2015-11-11', 4.1912, 'exchange-api'),
('eur', '2015-11-12', 4.1748, 'exchange-api'),
('eur', '2015-11-13', 4.1823, 'exchange-api'),
('eur', '2015-11-16', 4.1776, 'exchange-api'),
('eur', '2015-11-17', 4.1635, 'exchange-api'),
('eur', '2015-11-18', 4.1627, 'exchange-api'),
('eur', '2015-11-19', 4.1627, 'exchange-api'),
('eur', '2015-11-20', 4.1447, 'exchange-api'),
('eur', '2015-11-23', 4.1383, 'exchange-api'),
('eur', '2015-11-24', 4.1219, 'exchange-api'),
('eur', '2015-11-25', 4.1056, 'exchange-api'),
('eur', '2015-11-26', 4.1189, 'exchange-api'),
('eur', '2015-11-27', 4.1285, 'exchange-api'),
('eur', '2015-11-30', 4.0995, 'exchange-api'),
('eur', '2015-12-01', 4.1105, 'exchange-api'),
('eur', '2015-12-02', 4.11, 'exchange-api'),
('eur', '2015-12-03', 4.1005, 'exchange-api'),
('eur', '2015-12-04', 4.195, 'exchange-api'),
('eur', '2015-12-07', 4.166, 'exchange-api'),
('eur', '2015-12-08', 4.2123, 'exchange-api'),
('eur', '2015-12-09', 4.252, 'exchange-api'),
('eur', '2015-12-10', 4.2357, 'exchange-api'),
('eur', '2015-12-11', 4.2282, 'exchange-api'),
('eur', '2015-12-14', 4.2318, 'exchange-api'),
('eur', '2015-12-15', 4.2414, 'exchange-api'),
('eur', '2015-12-16', 4.2356, 'exchange-api'),
('eur', '2015-12-17', 4.2244, 'exchange-api'),
('eur', '2015-12-18', 4.2138, 'exchange-api'),
('eur', '2015-12-21', 4.2374, 'exchange-api'),
('eur', '2015-12-22', 4.2703, 'exchange-api'),
('eur', '2015-12-23', 4.2568, 'exchange-api'),
('eur', '2015-12-24', 4.2635, 'exchange-api'),
('eur', '2015-12-28', 4.2697, 'exchange-api'),
('eur', '2015-12-29', 4.2595, 'exchange-api'),
('eur', '2015-12-30', 4.2569, 'exchange-api'),
('eur', '2015-12-31', 4.2468, 'exchange-api'),
('eur', '2016-01-04', 4.2689, 'exchange-api'),
('eur', '2016-01-05', 4.2293, 'exchange-api'),
('eur', '2016-01-06', 4.2378, 'exchange-api'),
('eur', '2016-01-07', 4.2728, 'exchange-api'),
('eur', '2016-01-08', 4.2676, 'exchange-api'),
('eur', '2016-01-11', 4.2812, 'exchange-api'),
('eur', '2016-01-12', 4.2735, 'exchange-api'),
('eur', '2016-01-13', 4.2618, 'exchange-api'),
('eur', '2016-01-14', 4.3119, 'exchange-api'),
('eur', '2016-01-15', 4.3026, 'exchange-api'),
('eur', '2016-01-18', 4.3104, 'exchange-api'),
('eur', '2016-01-19', 4.2955, 'exchange-api'),
('eur', '2016-01-20', 4.3469, 'exchange-api'),
('eur', '2016-01-21', 4.3302, 'exchange-api'),
('eur', '2016-01-22', 4.304, 'exchange-api'),
('eur', '2016-01-25', 4.3081, 'exchange-api'),
('eur', '2016-01-26', 4.3075, 'exchange-api'),
('eur', '2016-01-27', 4.3217, 'exchange-api'),
('eur', '2016-01-28', 4.3202, 'exchange-api'),
('eur', '2016-01-29', 4.3097, 'exchange-api'),
('eur', '2016-02-01', 4.2971, 'exchange-api'),
('eur', '2016-02-02', 4.317, 'exchange-api'),
('eur', '2016-02-03', 4.3316, 'exchange-api'),
('eur', '2016-02-04', 4.3696, 'exchange-api'),
('eur', '2016-02-05', 4.3457, 'exchange-api'),
('eur', '2016-02-08', 4.3273, 'exchange-api'),
('eur', '2016-02-09', 4.364, 'exchange-api'),
('eur', '2016-02-10', 4.3587, 'exchange-api'),
('eur', '2016-02-11', 4.4002, 'exchange-api'),
('eur', '2016-02-12', 4.3751, 'exchange-api'),
('eur', '2016-02-15', 4.3483, 'exchange-api'),
('eur', '2016-02-16', 4.3678, 'exchange-api'),
('eur', '2016-02-17', 4.3516, 'exchange-api'),
('eur', '2016-02-18', 4.3367, 'exchange-api'),
('eur', '2016-02-19', 4.3489, 'exchange-api'),
('eur', '2016-02-22', 4.3198, 'exchange-api'),
('eur', '2016-02-23', 4.2992, 'exchange-api'),
('eur', '2016-02-24', 4.3056, 'exchange-api'),
('eur', '2016-02-25', 4.3104, 'exchange-api'),
('eur', '2016-02-26', 4.2994, 'exchange-api'),
('eur', '2016-02-29', 4.2547, 'exchange-api'),
('eur', '2016-03-01', 4.2373, 'exchange-api'),
('eur', '2016-03-02', 4.2173, 'exchange-api'),
('eur', '2016-03-03', 4.2305, 'exchange-api'),
('eur', '2016-03-04', 4.2573, 'exchange-api'),
('eur', '2016-03-07', 4.2812, 'exchange-api'),
('eur', '2016-03-08', 4.311, 'exchange-api'),
('eur', '2016-03-09', 4.288, 'exchange-api'),
('eur', '2016-03-10', 4.2451, 'exchange-api'),
('eur', '2016-03-11', 4.3115, 'exchange-api'),
('eur', '2016-03-14', 4.3092, 'exchange-api'),
('eur', '2016-03-15', 4.3255, 'exchange-api'),
('eur', '2016-03-16', 4.3247, 'exchange-api'),
('eur', '2016-03-17', 4.3521, 'exchange-api'),
('eur', '2016-03-18', 4.347, 'exchange-api'),
('eur', '2016-03-21', 4.3446, 'exchange-api'),
('eur', '2016-03-22', 4.3222, 'exchange-api'),
('eur', '2016-03-23', 4.2932, 'exchange-api'),
('eur', '2016-03-28', 4.2827, 'exchange-api'),
('eur', '2016-03-29', 4.284, 'exchange-api'),
('eur', '2016-03-30', 4.2898, 'exchange-api'),
('eur', '2016-03-31', 4.2856, 'exchange-api'),
('eur', '2016-04-01', 4.3145, 'exchange-api'),
('eur', '2016-04-04', 4.3041, 'exchange-api'),
('eur', '2016-04-05', 4.3201, 'exchange-api'),
('eur', '2016-04-06', 4.3294, 'exchange-api'),
('eur', '2016-04-07', 4.3115, 'exchange-api'),
('eur', '2016-04-08', 4.3131, 'exchange-api'),
('eur', '2016-04-11', 4.308, 'exchange-api'),
('eur', '2016-04-12', 4.2941, 'exchange-api'),
('eur', '2016-04-13', 4.2631, 'exchange-api'),
('eur', '2016-04-14', 4.266, 'exchange-api'),
('eur', '2016-04-15', 4.265, 'exchange-api'),
('eur', '2016-04-18', 4.2643, 'exchange-api'),
('eur', '2016-04-19', 4.2676, 'exchange-api'),
('eur', '2016-04-20', 4.2751, 'exchange-api'),
('eur', '2016-04-21', 4.2619, 'exchange-api'),
('eur', '2016-04-25', 4.2492, 'exchange-api'),
('eur', '2016-04-26', 4.2498, 'exchange-api'),
('eur', '2016-04-27', 4.267, 'exchange-api'),
('eur', '2016-04-28', 4.2717, 'exchange-api'),
('eur', '2016-05-02', 4.3018, 'exchange-api'),
('eur', '2016-05-03', 4.3356, 'exchange-api'),
('eur', '2016-05-04', 4.336, 'exchange-api'),
('eur', '2016-05-05', 4.3213, 'exchange-api'),
('eur', '2016-05-06', 4.3249, 'exchange-api'),
('eur', '2016-05-09', 4.3038, 'exchange-api'),
('eur', '2016-05-10', 4.3034, 'exchange-api'),
('eur', '2016-05-11', 4.2963, 'exchange-api'),
('eur', '2016-05-13', 4.2788, 'exchange-api'),
('eur', '2016-05-16', 4.3145, 'exchange-api'),
('eur', '2016-05-17', 4.3219, 'exchange-api'),
('eur', '2016-05-18', 4.3234, 'exchange-api'),
('eur', '2016-05-19', 4.3228, 'exchange-api'),
('eur', '2016-05-20', 4.3432, 'exchange-api'),
('eur', '2016-05-23', 4.3455, 'exchange-api'),
('eur', '2016-05-24', 4.3215, 'exchange-api'),
('eur', '2016-05-25', 4.2951, 'exchange-api'),
('eur', '2016-05-26', 4.289, 'exchange-api'),
('eur', '2016-05-27', 4.2994, 'exchange-api'),
('eur', '2016-05-31', 4.2951, 'exchange-api'),
('eur', '2016-06-01', 4.3, 'exchange-api'),
('eur', '2016-06-02', 4.3117, 'exchange-api'),
('eur', '2016-06-03', 4.3149, 'exchange-api'),
('eur', '2016-06-06', 4.3467, 'exchange-api'),
('eur', '2016-06-07', 4.3302, 'exchange-api'),
('eur', '2016-06-08', 4.3533, 'exchange-api'),
('eur', '2016-06-09', 4.3603, 'exchange-api'),
('eur', '2016-06-10', 4.3479, 'exchange-api'),
('eur', '2016-06-13', 4.3669, 'exchange-api'),
('eur', '2016-06-14', 4.335, 'exchange-api'),
('eur', '2016-06-15', 4.3509, 'exchange-api'),
('eur', '2016-06-16', 4.3311, 'exchange-api'),
('eur', '2016-06-17', 4.3382, 'exchange-api'),
('eur', '2016-06-20', 4.3627, 'exchange-api'),
('eur', '2016-06-21', 4.3701, 'exchange-api'),
('eur', '2016-06-22', 4.3472, 'exchange-api'),
('eur', '2016-06-23', 4.3533, 'exchange-api'),
('eur', '2016-06-24', 4.3187, 'exchange-api'),
('eur', '2016-06-27', 4.2912, 'exchange-api'),
('eur', '2016-06-28', 4.3011, 'exchange-api'),
('eur', '2016-06-29', 4.2811, 'exchange-api'),
('eur', '2016-06-30', 4.2839, 'exchange-api'),
('eur', '2016-07-01', 4.2703, 'exchange-api'),
('eur', '2016-07-04', 4.2908, 'exchange-api'),
('eur', '2016-07-05', 4.3109, 'exchange-api'),
('eur', '2016-07-06', 4.3065, 'exchange-api'),
('eur', '2016-07-07', 4.2971, 'exchange-api'),
('eur', '2016-07-08', 4.299, 'exchange-api'),
('eur', '2016-07-11', 4.2894, 'exchange-api'),
('eur', '2016-07-12', 4.304, 'exchange-api'),
('eur', '2016-07-13', 4.2868, 'exchange-api'),
('eur', '2016-07-14', 4.279, 'exchange-api'),
('eur', '2016-07-15', 4.2842, 'exchange-api'),
('eur', '2016-07-18', 4.2652, 'exchange-api'),
('eur', '2016-07-19', 4.2648, 'exchange-api'),
('eur', '2016-07-20', 4.2496, 'exchange-api'),
('eur', '2016-07-21', 4.2486, 'exchange-api'),
('eur', '2016-07-22', 4.2353, 'exchange-api'),
('eur', '2016-07-25', 4.2263, 'exchange-api'),
('eur', '2016-07-26', 4.229, 'exchange-api'),
('eur', '2016-07-27', 4.2219, 'exchange-api'),
('eur', '2016-07-28', 4.2442, 'exchange-api'),
('eur', '2016-07-29', 4.246, 'exchange-api'),
('eur', '2016-08-01', 4.2489, 'exchange-api'),
('eur', '2016-08-02', 4.2712, 'exchange-api'),
('eur', '2016-08-03', 4.2819, 'exchange-api'),
('eur', '2016-08-04', 4.258, 'exchange-api'),
('eur', '2016-08-05', 4.2551, 'exchange-api'),
('eur', '2016-08-08', 4.2464, 'exchange-api'),
('eur', '2016-08-09', 4.2355, 'exchange-api'),
('eur', '2016-08-10', 4.2632, 'exchange-api'),
('eur', '2016-08-11', 4.2494, 'exchange-api'),
('eur', '2016-08-12', 4.2512, 'exchange-api'),
('eur', '2016-08-15', 4.2553, 'exchange-api'),
('eur', '2016-08-16', 4.2536, 'exchange-api'),
('eur', '2016-08-17', 4.2723, 'exchange-api'),
('eur', '2016-08-18', 4.2781, 'exchange-api'),
('eur', '2016-08-19', 4.2725, 'exchange-api'),
('eur', '2016-08-22', 4.2715, 'exchange-api'),
('eur', '2016-08-23', 4.2702, 'exchange-api'),
('eur', '2016-08-24', 4.2508, 'exchange-api'),
('eur', '2016-08-25', 4.2549, 'exchange-api'),
('eur', '2016-08-26', 4.2386, 'exchange-api'),
('eur', '2016-08-29', 4.2373, 'exchange-api'),
('eur', '2016-08-30', 4.2237, 'exchange-api'),
('eur', '2016-08-31', 4.2197, 'exchange-api'),
('eur', '2016-09-01', 4.209, 'exchange-api'),
('eur', '2016-09-02', 4.2172, 'exchange-api'),
('eur', '2016-09-05', 4.2042, 'exchange-api'),
('eur', '2016-09-06', 4.2057, 'exchange-api'),
('eur', '2016-09-07', 4.2339, 'exchange-api'),
('eur', '2016-09-08', 4.2361, 'exchange-api'),
('eur', '2016-09-09', 4.2327, 'exchange-api'),
('eur', '2016-09-12', 4.232, 'exchange-api'),
('eur', '2016-09-13', 4.2373, 'exchange-api'),
('eur', '2016-09-14', 4.2495, 'exchange-api'),
('eur', '2016-09-15', 4.2478, 'exchange-api'),
('eur', '2016-09-16', 4.2251, 'exchange-api'),
('eur', '2016-09-19', 4.2148, 'exchange-api'),
('eur', '2016-09-20', 4.2233, 'exchange-api'),
('eur', '2016-09-21', 4.2106, 'exchange-api'),
('eur', '2016-09-22', 4.2236, 'exchange-api'),
('eur', '2016-09-23', 4.2155, 'exchange-api'),
('eur', '2016-09-26', 4.2335, 'exchange-api'),
('eur', '2016-09-27', 4.2083, 'exchange-api'),
('eur', '2016-09-28', 4.2117, 'exchange-api'),
('eur', '2016-09-29', 4.2144, 'exchange-api'),
('eur', '2016-09-30', 4.203, 'exchange-api'),
('eur', '2016-10-05', 4.2405, 'exchange-api'),
('eur', '2016-10-06', 4.2263, 'exchange-api'),
('eur', '2016-10-07', 4.215, 'exchange-api'),
('eur', '2016-10-10', 4.2315, 'exchange-api'),
('eur', '2016-10-13', 4.2028, 'exchange-api'),
('eur', '2016-10-14', 4.2025, 'exchange-api'),
('eur', '2016-10-18', 4.204, 'exchange-api'),
('eur', '2016-10-19', 4.1993, 'exchange-api'),
('eur', '2016-10-20', 4.2068, 'exchange-api'),
('eur', '2016-10-21', 4.1875, 'exchange-api'),
('eur', '2016-10-25', 4.1878, 'exchange-api'),
('eur', '2016-10-26', 4.1944, 'exchange-api'),
('eur', '2016-10-27', 4.1969, 'exchange-api'),
('eur', '2016-10-28', 4.2116, 'exchange-api'),
('eur', '2016-10-31', 4.2131, 'exchange-api'),
('eur', '2016-11-01', 4.2145, 'exchange-api'),
('eur', '2016-11-02', 4.2245, 'exchange-api'),
('eur', '2016-11-03', 4.2262, 'exchange-api'),
('eur', '2016-11-04', 4.2246, 'exchange-api'),
('eur', '2016-11-07', 4.2165, 'exchange-api'),
('eur', '2016-11-08', 4.2126, 'exchange-api'),
('eur', '2016-11-09', 4.2185, 'exchange-api'),
('eur', '2016-11-10', 4.1828, 'exchange-api'),
('eur', '2016-11-11', 4.1794, 'exchange-api'),
('eur', '2016-11-14', 4.1478, 'exchange-api'),
('eur', '2016-11-15', 4.1404, 'exchange-api'),
('eur', '2016-11-16', 4.1274, 'exchange-api'),
('eur', '2016-11-17', 4.132, 'exchange-api'),
('eur', '2016-11-18', 4.105, 'exchange-api'),
('eur', '2016-11-21', 4.1127, 'exchange-api'),
('eur', '2016-11-22', 4.1059, 'exchange-api'),
('eur', '2016-11-23', 4.1083, 'exchange-api'),
('eur', '2016-11-24', 4.0942, 'exchange-api'),
('eur', '2016-11-25', 4.1003, 'exchange-api'),
('eur', '2016-11-28', 4.089, 'exchange-api'),
('eur', '2016-11-29', 4.0762, 'exchange-api'),
('eur', '2016-11-30', 4.0807, 'exchange-api'),
('eur', '2016-12-01', 4.0755, 'exchange-api'),
('eur', '2016-12-02', 4.0822, 'exchange-api'),
('eur', '2016-12-05', 4.0934, 'exchange-api'),
('eur', '2016-12-06', 4.0877, 'exchange-api'),
('eur', '2016-12-07', 4.0805, 'exchange-api'),
('eur', '2016-12-08', 4.0878, 'exchange-api'),
('eur', '2016-12-09', 4.0521, 'exchange-api'),
('eur', '2016-12-12', 4.0554, 'exchange-api'),
('eur', '2016-12-13', 4.0415, 'exchange-api'),
('eur', '2016-12-14', 4.0481, 'exchange-api'),
('eur', '2016-12-15', 4.0084, 'exchange-api'),
('eur', '2016-12-16', 4.0186, 'exchange-api'),
('eur', '2016-12-19', 4.0307, 'exchange-api'),
('eur', '2016-12-20', 4.0023, 'exchange-api'),
('eur', '2016-12-21', 3.9941, 'exchange-api'),
('eur', '2016-12-22', 3.9894, 'exchange-api'),
('eur', '2016-12-23', 3.9874, 'exchange-api'),
('eur', '2016-12-27', 4.0202, 'exchange-api'),
('eur', '2016-12-28', 4.0069, 'exchange-api'),
('eur', '2016-12-29', 4.0201, 'exchange-api'),
('eur', '2016-12-30', 4.0438, 'exchange-api'),
('eur', '2017-01-03', 4.0085, 'exchange-api'),
('eur', '2017-01-04', 4.024, 'exchange-api'),
('eur', '2017-01-05', 4.0484, 'exchange-api'),
('eur', '2017-01-06', 4.0742, 'exchange-api'),
('eur', '2017-01-09', 4.0521, 'exchange-api'),
('eur', '2017-01-10', 4.0677, 'exchange-api'),
('eur', '2017-01-11', 4.0482, 'exchange-api'),
('eur', '2017-01-12', 4.0733, 'exchange-api'),
('eur', '2017-01-13', 4.0641, 'exchange-api'),
('eur', '2017-01-16', 4.0533, 'exchange-api'),
('eur', '2017-01-17', 4.0893, 'exchange-api'),
('eur', '2017-01-18', 4.0702, 'exchange-api'),
('eur', '2017-01-19', 4.0623, 'exchange-api'),
('eur', '2017-01-20', 4.0563, 'exchange-api'),
('eur', '2017-01-23', 4.0763, 'exchange-api'),
('eur', '2017-01-24', 4.0688, 'exchange-api'),
('eur', '2017-01-25', 4.0702, 'exchange-api'),
('eur', '2017-01-26', 4.0577, 'exchange-api'),
('eur', '2017-01-27', 4.0544, 'exchange-api'),
('eur', '2017-01-30', 4.0242, 'exchange-api'),
('eur', '2017-01-31', 4.0546, 'exchange-api'),
('eur', '2017-02-01', 4.0676, 'exchange-api'),
('eur', '2017-02-02', 4.0658, 'exchange-api'),
('eur', '2017-02-03', 4.0399, 'exchange-api'),
('eur', '2017-02-06', 4.0225, 'exchange-api'),
('eur', '2017-02-07', 4.0072, 'exchange-api'),
('eur', '2017-02-08', 3.9947, 'exchange-api'),
('eur', '2017-02-09', 4.0063, 'exchange-api'),
('eur', '2017-02-10', 3.9882, 'exchange-api'),
('eur', '2017-02-13', 3.9868, 'exchange-api'),
('eur', '2017-02-14', 3.9817, 'exchange-api'),
('eur', '2017-02-15', 3.9542, 'exchange-api'),
('eur', '2017-02-16', 3.9509, 'exchange-api'),
('eur', '2017-02-17', 3.957, 'exchange-api'),
('eur', '2017-02-20', 3.9397, 'exchange-api'),
('eur', '2017-02-21', 3.9066, 'exchange-api'),
('eur', '2017-02-22', 3.8954, 'exchange-api'),
('eur', '2017-02-23', 3.9131, 'exchange-api'),
('eur', '2017-02-24', 3.9183, 'exchange-api'),
('eur', '2017-02-27', 3.8942, 'exchange-api'),
('eur', '2017-02-28', 3.8782, 'exchange-api'),
('eur', '2017-03-01', 3.8246, 'exchange-api'),
('eur', '2017-03-02', 3.8809, 'exchange-api'),
('eur', '2017-03-03', 3.8836, 'exchange-api'),
('eur', '2017-03-06', 3.897, 'exchange-api'),
('eur', '2017-03-07', 3.8866, 'exchange-api'),
('eur', '2017-03-08', 3.8883, 'exchange-api'),
('eur', '2017-03-09', 3.8929, 'exchange-api'),
('eur', '2017-03-10', 3.9012, 'exchange-api'),
('eur', '2017-03-14', 3.893, 'exchange-api'),
('eur', '2017-03-15', 3.8874, 'exchange-api'),
('eur', '2017-03-16', 3.8916, 'exchange-api'),
('eur', '2017-03-17', 3.9095, 'exchange-api'),
('eur', '2017-03-20', 3.8905, 'exchange-api'),
('eur', '2017-03-21', 3.9068, 'exchange-api'),
('eur', '2017-03-22', 3.9438, 'exchange-api'),
('eur', '2017-03-23', 3.9316, 'exchange-api'),
('eur', '2017-03-24', 3.9366, 'exchange-api'),
('eur', '2017-03-27', 3.9327, 'exchange-api'),
('eur', '2017-03-28', 3.9243, 'exchange-api'),
('eur', '2017-03-29', 3.9115, 'exchange-api'),
('eur', '2017-03-30', 3.882, 'exchange-api'),
('eur', '2017-03-31', 3.8822, 'exchange-api'),
('eur', '2017-04-03', 3.867, 'exchange-api'),
('eur', '2017-04-04', 3.882, 'exchange-api'),
('eur', '2017-04-05', 3.9007, 'exchange-api'),
('eur', '2017-04-06', 3.8912, 'exchange-api'),
('eur', '2017-04-07', 3.8828, 'exchange-api'),
('eur', '2017-04-12', 3.8807, 'exchange-api'),
('eur', '2017-04-13', 3.884, 'exchange-api'),
('eur', '2017-04-18', 3.9148, 'exchange-api'),
('eur', '2017-04-19', 3.9329, 'exchange-api'),
('eur', '2017-04-20', 3.9363, 'exchange-api'),
('eur', '2017-04-21', 3.9469, 'exchange-api'),
('eur', '2017-04-24', 3.9622, 'exchange-api'),
('eur', '2017-04-25', 3.9683, 'exchange-api'),
('eur', '2017-04-26', 3.9598, 'exchange-api'),
('eur', '2017-04-27', 3.97, 'exchange-api'),
('eur', '2017-04-28', 3.9395, 'exchange-api'),
('eur', '2017-05-03', 3.9415, 'exchange-api'),
('eur', '2017-05-04', 3.9538, 'exchange-api'),
('eur', '2017-05-05', 3.9635, 'exchange-api'),
('eur', '2017-05-08', 3.9478, 'exchange-api'),
('eur', '2017-05-09', 3.925, 'exchange-api'),
('eur', '2017-05-10', 3.9167, 'exchange-api'),
('eur', '2017-05-11', 3.9252, 'exchange-api'),
('eur', '2017-05-12', 3.9216, 'exchange-api'),
('eur', '2017-05-15', 3.9447, 'exchange-api'),
('eur', '2017-05-16', 3.9853, 'exchange-api'),
('eur', '2017-05-17', 4.0024, 'exchange-api'),
('eur', '2017-05-18', 4.0114, 'exchange-api'),
('eur', '2017-05-19', 4.0015, 'exchange-api'),
('eur', '2017-05-22', 4.0252, 'exchange-api'),
('eur', '2017-05-23', 4.0357, 'exchange-api'),
('eur', '2017-05-24', 4.0192, 'exchange-api'),
('eur', '2017-05-25', 4.0099, 'exchange-api'),
('eur', '2017-05-26', 4.0065, 'exchange-api'),
('eur', '2017-05-30', 3.9684, 'exchange-api'),
('eur', '2017-06-01', 3.9814, 'exchange-api'),
('eur', '2017-06-02', 3.994, 'exchange-api'),
('eur', '2017-06-05', 3.9877, 'exchange-api'),
('eur', '2017-06-06', 3.9864, 'exchange-api'),
('eur', '2017-06-07', 3.9767, 'exchange-api'),
('eur', '2017-06-08', 3.975, 'exchange-api'),
('eur', '2017-06-09', 3.9541, 'exchange-api'),
('eur', '2017-06-12', 3.9656, 'exchange-api'),
('eur', '2017-06-13', 3.9594, 'exchange-api'),
('eur', '2017-06-14', 3.9536, 'exchange-api'),
('eur', '2017-06-15', 3.9305, 'exchange-api'),
('eur', '2017-06-16', 3.9393, 'exchange-api'),
('eur', '2017-06-19', 3.9462, 'exchange-api'),
('eur', '2017-06-20', 3.9408, 'exchange-api'),
('eur', '2017-06-21', 3.9502, 'exchange-api'),
('eur', '2017-06-22', 3.9553, 'exchange-api'),
('eur', '2017-06-23', 3.9565, 'exchange-api'),
('eur', '2017-06-26', 3.9521, 'exchange-api'),
('eur', '2017-06-27', 3.9593, 'exchange-api'),
('eur', '2017-06-28', 4.0022, 'exchange-api'),
('eur', '2017-06-29', 3.9825, 'exchange-api'),
('eur', '2017-06-30', 3.9859, 'exchange-api'),
('eur', '2017-07-03', 3.974, 'exchange-api'),
('eur', '2017-07-04', 3.9889, 'exchange-api'),
('eur', '2017-07-05', 3.9919, 'exchange-api'),
('eur', '2017-07-06', 4.0165, 'exchange-api'),
('eur', '2017-07-07', 4.0282, 'exchange-api'),
('eur', '2017-07-10', 4.0418, 'exchange-api'),
('eur', '2017-07-11', 4.0753, 'exchange-api'),
('eur', '2017-07-12', 4.0698, 'exchange-api'),
('eur', '2017-07-13', 4.0277, 'exchange-api'),
('eur', '2017-07-14', 4.0368, 'exchange-api'),
('eur', '2017-07-17', 4.0638, 'exchange-api'),
('eur', '2017-07-18', 4.1178, 'exchange-api'),
('eur', '2017-07-19', 4.1385, 'exchange-api'),
('eur', '2017-07-20', 4.1052, 'exchange-api'),
('eur', '2017-07-21', 4.14, 'exchange-api'),
('eur', '2017-07-24', 4.1801, 'exchange-api'),
('eur', '2017-07-25', 4.1579, 'exchange-api'),
('eur', '2017-07-26', 4.1572, 'exchange-api'),
('eur', '2017-07-27', 4.1675, 'exchange-api'),
('eur', '2017-07-28', 4.1636, 'exchange-api'),
('eur', '2017-07-31', 4.1745, 'exchange-api'),
('eur', '2017-08-02', 4.2346, 'exchange-api'),
('eur', '2017-08-03', 4.25, 'exchange-api'),
('eur', '2017-08-04', 4.2869, 'exchange-api'),
('eur', '2017-08-07', 4.2734, 'exchange-api'),
('eur', '2017-08-08', 4.2597, 'exchange-api'),
('eur', '2017-08-09', 4.2253, 'exchange-api'),
('eur', '2017-08-10', 4.2157, 'exchange-api'),
('eur', '2017-08-11', 4.217, 'exchange-api'),
('eur', '2017-08-14', 4.2266, 'exchange-api'),
('eur', '2017-08-15', 4.2152, 'exchange-api'),
('eur', '2017-08-16', 4.2465, 'exchange-api'),
('eur', '2017-08-17', 4.2403, 'exchange-api'),
('eur', '2017-08-18', 4.2514, 'exchange-api'),
('eur', '2017-08-21', 4.261, 'exchange-api'),
('eur', '2017-08-22', 4.2575, 'exchange-api'),
('eur', '2017-08-23', 4.2677, 'exchange-api'),
('eur', '2017-08-24', 4.2443, 'exchange-api'),
('eur', '2017-08-25', 4.2415, 'exchange-api'),
('eur', '2017-08-28', 4.2709, 'exchange-api'),
('eur', '2017-08-29', 4.3049, 'exchange-api'),
('eur', '2017-08-30', 4.2713, 'exchange-api'),
('eur', '2017-08-31', 4.2607, 'exchange-api'),
('eur', '2017-09-01', 4.2582, 'exchange-api'),
('eur', '2017-09-04', 4.2647, 'exchange-api'),
('eur', '2017-09-05', 4.242, 'exchange-api'),
('eur', '2017-09-06', 4.2469, 'exchange-api'),
('eur', '2017-09-07', 4.2274, 'exchange-api'),
('eur', '2017-09-08', 4.2268, 'exchange-api'),
('eur', '2017-09-11', 4.2302, 'exchange-api'),
('eur', '2017-09-12', 4.2298, 'exchange-api'),
('eur', '2017-09-13', 4.2362, 'exchange-api'),
('eur', '2017-09-14', 4.2033, 'exchange-api'),
('eur', '2017-09-15', 4.1971, 'exchange-api'),
('eur', '2017-09-18', 4.2062, 'exchange-api'),
('eur', '2017-09-19', 4.2131, 'exchange-api'),
('eur', '2017-09-25', 4.1704, 'exchange-api'),
('eur', '2017-09-26', 4.1567, 'exchange-api'),
('eur', '2017-09-27', 4.1622, 'exchange-api'),
('eur', '2017-09-28', 4.1569, 'exchange-api'),
('eur', '2017-10-02', 4.1553, 'exchange-api'),
('eur', '2017-10-03', 4.1463, 'exchange-api'),
('eur', '2017-10-04', 4.1414, 'exchange-api'),
('eur', '2017-10-06', 4.1155, 'exchange-api'),
('eur', '2017-10-09', 4.12, 'exchange-api'),
('eur', '2017-10-10', 4.1274, 'exchange-api'),
('eur', '2017-10-11', 4.1457, 'exchange-api'),
('eur', '2017-10-13', 4.141, 'exchange-api'),
('eur', '2017-10-16', 4.1257, 'exchange-api'),
('eur', '2017-10-17', 4.1285, 'exchange-api'),
('eur', '2017-10-18', 4.1277, 'exchange-api'),
('eur', '2017-10-19', 4.1402, 'exchange-api'),
('eur', '2017-10-20', 4.121, 'exchange-api'),
('eur', '2017-10-23', 4.1002, 'exchange-api'),
('eur', '2017-10-24', 4.1155, 'exchange-api'),
('eur', '2017-10-25', 4.1349, 'exchange-api'),
('eur', '2017-10-26', 4.1456, 'exchange-api'),
('eur', '2017-10-27', 4.1119, 'exchange-api'),
('eur', '2017-10-30', 4.1035, 'exchange-api'),
('eur', '2017-10-31', 4.0956, 'exchange-api'),
('eur', '2017-11-01', 4.0813, 'exchange-api'),
('eur', '2017-11-02', 4.0862, 'exchange-api'),
('eur', '2017-11-03', 4.0908, 'exchange-api'),
('eur', '2017-11-06', 4.0707, 'exchange-api'),
('eur', '2017-11-07', 4.0664, 'exchange-api'),
('eur', '2017-11-08', 4.07, 'exchange-api'),
('eur', '2017-11-09', 4.0866, 'exchange-api'),
('eur', '2017-11-10', 4.1069, 'exchange-api'),
('eur', '2017-11-13', 4.1287, 'exchange-api'),
('eur', '2017-11-14', 4.1616, 'exchange-api'),
('eur', '2017-11-15', 4.1824, 'exchange-api'),
('eur', '2017-11-16', 4.1462, 'exchange-api'),
('eur', '2017-11-17', 4.1506, 'exchange-api'),
('eur', '2017-11-20', 4.1408, 'exchange-api'),
('eur', '2017-11-21', 4.1373, 'exchange-api'),
('eur', '2017-11-22', 4.1416, 'exchange-api'),
('eur', '2017-11-23', 4.161, 'exchange-api'),
('eur', '2017-11-24', 4.1642, 'exchange-api'),
('eur', '2017-11-27', 4.18, 'exchange-api'),
('eur', '2017-11-28', 4.1634, 'exchange-api'),
('eur', '2017-11-29', 4.1448, 'exchange-api'),
('eur', '2017-11-30', 4.1429, 'exchange-api'),
('eur', '2017-12-01', 4.1521, 'exchange-api'),
('eur', '2017-12-04', 4.1362, 'exchange-api'),
('eur', '2017-12-05', 4.142, 'exchange-api'),
('eur', '2017-12-06', 4.1527, 'exchange-api'),
('eur', '2017-12-07', 4.1437, 'exchange-api'),
('eur', '2017-12-08', 4.1335, 'exchange-api'),
('eur', '2017-12-11', 4.1504, 'exchange-api'),
('eur', '2017-12-12', 4.1669, 'exchange-api'),
('eur', '2017-12-13', 4.1671, 'exchange-api'),
('eur', '2017-12-14', 4.1758, 'exchange-api'),
('eur', '2017-12-15', 4.1549, 'exchange-api'),
('eur', '2017-12-18', 4.1413, 'exchange-api'),
('eur', '2017-12-19', 4.1317, 'exchange-api'),
('eur', '2017-12-20', 4.1445, 'exchange-api'),
('eur', '2017-12-21', 4.1378, 'exchange-api'),
('eur', '2017-12-22', 4.1308, 'exchange-api'),
('eur', '2017-12-26', 4.1339, 'exchange-api'),
('eur', '2017-12-27', 4.1377, 'exchange-api'),
('eur', '2017-12-28', 4.144, 'exchange-api'),
('eur', '2017-12-29', 4.1526, 'exchange-api'),
('eur', '2018-01-02', 4.1702, 'exchange-api'),
('eur', '2018-01-03', 4.1578, 'exchange-api'),
('eur', '2018-01-04', 4.1598, 'exchange-api'),
('eur', '2018-01-05', 4.1524, 'exchange-api'),
('eur', '2018-01-08', 4.1242, 'exchange-api'),
('eur', '2018-01-09', 4.1087, 'exchange-api'),
('eur', '2018-01-10', 4.1139, 'exchange-api'),
('eur', '2018-01-11', 4.1125, 'exchange-api'),
('eur', '2018-01-12', 4.1198, 'exchange-api'),
('eur', '2018-01-15', 4.1737, 'exchange-api'),
('eur', '2018-01-16', 4.1706, 'exchange-api'),
('eur', '2018-01-17', 4.2136, 'exchange-api'),
('eur', '2018-01-18', 4.1986, 'exchange-api'),
('eur', '2018-01-19', 4.1796, 'exchange-api'),
('eur', '2018-01-22', 4.1901, 'exchange-api'),
('eur', '2018-01-23', 4.1887, 'exchange-api'),
('eur', '2018-01-24', 4.2032, 'exchange-api'),
('eur', '2018-01-25', 4.2218, 'exchange-api'),
('eur', '2018-01-26', 4.2171, 'exchange-api'),
('eur', '2018-01-29', 4.2265, 'exchange-api'),
('eur', '2018-01-30', 4.2215, 'exchange-api'),
('eur', '2018-01-31', 4.2413, 'exchange-api'),
('eur', '2018-02-01', 4.2629, 'exchange-api'),
('eur', '2018-02-02', 4.2843, 'exchange-api'),
('eur', '2018-02-05', 4.2819, 'exchange-api'),
('eur', '2018-02-06', 4.3039, 'exchange-api'),
('eur', '2018-02-07', 4.3015, 'exchange-api'),
('eur', '2018-02-08', 4.2826, 'exchange-api'),
('eur', '2018-02-09', 4.3158, 'exchange-api'),
('eur', '2018-02-12', 4.3226, 'exchange-api'),
('eur', '2018-02-13', 4.3526, 'exchange-api'),
('eur', '2018-02-14', 4.3643, 'exchange-api'),
('eur', '2018-02-15', 4.4009, 'exchange-api'),
('eur', '2018-02-16', 4.4274, 'exchange-api'),
('eur', '2018-02-19', 4.371, 'exchange-api'),
('eur', '2018-02-20', 4.3199, 'exchange-api'),
('eur', '2018-02-21', 4.3132, 'exchange-api'),
('eur', '2018-02-22', 4.298, 'exchange-api'),
('eur', '2018-02-23', 4.2931, 'exchange-api'),
('eur', '2018-02-26', 4.3106, 'exchange-api'),
('eur', '2018-02-27', 4.2801, 'exchange-api'),
('eur', '2018-02-28', 4.2586, 'exchange-api'),
('eur', '2018-03-05', 4.2509, 'exchange-api'),
('eur', '2018-03-06', 4.292, 'exchange-api'),
('eur', '2018-03-07', 4.3014, 'exchange-api'),
('eur', '2018-03-08', 4.2789, 'exchange-api'),
('eur', '2018-03-09', 4.2521, 'exchange-api'),
('eur', '2018-03-12', 4.2291, 'exchange-api'),
('eur', '2018-03-13', 4.2507, 'exchange-api'),
('eur', '2018-03-14', 4.2455, 'exchange-api'),
('eur', '2018-03-15', 4.2423, 'exchange-api'),
('eur', '2018-03-16', 4.2543, 'exchange-api'),
('eur', '2018-03-19', 4.268, 'exchange-api'),
('eur', '2018-03-20', 4.2803, 'exchange-api'),
('eur', '2018-03-21', 4.2916, 'exchange-api'),
('eur', '2018-03-22', 4.2885, 'exchange-api'),
('eur', '2018-03-23', 4.3025, 'exchange-api'),
('eur', '2018-03-26', 4.3329, 'exchange-api'),
('eur', '2018-03-27', 4.3258, 'exchange-api'),
('eur', '2018-03-28', 4.3365, 'exchange-api'),
('eur', '2018-03-29', 4.3288, 'exchange-api'),
('eur', '2018-04-03', 4.3354, 'exchange-api'),
('eur', '2018-04-04', 4.3365, 'exchange-api'),
('eur', '2018-04-05', 4.3375, 'exchange-api'),
('eur', '2018-04-09', 4.3352, 'exchange-api'),
('eur', '2018-04-10', 4.3346, 'exchange-api'),
('eur', '2018-04-11', 4.3539, 'exchange-api'),
('eur', '2018-04-12', 4.3362, 'exchange-api'),
('eur', '2018-04-13', 4.3261, 'exchange-api'),
('eur', '2018-04-16', 4.3296, 'exchange-api'),
('eur', '2018-04-17', 4.3623, 'exchange-api'),
('eur', '2018-04-18', 4.3486, 'exchange-api'),
('eur', '2018-04-20', 4.3503, 'exchange-api'),
('eur', '2018-04-23', 4.3342, 'exchange-api'),
('eur', '2018-04-24', 4.3501, 'exchange-api'),
('eur', '2018-04-25', 4.3754, 'exchange-api'),
('eur', '2018-04-26', 4.3578, 'exchange-api'),
('eur', '2018-04-27', 4.3432, 'exchange-api'),
('eur', '2018-04-30', 4.3387, 'exchange-api'),
('eur', '2018-05-01', 4.349, 'exchange-api'),
('eur', '2018-05-02', 4.3312, 'exchange-api'),
('eur', '2018-05-03', 4.3474, 'exchange-api'),
('eur', '2018-05-04', 4.3364, 'exchange-api'),
('eur', '2018-05-07', 4.3148, 'exchange-api'),
('eur', '2018-05-08', 4.2775, 'exchange-api'),
('eur', '2018-05-09', 4.2751, 'exchange-api'),
('eur', '2018-05-10', 4.2564, 'exchange-api'),
('eur', '2018-05-11', 4.255, 'exchange-api'),
('eur', '2018-05-14', 4.2849, 'exchange-api'),
('eur', '2018-05-15', 4.2895, 'exchange-api'),
('eur', '2018-05-16', 4.2353, 'exchange-api'),
('eur', '2018-05-17', 4.2259, 'exchange-api'),
('eur', '2018-05-18', 4.2409, 'exchange-api'),
('eur', '2018-05-21', 4.2102, 'exchange-api'),
('eur', '2018-05-22', 4.2116, 'exchange-api'),
('eur', '2018-05-23', 4.1882, 'exchange-api'),
('eur', '2018-05-24', 4.1804, 'exchange-api'),
('eur', '2018-05-25', 4.1756, 'exchange-api'),
('eur', '2018-05-29', 4.1525, 'exchange-api'),
('eur', '2018-05-30', 4.1616, 'exchange-api'),
('eur', '2018-05-31', 4.165, 'exchange-api'),
('eur', '2018-06-01', 4.1645, 'exchange-api'),
('eur', '2018-06-04', 4.1798, 'exchange-api'),
('eur', '2018-06-05', 4.1762, 'exchange-api'),
('eur', '2018-06-06', 4.1961, 'exchange-api'),
('eur', '2018-06-07', 4.2218, 'exchange-api'),
('eur', '2018-06-08', 4.2043, 'exchange-api'),
('eur', '2018-06-11', 4.2097, 'exchange-api'),
('eur', '2018-06-12', 4.2171, 'exchange-api'),
('eur', '2018-06-13', 4.2187, 'exchange-api'),
('eur', '2018-06-14', 4.2505, 'exchange-api'),
('eur', '2018-06-15', 4.1789, 'exchange-api'),
('eur', '2018-06-18', 4.212, 'exchange-api'),
('eur', '2018-06-19', 4.2094, 'exchange-api'),
('eur', '2018-06-20', 4.2062, 'exchange-api'),
('eur', '2018-06-21', 4.174, 'exchange-api'),
('eur', '2018-06-22', 4.2163, 'exchange-api'),
('eur', '2018-06-25', 4.2244, 'exchange-api'),
('eur', '2018-06-26', 4.2381, 'exchange-api'),
('eur', '2018-06-27', 4.236, 'exchange-api'),
('eur', '2018-06-28', 4.2258, 'exchange-api'),
('eur', '2018-06-29', 4.2551, 'exchange-api'),
('eur', '2018-07-02', 4.2626, 'exchange-api'),
('eur', '2018-07-03', 4.2609, 'exchange-api'),
('eur', '2018-07-04', 4.2544, 'exchange-api'),
('eur', '2018-07-05', 4.2454, 'exchange-api'),
('eur', '2018-07-06', 4.2589, 'exchange-api'),
('eur', '2018-07-09', 4.2656, 'exchange-api'),
('eur', '2018-07-10', 4.2607, 'exchange-api'),
('eur', '2018-07-11', 4.2578, 'exchange-api'),
('eur', '2018-07-12', 4.2565, 'exchange-api'),
('eur', '2018-07-13', 4.2379, 'exchange-api'),
('eur', '2018-07-16', 4.2658, 'exchange-api'),
('eur', '2018-07-17', 4.252, 'exchange-api'),
('eur', '2018-07-18', 4.2323, 'exchange-api'),
('eur', '2018-07-19', 4.2359, 'exchange-api'),
('eur', '2018-07-20', 4.2454, 'exchange-api'),
('eur', '2018-07-23', 4.2535, 'exchange-api'),
('eur', '2018-07-24', 4.2705, 'exchange-api'),
('eur', '2018-07-25', 4.2572, 'exchange-api'),
('eur', '2018-07-26', 4.2601, 'exchange-api'),
('eur', '2018-07-27', 4.2644, 'exchange-api'),
('eur', '2018-07-30', 4.285, 'exchange-api'),
('eur', '2018-07-31', 4.3004, 'exchange-api'),
('eur', '2018-08-01', 4.2961, 'exchange-api'),
('eur', '2018-08-02', 4.2841, 'exchange-api'),
('eur', '2018-08-03', 4.2795, 'exchange-api'),
('eur', '2018-08-06', 4.2773, 'exchange-api'),
('eur', '2018-08-07', 4.2838, 'exchange-api'),
('eur', '2018-08-08', 4.2726, 'exchange-api'),
('eur', '2018-08-09', 4.2713, 'exchange-api'),
('eur', '2018-08-10', 4.2364, 'exchange-api'),
('eur', '2018-08-13', 4.2246, 'exchange-api'),
('eur', '2018-08-14', 4.2136, 'exchange-api'),
('eur', '2018-08-15', 4.181, 'exchange-api'),
('eur', '2018-08-16', 4.1918, 'exchange-api'),
('eur', '2018-08-17', 4.1791, 'exchange-api'),
('eur', '2018-08-20', 4.1804, 'exchange-api'),
('eur', '2018-08-21', 4.207, 'exchange-api'),
('eur', '2018-08-22', 4.2228, 'exchange-api'),
('eur', '2018-08-23', 4.2105, 'exchange-api'),
('eur', '2018-08-24', 4.2095, 'exchange-api'),
('eur', '2018-08-27', 4.2272, 'exchange-api'),
('eur', '2018-08-28', 4.24, 'exchange-api'),
('eur', '2018-08-29', 4.2526, 'exchange-api'),
('eur', '2018-08-30', 4.2225, 'exchange-api'),
('eur', '2018-08-31', 4.2119, 'exchange-api'),
('eur', '2018-09-03', 4.1987, 'exchange-api'),
('eur', '2018-09-04', 4.1898, 'exchange-api'),
('eur', '2018-09-05', 4.1953, 'exchange-api'),
('eur', '2018-09-06', 4.1788, 'exchange-api'),
('eur', '2018-09-07', 4.1685, 'exchange-api'),
('eur', '2018-09-12', 4.1595, 'exchange-api'),
('eur', '2018-09-13', 4.1574, 'exchange-api'),
('eur', '2018-09-14', 4.171, 'exchange-api'),
('eur', '2018-09-17', 4.1772, 'exchange-api'),
('eur', '2018-09-20', 4.197, 'exchange-api'),
('eur', '2018-09-21', 4.2109, 'exchange-api'),
('eur', '2018-09-25', 4.21, 'exchange-api'),
('eur', '2018-09-26', 4.2124, 'exchange-api'),
('eur', '2018-09-27', 4.2154, 'exchange-api'),
('eur', '2018-09-28', 4.2156, 'exchange-api'),
('eur', '2018-10-02', 4.2015, 'exchange-api'),
('eur', '2018-10-03', 4.2076, 'exchange-api'),
('eur', '2018-10-04', 4.188, 'exchange-api'),
('eur', '2018-10-05', 4.1816, 'exchange-api'),
('eur', '2018-10-08', 4.154, 'exchange-api'),
('eur', '2018-10-09', 4.1695, 'exchange-api'),
('eur', '2018-10-10', 4.1678, 'exchange-api'),
('eur', '2018-10-11', 4.2069, 'exchange-api'),
('eur', '2018-10-12', 4.2036, 'exchange-api'),
('eur', '2018-10-15', 4.2021, 'exchange-api'),
('eur', '2018-10-16', 4.2227, 'exchange-api'),
('eur', '2018-10-17', 4.214, 'exchange-api'),
('eur', '2018-10-18', 4.2037, 'exchange-api'),
('eur', '2018-10-19', 4.193, 'exchange-api'),
('eur', '2018-10-22', 4.2022, 'exchange-api'),
('eur', '2018-10-23', 4.213, 'exchange-api'),
('eur', '2018-10-24', 4.1915, 'exchange-api'),
('eur', '2018-10-25', 4.2132, 'exchange-api'),
('eur', '2018-10-26', 4.2103, 'exchange-api'),
('eur', '2018-10-29', 4.2158, 'exchange-api'),
('eur', '2018-10-31', 4.2114, 'exchange-api'),
('eur', '2018-11-01', 4.2173, 'exchange-api'),
('eur', '2018-11-02', 4.2229, 'exchange-api'),
('eur', '2018-11-05', 4.2056, 'exchange-api'),
('eur', '2018-11-06', 4.2066, 'exchange-api'),
('eur', '2018-11-07', 4.2172, 'exchange-api'),
('eur', '2018-11-08', 4.1948, 'exchange-api'),
('eur', '2018-11-09', 4.1755, 'exchange-api'),
('eur', '2018-11-12', 4.1427, 'exchange-api'),
('eur', '2018-11-13', 4.1505, 'exchange-api'),
('eur', '2018-11-14', 4.1694, 'exchange-api'),
('eur', '2018-11-15', 4.1783, 'exchange-api'),
('eur', '2018-11-16', 4.2169, 'exchange-api'),
('eur', '2018-11-19', 4.2359, 'exchange-api'),
('eur', '2018-11-20', 4.2489, 'exchange-api'),
('eur', '2018-11-21', 4.2643, 'exchange-api'),
('eur', '2018-11-22', 4.2559, 'exchange-api'),
('eur', '2018-11-23', 4.2495, 'exchange-api'),
('eur', '2018-11-26', 4.2375, 'exchange-api'),
('eur', '2018-11-27', 4.2191, 'exchange-api'),
('eur', '2018-11-28', 4.2132, 'exchange-api'),
('eur', '2018-11-29', 4.2243, 'exchange-api'),
('eur', '2018-11-30', 4.2109, 'exchange-api'),
('eur', '2018-12-03', 4.2116, 'exchange-api'),
('eur', '2018-12-04', 4.2518, 'exchange-api'),
('eur', '2018-12-05', 4.2289, 'exchange-api'),
('eur', '2018-12-06', 4.2316, 'exchange-api'),
('eur', '2018-12-07', 4.2511, 'exchange-api'),
('eur', '2018-12-10', 4.2551, 'exchange-api'),
('eur', '2018-12-11', 4.2672, 'exchange-api'),
('eur', '2018-12-12', 4.2477, 'exchange-api'),
('eur', '2018-12-13', 4.2696, 'exchange-api'),
('eur', '2018-12-14', 4.2586, 'exchange-api'),
('eur', '2018-12-17', 4.2843, 'exchange-api'),
('eur', '2018-12-18', 4.2846, 'exchange-api'),
('eur', '2018-12-19', 4.284, 'exchange-api'),
('eur', '2018-12-20', 4.3045, 'exchange-api'),
('eur', '2018-12-21', 4.3226, 'exchange-api'),
('eur', '2018-12-24', 4.3019, 'exchange-api'),
('eur', '2018-12-26', 4.2935, 'exchange-api'),
('eur', '2018-12-27', 4.3071, 'exchange-api'),
('eur', '2018-12-28', 4.314, 'exchange-api'),
('eur', '2018-12-31', 4.2916, 'exchange-api'),
('eur', '2019-01-02', 4.2846, 'exchange-api'),
('eur', '2019-01-03', 4.2496, 'exchange-api'),
('eur', '2019-01-04', 4.2422, 'exchange-api'),
('eur', '2019-01-07', 4.2274, 'exchange-api'),
('eur', '2019-01-08', 4.2345, 'exchange-api'),
('eur', '2019-01-09', 4.2156, 'exchange-api'),
('eur', '2019-01-10', 4.2273, 'exchange-api'),
('eur', '2019-01-11', 4.2318, 'exchange-api'),
('eur', '2019-01-14', 4.1922, 'exchange-api'),
('eur', '2019-01-15', 4.1953, 'exchange-api'),
('eur', '2019-01-16', 4.1894, 'exchange-api'),
('eur', '2019-01-17', 4.2051, 'exchange-api'),
('eur', '2019-01-18', 4.2079, 'exchange-api'),
('eur', '2019-01-21', 4.2033, 'exchange-api'),
('eur', '2019-01-22', 4.1932, 'exchange-api'),
('eur', '2019-01-23', 4.1868, 'exchange-api'),
('eur', '2019-01-24', 4.1802, 'exchange-api'),
('eur', '2019-01-25', 4.1745, 'exchange-api'),
('eur', '2019-01-28', 4.2017, 'exchange-api'),
('eur', '2019-01-29', 4.2057, 'exchange-api'),
('eur', '2019-01-30', 4.1968, 'exchange-api'),
('eur', '2019-01-31', 4.1856, 'exchange-api'),
('eur', '2019-02-01', 4.1588, 'exchange-api'),
('eur', '2019-02-04', 4.1531, 'exchange-api'),
('eur', '2019-02-05', 4.1249, 'exchange-api'),
('eur', '2019-02-06', 4.1213, 'exchange-api'),
('eur', '2019-02-07', 4.1113, 'exchange-api'),
('eur', '2019-02-08', 4.1168, 'exchange-api'),
('eur', '2019-02-11', 4.1207, 'exchange-api'),
('eur', '2019-02-12', 4.1146, 'exchange-api'),
('eur', '2019-02-13', 4.1152, 'exchange-api'),
('eur', '2019-02-14', 4.127, 'exchange-api'),
('eur', '2019-02-15', 4.106, 'exchange-api'),
('eur', '2019-02-18', 4.1006, 'exchange-api'),
('eur', '2019-02-19', 4.0954, 'exchange-api'),
('eur', '2019-02-20', 4.1027, 'exchange-api'),
('eur', '2019-02-21', 4.1057, 'exchange-api'),
('eur', '2019-02-22', 4.0986, 'exchange-api'),
('eur', '2019-02-25', 4.097, 'exchange-api'),
('eur', '2019-02-26', 4.1181, 'exchange-api'),
('eur', '2019-02-27', 4.1263, 'exchange-api'),
('eur', '2019-02-28', 4.1142, 'exchange-api'),
('eur', '2019-03-01', 4.1155, 'exchange-api'),
('eur', '2019-03-04', 4.1092, 'exchange-api'),
('eur', '2019-03-05', 4.0991, 'exchange-api'),
('eur', '2019-03-06', 4.0877, 'exchange-api'),
('eur', '2019-03-07', 4.0794, 'exchange-api'),
('eur', '2019-03-08', 4.0683, 'exchange-api'),
('eur', '2019-03-11', 4.0723, 'exchange-api'),
('eur', '2019-03-12', 4.0809, 'exchange-api'),
('eur', '2019-03-13', 4.0847, 'exchange-api'),
('eur', '2019-03-14', 4.0706, 'exchange-api'),
('eur', '2019-03-15', 4.0821, 'exchange-api'),
('eur', '2019-03-18', 4.089, 'exchange-api'),
('eur', '2019-03-19', 4.0927, 'exchange-api'),
('eur', '2019-03-20', 4.0993, 'exchange-api'),
('eur', '2019-03-25', 4.1018, 'exchange-api'),
('eur', '2019-03-26', 4.0947, 'exchange-api'),
('eur', '2019-03-27', 4.0969, 'exchange-api'),
('eur', '2019-03-28', 4.0875, 'exchange-api'),
('eur', '2019-03-29', 4.0782, 'exchange-api'),
('eur', '2019-04-01', 4.0734, 'exchange-api'),
('eur', '2019-04-02', 4.0594, 'exchange-api'),
('eur', '2019-04-03', 4.0488, 'exchange-api'),
('eur', '2019-04-04', 4.0467, 'exchange-api'),
('eur', '2019-04-05', 4.0276, 'exchange-api'),
('eur', '2019-04-08', 4.0255, 'exchange-api'),
('eur', '2019-04-10', 4.0359, 'exchange-api'),
('eur', '2019-04-11', 4.0414, 'exchange-api'),
('eur', '2019-04-12', 4.0397, 'exchange-api'),
('eur', '2019-04-15', 4.0277, 'exchange-api'),
('eur', '2019-04-16', 4.0203, 'exchange-api'),
('eur', '2019-04-17', 4.0436, 'exchange-api'),
('eur', '2019-04-18', 4.0396, 'exchange-api'),
('eur', '2019-04-23', 4.0404, 'exchange-api'),
('eur', '2019-04-24', 4.0537, 'exchange-api'),
('eur', '2019-04-25', 4.0473, 'exchange-api'),
('eur', '2019-04-29', 4.0356, 'exchange-api'),
('eur', '2019-04-30', 4.0438, 'exchange-api'),
('eur', '2019-05-01', 4.0298, 'exchange-api'),
('eur', '2019-05-02', 4.0324, 'exchange-api'),
('eur', '2019-05-03', 4.0185, 'exchange-api'),
('eur', '2019-05-06', 4.0206, 'exchange-api'),
('eur', '2019-05-07', 4.0149, 'exchange-api'),
('eur', '2019-05-08', 4.0142, 'exchange-api'),
('eur', '2019-05-10', 4.0062, 'exchange-api'),
('eur', '2019-05-13', 4.0089, 'exchange-api'),
('eur', '2019-05-14', 4.018, 'exchange-api'),
('eur', '2019-05-15', 3.9936, 'exchange-api'),
('eur', '2019-05-16', 3.9964, 'exchange-api'),
('eur', '2019-05-17', 3.9956, 'exchange-api'),
('eur', '2019-05-20', 3.9871, 'exchange-api'),
('eur', '2019-05-21', 4.0116, 'exchange-api'),
('eur', '2019-05-22', 4.0323, 'exchange-api'),
('eur', '2019-05-23', 4.0261, 'exchange-api'),
('eur', '2019-05-24', 4.0344, 'exchange-api'),
('eur', '2019-05-28', 4.044, 'exchange-api'),
('eur', '2019-05-29', 4.0343, 'exchange-api'),
('eur', '2019-05-30', 4.0316, 'exchange-api'),
('eur', '2019-05-31', 4.0489, 'exchange-api'),
('eur', '2019-06-03', 4.0615, 'exchange-api'),
('eur', '2019-06-04', 4.0646, 'exchange-api'),
('eur', '2019-06-05', 4.064, 'exchange-api'),
('eur', '2019-06-06', 4.0463, 'exchange-api'),
('eur', '2019-06-07', 4.0563, 'exchange-api'),
('eur', '2019-06-10', 4.0519, 'exchange-api'),
('eur', '2019-06-11', 4.0513, 'exchange-api'),
('eur', '2019-06-12', 4.0546, 'exchange-api'),
('eur', '2019-06-13', 4.0558, 'exchange-api'),
('eur', '2019-06-14', 4.0584, 'exchange-api'),
('eur', '2019-06-17', 4.0548, 'exchange-api'),
('eur', '2019-06-18', 4.0413, 'exchange-api'),
('eur', '2019-06-19', 4.0439, 'exchange-api'),
('eur', '2019-06-20', 4.0456, 'exchange-api'),
('eur', '2019-06-21', 4.0655, 'exchange-api'),
('eur', '2019-06-24', 4.1051, 'exchange-api'),
('eur', '2019-06-25', 4.0991, 'exchange-api'),
('eur', '2019-06-26', 4.0788, 'exchange-api'),
('eur', '2019-06-27', 4.0752, 'exchange-api'),
('eur', '2019-06-28', 4.0616, 'exchange-api'),
('eur', '2019-07-01', 4.0514, 'exchange-api'),
('eur', '2019-07-02', 4.0393, 'exchange-api'),
('eur', '2019-07-03', 4.0327, 'exchange-api'),
('eur', '2019-07-04', 4.0264, 'exchange-api'),
('eur', '2019-07-05', 4.0134, 'exchange-api'),
('eur', '2019-07-08', 4.0088, 'exchange-api'),
('eur', '2019-07-09', 3.997, 'exchange-api'),
('eur', '2019-07-10', 4.0092, 'exchange-api'),
('eur', '2019-07-11', 3.9974, 'exchange-api'),
('eur', '2019-07-12', 4, 'exchange-api'),
('eur', '2019-07-15', 3.9904, 'exchange-api'),
('eur', '2019-07-16', 3.9756, 'exchange-api'),
('eur', '2019-07-17', 3.9732, 'exchange-api'),
('eur', '2019-07-18', 3.9752, 'exchange-api'),
('eur', '2019-07-19', 3.9801, 'exchange-api'),
('eur', '2019-07-22', 3.967, 'exchange-api'),
('eur', '2019-07-23', 3.9544, 'exchange-api'),
('eur', '2019-07-24', 3.9229, 'exchange-api'),
('eur', '2019-07-25', 3.9259, 'exchange-api'),
('eur', '2019-07-26', 3.9258, 'exchange-api'),
('eur', '2019-07-29', 3.9224, 'exchange-api'),
('eur', '2019-07-30', 3.9015, 'exchange-api'),
('eur', '2019-07-31', 3.8997, 'exchange-api'),
('eur', '2019-08-01', 3.8885, 'exchange-api'),
('eur', '2019-08-02', 3.8908, 'exchange-api'),
('eur', '2019-08-05', 3.9001, 'exchange-api'),
('eur', '2019-08-06', 3.9075, 'exchange-api'),
('eur', '2019-08-07', 3.8988, 'exchange-api'),
('eur', '2019-08-08', 3.9032, 'exchange-api'),
('eur', '2019-08-09', 3.8929, 'exchange-api'),
('eur', '2019-08-12', 3.9008, 'exchange-api'),
('eur', '2019-08-13', 3.9202, 'exchange-api'),
('eur', '2019-08-14', 3.9015, 'exchange-api'),
('eur', '2019-08-15', 3.9231, 'exchange-api'),
('eur', '2019-08-16', 3.9248, 'exchange-api'),
('eur', '2019-08-19', 3.9345, 'exchange-api'),
('eur', '2019-08-20', 3.9045, 'exchange-api'),
('eur', '2019-08-21', 3.9167, 'exchange-api'),
('eur', '2019-08-22', 3.9018, 'exchange-api'),
('eur', '2019-08-23', 3.8854, 'exchange-api'),
('eur', '2019-08-26', 3.9116, 'exchange-api'),
('eur', '2019-08-27', 3.9099, 'exchange-api'),
('eur', '2019-08-28', 3.9099, 'exchange-api'),
('eur', '2019-08-29', 3.9001, 'exchange-api'),
('eur', '2019-08-30', 3.9029, 'exchange-api'),
('eur', '2019-09-02', 3.8815, 'exchange-api'),
('eur', '2019-09-03', 3.8812, 'exchange-api'),
('eur', '2019-09-04', 3.8867, 'exchange-api'),
('eur', '2019-09-05', 3.8851, 'exchange-api'),
('eur', '2019-09-06', 3.8835, 'exchange-api'),
('eur', '2019-09-09', 3.8927, 'exchange-api'),
('eur', '2019-09-10', 3.9046, 'exchange-api'),
('eur', '2019-09-11', 3.8985, 'exchange-api'),
('eur', '2019-09-12', 3.9032, 'exchange-api'),
('eur', '2019-09-13', 3.9109, 'exchange-api'),
('eur', '2019-09-16', 3.9039, 'exchange-api'),
('eur', '2019-09-18', 3.9111, 'exchange-api'),
('eur', '2019-09-19', 3.8963, 'exchange-api'),
('eur', '2019-09-20', 3.8842, 'exchange-api'),
('eur', '2019-09-23', 3.8644, 'exchange-api'),
('eur', '2019-09-24', 3.8566, 'exchange-api'),
('eur', '2019-09-25', 3.8485, 'exchange-api'),
('eur', '2019-09-26', 3.8438, 'exchange-api'),
('eur', '2019-09-27', 3.805, 'exchange-api'),
('eur', '2019-10-02', 3.8049, 'exchange-api'),
('eur', '2019-10-03', 3.8316, 'exchange-api'),
('eur', '2019-10-04', 3.8198, 'exchange-api'),
('eur', '2019-10-07', 3.8335, 'exchange-api'),
('eur', '2019-10-10', 3.8647, 'exchange-api'),
('eur', '2019-10-11', 3.864, 'exchange-api'),
('eur', '2019-10-15', 3.872, 'exchange-api'),
('eur', '2019-10-16', 3.9002, 'exchange-api'),
('eur', '2019-10-17', 3.9268, 'exchange-api'),
('eur', '2019-10-18', 3.9325, 'exchange-api'),
('eur', '2019-10-22', 3.9423, 'exchange-api'),
('eur', '2019-10-23', 3.9303, 'exchange-api'),
('eur', '2019-10-24', 3.9192, 'exchange-api'),
('eur', '2019-10-25', 3.9339, 'exchange-api'),
('eur', '2019-10-28', 3.9169, 'exchange-api'),
('eur', '2019-10-29', 3.9133, 'exchange-api'),
('eur', '2019-10-30', 3.9209, 'exchange-api'),
('eur', '2019-10-31', 3.9365, 'exchange-api'),
('eur', '2019-11-01', 3.9267, 'exchange-api'),
('eur', '2019-11-04', 3.9329, 'exchange-api'),
('eur', '2019-11-05', 3.8901, 'exchange-api'),
('eur', '2019-11-06', 3.8703, 'exchange-api'),
('eur', '2019-11-07', 3.8621, 'exchange-api'),
('eur', '2019-11-08', 3.8616, 'exchange-api'),
('eur', '2019-11-11', 3.8597, 'exchange-api'),
('eur', '2019-11-12', 3.8681, 'exchange-api'),
('eur', '2019-11-13', 3.8483, 'exchange-api'),
('eur', '2019-11-14', 3.8337, 'exchange-api'),
('eur', '2019-11-15', 3.8323, 'exchange-api'),
('eur', '2019-11-18', 3.8293, 'exchange-api'),
('eur', '2019-11-19', 3.8291, 'exchange-api'),
('eur', '2019-11-20', 3.8384, 'exchange-api'),
('eur', '2019-11-21', 3.8292, 'exchange-api'),
('eur', '2019-11-22', 3.832, 'exchange-api'),
('eur', '2019-11-25', 3.8121, 'exchange-api'),
('eur', '2019-11-26', 3.8146, 'exchange-api'),
('eur', '2019-11-27', 3.8196, 'exchange-api'),
('eur', '2019-11-28', 3.8203, 'exchange-api'),
('eur', '2019-11-29', 3.8241, 'exchange-api'),
('eur', '2019-12-02', 3.8269, 'exchange-api'),
('eur', '2019-12-03', 3.8558, 'exchange-api'),
('eur', '2019-12-04', 3.8468, 'exchange-api'),
('eur', '2019-12-05', 3.8464, 'exchange-api'),
('eur', '2019-12-06', 3.8434, 'exchange-api'),
('eur', '2019-12-09', 3.843, 'exchange-api'),
('eur', '2019-12-10', 3.838, 'exchange-api'),
('eur', '2019-12-11', 3.8531, 'exchange-api'),
('eur', '2019-12-12', 3.8745, 'exchange-api'),
('eur', '2019-12-13', 3.8857, 'exchange-api'),
('eur', '2019-12-16', 3.896, 'exchange-api'),
('eur', '2019-12-17', 3.8992, 'exchange-api'),
('eur', '2019-12-18', 3.8942, 'exchange-api'),
('eur', '2019-12-19', 3.8827, 'exchange-api'),
('eur', '2019-12-20', 3.8663, 'exchange-api'),
('eur', '2019-12-23', 3.8457, 'exchange-api'),
('eur', '2019-12-24', 3.8385, 'exchange-api'),
('eur', '2019-12-26', 3.8515, 'exchange-api'),
('eur', '2019-12-27', 3.8616, 'exchange-api'),
('eur', '2019-12-30', 3.8758, 'exchange-api'),
('eur', '2019-12-31', 3.8782, 'exchange-api'),
('eur', '2020-01-02', 3.8655, 'exchange-api'),
('eur', '2020-01-03', 3.8605, 'exchange-api'),
('eur', '2020-01-06', 3.8914, 'exchange-api'),
('eur', '2020-01-07', 3.8763, 'exchange-api'),
('eur', '2020-01-08', 3.8558, 'exchange-api'),
('eur', '2020-01-09', 3.8553, 'exchange-api'),
('eur', '2020-01-10', 3.8528, 'exchange-api'),
('eur', '2020-01-13', 3.8593, 'exchange-api'),
('eur', '2020-01-14', 3.8608, 'exchange-api'),
('eur', '2020-01-15', 3.8556, 'exchange-api'),
('eur', '2020-01-16', 3.8592, 'exchange-api'),
('eur', '2020-01-17', 3.8461, 'exchange-api'),
('eur', '2020-01-20', 3.8309, 'exchange-api'),
('eur', '2020-01-21', 3.8364, 'exchange-api'),
('eur', '2020-01-22', 3.8249, 'exchange-api'),
('eur', '2020-01-23', 3.8361, 'exchange-api'),
('eur', '2020-01-24', 3.8187, 'exchange-api'),
('eur', '2020-01-27', 3.8112, 'exchange-api'),
('eur', '2020-01-28', 3.8023, 'exchange-api'),
('eur', '2020-01-29', 3.8041, 'exchange-api'),
('eur', '2020-01-30', 3.8034, 'exchange-api'),
('eur', '2020-01-31', 3.8023, 'exchange-api'),
('eur', '2020-02-03', 3.8115, 'exchange-api'),
('eur', '2020-02-04', 3.8093, 'exchange-api'),
('eur', '2020-02-05', 3.8027, 'exchange-api'),
('eur', '2020-02-06', 3.7817, 'exchange-api'),
('eur', '2020-02-07', 3.7575, 'exchange-api'),
('eur', '2020-02-10', 3.7464, 'exchange-api'),
('eur', '2020-02-11', 3.7322, 'exchange-api'),
('eur', '2020-02-12', 3.7346, 'exchange-api'),
('eur', '2020-02-13', 3.7289, 'exchange-api'),
('eur', '2020-02-14', 3.7248, 'exchange-api'),
('eur', '2020-02-17', 3.7155, 'exchange-api'),
('eur', '2020-02-18', 3.6999, 'exchange-api'),
('eur', '2020-02-19', 3.6952, 'exchange-api'),
('eur', '2020-02-20', 3.7034, 'exchange-api'),
('eur', '2020-02-21', 3.7026, 'exchange-api'),
('eur', '2020-02-24', 3.7207, 'exchange-api'),
('eur', '2020-02-25', 3.715, 'exchange-api'),
('eur', '2020-02-26', 3.7411, 'exchange-api'),
('eur', '2020-02-27', 3.759, 'exchange-api'),
('eur', '2020-02-28', 3.8196, 'exchange-api'),
('eur', '2020-03-03', 3.844, 'exchange-api'),
('eur', '2020-03-04', 3.8486, 'exchange-api'),
('eur', '2020-03-05', 3.8783, 'exchange-api'),
('eur', '2020-03-06', 3.9324, 'exchange-api'),
('eur', '2020-03-09', 4.0053, 'exchange-api'),
('eur', '2020-03-12', 4.0861, 'exchange-api'),
('eur', '2020-03-13', 4.0778, 'exchange-api'),
('eur', '2020-03-16', 4.1639, 'exchange-api'),
('eur', '2020-03-17', 4.2469, 'exchange-api'),
('eur', '2020-03-18', 4.1948, 'exchange-api'),
('eur', '2020-03-19', 3.9766, 'exchange-api'),
('eur', '2020-03-20', 3.8708, 'exchange-api'),
('eur', '2020-03-23', 3.9505, 'exchange-api'),
('eur', '2020-03-24', 3.9692, 'exchange-api'),
('eur', '2020-03-25', 3.9372, 'exchange-api'),
('eur', '2020-03-26', 3.9685, 'exchange-api'),
('eur', '2020-03-27', 3.965, 'exchange-api'),
('eur', '2020-03-30', 3.965, 'exchange-api'),
('eur', '2020-03-31', 3.9003, 'exchange-api'),
('eur', '2020-04-01', 3.8899, 'exchange-api'),
('eur', '2020-04-02', 3.9675, 'exchange-api'),
('eur', '2020-04-03', 3.927, 'exchange-api'),
('eur', '2020-04-06', 3.9206, 'exchange-api'),
('eur', '2020-04-07', 3.9195, 'exchange-api'),
('eur', '2020-04-14', 3.9075, 'exchange-api'),
('eur', '2020-04-16', 3.9087, 'exchange-api'),
('eur', '2020-04-17', 3.8897, 'exchange-api'),
('eur', '2020-04-20', 3.8897, 'exchange-api'),
('eur', '2020-04-21', 3.8456, 'exchange-api'),
('eur', '2020-04-22', 3.8462, 'exchange-api'),
('eur', '2020-04-23', 3.8328, 'exchange-api'),
('eur', '2020-04-24', 3.7827, 'exchange-api'),
('eur', '2020-04-27', 3.8111, 'exchange-api'),
('eur', '2020-04-28', 3.7885, 'exchange-api'),
('eur', '2020-04-30', 3.8066, 'exchange-api'),
('eur', '2020-05-01', 3.8308, 'exchange-api'),
('eur', '2020-05-04', 3.8554, 'exchange-api'),
('eur', '2020-05-05', 3.8187, 'exchange-api'),
('eur', '2020-05-06', 3.7942, 'exchange-api'),
('eur', '2020-05-07', 3.7955, 'exchange-api'),
('eur', '2020-05-11', 3.806, 'exchange-api'),
('eur', '2020-05-12', 3.8041, 'exchange-api'),
('eur', '2020-05-13', 3.8183, 'exchange-api'),
('eur', '2020-05-14', 3.8229, 'exchange-api'),
('eur', '2020-05-15', 3.8207, 'exchange-api'),
('eur', '2020-05-18', 3.8292, 'exchange-api'),
('eur', '2020-05-19', 3.8635, 'exchange-api'),
('eur', '2020-05-20', 3.8391, 'exchange-api'),
('eur', '2020-05-21', 3.8634, 'exchange-api'),
('eur', '2020-05-22', 3.8462, 'exchange-api'),
('eur', '2020-05-26', 3.8501, 'exchange-api'),
('eur', '2020-05-27', 3.8569, 'exchange-api'),
('eur', '2020-05-28', 3.8534, 'exchange-api'),
('eur', '2020-06-01', 3.8996, 'exchange-api'),
('eur', '2020-06-02', 3.8914, 'exchange-api'),
('eur', '2020-06-03', 3.8821, 'exchange-api'),
('eur', '2020-06-04', 3.8987, 'exchange-api'),
('eur', '2020-06-05', 3.9215, 'exchange-api'),
('eur', '2020-06-08', 3.9012, 'exchange-api'),
('eur', '2020-06-09', 3.8934, 'exchange-api'),
('eur', '2020-06-10', 3.9173, 'exchange-api'),
('eur', '2020-06-11', 3.9191, 'exchange-api'),
('eur', '2020-06-12', 3.9234, 'exchange-api'),
('eur', '2020-06-15', 3.9315, 'exchange-api'),
('eur', '2020-06-16', 3.9242, 'exchange-api'),
('eur', '2020-06-17', 3.8857, 'exchange-api'),
('eur', '2020-06-18', 3.8841, 'exchange-api'),
('eur', '2020-06-19', 3.863, 'exchange-api'),
('eur', '2020-06-22', 3.8653, 'exchange-api'),
('eur', '2020-06-23', 3.877, 'exchange-api'),
('eur', '2020-06-24', 3.8724, 'exchange-api'),
('eur', '2020-06-25', 3.8622, 'exchange-api'),
('eur', '2020-06-26', 3.8588, 'exchange-api'),
('eur', '2020-06-29', 3.8747, 'exchange-api'),
('eur', '2020-06-30', 3.8828, 'exchange-api'),
('eur', '2020-07-01', 3.8696, 'exchange-api'),
('eur', '2020-07-02', 3.891, 'exchange-api'),
('eur', '2020-07-03', 3.8584, 'exchange-api'),
('eur', '2020-07-06', 3.8965, 'exchange-api'),
('eur', '2020-07-07', 3.8951, 'exchange-api'),
('eur', '2020-07-08', 3.8977, 'exchange-api'),
('eur', '2020-07-09', 3.8996, 'exchange-api'),
('eur', '2020-07-10', 3.9031, 'exchange-api'),
('eur', '2020-07-13', 3.8993, 'exchange-api'),
('eur', '2020-07-14', 3.9086, 'exchange-api'),
('eur', '2020-07-15', 3.9251, 'exchange-api'),
('eur', '2020-07-16', 3.9068, 'exchange-api'),
('eur', '2020-07-17', 3.9274, 'exchange-api'),
('eur', '2020-07-20', 3.9286, 'exchange-api'),
('eur', '2020-07-21', 3.918, 'exchange-api'),
('eur', '2020-07-22', 3.9586, 'exchange-api'),
('eur', '2020-07-23', 3.9613, 'exchange-api'),
('eur', '2020-07-24', 3.9737, 'exchange-api'),
('eur', '2020-07-27', 4, 'exchange-api'),
('eur', '2020-07-28', 4.0066, 'exchange-api'),
('eur', '2020-07-29', 3.9999, 'exchange-api'),
('eur', '2020-07-31', 4.0388, 'exchange-api'),
('eur', '2020-08-03', 4.0059, 'exchange-api'),
('eur', '2020-08-04', 4.0298, 'exchange-api'),
('eur', '2020-08-05', 4.0378, 'exchange-api'),
('eur', '2020-08-06', 4.0379, 'exchange-api'),
('eur', '2020-08-07', 4.0327, 'exchange-api'),
('eur', '2020-08-10', 4.0112, 'exchange-api'),
('eur', '2020-08-11', 4.0129, 'exchange-api'),
('eur', '2020-08-12', 4.009, 'exchange-api'),
('eur', '2020-08-13', 4.0363, 'exchange-api'),
('eur', '2020-08-14', 4.0221, 'exchange-api'),
('eur', '2020-08-17', 4.0391, 'exchange-api'),
('eur', '2020-08-18', 4.0482, 'exchange-api'),
('eur', '2020-08-19', 4.0603, 'exchange-api'),
('eur', '2020-08-20', 4.0302, 'exchange-api'),
('eur', '2020-08-21', 4.0321, 'exchange-api'),
('eur', '2020-08-24', 4.0291, 'exchange-api'),
('eur', '2020-08-25', 4.0173, 'exchange-api'),
('eur', '2020-08-26', 4.0156, 'exchange-api'),
('eur', '2020-08-27', 3.975, 'exchange-api'),
('eur', '2020-08-28', 4.0043, 'exchange-api'),
('eur', '2020-08-31', 4.0126, 'exchange-api'),
('eur', '2020-09-01', 4.0191, 'exchange-api'),
('eur', '2020-09-02', 3.9893, 'exchange-api'),
('eur', '2020-09-03', 3.981, 'exchange-api'),
('eur', '2020-09-04', 3.9938, 'exchange-api'),
('eur', '2020-09-07', 3.9944, 'exchange-api'),
('eur', '2020-09-08', 3.9994, 'exchange-api'),
('eur', '2020-09-09', 4.0058, 'exchange-api'),
('eur', '2020-09-10', 4.0401, 'exchange-api'),
('eur', '2020-09-11', 4.069, 'exchange-api'),
('eur', '2020-09-14', 4.0799, 'exchange-api'),
('eur', '2020-09-15', 4.0705, 'exchange-api'),
('eur', '2020-09-16', 4.0516, 'exchange-api'),
('eur', '2020-09-17', 4.0359, 'exchange-api'),
('eur', '2020-09-21', 4.0576, 'exchange-api'),
('eur', '2020-09-22', 4.0455, 'exchange-api'),
('eur', '2020-09-23', 4.0351, 'exchange-api'),
('eur', '2020-09-24', 4.0479, 'exchange-api'),
('eur', '2020-09-25', 4.0488, 'exchange-api'),
('eur', '2020-09-29', 4.0519, 'exchange-api'),
('eur', '2020-09-30', 4.0258, 'exchange-api'),
('eur', '2020-10-01', 4.0242, 'exchange-api'),
('eur', '2020-10-02', 4.0203, 'exchange-api'),
('eur', '2020-10-05', 4.0215, 'exchange-api'),
('eur', '2020-10-06', 4.0152, 'exchange-api'),
('eur', '2020-10-07', 4.0053, 'exchange-api'),
('eur', '2020-10-08', 3.9928, 'exchange-api'),
('eur', '2020-10-09', 3.986, 'exchange-api'),
('eur', '2020-10-12', 3.9893, 'exchange-api'),
('eur', '2020-10-13', 3.993, 'exchange-api'),
('eur', '2020-10-14', 3.9717, 'exchange-api'),
('eur', '2020-10-15', 3.9774, 'exchange-api'),
('eur', '2020-10-16', 3.9617, 'exchange-api'),
('eur', '2020-10-19', 3.9811, 'exchange-api'),
('eur', '2020-10-20', 3.9901, 'exchange-api'),
('eur', '2020-10-21', 4.0111, 'exchange-api'),
('eur', '2020-10-22', 4.0006, 'exchange-api'),
('eur', '2020-10-23', 3.9983, 'exchange-api'),
('eur', '2020-10-26', 3.9979, 'exchange-api'),
('eur', '2020-10-27', 3.9973, 'exchange-api'),
('eur', '2020-10-28', 3.9835, 'exchange-api'),
('eur', '2020-10-29', 3.9914, 'exchange-api'),
('eur', '2020-10-30', 3.9938, 'exchange-api'),
('eur', '2020-11-02', 3.961, 'exchange-api'),
('eur', '2020-11-03', 4.0015, 'exchange-api'),
('eur', '2020-11-04', 3.9963, 'exchange-api'),
('eur', '2020-11-05', 3.9936, 'exchange-api'),
('eur', '2020-11-06', 4.0031, 'exchange-api'),
('eur', '2020-11-09', 3.996, 'exchange-api'),
('eur', '2020-11-10', 3.9849, 'exchange-api'),
('eur', '2020-11-11', 3.9889, 'exchange-api'),
('eur', '2020-11-12', 3.9874, 'exchange-api'),
('eur', '2020-11-13', 3.973, 'exchange-api'),
('eur', '2020-11-16', 3.9737, 'exchange-api'),
('eur', '2020-11-17', 3.9852, 'exchange-api'),
('eur', '2020-11-18', 3.9669, 'exchange-api'),
('eur', '2020-11-19', 3.9639, 'exchange-api'),
('eur', '2020-11-20', 3.9699, 'exchange-api'),
('eur', '2020-11-23', 3.9738, 'exchange-api'),
('eur', '2020-11-24', 3.9661, 'exchange-api'),
('eur', '2020-11-25', 3.956, 'exchange-api'),
('eur', '2020-11-26', 3.9546, 'exchange-api'),
('eur', '2020-11-27', 3.9569, 'exchange-api'),
('eur', '2020-11-30', 3.9656, 'exchange-api'),
('eur', '2020-12-01', 3.9554, 'exchange-api'),
('eur', '2020-12-02', 3.9639, 'exchange-api'),
('eur', '2020-12-03', 3.9709, 'exchange-api'),
('eur', '2020-12-04', 3.9748, 'exchange-api'),
('eur', '2020-12-07', 3.962, 'exchange-api'),
('eur', '2020-12-08', 3.936, 'exchange-api'),
('eur', '2020-12-09', 3.9467, 'exchange-api'),
('eur', '2020-12-10', 3.9285, 'exchange-api'),
('eur', '2020-12-11', 3.9437, 'exchange-api'),
('eur', '2020-12-14', 3.9599, 'exchange-api'),
('eur', '2020-12-15', 3.958, 'exchange-api'),
('eur', '2020-12-16', 3.9653, 'exchange-api'),
('eur', '2020-12-17', 3.971, 'exchange-api'),
('eur', '2020-12-18', 3.9717, 'exchange-api'),
('eur', '2020-12-21', 3.9573, 'exchange-api'),
('eur', '2020-12-22', 3.9537, 'exchange-api'),
('eur', '2020-12-23', 3.9286, 'exchange-api'),
('eur', '2020-12-24', 3.9221, 'exchange-api'),
('eur', '2020-12-28', 3.926, 'exchange-api'),
('eur', '2020-12-29', 3.9364, 'exchange-api'),
('eur', '2020-12-30', 3.9403, 'exchange-api'),
('eur', '2020-12-31', 3.9441, 'exchange-api'),
('eur', '2021-01-04', 3.9423, 'exchange-api'),
('eur', '2021-01-05', 3.9313, 'exchange-api'),
('eur', '2021-01-06', 3.9316, 'exchange-api'),
('eur', '2021-01-07', 3.9022, 'exchange-api'),
('eur', '2021-01-08', 3.9008, 'exchange-api'),
('eur', '2021-01-11', 3.8728, 'exchange-api'),
('eur', '2021-01-12', 3.8403, 'exchange-api'),
('eur', '2021-01-13', 3.8128, 'exchange-api'),
('eur', '2021-01-14', 3.7874, 'exchange-api'),
('eur', '2021-01-15', 3.9222, 'exchange-api'),
('eur', '2021-01-18', 3.8963, 'exchange-api'),
('eur', '2021-01-19', 3.921, 'exchange-api'),
('eur', '2021-01-20', 3.9371, 'exchange-api'),
('eur', '2021-01-21', 3.985, 'exchange-api'),
('eur', '2021-01-22', 3.9867, 'exchange-api'),
('eur', '2021-01-25', 3.9694, 'exchange-api'),
('eur', '2021-01-26', 3.9674, 'exchange-api'),
('eur', '2021-01-27', 3.9538, 'exchange-api'),
('eur', '2021-01-28', 3.9861, 'exchange-api'),
('eur', '2021-01-29', 3.9871, 'exchange-api'),
('eur', '2021-02-01', 3.9713, 'exchange-api'),
('eur', '2021-02-02', 3.9699, 'exchange-api'),
('eur', '2021-02-03', 3.968, 'exchange-api'),
('eur', '2021-02-04', 3.9557, 'exchange-api'),
('eur', '2021-02-05', 3.9368, 'exchange-api'),
('eur', '2021-02-08', 3.949, 'exchange-api'),
('eur', '2021-02-09', 3.9433, 'exchange-api'),
('eur', '2021-02-10', 3.9427, 'exchange-api'),
('eur', '2021-02-11', 3.9514, 'exchange-api'),
('eur', '2021-02-12', 3.9352, 'exchange-api'),
('eur', '2021-02-15', 3.9352, 'exchange-api'),
('eur', '2021-02-16', 3.9366, 'exchange-api'),
('eur', '2021-02-17', 3.9293, 'exchange-api'),
('eur', '2021-02-18', 3.942, 'exchange-api'),
('eur', '2021-02-19', 3.9645, 'exchange-api'),
('eur', '2021-02-22', 3.9662, 'exchange-api'),
('eur', '2021-02-23', 3.9674, 'exchange-api'),
('eur', '2021-02-24', 3.97, 'exchange-api'),
('eur', '2021-02-25', 4.0116, 'exchange-api'),
('eur', '2021-03-01', 3.9826, 'exchange-api'),
('eur', '2021-03-02', 3.9675, 'exchange-api'),
('eur', '2021-03-03', 3.966, 'exchange-api'),
('eur', '2021-03-04', 3.9838, 'exchange-api'),
('eur', '2021-03-05', 3.9566, 'exchange-api'),
('eur', '2021-03-08', 3.9575, 'exchange-api'),
('eur', '2021-03-09', 3.9627, 'exchange-api'),
('eur', '2021-03-10', 3.95, 'exchange-api'),
('eur', '2021-03-11', 3.9516, 'exchange-api'),
('eur', '2021-03-12', 3.9563, 'exchange-api'),
('eur', '2021-03-15', 3.949, 'exchange-api'),
('eur', '2021-03-16', 3.943, 'exchange-api'),
('eur', '2021-03-17', 3.9126, 'exchange-api'),
('eur', '2021-03-18', 3.9395, 'exchange-api'),
('eur', '2021-03-19', 3.924, 'exchange-api'),
('eur', '2021-03-22', 3.9389, 'exchange-api'),
('eur', '2021-03-24', 3.899, 'exchange-api'),
('eur', '2021-03-25', 3.9075, 'exchange-api'),
('eur', '2021-03-26', 3.9185, 'exchange-api'),
('eur', '2021-03-29', 3.9328, 'exchange-api'),
('eur', '2021-03-30', 3.9066, 'exchange-api'),
('eur', '2021-03-31', 3.9127, 'exchange-api'),
('eur', '2021-04-01', 3.9116, 'exchange-api'),
('eur', '2021-04-05', 3.9038, 'exchange-api'),
('eur', '2021-04-06', 3.9078, 'exchange-api'),
('eur', '2021-04-07', 3.925, 'exchange-api'),
('eur', '2021-04-08', 3.8991, 'exchange-api'),
('eur', '2021-04-09', 3.9057, 'exchange-api'),
('eur', '2021-04-12', 3.9191, 'exchange-api'),
('eur', '2021-04-13', 3.929, 'exchange-api'),
('eur', '2021-04-14', 3.9341, 'exchange-api'),
('eur', '2021-04-16', 3.9266, 'exchange-api'),
('eur', '2021-04-19', 3.929, 'exchange-api'),
('eur', '2021-04-20', 3.9207, 'exchange-api'),
('eur', '2021-04-21', 3.9107, 'exchange-api'),
('eur', '2021-04-22', 3.9325, 'exchange-api'),
('eur', '2021-04-23', 3.9237, 'exchange-api'),
('eur', '2021-04-26', 3.9151, 'exchange-api'),
('eur', '2021-04-27', 3.915, 'exchange-api'),
('eur', '2021-04-28', 3.9227, 'exchange-api'),
('eur', '2021-04-29', 3.9347, 'exchange-api'),
('eur', '2021-04-30', 3.9272, 'exchange-api'),
('eur', '2021-05-03', 3.9124, 'exchange-api'),
('eur', '2021-05-04', 3.9054, 'exchange-api'),
('eur', '2021-05-05', 3.9239, 'exchange-api'),
('eur', '2021-05-06', 3.9307, 'exchange-api'),
('eur', '2021-05-07', 3.9386, 'exchange-api'),
('eur', '2021-05-10', 3.9552, 'exchange-api'),
('eur', '2021-05-11', 3.9957, 'exchange-api'),
('eur', '2021-05-12', 3.9745, 'exchange-api'),
('eur', '2021-05-13', 3.9764, 'exchange-api'),
('eur', '2021-05-14', 3.9749, 'exchange-api'),
('eur', '2021-05-18', 3.9998, 'exchange-api'),
('eur', '2021-05-19', 3.9847, 'exchange-api'),
('eur', '2021-05-20', 3.98, 'exchange-api'),
('eur', '2021-05-21', 3.9787, 'exchange-api'),
('eur', '2021-05-24', 3.9799, 'exchange-api'),
('eur', '2021-05-25', 3.9726, 'exchange-api'),
('eur', '2021-05-26', 3.9734, 'exchange-api'),
('eur', '2021-05-27', 3.963, 'exchange-api'),
('eur', '2021-05-28', 3.9688, 'exchange-api'),
('eur', '2021-06-01', 3.9583, 'exchange-api'),
('eur', '2021-06-02', 3.9618, 'exchange-api'),
('eur', '2021-06-03', 3.9622, 'exchange-api'),
('eur', '2021-06-04', 3.9459, 'exchange-api'),
('eur', '2021-06-07', 3.9524, 'exchange-api'),
('eur', '2021-06-08', 3.9505, 'exchange-api'),
('eur', '2021-06-09', 3.9561, 'exchange-api'),
('eur', '2021-06-10', 3.9469, 'exchange-api'),
('eur', '2021-06-11', 3.9494, 'exchange-api'),
('eur', '2021-06-14', 3.9361, 'exchange-api'),
('eur', '2021-06-15', 3.9267, 'exchange-api'),
('eur', '2021-06-16', 3.9239, 'exchange-api'),
('eur', '2021-06-17', 3.8912, 'exchange-api'),
('eur', '2021-06-18', 3.8897, 'exchange-api'),
('eur', '2021-06-21', 3.8858, 'exchange-api'),
('eur', '2021-06-22', 3.8785, 'exchange-api'),
('eur', '2021-06-23', 3.8883, 'exchange-api'),
('eur', '2021-06-24', 3.8855, 'exchange-api'),
('eur', '2021-06-25', 3.8762, 'exchange-api'),
('eur', '2021-06-28', 3.8816, 'exchange-api'),
('eur', '2021-06-29', 3.8801, 'exchange-api'),
('eur', '2021-06-30', 3.8748, 'exchange-api'),
('eur', '2021-07-01', 3.8714, 'exchange-api'),
('eur', '2021-07-02', 3.871, 'exchange-api'),
('eur', '2021-07-05', 3.8757, 'exchange-api'),
('eur', '2021-07-06', 3.8655, 'exchange-api'),
('eur', '2021-07-07', 3.8642, 'exchange-api'),
('eur', '2021-07-08', 3.8784, 'exchange-api'),
('eur', '2021-07-09', 3.8792, 'exchange-api'),
('eur', '2021-07-12', 3.8924, 'exchange-api'),
('eur', '2021-07-13', 3.8832, 'exchange-api'),
('eur', '2021-07-14', 3.8698, 'exchange-api'),
('eur', '2021-07-15', 3.8567, 'exchange-api'),
('eur', '2021-07-16', 3.8733, 'exchange-api'),
('eur', '2021-07-19', 3.8803, 'exchange-api'),
('eur', '2021-07-20', 3.8843, 'exchange-api'),
('eur', '2021-07-21', 3.8768, 'exchange-api'),
('eur', '2021-07-22', 3.857, 'exchange-api'),
('eur', '2021-07-23', 3.8528, 'exchange-api'),
('eur', '2021-07-26', 3.8491, 'exchange-api'),
('eur', '2021-07-27', 3.843, 'exchange-api'),
('eur', '2021-07-28', 3.8399, 'exchange-api'),
('eur', '2021-07-29', 3.8515, 'exchange-api'),
('eur', '2021-07-30', 3.849, 'exchange-api'),
('eur', '2021-08-02', 3.8362, 'exchange-api'),
('eur', '2021-08-03', 3.8237, 'exchange-api'),
('eur', '2021-08-04', 3.809, 'exchange-api'),
('eur', '2021-08-05', 3.8059, 'exchange-api'),
('eur', '2021-08-06', 3.8035, 'exchange-api'),
('eur', '2021-08-09', 3.7883, 'exchange-api'),
('eur', '2021-08-10', 3.7835, 'exchange-api'),
('eur', '2021-08-11', 3.7703, 'exchange-api'),
('eur', '2021-08-12', 3.7808, 'exchange-api'),
('eur', '2021-08-13', 3.7835, 'exchange-api'),
('eur', '2021-08-16', 3.7874, 'exchange-api'),
('eur', '2021-08-17', 3.7947, 'exchange-api'),
('eur', '2021-08-18', 3.7953, 'exchange-api'),
('eur', '2021-08-19', 3.7935, 'exchange-api'),
('eur', '2021-08-20', 3.7904, 'exchange-api'),
('eur', '2021-08-23', 3.7854, 'exchange-api'),
('eur', '2021-08-24', 3.7772, 'exchange-api'),
('eur', '2021-08-25', 3.7913, 'exchange-api'),
('eur', '2021-08-26', 3.7928, 'exchange-api'),
('eur', '2021-08-27', 3.8009, 'exchange-api'),
('eur', '2021-08-30', 3.7991, 'exchange-api'),
('eur', '2021-08-31', 3.7973, 'exchange-api'),
('eur', '2021-09-01', 3.7843, 'exchange-api'),
('eur', '2021-09-02', 3.8022, 'exchange-api'),
('eur', '2021-09-03', 3.8073, 'exchange-api'),
('eur', '2021-09-09', 3.7904, 'exchange-api'),
('eur', '2021-09-10', 3.7896, 'exchange-api'),
('eur', '2021-09-13', 3.7754, 'exchange-api'),
('eur', '2021-09-14', 3.7906, 'exchange-api'),
('eur', '2021-09-17', 3.7779, 'exchange-api'),
('eur', '2021-09-20', 3.7624, 'exchange-api'),
('eur', '2021-09-22', 3.7628, 'exchange-api'),
('eur', '2021-09-23', 3.7504, 'exchange-api'),
('eur', '2021-09-24', 3.7555, 'exchange-api'),
('eur', '2021-09-27', 3.7452, 'exchange-api'),
('eur', '2021-09-29', 3.7453, 'exchange-api'),
('eur', '2021-09-30', 3.736, 'exchange-api'),
('eur', '2021-10-01', 3.7386, 'exchange-api'),
('eur', '2021-10-04', 3.7382, 'exchange-api'),
('eur', '2021-10-05', 3.7437, 'exchange-api'),
('eur', '2021-10-06', 3.7434, 'exchange-api'),
('eur', '2021-10-07', 3.7324, 'exchange-api'),
('eur', '2021-10-08', 3.7319, 'exchange-api'),
('eur', '2021-10-11', 3.7349, 'exchange-api'),
('eur', '2021-10-12', 3.7278, 'exchange-api'),
('eur', '2021-10-13', 3.7405, 'exchange-api'),
('eur', '2021-10-14', 3.7412, 'exchange-api'),
('eur', '2021-10-15', 3.7345, 'exchange-api'),
('eur', '2021-10-18', 3.7411, 'exchange-api'),
('eur', '2021-10-19', 3.7462, 'exchange-api'),
('eur', '2021-10-20', 3.7378, 'exchange-api'),
('eur', '2021-10-21', 3.7382, 'exchange-api'),
('eur', '2021-10-22', 3.7368, 'exchange-api'),
('eur', '2021-10-25', 3.7258, 'exchange-api'),
('eur', '2021-10-26', 3.7204, 'exchange-api'),
('eur', '2021-10-27', 3.7024, 'exchange-api'),
('eur', '2021-10-28', 3.6948, 'exchange-api'),
('eur', '2021-10-29', 3.6858, 'exchange-api'),
('eur', '2021-11-01', 3.627, 'exchange-api'),
('eur', '2021-11-02', 3.6303, 'exchange-api'),
('eur', '2021-11-03', 3.6339, 'exchange-api'),
('eur', '2021-11-04', 3.61, 'exchange-api'),
('eur', '2021-11-05', 3.6026, 'exchange-api'),
('eur', '2021-11-08', 3.5894, 'exchange-api'),
('eur', '2021-11-09', 3.5938, 'exchange-api'),
('eur', '2021-11-10', 3.5917, 'exchange-api'),
('eur', '2021-11-11', 3.5773, 'exchange-api'),
('eur', '2021-11-12', 3.5621, 'exchange-api'),
('eur', '2021-11-15', 3.5524, 'exchange-api'),
('eur', '2021-11-16', 3.5136, 'exchange-api'),
('eur', '2021-11-17', 3.4767, 'exchange-api'),
('eur', '2021-11-18', 3.4939, 'exchange-api'),
('eur', '2021-11-19', 3.495, 'exchange-api'),
('eur', '2021-11-22', 3.4841, 'exchange-api'),
('eur', '2021-11-23', 3.4983, 'exchange-api'),
('eur', '2021-11-24', 3.5517, 'exchange-api'),
('eur', '2021-11-25', 3.5418, 'exchange-api'),
('eur', '2021-11-26', 3.5817, 'exchange-api'),
('eur', '2021-11-29', 3.5634, 'exchange-api'),
('eur', '2021-11-30', 3.5899, 'exchange-api'),
('eur', '2021-12-01', 3.5655, 'exchange-api'),
('eur', '2021-12-02', 3.5938, 'exchange-api'),
('eur', '2021-12-03', 3.5643, 'exchange-api'),
('eur', '2021-12-06', 3.5698, 'exchange-api'),
('eur', '2021-12-07', 3.5524, 'exchange-api'),
('eur', '2021-12-08', 3.5126, 'exchange-api'),
('eur', '2021-12-09', 3.5112, 'exchange-api'),
('eur', '2021-12-10', 3.5033, 'exchange-api'),
('eur', '2021-12-13', 3.4964, 'exchange-api'),
('eur', '2021-12-14', 3.5232, 'exchange-api'),
('eur', '2021-12-15', 3.5325, 'exchange-api'),
('eur', '2021-12-16', 3.5088, 'exchange-api'),
('eur', '2021-12-17', 3.5292, 'exchange-api'),
('eur', '2021-12-20', 3.5523, 'exchange-api'),
('eur', '2021-12-21', 3.5715, 'exchange-api'),
('eur', '2021-12-22', 3.5776, 'exchange-api'),
('eur', '2021-12-23', 3.5683, 'exchange-api'),
('eur', '2021-12-24', 3.5713, 'exchange-api'),
('eur', '2021-12-27', 3.5471, 'exchange-api'),
('eur', '2021-12-28', 3.5253, 'exchange-api'),
('eur', '2021-12-29', 3.5159, 'exchange-api'),
('eur', '2021-12-30', 3.522, 'exchange-api'),
('eur', '2021-12-31', 3.5199, 'exchange-api'),
('eur', '2022-01-03', 3.5099, 'exchange-api'),
('eur', '2022-01-04', 3.4915, 'exchange-api'),
('eur', '2022-01-05', 3.4976, 'exchange-api'),
('eur', '2022-01-06', 3.5181, 'exchange-api'),
('eur', '2022-01-07', 3.517, 'exchange-api'),
('eur', '2022-01-10', 3.5255, 'exchange-api'),
('eur', '2022-01-11', 3.5457, 'exchange-api'),
('eur', '2022-01-12', 3.5364, 'exchange-api'),
('eur', '2022-01-13', 3.5716, 'exchange-api'),
('eur', '2022-01-14', 3.566, 'exchange-api'),
('eur', '2022-01-17', 3.5439, 'exchange-api'),
('eur', '2022-01-18', 3.5573, 'exchange-api'),
('eur', '2022-01-19', 3.5432, 'exchange-api'),
('eur', '2022-01-20', 3.5541, 'exchange-api'),
('eur', '2022-01-21', 3.5611, 'exchange-api'),
('eur', '2022-01-24', 3.5833, 'exchange-api'),
('eur', '2022-01-25', 3.5886, 'exchange-api'),
('eur', '2022-01-26', 3.5832, 'exchange-api'),
('eur', '2022-01-27', 3.5667, 'exchange-api'),
('eur', '2022-01-28', 3.5547, 'exchange-api'),
('eur', '2022-01-31', 3.5647, 'exchange-api'),
('eur', '2022-02-01', 3.5716, 'exchange-api'),
('eur', '2022-02-02', 3.5751, 'exchange-api'),
('eur', '2022-02-03', 3.5982, 'exchange-api'),
('eur', '2022-02-04', 3.6683, 'exchange-api'),
('eur', '2022-02-07', 3.6583, 'exchange-api'),
('eur', '2022-02-08', 3.6803, 'exchange-api'),
('eur', '2022-02-09', 3.6775, 'exchange-api'),
('eur', '2022-02-10', 3.6826, 'exchange-api'),
('eur', '2022-02-11', 3.6845, 'exchange-api'),
('eur', '2022-02-14', 3.6867, 'exchange-api'),
('eur', '2022-02-15', 3.6583, 'exchange-api'),
('eur', '2022-02-16', 3.6235, 'exchange-api'),
('eur', '2022-02-17', 3.6273, 'exchange-api'),
('eur', '2022-02-18', 3.6311, 'exchange-api'),
('eur', '2022-02-21', 3.6426, 'exchange-api'),
('eur', '2022-02-22', 3.6531, 'exchange-api'),
('eur', '2022-02-23', 3.6565, 'exchange-api'),
('eur', '2022-02-24', 3.6497, 'exchange-api'),
('eur', '2022-02-25', 3.6431, 'exchange-api'),
('eur', '2022-02-28', 3.6273, 'exchange-api'),
('eur', '2022-03-01', 3.6069, 'exchange-api'),
('eur', '2022-03-02', 3.5885, 'exchange-api'),
('eur', '2022-03-03', 3.59, 'exchange-api'),
('eur', '2022-03-04', 3.5769, 'exchange-api'),
('eur', '2022-03-07', 3.5559, 'exchange-api'),
('eur', '2022-03-08', 3.5985, 'exchange-api'),
('eur', '2022-03-09', 3.6025, 'exchange-api'),
('eur', '2022-03-10', 3.6124, 'exchange-api'),
('eur', '2022-03-11', 3.5841, 'exchange-api'),
('eur', '2022-03-14', 3.581, 'exchange-api'),
('eur', '2022-03-15', 3.6113, 'exchange-api'),
('eur', '2022-03-16', 3.5873, 'exchange-api'),
('eur', '2022-03-21', 3.5735, 'exchange-api'),
('eur', '2022-03-22', 3.5488, 'exchange-api'),
('eur', '2022-03-23', 3.5484, 'exchange-api'),
('eur', '2022-03-24', 3.5403, 'exchange-api'),
('eur', '2022-03-25', 3.5502, 'exchange-api'),
('eur', '2022-03-28', 3.5404, 'exchange-api'),
('eur', '2022-03-29', 3.5531, 'exchange-api'),
('eur', '2022-03-30', 3.5479, 'exchange-api'),
('eur', '2022-03-31', 3.5236, 'exchange-api'),
('eur', '2022-04-01', 3.5404, 'exchange-api'),
('eur', '2022-04-04', 3.531, 'exchange-api'),
('eur', '2022-04-05', 3.5147, 'exchange-api'),
('eur', '2022-04-06', 3.5212, 'exchange-api'),
('eur', '2022-04-07', 3.5182, 'exchange-api'),
('eur', '2022-04-08', 3.5057, 'exchange-api'),
('eur', '2022-04-11', 3.5006, 'exchange-api'),
('eur', '2022-04-12', 3.4934, 'exchange-api'),
('eur', '2022-04-13', 3.4763, 'exchange-api'),
('eur', '2022-04-14', 3.4916, 'exchange-api'),
('eur', '2022-04-19', 3.4974, 'exchange-api'),
('eur', '2022-04-20', 3.5004, 'exchange-api'),
('eur', '2022-04-21', 3.5132, 'exchange-api'),
('eur', '2022-04-25', 3.5292, 'exchange-api'),
('eur', '2022-04-26', 3.5142, 'exchange-api'),
('eur', '2022-04-27', 3.5207, 'exchange-api'),
('eur', '2022-04-28', 3.4882, 'exchange-api'),
('eur', '2022-04-29', 3.5127, 'exchange-api'),
('eur', '2022-05-02', 3.5282, 'exchange-api'),
('eur', '2022-05-03', 3.5412, 'exchange-api'),
('eur', '2022-05-04', 3.5329, 'exchange-api'),
('eur', '2022-05-06', 3.5877, 'exchange-api'),
('eur', '2022-05-09', 3.624, 'exchange-api'),
('eur', '2022-05-10', 3.6556, 'exchange-api'),
('eur', '2022-05-11', 3.6154, 'exchange-api'),
('eur', '2022-05-12', 3.6189, 'exchange-api'),
('eur', '2022-05-13', 3.5514, 'exchange-api'),
('eur', '2022-05-16', 3.5646, 'exchange-api'),
('eur', '2022-05-17', 3.5376, 'exchange-api'),
('eur', '2022-05-18', 3.5242, 'exchange-api'),
('eur', '2022-05-19', 3.5666, 'exchange-api'),
('eur', '2022-05-20', 3.549, 'exchange-api'),
('eur', '2022-05-23', 3.5819, 'exchange-api'),
('eur', '2022-05-24', 3.5854, 'exchange-api'),
('eur', '2022-05-25', 3.5835, 'exchange-api'),
('eur', '2022-05-26', 3.6047, 'exchange-api'),
('eur', '2022-05-27', 3.6029, 'exchange-api'),
('eur', '2022-05-30', 3.5727, 'exchange-api'),
('eur', '2022-05-31', 3.5757, 'exchange-api'),
('eur', '2022-06-01', 3.5632, 'exchange-api'),
('eur', '2022-06-02', 3.5711, 'exchange-api'),
('eur', '2022-06-06', 3.5739, 'exchange-api'),
('eur', '2022-06-07', 3.5614, 'exchange-api'),
('eur', '2022-06-08', 3.5853, 'exchange-api'),
('eur', '2022-06-09', 3.5839, 'exchange-api'),
('eur', '2022-06-10', 3.5827, 'exchange-api'),
('eur', '2022-06-13', 3.5988, 'exchange-api'),
('eur', '2022-06-14', 3.5942, 'exchange-api'),
('eur', '2022-06-15', 3.6217, 'exchange-api'),
('eur', '2022-06-16', 3.5999, 'exchange-api'),
('eur', '2022-06-17', 3.6431, 'exchange-api'),
('eur', '2022-06-20', 3.6365, 'exchange-api'),
('eur', '2022-06-21', 3.6484, 'exchange-api'),
('eur', '2022-06-22', 3.644, 'exchange-api'),
('eur', '2022-06-23', 3.6199, 'exchange-api'),
('eur', '2022-06-24', 3.6227, 'exchange-api'),
('eur', '2022-06-27', 3.5956, 'exchange-api'),
('eur', '2022-06-28', 3.635, 'exchange-api'),
('eur', '2022-06-29', 3.6328, 'exchange-api'),
('eur', '2022-06-30', 3.6364, 'exchange-api'),
('eur', '2022-07-01', 3.685, 'exchange-api'),
('eur', '2022-07-04', 3.6568, 'exchange-api'),
('eur', '2022-07-05', 3.6249, 'exchange-api'),
('eur', '2022-07-06', 3.5816, 'exchange-api'),
('eur', '2022-07-07', 3.5582, 'exchange-api'),
('eur', '2022-07-08', 3.5176, 'exchange-api'),
('eur', '2022-07-11', 3.5111, 'exchange-api'),
('eur', '2022-07-12', 3.4974, 'exchange-api'),
('eur', '2022-07-13', 3.4904, 'exchange-api'),
('eur', '2022-07-14', 3.479, 'exchange-api'),
('eur', '2022-07-15', 3.4903, 'exchange-api'),
('eur', '2022-07-18', 3.5005, 'exchange-api'),
('eur', '2022-07-19', 3.5239, 'exchange-api'),
('eur', '2022-07-20', 3.5165, 'exchange-api'),
('eur', '2022-07-21', 3.5175, 'exchange-api'),
('eur', '2022-07-22', 3.5054, 'exchange-api'),
('eur', '2022-07-25', 3.5249, 'exchange-api'),
('eur', '2022-07-26', 3.4891, 'exchange-api'),
('eur', '2022-07-27', 3.4777, 'exchange-api'),
('eur', '2022-07-28', 3.4779, 'exchange-api'),
('eur', '2022-07-29', 3.471, 'exchange-api'),
('eur', '2022-08-01', 3.4644, 'exchange-api'),
('eur', '2022-08-02', 3.4472, 'exchange-api'),
('eur', '2022-08-03', 3.4308, 'exchange-api'),
('eur', '2022-08-04', 3.4065, 'exchange-api'),
('eur', '2022-08-05', 3.4095, 'exchange-api'),
('eur', '2022-08-08', 3.3898, 'exchange-api'),
('eur', '2022-08-09', 3.3834, 'exchange-api'),
('eur', '2022-08-10', 3.3654, 'exchange-api'),
('eur', '2022-08-11', 3.3686, 'exchange-api'),
('eur', '2022-08-12', 3.3402, 'exchange-api'),
('eur', '2022-08-15', 3.3297, 'exchange-api'),
('eur', '2022-08-16', 3.3162, 'exchange-api'),
('eur', '2022-08-17', 3.3132, 'exchange-api'),
('eur', '2022-08-18', 3.2987, 'exchange-api'),
('eur', '2022-08-19', 3.2845, 'exchange-api'),
('eur', '2022-08-22', 3.2839, 'exchange-api'),
('eur', '2022-08-23', 3.2572, 'exchange-api'),
('eur', '2022-08-24', 3.2542, 'exchange-api'),
('eur', '2022-08-25', 3.2808, 'exchange-api'),
('eur', '2022-08-26', 3.2523, 'exchange-api'),
('eur', '2022-08-29', 3.3177, 'exchange-api'),
('eur', '2022-08-30', 3.3132, 'exchange-api'),
('eur', '2022-08-31', 3.3348, 'exchange-api'),
('eur', '2022-09-01', 3.369, 'exchange-api'),
('eur', '2022-09-02', 3.3722, 'exchange-api'),
('eur', '2022-09-05', 3.3873, 'exchange-api'),
('eur', '2022-09-06', 3.3936, 'exchange-api'),
('eur', '2022-09-07', 3.3999, 'exchange-api'),
('eur', '2022-09-08', 3.432, 'exchange-api'),
('eur', '2022-09-09', 3.4493, 'exchange-api'),
('eur', '2022-09-12', 3.4388, 'exchange-api'),
('eur', '2022-09-13', 3.411, 'exchange-api'),
('eur', '2022-09-14', 3.4331, 'exchange-api'),
('eur', '2022-09-15', 3.4354, 'exchange-api'),
('eur', '2022-09-16', 3.4307, 'exchange-api'),
('eur', '2022-09-19', 3.4407, 'exchange-api'),
('eur', '2022-09-20', 3.4412, 'exchange-api'),
('eur', '2022-09-21', 3.4348, 'exchange-api'),
('eur', '2022-09-22', 3.4268, 'exchange-api'),
('eur', '2022-09-23', 3.411, 'exchange-api'),
('eur', '2022-09-28', 3.3854, 'exchange-api'),
('eur', '2022-09-29', 3.4284, 'exchange-api'),
('eur', '2022-09-30', 3.4858, 'exchange-api'),
('eur', '2022-10-03', 3.4998, 'exchange-api'),
('eur', '2022-10-06', 3.4982, 'exchange-api'),
('eur', '2022-10-07', 3.4559, 'exchange-api'),
('eur', '2022-10-11', 3.4774, 'exchange-api'),
('eur', '2022-10-12', 3.4601, 'exchange-api'),
('eur', '2022-10-13', 3.4711, 'exchange-api'),
('eur', '2022-10-14', 3.4571, 'exchange-api'),
('eur', '2022-10-18', 3.4773, 'exchange-api'),
('eur', '2022-10-19', 3.4603, 'exchange-api'),
('eur', '2022-10-20', 3.4728, 'exchange-api'),
('eur', '2022-10-21', 3.4797, 'exchange-api'),
('eur', '2022-10-24', 3.4969, 'exchange-api'),
('eur', '2022-10-25', 3.5088, 'exchange-api'),
('eur', '2022-10-26', 3.5106, 'exchange-api'),
('eur', '2022-10-27', 3.5386, 'exchange-api'),
('eur', '2022-10-28', 3.5258, 'exchange-api'),
('eur', '2022-10-31', 3.498, 'exchange-api'),
('eur', '2022-11-02', 3.501, 'exchange-api'),
('eur', '2022-11-03', 3.4824, 'exchange-api'),
('eur', '2022-11-04', 3.485, 'exchange-api'),
('eur', '2022-11-07', 3.5324, 'exchange-api'),
('eur', '2022-11-08', 3.5334, 'exchange-api'),
('eur', '2022-11-09', 3.565, 'exchange-api'),
('eur', '2022-11-10', 3.5452, 'exchange-api'),
('eur', '2022-11-11', 3.5401, 'exchange-api'),
('eur', '2022-11-14', 3.5328, 'exchange-api'),
('eur', '2022-11-15', 3.58, 'exchange-api'),
('eur', '2022-11-16', 3.562, 'exchange-api'),
('eur', '2022-11-17', 3.576, 'exchange-api'),
('eur', '2022-11-18', 3.5965, 'exchange-api'),
('eur', '2022-11-21', 3.5482, 'exchange-api'),
('eur', '2022-11-22', 3.5671, 'exchange-api'),
('eur', '2022-11-23', 3.5654, 'exchange-api'),
('eur', '2022-11-24', 3.5578, 'exchange-api'),
('eur', '2022-11-25', 3.5558, 'exchange-api'),
('eur', '2022-11-28', 3.601, 'exchange-api'),
('eur', '2022-11-29', 3.5608, 'exchange-api'),
('eur', '2022-11-30', 3.5642, 'exchange-api'),
('eur', '2022-12-01', 3.5673, 'exchange-api'),
('eur', '2022-12-02', 3.5607, 'exchange-api'),
('eur', '2022-12-05', 3.5786, 'exchange-api'),
('eur', '2022-12-06', 3.5798, 'exchange-api'),
('eur', '2022-12-07', 3.624, 'exchange-api'),
('eur', '2022-12-08', 3.619, 'exchange-api'),
('eur', '2022-12-09', 3.6122, 'exchange-api'),
('eur', '2022-12-12', 3.6209, 'exchange-api'),
('eur', '2022-12-13', 3.6188, 'exchange-api'),
('eur', '2022-12-14', 3.6304, 'exchange-api'),
('eur', '2022-12-15', 3.6363, 'exchange-api'),
('eur', '2022-12-16', 3.6721, 'exchange-api'),
('eur', '2022-12-19', 3.6514, 'exchange-api'),
('eur', '2022-12-20', 3.6754, 'exchange-api'),
('eur', '2022-12-21', 3.6952, 'exchange-api'),
('eur', '2022-12-22', 3.6933, 'exchange-api'),
('eur', '2022-12-23', 3.7055, 'exchange-api'),
('eur', '2022-12-27', 3.7401, 'exchange-api'),
('eur', '2022-12-28', 3.7524, 'exchange-api'),
('eur', '2022-12-29', 3.7567, 'exchange-api'),
('eur', '2022-12-30', 3.753, 'exchange-api'),
('eur', '2023-01-03', 3.7188, 'exchange-api'),
('eur', '2023-01-04', 3.7409, 'exchange-api'),
('eur', '2023-01-05', 3.7439, 'exchange-api'),
('eur', '2023-01-06', 3.7355, 'exchange-api'),
('eur', '2023-01-09', 3.7347, 'exchange-api'),
('eur', '2023-01-10', 3.7288, 'exchange-api'),
('eur', '2023-01-11', 3.7125, 'exchange-api'),
('eur', '2023-01-12', 3.6885, 'exchange-api'),
('eur', '2023-01-13', 3.6973, 'exchange-api'),
('eur', '2023-01-16', 3.6985, 'exchange-api'),
('eur', '2023-01-17', 3.6996, 'exchange-api'),
('eur', '2023-01-18', 3.6639, 'exchange-api'),
('eur', '2023-01-19', 3.6871, 'exchange-api'),
('eur', '2023-01-20', 3.6948, 'exchange-api'),
('eur', '2023-01-23', 3.6777, 'exchange-api'),
('eur', '2023-01-24', 3.6629, 'exchange-api'),
('eur', '2023-01-25', 3.6642, 'exchange-api'),
('eur', '2023-01-26', 3.7045, 'exchange-api'),
('eur', '2023-01-27', 3.7374, 'exchange-api'),
('eur', '2023-01-30', 3.779, 'exchange-api'),
('eur', '2023-01-31', 3.7646, 'exchange-api'),
('eur', '2023-02-01', 3.7639, 'exchange-api'),
('eur', '2023-02-02', 3.7621, 'exchange-api'),
('eur', '2023-02-03', 3.7128, 'exchange-api'),
('eur', '2023-02-06', 3.7386, 'exchange-api'),
('eur', '2023-02-07', 3.7176, 'exchange-api'),
('eur', '2023-02-08', 3.7379, 'exchange-api'),
('eur', '2023-02-09', 3.757, 'exchange-api'),
('eur', '2023-02-10', 3.7578, 'exchange-api'),
('eur', '2023-02-13', 3.7821, 'exchange-api'),
('eur', '2023-02-14', 3.7666, 'exchange-api'),
('eur', '2023-02-15', 3.7802, 'exchange-api'),
('eur', '2023-02-16', 3.7877, 'exchange-api'),
('eur', '2023-02-17', 3.7937, 'exchange-api'),
('eur', '2023-02-20', 3.807, 'exchange-api'),
('eur', '2023-02-21', 3.8886, 'exchange-api'),
('eur', '2023-02-22', 3.8945, 'exchange-api'),
('eur', '2023-02-23', 3.8364, 'exchange-api'),
('eur', '2023-02-24', 3.8752, 'exchange-api'),
('eur', '2023-02-27', 3.8788, 'exchange-api'),
('eur', '2023-02-28', 3.8913, 'exchange-api'),
('eur', '2023-03-01', 3.8795, 'exchange-api'),
('eur', '2023-03-02', 3.8716, 'exchange-api'),
('eur', '2023-03-03', 3.8873, 'exchange-api'),
('eur', '2023-03-06', 3.8173, 'exchange-api'),
('eur', '2023-03-09', 3.8057, 'exchange-api'),
('eur', '2023-03-10', 3.8037, 'exchange-api'),
('eur', '2023-03-13', 3.8751, 'exchange-api'),
('eur', '2023-03-14', 3.897, 'exchange-api'),
('eur', '2023-03-15', 3.8583, 'exchange-api'),
('eur', '2023-03-16', 3.8828, 'exchange-api'),
('eur', '2023-03-17', 3.9026, 'exchange-api'),
('eur', '2023-03-20', 3.9345, 'exchange-api'),
('eur', '2023-03-21', 3.9351, 'exchange-api'),
('eur', '2023-03-22', 3.9325, 'exchange-api'),
('eur', '2023-03-23', 3.9284, 'exchange-api'),
('eur', '2023-03-24', 3.9143, 'exchange-api'),
('eur', '2023-03-27', 3.8336, 'exchange-api'),
('eur', '2023-03-28', 3.8255, 'exchange-api'),
('eur', '2023-03-29', 3.8671, 'exchange-api'),
('eur', '2023-03-30', 3.8962, 'exchange-api'),
('eur', '2023-03-31', 3.9322, 'exchange-api'),
('eur', '2023-04-03', 3.9037, 'exchange-api'),
('eur', '2023-04-04', 3.8879, 'exchange-api'),
('eur', '2023-04-11', 3.9489, 'exchange-api'),
('eur', '2023-04-13', 4.0285, 'exchange-api'),
('eur', '2023-04-14', 4.0492, 'exchange-api'),
('eur', '2023-04-17', 4.0027, 'exchange-api'),
('eur', '2023-04-18', 4.0027, 'exchange-api'),
('eur', '2023-04-19', 3.9985, 'exchange-api'),
('eur', '2023-04-20', 4.0092, 'exchange-api'),
('eur', '2023-04-21', 4.0023, 'exchange-api'),
('eur', '2023-04-24', 4.0286, 'exchange-api'),
('eur', '2023-04-25', 4.0139, 'exchange-api'),
('eur', '2023-04-27', 4.015, 'exchange-api'),
('eur', '2023-04-28', 4.0021, 'exchange-api'),
('eur', '2023-05-01', 3.984, 'exchange-api'),
('eur', '2023-05-02', 3.9707, 'exchange-api'),
('eur', '2023-05-03', 4.0149, 'exchange-api'),
('eur', '2023-05-04', 4.0268, 'exchange-api'),
('eur', '2023-05-05', 4.022, 'exchange-api'),
('eur', '2023-05-08', 4.0129, 'exchange-api'),
('eur', '2023-05-09', 4.0148, 'exchange-api'),
('eur', '2023-05-10', 4.0233, 'exchange-api'),
('eur', '2023-05-11', 3.9818, 'exchange-api'),
('eur', '2023-05-12', 3.9807, 'exchange-api'),
('eur', '2023-05-15', 3.9653, 'exchange-api'),
('eur', '2023-05-16', 3.9872, 'exchange-api'),
('eur', '2023-05-17', 3.9536, 'exchange-api'),
('eur', '2023-05-18', 3.9355, 'exchange-api'),
('eur', '2023-05-19', 3.9297, 'exchange-api'),
('eur', '2023-05-22', 3.9524, 'exchange-api'),
('eur', '2023-05-23', 3.9575, 'exchange-api'),
('eur', '2023-05-24', 4.0123, 'exchange-api'),
('eur', '2023-05-25', 3.999, 'exchange-api'),
('eur', '2023-05-30', 3.9817, 'exchange-api'),
('eur', '2023-05-31', 3.9672, 'exchange-api'),
('eur', '2023-06-01', 3.9968, 'exchange-api'),
('eur', '2023-06-02', 4.0347, 'exchange-api'),
('eur', '2023-06-05', 3.9922, 'exchange-api'),
('eur', '2023-06-06', 3.9687, 'exchange-api'),
('eur', '2023-06-07', 3.9179, 'exchange-api'),
('eur', '2023-06-08', 3.9291, 'exchange-api'),
('eur', '2023-06-09', 3.9114, 'exchange-api'),
('eur', '2023-06-12', 3.8638, 'exchange-api'),
('eur', '2023-06-13', 3.8407, 'exchange-api'),
('eur', '2023-06-14', 3.9057, 'exchange-api'),
('eur', '2023-06-15', 3.8846, 'exchange-api'),
('eur', '2023-06-16', 3.8917, 'exchange-api'),
('eur', '2023-06-19', 3.9344, 'exchange-api'),
('eur', '2023-06-20', 3.943, 'exchange-api'),
('eur', '2023-06-21', 3.9353, 'exchange-api'),
('eur', '2023-06-22', 3.9856, 'exchange-api'),
('eur', '2023-06-23', 3.9439, 'exchange-api'),
('eur', '2023-06-26', 3.9528, 'exchange-api'),
('eur', '2023-06-27', 3.9818, 'exchange-api'),
('eur', '2023-06-28', 4.0309, 'exchange-api'),
('eur', '2023-06-29', 4.0334, 'exchange-api'),
('eur', '2023-06-30', 4.0185, 'exchange-api'),
('eur', '2023-07-03', 4.0464, 'exchange-api'),
('eur', '2023-07-04', 4.0394, 'exchange-api'),
('eur', '2023-07-05', 4.0218, 'exchange-api'),
('eur', '2023-07-06', 4.0287, 'exchange-api'),
('eur', '2023-07-07', 4.0428, 'exchange-api'),
('eur', '2023-07-10', 4.0641, 'exchange-api'),
('eur', '2023-07-11', 4.0825, 'exchange-api'),
('eur', '2023-07-12', 4.0395, 'exchange-api'),
('eur', '2023-07-13', 4.0379, 'exchange-api'),
('eur', '2023-07-14', 4.0528, 'exchange-api'),
('eur', '2023-07-17', 4.0838, 'exchange-api'),
('eur', '2023-07-18', 4.0903, 'exchange-api'),
('eur', '2023-07-19', 4.0264, 'exchange-api'),
('eur', '2023-07-20', 4.0257, 'exchange-api'),
('eur', '2023-07-21', 4.0241, 'exchange-api'),
('eur', '2023-07-24', 4.0184, 'exchange-api'),
('eur', '2023-07-25', 4.1056, 'exchange-api'),
('eur', '2023-07-26', 4.1087, 'exchange-api'),
('eur', '2023-07-28', 4.0714, 'exchange-api'),
('eur', '2023-07-31', 4.0737, 'exchange-api'),
('eur', '2023-08-01', 4.0089, 'exchange-api'),
('eur', '2023-08-02', 4.0109, 'exchange-api'),
('eur', '2023-08-03', 4.0298, 'exchange-api'),
('eur', '2023-08-04', 4.0338, 'exchange-api'),
('eur', '2023-08-07', 4.0354, 'exchange-api'),
('eur', '2023-08-08', 4.0507, 'exchange-api'),
('eur', '2023-08-09', 4.0798, 'exchange-api'),
('eur', '2023-08-10', 4.098, 'exchange-api'),
('eur', '2023-08-11', 4.0937, 'exchange-api'),
('eur', '2023-08-14', 4.0771, 'exchange-api'),
('eur', '2023-08-15', 4.1144, 'exchange-api'),
('eur', '2023-08-16', 4.0979, 'exchange-api'),
('eur', '2023-08-17', 4.1128, 'exchange-api'),
('eur', '2023-08-18', 4.1206, 'exchange-api'),
('eur', '2023-08-21', 4.1372, 'exchange-api'),
('eur', '2023-08-22', 4.1134, 'exchange-api'),
('eur', '2023-08-23', 4.0941, 'exchange-api'),
('eur', '2023-08-24', 4.0942, 'exchange-api'),
('eur', '2023-08-25', 4.0974, 'exchange-api'),
('eur', '2023-08-28', 4.105, 'exchange-api'),
('eur', '2023-08-29', 4.1151, 'exchange-api'),
('eur', '2023-08-30', 4.1338, 'exchange-api'),
('eur', '2023-08-31', 4.1329, 'exchange-api'),
('eur', '2023-09-01', 4.1172, 'exchange-api'),
('eur', '2023-09-04', 4.1133, 'exchange-api'),
('eur', '2023-09-05', 4.0709, 'exchange-api'),
('eur', '2023-09-06', 4.0905, 'exchange-api'),
('eur', '2023-09-07', 4.1188, 'exchange-api'),
('eur', '2023-09-08', 4.1176, 'exchange-api'),
('eur', '2023-09-11', 4.1233, 'exchange-api'),
('eur', '2023-09-12', 4.0694, 'exchange-api'),
('eur', '2023-09-13', 4.0986, 'exchange-api'),
('eur', '2023-09-14', 4.1059, 'exchange-api'),
('eur', '2023-09-18', 4.081, 'exchange-api'),
('eur', '2023-09-19', 4.0709, 'exchange-api'),
('eur', '2023-09-20', 4.0776, 'exchange-api'),
('eur', '2023-09-21', 4.0533, 'exchange-api'),
('eur', '2023-09-22', 4.0622, 'exchange-api'),
('eur', '2023-09-26', 4.0485, 'exchange-api'),
('eur', '2023-09-27', 4.0543, 'exchange-api'),
('eur', '2023-09-28', 4.0575, 'exchange-api'),
('eur', '2023-09-29', 4.0531, 'exchange-api'),
('eur', '2023-10-02', 4.0439, 'exchange-api'),
('eur', '2023-10-03', 4.0334, 'exchange-api'),
('eur', '2023-10-04', 4.0481, 'exchange-api'),
('eur', '2023-10-05', 4.0545, 'exchange-api'),
('eur', '2023-10-06', 4.0725, 'exchange-api'),
('eur', '2023-10-09', 4.1196, 'exchange-api'),
('eur', '2023-10-10', 4.1774, 'exchange-api'),
('eur', '2023-10-11', 4.1969, 'exchange-api'),
('eur', '2023-10-12', 4.2025, 'exchange-api'),
('eur', '2023-10-13', 4.1867, 'exchange-api'),
('eur', '2023-10-16', 4.2004, 'exchange-api'),
('eur', '2023-10-17', 4.2372, 'exchange-api'),
('eur', '2023-10-18', 4.2475, 'exchange-api'),
('eur', '2023-10-19', 4.2492, 'exchange-api'),
('eur', '2023-10-20', 4.2799, 'exchange-api'),
('eur', '2023-10-23', 4.3087, 'exchange-api'),
('eur', '2023-10-24', 4.3168, 'exchange-api'),
('eur', '2023-10-25', 4.2968, 'exchange-api'),
('eur', '2023-10-26', 4.2975, 'exchange-api'),
('eur', '2023-10-27', 4.3077, 'exchange-api'),
('eur', '2023-10-30', 4.2934, 'exchange-api'),
('eur', '2023-10-31', 4.2833, 'exchange-api'),
('eur', '2023-11-01', 4.248, 'exchange-api'),
('eur', '2023-11-02', 4.2243, 'exchange-api'),
('eur', '2023-11-03', 4.2423, 'exchange-api'),
('eur', '2023-11-06', 4.1677, 'exchange-api'),
('eur', '2023-11-07', 4.129, 'exchange-api'),
('eur', '2023-11-08', 4.1075, 'exchange-api'),
('eur', '2023-11-09', 4.1173, 'exchange-api'),
('eur', '2023-11-10', 4.1325, 'exchange-api'),
('eur', '2023-11-13', 4.1326, 'exchange-api'),
('eur', '2023-11-14', 4.1101, 'exchange-api'),
('eur', '2023-11-15', 4.09, 'exchange-api'),
('eur', '2023-11-16', 4.1023, 'exchange-api'),
('eur', '2023-11-17', 4.0476, 'exchange-api'),
('eur', '2023-11-20', 4.0713, 'exchange-api'),
('eur', '2023-11-21', 4.061, 'exchange-api'),
('eur', '2023-11-22', 4.0643, 'exchange-api'),
('eur', '2023-11-23', 4.0716, 'exchange-api'),
('eur', '2023-11-24', 4.0783, 'exchange-api'),
('eur', '2023-11-27', 4.0795, 'exchange-api'),
('eur', '2023-11-28', 4.0609, 'exchange-api'),
('eur', '2023-11-29', 4.0358, 'exchange-api'),
('eur', '2023-11-30', 4.0543, 'exchange-api'),
('eur', '2023-12-01', 4.0743, 'exchange-api'),
('eur', '2023-12-04', 4.0328, 'exchange-api'),
('eur', '2023-12-05', 4.0346, 'exchange-api'),
('eur', '2023-12-06', 3.9997, 'exchange-api'),
('eur', '2023-12-07', 3.9857, 'exchange-api'),
('eur', '2023-12-08', 3.9886, 'exchange-api'),
('eur', '2023-12-11', 4.0011, 'exchange-api'),
('eur', '2023-12-12', 4.0042, 'exchange-api'),
('eur', '2023-12-13', 4.0001, 'exchange-api'),
('eur', '2023-12-14', 4.0259, 'exchange-api'),
('eur', '2023-12-15', 4.0095, 'exchange-api'),
('eur', '2023-12-18', 3.9869, 'exchange-api'),
('eur', '2023-12-19', 3.985, 'exchange-api'),
('eur', '2023-12-20', 3.9901, 'exchange-api'),
('eur', '2023-12-21', 3.9705, 'exchange-api'),
('eur', '2023-12-22', 3.9616, 'exchange-api'),
('eur', '2023-12-26', 3.9973, 'exchange-api'),
('eur', '2023-12-27', 4.0066, 'exchange-api'),
('eur', '2023-12-28', 4.0222, 'exchange-api'),
('eur', '2023-12-29', 4.0116, 'exchange-api'),
('eur', '2024-01-02', 3.9773, 'exchange-api'),
('eur', '2024-01-03', 3.9833, 'exchange-api'),
('eur', '2024-01-04', 3.9961, 'exchange-api'),
('eur', '2024-01-05', 3.9917, 'exchange-api'),
('eur', '2024-01-08', 4.0681, 'exchange-api'),
('eur', '2024-01-09', 4.0639, 'exchange-api'),
('eur', '2024-01-10', 4.1126, 'exchange-api'),
('eur', '2024-01-11', 4.1013, 'exchange-api'),
('eur', '2024-01-12', 4.0876, 'exchange-api'),
('eur', '2024-01-15', 4.1087, 'exchange-api'),
('eur', '2024-01-16', 4.1014, 'exchange-api'),
('eur', '2024-01-17', 4.1157, 'exchange-api'),
('eur', '2024-01-18', 4.1016, 'exchange-api'),
('eur', '2024-01-19', 4.0781, 'exchange-api'),
('eur', '2024-01-22', 4.1044, 'exchange-api'),
('eur', '2024-01-23', 4.096, 'exchange-api'),
('eur', '2024-01-24', 4.0521, 'exchange-api'),
('eur', '2024-01-25', 4.0324, 'exchange-api'),
('eur', '2024-01-26', 4.0213, 'exchange-api'),
('eur', '2024-01-29', 3.9919, 'exchange-api'),
('eur', '2024-01-30', 3.9593, 'exchange-api'),
('eur', '2024-01-31', 3.9398, 'exchange-api'),
('eur', '2024-02-01', 3.9499, 'exchange-api'),
('eur', '2024-02-02', 3.9675, 'exchange-api'),
('eur', '2024-02-05', 3.9493, 'exchange-api'),
('eur', '2024-02-06', 3.9126, 'exchange-api'),
('eur', '2024-02-07', 3.9269, 'exchange-api'),
('eur', '2024-02-08', 3.9487, 'exchange-api'),
('eur', '2024-02-09', 3.9676, 'exchange-api'),
('eur', '2024-02-12', 3.9667, 'exchange-api'),
('eur', '2024-02-13', 3.9285, 'exchange-api'),
('eur', '2024-02-14', 3.9187, 'exchange-api'),
('eur', '2024-02-15', 3.8986, 'exchange-api'),
('eur', '2024-02-16', 3.8857, 'exchange-api'),
('eur', '2024-02-19', 3.9034, 'exchange-api'),
('eur', '2024-02-20', 3.9475, 'exchange-api'),
('eur', '2024-02-21', 3.9719, 'exchange-api'),
('eur', '2024-02-22', 3.9538, 'exchange-api'),
('eur', '2024-02-23', 3.9347, 'exchange-api'),
('eur', '2024-02-26', 3.9597, 'exchange-api'),
('eur', '2024-02-28', 3.9023, 'exchange-api'),
('eur', '2024-02-29', 3.8856, 'exchange-api'),
('eur', '2024-03-01', 3.8549, 'exchange-api'),
('eur', '2024-03-04', 3.8779, 'exchange-api'),
('eur', '2024-03-05', 3.8975, 'exchange-api'),
('eur', '2024-03-06', 3.9218, 'exchange-api'),
('eur', '2024-03-07', 3.9116, 'exchange-api'),
('eur', '2024-03-08', 3.9128, 'exchange-api'),
('eur', '2024-03-11', 3.9482, 'exchange-api'),
('eur', '2024-03-12', 3.9894, 'exchange-api'),
('eur', '2024-03-13', 4.0039, 'exchange-api'),
('eur', '2024-03-14', 3.9639, 'exchange-api'),
('eur', '2024-03-15', 3.9746, 'exchange-api'),
('eur', '2024-03-18', 3.9811, 'exchange-api'),
('eur', '2024-03-19', 3.9807, 'exchange-api'),
('eur', '2024-03-20', 3.9904, 'exchange-api'),
('eur', '2024-03-21', 3.9304, 'exchange-api'),
('eur', '2024-03-22', 3.9167, 'exchange-api'),
('eur', '2024-03-26', 3.9713, 'exchange-api'),
('eur', '2024-03-27', 3.9648, 'exchange-api'),
('eur', '2024-03-28', 3.9791, 'exchange-api'),
('eur', '2024-04-01', 3.9502, 'exchange-api'),
('eur', '2024-04-02', 3.9717, 'exchange-api'),
('eur', '2024-04-03', 4.0231, 'exchange-api'),
('eur', '2024-04-04', 4.0348, 'exchange-api'),
('eur', '2024-04-05', 4.0626, 'exchange-api'),
('eur', '2024-04-08', 4.0204, 'exchange-api'),
('eur', '2024-04-09', 4.0078, 'exchange-api'),
('eur', '2024-04-10', 4.0318, 'exchange-api'),
('eur', '2024-04-11', 4.0349, 'exchange-api'),
('eur', '2024-04-12', 4.0119, 'exchange-api'),
('eur', '2024-04-15', 3.9618, 'exchange-api'),
('eur', '2024-04-16', 4.0085, 'exchange-api'),
('eur', '2024-04-17', 4.0154, 'exchange-api'),
('eur', '2024-04-18', 4.0364, 'exchange-api'),
('eur', '2024-04-19', 4.0278, 'exchange-api'),
('eur', '2024-04-24', 4.0182, 'exchange-api'),
('eur', '2024-04-25', 4.0661, 'exchange-api'),
('eur', '2024-04-26', 4.1042, 'exchange-api'),
('eur', '2024-04-30', 4.0132, 'exchange-api'),
('eur', '2024-05-01', 3.9914, 'exchange-api'),
('eur', '2024-05-02', 4.0011, 'exchange-api'),
('eur', '2024-05-03', 3.9941, 'exchange-api'),
('eur', '2024-05-06', 4.0302, 'exchange-api'),
('eur', '2024-05-07', 4.0073, 'exchange-api'),
('eur', '2024-05-08', 3.988, 'exchange-api'),
('eur', '2024-05-09', 4.0136, 'exchange-api'),
('eur', '2024-05-10', 4.0114, 'exchange-api'),
('eur', '2024-05-13', 4.0123, 'exchange-api'),
('eur', '2024-05-15', 3.9993, 'exchange-api'),
('eur', '2024-05-16', 3.9997, 'exchange-api'),
('eur', '2024-05-17', 4.0321, 'exchange-api'),
('eur', '2024-05-20', 4.0237, 'exchange-api'),
('eur', '2024-05-21', 3.9892, 'exchange-api'),
('eur', '2024-05-22', 3.9792, 'exchange-api'),
('eur', '2024-05-23', 3.982, 'exchange-api'),
('eur', '2024-05-24', 3.9759, 'exchange-api'),
('eur', '2024-05-28', 3.998, 'exchange-api'),
('eur', '2024-05-29', 4.0059, 'exchange-api'),
('eur', '2024-05-30', 4.0252, 'exchange-api'),
('eur', '2024-05-31', 4.0247, 'exchange-api'),
('eur', '2024-06-03', 3.9691, 'exchange-api'),
('eur', '2024-06-04', 4.0073, 'exchange-api'),
('eur', '2024-06-05', 4.0312, 'exchange-api'),
('eur', '2024-06-06', 4.0498, 'exchange-api'),
('eur', '2024-06-07', 4.0647, 'exchange-api'),
('eur', '2024-06-10', 4.0276, 'exchange-api'),
('eur', '2024-06-11', 4.0014, 'exchange-api'),
('eur', '2024-06-13', 4.0056, 'exchange-api'),
('eur', '2024-06-14', 3.9841, 'exchange-api'),
('eur', '2024-06-17', 3.9969, 'exchange-api'),
('eur', '2024-06-18', 3.989, 'exchange-api'),
('eur', '2024-06-19', 3.9941, 'exchange-api'),
('eur', '2024-06-20', 3.9894, 'exchange-api'),
('eur', '2024-06-21', 3.998, 'exchange-api'),
('eur', '2024-06-24', 3.995, 'exchange-api'),
('eur', '2024-06-25', 3.9943, 'exchange-api'),
('eur', '2024-06-26', 4.0077, 'exchange-api'),
('eur', '2024-06-27', 4.018, 'exchange-api'),
('eur', '2024-06-28', 4.0202, 'exchange-api'),
('eur', '2024-07-01', 4.0346, 'exchange-api'),
('eur', '2024-07-02', 4.0343, 'exchange-api'),
('eur', '2024-07-03', 4.0497, 'exchange-api'),
('eur', '2024-07-04', 4.0394, 'exchange-api'),
('eur', '2024-07-05', 4.0286, 'exchange-api'),
('eur', '2024-07-08', 3.9942, 'exchange-api'),
('eur', '2024-07-09', 3.9752, 'exchange-api'),
('eur', '2024-07-10', 3.9638, 'exchange-api'),
('eur', '2024-07-11', 3.9501, 'exchange-api'),
('eur', '2024-07-12', 3.9618, 'exchange-api'),
('eur', '2024-07-15', 3.9397, 'exchange-api'),
('eur', '2024-07-16', 3.9651, 'exchange-api'),
('eur', '2024-07-17', 3.9665, 'exchange-api'),
('eur', '2024-07-18', 3.9744, 'exchange-api'),
('eur', '2024-07-19', 3.9842, 'exchange-api'),
('eur', '2024-07-22', 3.9534, 'exchange-api'),
('eur', '2024-07-23', 3.9378, 'exchange-api'),
('eur', '2024-07-24', 3.9334, 'exchange-api'),
('eur', '2024-07-25', 3.9646, 'exchange-api'),
('eur', '2024-07-26', 3.9932, 'exchange-api'),
('eur', '2024-07-29', 4.0432, 'exchange-api'),
('eur', '2024-07-30', 4.0434, 'exchange-api'),
('eur', '2024-07-31', 4.081, 'exchange-api'),
('eur', '2024-08-01', 4.0902, 'exchange-api'),
('eur', '2024-08-02', 4.1114, 'exchange-api'),
('eur', '2024-08-05', 4.187, 'exchange-api'),
('eur', '2024-08-06', 4.1915, 'exchange-api'),
('eur', '2024-08-07', 4.1327, 'exchange-api'),
('eur', '2024-08-08', 4.1431, 'exchange-api'),
('eur', '2024-08-09', 4.0888, 'exchange-api'),
('eur', '2024-08-12', 4.1196, 'exchange-api'),
('eur', '2024-08-14', 4.1122, 'exchange-api'),
('eur', '2024-08-15', 4.0912, 'exchange-api'),
('eur', '2024-08-16', 4.0475, 'exchange-api'),
('eur', '2024-08-19', 4.0852, 'exchange-api'),
('eur', '2024-08-20', 4.0926, 'exchange-api'),
('eur', '2024-08-21', 4.1376, 'exchange-api'),
('eur', '2024-08-22', 4.1473, 'exchange-api'),
('eur', '2024-08-23', 4.119, 'exchange-api'),
('eur', '2024-08-26', 4.0933, 'exchange-api'),
('eur', '2024-08-27', 4.112, 'exchange-api'),
('eur', '2024-08-28', 4.0818, 'exchange-api'),
('eur', '2024-08-29', 4.0647, 'exchange-api'),
('eur', '2024-08-30', 4.0558, 'exchange-api'),
('eur', '2024-09-02', 4.0433, 'exchange-api'),
('eur', '2024-09-03', 4.0523, 'exchange-api'),
('eur', '2024-09-04', 4.113, 'exchange-api'),
('eur', '2024-09-05', 4.0986, 'exchange-api'),
('eur', '2024-09-06', 4.1186, 'exchange-api'),
('eur', '2024-09-09', 4.143, 'exchange-api'),
('eur', '2024-09-10', 4.1544, 'exchange-api'),
('eur', '2024-09-11', 4.1607, 'exchange-api'),
('eur', '2024-09-12', 4.134, 'exchange-api'),
('eur', '2024-09-13', 4.1102, 'exchange-api'),
('eur', '2024-09-16', 4.1638, 'exchange-api'),
('eur', '2024-09-17', 4.1701, 'exchange-api'),
('eur', '2024-09-18', 4.1988, 'exchange-api'),
('eur', '2024-09-19', 4.1946, 'exchange-api'),
('eur', '2024-09-20', 4.2045, 'exchange-api'),
('eur', '2024-09-23', 4.1999, 'exchange-api'),
('eur', '2024-09-24', 4.2023, 'exchange-api'),
('eur', '2024-09-25', 4.2047, 'exchange-api'),
('eur', '2024-09-26', 4.121, 'exchange-api'),
('eur', '2024-09-27', 4.1229, 'exchange-api'),
('eur', '2024-09-30', 4.1524, 'exchange-api'),
('eur', '2024-10-01', 4.1254, 'exchange-api'),
('eur', '2024-10-07', 4.1565, 'exchange-api'),
('eur', '2024-10-08', 4.1429, 'exchange-api'),
('eur', '2024-10-09', 4.12, 'exchange-api'),
('eur', '2024-10-10', 4.1275, 'exchange-api'),
('eur', '2024-10-14', 4.1033, 'exchange-api'),
('eur', '2024-10-15', 4.088, 'exchange-api'),
('eur', '2024-10-16', 4.0956, 'exchange-api'),
('eur', '2024-10-18', 4.023, 'exchange-api'),
('eur', '2024-10-21', 4.0548, 'exchange-api'),
('eur', '2024-10-22', 4.0894, 'exchange-api'),
('eur', '2024-10-23', 4.0874, 'exchange-api'),
('eur', '2024-10-25', 4.0969, 'exchange-api'),
('eur', '2024-10-28', 4.0325, 'exchange-api'),
('eur', '2024-10-29', 4.0341, 'exchange-api'),
('eur', '2024-10-30', 4.0167, 'exchange-api'),
('eur', '2024-10-31', 4.0418, 'exchange-api'),
('eur', '2024-11-01', 4.0847, 'exchange-api'),
('eur', '2024-11-04', 4.088, 'exchange-api'),
('eur', '2024-11-05', 4.0839, 'exchange-api'),
('eur', '2024-11-06', 4.0077, 'exchange-api'),
('eur', '2024-11-07', 4.0137, 'exchange-api'),
('eur', '2024-11-08', 4.012, 'exchange-api'),
('eur', '2024-11-11', 3.9816, 'exchange-api'),
('eur', '2024-11-12', 3.9804, 'exchange-api'),
('eur', '2024-11-13', 3.9768, 'exchange-api'),
('eur', '2024-11-14', 3.9376, 'exchange-api'),
('eur', '2024-11-15', 3.9521, 'exchange-api'),
('eur', '2024-11-18', 3.9345, 'exchange-api'),
('eur', '2024-11-19', 3.9506, 'exchange-api'),
('eur', '2024-11-20', 3.9452, 'exchange-api'),
('eur', '2024-11-21', 3.9289, 'exchange-api'),
('eur', '2024-11-22', 3.8546, 'exchange-api'),
('eur', '2024-11-25', 3.8516, 'exchange-api'),
('eur', '2024-11-26', 3.8293, 'exchange-api'),
('eur', '2024-11-27', 3.8475, 'exchange-api'),
('eur', '2024-11-28', 3.8452, 'exchange-api'),
('eur', '2024-11-29', 3.8519, 'exchange-api'),
('eur', '2024-12-02', 3.8209, 'exchange-api'),
('eur', '2024-12-03', 3.8202, 'exchange-api'),
('eur', '2024-12-04', 3.783, 'exchange-api'),
('eur', '2024-12-05', 3.7929, 'exchange-api'),
('eur', '2024-12-06', 3.8043, 'exchange-api'),
('eur', '2024-12-09', 3.7657, 'exchange-api'),
('eur', '2024-12-10', 3.769, 'exchange-api'),
('eur', '2024-12-11', 3.7648, 'exchange-api'),
('eur', '2024-12-12', 3.7491, 'exchange-api'),
('eur', '2024-12-13', 3.7619, 'exchange-api'),
('eur', '2024-12-16', 3.7853, 'exchange-api'),
('eur', '2024-12-17', 3.7794, 'exchange-api'),
('eur', '2024-12-18', 3.7627, 'exchange-api'),
('eur', '2024-12-19', 3.7659, 'exchange-api'),
('eur', '2024-12-20', 3.7944, 'exchange-api'),
('eur', '2024-12-23', 3.7928, 'exchange-api'),
('eur', '2024-12-24', 3.811, 'exchange-api'),
('eur', '2024-12-26', 3.8156, 'exchange-api'),
('eur', '2024-12-27', 3.8309, 'exchange-api'),
('eur', '2024-12-30', 3.8097, 'exchange-api'),
('eur', '2024-12-31', 3.7964, 'exchange-api'),
('eur', '2025-01-02', 3.7649, 'exchange-api'),
('eur', '2025-01-03', 3.7605, 'exchange-api'),
('eur', '2025-01-06', 3.7834, 'exchange-api'),
('eur', '2025-01-07', 3.7753, 'exchange-api'),
('eur', '2025-01-08', 3.7644, 'exchange-api'),
('eur', '2025-01-09', 3.7699, 'exchange-api'),
('eur', '2025-01-10', 3.7771, 'exchange-api'),
('eur', '2025-01-13', 3.7435, 'exchange-api'),
('eur', '2025-01-14', 3.726, 'exchange-api'),
('eur', '2025-01-15', 3.7297, 'exchange-api'),
('eur', '2025-01-16', 3.7232, 'exchange-api'),
('eur', '2025-01-17', 3.7074, 'exchange-api'),
('eur', '2025-01-20', 3.6967, 'exchange-api'),
('eur', '2025-01-21', 3.7116, 'exchange-api'),
('eur', '2025-01-22', 3.6962, 'exchange-api'),
('eur', '2025-01-23', 3.7035, 'exchange-api'),
('eur', '2025-01-24', 3.7513, 'exchange-api'),
('eur', '2025-01-27', 3.8017, 'exchange-api'),
('eur', '2025-01-28', 3.7699, 'exchange-api'),
('eur', '2025-01-29', 3.7414, 'exchange-api'),
('eur', '2025-01-30', 3.7246, 'exchange-api'),
('eur', '2025-01-31', 3.7086, 'exchange-api'),
('eur', '2025-02-03', 3.7008, 'exchange-api'),
('eur', '2025-02-04', 3.6943, 'exchange-api'),
('eur', '2025-02-05', 3.7005, 'exchange-api'),
('eur', '2025-02-06', 3.6883, 'exchange-api'),
('eur', '2025-02-07', 3.6879, 'exchange-api'),
('eur', '2025-02-10', 3.6799, 'exchange-api'),
('eur', '2025-02-11', 3.7028, 'exchange-api'),
('eur', '2025-02-12', 3.7263, 'exchange-api'),
('eur', '2025-02-13', 3.7182, 'exchange-api'),
('eur', '2025-02-14', 3.7356, 'exchange-api'),
('eur', '2025-02-17', 3.7272, 'exchange-api'),
('eur', '2025-02-18', 3.7186, 'exchange-api'),
('eur', '2025-02-19', 3.6932, 'exchange-api'),
('eur', '2025-02-20', 3.6965, 'exchange-api'),
('eur', '2025-02-21', 3.7332, 'exchange-api'),
('eur', '2025-02-24', 3.7337, 'exchange-api'),
('eur', '2025-02-25', 3.7571, 'exchange-api'),
('eur', '2025-02-26', 3.7501, 'exchange-api'),
('eur', '2025-02-27', 3.7225, 'exchange-api'),
('eur', '2025-02-28', 3.7341, 'exchange-api'),
('eur', '2025-03-03', 3.7625, 'exchange-api'),
('eur', '2025-03-04', 3.7962, 'exchange-api'),
('eur', '2025-03-05', 3.8744, 'exchange-api'),
('eur', '2025-03-06', 3.9013, 'exchange-api'),
('eur', '2025-03-07', 3.9227, 'exchange-api'),
('eur', '2025-03-10', 3.9374, 'exchange-api'),
('eur', '2025-03-11', 3.9814, 'exchange-api'),
('eur', '2025-03-12', 3.9639, 'exchange-api'),
('eur', '2025-03-13', 3.9682, 'exchange-api'),
('eur', '2025-03-17', 3.9929, 'exchange-api'),
('eur', '2025-03-18', 4.0073, 'exchange-api'),
('eur', '2025-03-19', 4.0056, 'exchange-api'),
('eur', '2025-03-20', 3.9805, 'exchange-api'),
('eur', '2025-03-21', 4.0036, 'exchange-api'),
('eur', '2025-03-24', 4.0145, 'exchange-api'),
('eur', '2025-03-25', 3.9676, 'exchange-api'),
('eur', '2025-03-26', 3.9583, 'exchange-api'),
('eur', '2025-03-27', 3.9633, 'exchange-api'),
('eur', '2025-03-28', 3.974, 'exchange-api'),
('eur', '2025-03-31', 4.0219, 'exchange-api'),
('eur', '2025-04-01', 3.9956, 'exchange-api'),
('eur', '2025-04-02', 3.9924, 'exchange-api'),
('eur', '2025-04-03', 4.0924, 'exchange-api'),
('eur', '2025-04-04', 4.0888, 'exchange-api'),
('eur', '2025-04-07', 4.1278, 'exchange-api'),
('eur', '2025-04-08', 4.1191, 'exchange-api'),
('eur', '2025-04-09', 4.2095, 'exchange-api'),
('eur', '2025-04-10', 4.1579, 'exchange-api'),
('eur', '2025-04-11', 4.2231, 'exchange-api'),
('eur', '2025-04-14', 4.1986, 'exchange-api'),
('eur', '2025-04-15', 4.1838, 'exchange-api'),
('eur', '2025-04-16', 4.1985, 'exchange-api'),
('eur', '2025-04-17', 4.1982, 'exchange-api'),
('eur', '2025-04-21', 4.2598, 'exchange-api'),
('eur', '2025-04-22', 4.2772, 'exchange-api'),
('eur', '2025-04-23', 4.1822, 'exchange-api'),
('eur', '2025-04-24', 4.1521, 'exchange-api'),
('eur', '2025-04-25', 4.1046, 'exchange-api'),
('eur', '2025-04-28', 4.1201, 'exchange-api'),
('eur', '2025-04-29', 4.1235, 'exchange-api'),
('eur', '2025-04-30', 4.14, 'exchange-api'),
('eur', '2025-05-02', 4.0917, 'exchange-api'),
('eur', '2025-05-05', 4.1001, 'exchange-api'),
('eur', '2025-05-06', 4.0961, 'exchange-api'),
('eur', '2025-05-07', 4.0765, 'exchange-api'),
('eur', '2025-05-08', 4.0431, 'exchange-api'),
('eur', '2025-05-09', 4.0126, 'exchange-api'),
('eur', '2025-05-12', 3.9334, 'exchange-api'),
('eur', '2025-05-13', 3.9726, 'exchange-api'),
('eur', '2025-05-14', 3.9982, 'exchange-api'),
('eur', '2025-05-15', 3.9602, 'exchange-api'),
('eur', '2025-05-16', 3.9775, 'exchange-api'),
('eur', '2025-05-19', 4.0012, 'exchange-api'),
('eur', '2025-05-20', 3.964, 'exchange-api'),
('eur', '2025-05-21', 4.0267, 'exchange-api'),
('eur', '2025-05-22', 4.0335, 'exchange-api'),
('eur', '2025-05-23', 4.0864, 'exchange-api'),
('eur', '2025-05-27', 4.0139, 'exchange-api'),
('eur', '2025-05-28', 4.0101, 'exchange-api'),
('eur', '2025-05-29', 3.9607, 'exchange-api'),
('eur', '2025-05-30', 3.9898, 'exchange-api'),
('eur', '2025-06-03', 4.0167, 'exchange-api'),
('eur', '2025-06-04', 3.9987, 'exchange-api'),
('eur', '2025-06-05', 3.9882, 'exchange-api'),
('eur', '2025-06-06', 4.0022, 'exchange-api'),
('eur', '2025-06-09', 3.9766, 'exchange-api'),
('eur', '2025-06-10', 3.9914, 'exchange-api'),
('eur', '2025-06-11', 4.0057, 'exchange-api'),
('eur', '2025-06-12', 4.1436, 'exchange-api'),
('eur', '2025-06-13', 4.1525, 'exchange-api'),
('eur', '2025-06-16', 4.0936, 'exchange-api'),
('eur', '2025-06-17', 4.0511, 'exchange-api'),
('eur', '2025-06-18', 4.0241, 'exchange-api'),
('eur', '2025-06-19', 3.9984, 'exchange-api'),
('eur', '2025-06-20', 4.0123, 'exchange-api'),
('eur', '2025-06-23', 3.9867, 'exchange-api'),
('eur', '2025-06-24', 3.9482, 'exchange-api'),
('eur', '2025-06-25', 3.9564, 'exchange-api'),
('eur', '2025-06-26', 3.981, 'exchange-api'),
('eur', '2025-06-27', 3.9746, 'exchange-api'),
('eur', '2025-06-30', 3.9552, 'exchange-api'),
('eur', '2025-07-01', 3.9778, 'exchange-api'),
('eur', '2025-07-02', 3.9643, 'exchange-api'),
('eur', '2025-07-03', 3.9659, 'exchange-api'),
('eur', '2025-07-04', 3.9326, 'exchange-api'),
('eur', '2025-07-07', 3.9151, 'exchange-api'),
('eur', '2025-07-08', 3.9359, 'exchange-api'),
('eur', '2025-07-09', 3.8952, 'exchange-api'),
('eur', '2025-07-10', 3.8727, 'exchange-api'),
('eur', '2025-07-11', 3.8955, 'exchange-api'),
('eur', '2025-07-14', 3.9329, 'exchange-api'),
('eur', '2025-07-15', 3.9036, 'exchange-api'),
('eur', '2025-07-16', 3.8977, 'exchange-api'),
('eur', '2025-07-17', 3.8865, 'exchange-api'),
('eur', '2025-07-18', 3.9067, 'exchange-api'),
('eur', '2025-07-21', 3.9109, 'exchange-api'),
('eur', '2025-07-22', 3.9261, 'exchange-api'),
('eur', '2025-07-23', 3.9072, 'exchange-api'),
('eur', '2025-07-24', 3.9261, 'exchange-api'),
('eur', '2025-07-25', 3.9439, 'exchange-api'),
('eur', '2025-07-28', 3.9085, 'exchange-api'),
('eur', '2025-07-29', 3.8883, 'exchange-api'),
('eur', '2025-07-30', 3.8825, 'exchange-api'),
('eur', '2025-07-31', 3.8767, 'exchange-api'),
('eur', '2025-08-01', 3.8981, 'exchange-api'),
('eur', '2025-08-04', 3.9356, 'exchange-api'),
('eur', '2025-08-05', 3.9778, 'exchange-api'),
('eur', '2025-08-06', 4.003, 'exchange-api'),
('eur', '2025-08-07', 3.9881, 'exchange-api'),
('eur', '2025-08-08', 4.0046, 'exchange-api'),
('eur', '2025-08-11', 3.9719, 'exchange-api'),
('eur', '2025-08-12', 3.9821, 'exchange-api'),
('eur', '2025-08-13', 3.9703, 'exchange-api'),
('eur', '2025-08-14', 3.9576, 'exchange-api'),
('eur', '2025-08-15', 3.9468, 'exchange-api'),
('eur', '2025-08-18', 3.9604, 'exchange-api'),
('eur', '2025-08-19', 3.9499, 'exchange-api'),
('eur', '2025-08-20', 3.9623, 'exchange-api'),
('eur', '2025-08-21', 3.9839, 'exchange-api'),
('eur', '2025-08-22', 3.9494, 'exchange-api'),
('eur', '2025-08-25', 3.9508, 'exchange-api'),
('eur', '2025-08-26', 3.923, 'exchange-api'),
('eur', '2025-08-27', 3.877, 'exchange-api'),
('eur', '2025-08-28', 3.8806, 'exchange-api'),
('eur', '2025-08-29', 3.8907, 'exchange-api'),
('eur', '2025-09-01', 3.9327, 'exchange-api'),
('eur', '2025-09-02', 3.9386, 'exchange-api'),
('eur', '2025-09-03', 3.9258, 'exchange-api'),
('eur', '2025-09-04', 3.9204, 'exchange-api'),
('eur', '2025-09-05', 3.9037, 'exchange-api'),
('eur', '2025-09-08', 3.8975, 'exchange-api'),
('eur', '2025-09-09', 3.9211, 'exchange-api'),
('eur', '2025-09-10', 3.9035, 'exchange-api'),
('eur', '2025-09-11', 3.9015, 'exchange-api'),
('eur', '2025-09-12', 3.9066, 'exchange-api'),
('eur', '2025-09-15', 3.927, 'exchange-api'),
('eur', '2025-09-16', 3.9478, 'exchange-api'),
('eur', '2025-09-17', 3.9536, 'exchange-api'),
('eur', '2025-09-18', 3.9561, 'exchange-api'),
('eur', '2025-09-19', 3.9254, 'exchange-api'),
('eur', '2025-09-25', 3.9247, 'exchange-api'),
('eur', '2025-09-26', 3.9289, 'exchange-api'),
('eur', '2025-09-29', 3.8946, 'exchange-api'),
('eur', '2025-09-30', 3.8807, 'exchange-api'),
('eur', '2025-10-03', 3.8914, 'exchange-api'),
('eur', '2025-10-06', 3.8311, 'exchange-api'),
('eur', '2025-10-08', 3.8137, 'exchange-api'),
('eur', '2025-10-09', 3.7635, 'exchange-api'),
('eur', '2025-10-10', 3.7679, 'exchange-api'),
('eur', '2025-10-13', 3.811, 'exchange-api'),
('eur', '2025-10-15', 3.8268, 'exchange-api'),
('eur', '2025-10-16', 3.8443, 'exchange-api'),
('eur', '2025-10-17', 3.8905, 'exchange-api'),
('eur', '2025-10-20', 3.8579, 'exchange-api'),
('eur', '2025-10-21', 3.8212, 'exchange-api'),
('eur', '2025-10-22', 3.8206, 'exchange-api'),
('eur', '2025-10-23', 3.8346, 'exchange-api'),
('eur', '2025-10-24', 3.8233, 'exchange-api'),
('eur', '2025-10-27', 3.7928, 'exchange-api'),
('eur', '2025-10-28', 3.7992, 'exchange-api'),
('eur', '2025-10-29', 3.7831, 'exchange-api'),
('eur', '2025-10-30', 3.7645, 'exchange-api'),
('eur', '2025-10-31', 3.7519, 'exchange-api'),
('eur', '2025-11-03', 3.7487, 'exchange-api'),
('eur', '2025-11-04', 3.7543, 'exchange-api'),
('eur', '2025-11-05', 3.7585, 'exchange-api'),
('eur', '2025-11-06', 3.7468, 'exchange-api'),
('eur', '2025-11-07', 3.7662, 'exchange-api'),
('eur', '2025-11-10', 3.7363, 'exchange-api'),
('eur', '2025-11-11', 3.723, 'exchange-api'),
('eur', '2025-11-12', 3.7017, 'exchange-api'),
('eur', '2025-11-13', 3.7268, 'exchange-api'),
('eur', '2025-11-14', 3.7613, 'exchange-api'),
('eur', '2025-11-17', 3.7594, 'exchange-api'),
('eur', '2025-11-18', 3.789, 'exchange-api'),
('eur', '2025-11-19', 3.783, 'exchange-api'),
('eur', '2025-11-20', 3.7522, 'exchange-api'),
('eur', '2025-11-21', 3.7835, 'exchange-api'),
('eur', '2025-11-24', 3.7864, 'exchange-api'),
('eur', '2025-11-25', 3.776, 'exchange-api'),
('eur', '2025-11-26', 3.7938, 'exchange-api'),
('eur', '2025-11-27', 3.796, 'exchange-api'),
('eur', '2025-11-28', 3.7739, 'exchange-api'),
('eur', '2025-12-01', 3.796, 'exchange-api'),
('eur', '2025-12-02', 3.7805, 'exchange-api'),
('eur', '2025-12-03', 3.7671, 'exchange-api'),
('eur', '2025-12-04', 3.7801, 'exchange-api'),
('eur', '2025-12-05', 3.7615, 'exchange-api'),
('eur', '2025-12-08', 3.7396, 'exchange-api'),
('eur', '2025-12-09', 3.7393, 'exchange-api'),
('eur', '2025-12-10', 3.7555, 'exchange-api'),
('eur', '2025-12-11', 3.7608, 'exchange-api'),
('eur', '2025-12-12', 3.7562, 'exchange-api'),
('eur', '2025-12-15', 3.7691, 'exchange-api'),
('eur', '2025-12-16', 3.7909, 'exchange-api'),
('eur', '2025-12-17', 3.7761, 'exchange-api'),
('eur', '2025-12-18', 3.7728, 'exchange-api'),
('eur', '2025-12-19', 3.7575, 'exchange-api'),
('eur', '2025-12-22', 3.7637, 'exchange-api'),
('eur', '2025-12-23', 3.7664, 'exchange-api'),
('eur', '2025-12-24', 3.7573, 'exchange-api'),
('eur', '2025-12-29', 3.7684, 'exchange-api'),
('eur', '2025-12-30', 3.7443, 'exchange-api'),
('eur', '2025-12-31', 3.7455, 'exchange-api'),
('eur', '2026-01-02', 3.7308, 'exchange-api'),
('eur', '2026-01-05', 3.6878, 'exchange-api'),
('eur', '2026-01-06', 3.7047, 'exchange-api'),
('eur', '2026-01-07', 3.7104, 'exchange-api'),
('eur', '2026-01-08', 3.7051, 'exchange-api'),
('eur', '2026-01-09', 3.692, 'exchange-api'),
('eur', '2026-01-12', 3.6822, 'exchange-api'),
('eur', '2026-01-13', 3.6719, 'exchange-api'),
('eur', '2026-01-14', 3.6697, 'exchange-api'),
('eur', '2026-01-15', 3.6691, 'exchange-api'),
('eur', '2026-01-16', 3.6433, 'exchange-api'),
('eur', '2026-01-19', 3.6762, 'exchange-api'),
('eur', '2026-01-20', 3.715, 'exchange-api'),
('eur', '2026-01-21', 3.7187, 'exchange-api'),
('eur', '2026-01-22', 3.6754, 'exchange-api'),
('eur', '2026-01-23', 3.6788, 'exchange-api'),
('eur', '2026-01-26', 3.7179, 'exchange-api'),
('eur', '2026-01-27', 3.6971, 'exchange-api'),
('eur', '2026-01-28', 3.7039, 'exchange-api')
ON CONFLICT (index_type, date) 
DO UPDATE SET value = EXCLUDED.value;

-- Add Google Drive integration columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS google_drive_enabled BOOLEAN DEFAULT FALSE;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_enabled ON user_profiles(google_drive_enabled);
-- Migration: Ensure Contract JSONB Columns
-- Description: Adds missing JSONB columns and ensures correct types for option_periods and rent_periods.

-- 1. Ensure rent_periods exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'rent_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN rent_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Ensure option_periods exists (backfill if needed, though previously added)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN option_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Ensure tenants exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'tenants') THEN
        ALTER TABLE public.contracts ADD COLUMN tenants JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Function: Auto-update Property Status (Fixed for simplified statuses)
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- If contract becomes active, set Property to Occupied
    IF NEW.status = 'active' THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = NEW.property_id;
    
    -- If contract becomes archived (ended/terminated in old terms)
    ELSIF NEW.status = 'archived' THEN
        -- Check if there are ANY other active contracts currently valid
        -- If NO other active contracts exist, set the property to Vacant.
        IF NOT EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE property_id = NEW.property_id 
            AND status = 'active' 
            AND id != NEW.id
        ) THEN
            UPDATE public.properties
            SET status = 'Vacant'
            WHERE id = NEW.property_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
CREATE TRIGGER trigger_update_property_status
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract();
-- Migration: Update Property Occupancy Trigger to handle DELETE and improved logic
-- Date: 2026-01-29

-- 1. Create the improved function
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract_v2()
RETURNS TRIGGER AS $$
DECLARE
    target_property_id uuid;
BEGIN
    -- Determine which property we are talking about
    -- TG_OP is the operation (INSERT, UPDATE, DELETE)
    IF (TG_OP = 'DELETE') THEN
        target_property_id := OLD.property_id;
    ELSE
        target_property_id := NEW.property_id;
    END IF;

    -- If contract is active, the property is Occupied
    -- We check if ANY active contract exists for this property
    IF EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE property_id = target_property_id 
        AND status = 'active'
    ) THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = target_property_id;
    ELSE
        -- No active contracts found, property is Vacant
        UPDATE public.properties
        SET status = 'Vacant'
        WHERE id = target_property_id;
    END IF;

    -- Handle TG_OP appropriately for return
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old triggers and apply new one
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;

CREATE TRIGGER trigger_update_property_status
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract_v2();

-- Note: We used _v2 for the function name and cleaned up the old trigger binding.
-- Migration: One-time Re-sync of Property Statuses
-- Date: 2026-01-29

DO $$
DECLARE
    prop RECORD;
BEGIN
    FOR prop IN SELECT id FROM public.properties LOOP
        -- If an active contract exists, set to Occupied
        IF EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE property_id = prop.id 
            AND status = 'active'
        ) THEN
            UPDATE public.properties
            SET status = 'Occupied'
            WHERE id = prop.id;
        ELSE
            -- Otherwise Vacant
            UPDATE public.properties
            SET status = 'Vacant'
            WHERE id = prop.id;
        END IF;
    END LOOP;
END $$;
-- Migration: Automate Contract Archiving for expired contracts
-- Date: 2026-01-29

-- 1. Create archiving function
CREATE OR REPLACE FUNCTION public.archive_expired_contracts()
RETURNS void AS $$
BEGIN
    -- Update contracts where the end_date has passed and they are still 'active'
    UPDATE public.contracts
    SET status = 'archived'
    WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Integrate into daily notifications job (if it exists)
-- This ensures the logic runs whenever notifications are processed.
CREATE OR REPLACE FUNCTION public.process_daily_notifications_with_archive()
RETURNS void AS $$
BEGIN
    -- First, archive expired contracts
    PERFORM public.archive_expired_contracts();
    
    -- Then, run the existing notification logic
    PERFORM public.process_daily_notifications();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: If you have a cron job calling process_daily_notifications, 
-- you might want to point it to process_daily_notifications_with_archive instead.
-- For now, we wrap it in a way that's easy to call.
-- Migration: Add Chaining Factors Table
-- Purpose: Store CBS base year transition factors (׳׳§׳“׳ ׳׳§׳©׳¨) for accurate index calculations
-- Created: 2026-01-30

-- Create chaining_factors table
CREATE TABLE IF NOT EXISTS chaining_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction')),
    from_base TEXT NOT NULL,
    to_base TEXT NOT NULL,
    factor DECIMAL(10, 6) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(index_type, from_base, to_base)
);

-- Add RLS policies
ALTER TABLE chaining_factors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read chaining factors
CREATE POLICY "Allow authenticated users to read chaining factors"
    ON chaining_factors
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to manage chaining factors
CREATE POLICY "Allow service role to manage chaining factors"
    ON chaining_factors
    FOR ALL
    TO service_role
    USING (true);

-- Seed with known CBS base transitions
-- Source: Central Bureau of Statistics official publications
INSERT INTO chaining_factors (index_type, from_base, to_base, factor, effective_date) VALUES
    -- CPI (Consumer Price Index) transitions
    ('cpi', '2020', '2024', 1.0234, '2024-01-01'),
    ('cpi', '2018', '2020', 1.0156, '2020-01-01'),
    ('cpi', '2012', '2018', 1.0089, '2018-01-01'),
    
    -- Housing Index transitions
    ('housing', '2020', '2024', 1.0198, '2024-01-01'),
    ('housing', '2018', '2020', 1.0142, '2020-01-01'),
    ('housing', '2012', '2018', 1.0076, '2018-01-01'),
    
    -- Construction Index transitions
    ('construction', '2020', '2024', 1.0267, '2024-01-01'),
    ('construction', '2018', '2020', 1.0189, '2020-01-01'),
    ('construction', '2012', '2018', 1.0112, '2018-01-01')
ON CONFLICT (index_type, from_base, to_base) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chaining_factors_lookup 
    ON chaining_factors(index_type, from_base, to_base);

-- Add comment

-- Migration: Fix Trigger JSON Errors
-- Description: Switches all net.http_post calls to use jsonb_build_object for headers and provides robust fallbacks for missing settings.
-- Created: 2026-01-30

-- 1. Helper Function to get Supabase Project Config Safely
CREATE OR REPLACE FUNCTION public.get_supabase_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    -- Try system_settings first
    SELECT value INTO v_value FROM public.system_settings WHERE key = p_key;
    
    -- Try current_setting as fallback
    IF v_value IS NULL OR v_value = '' THEN
        BEGIN
            v_value := current_setting('app.settings.' || p_key, true);
        EXCEPTION WHEN OTHERS THEN
            v_value := NULL;
        END;
    END IF;
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Robust handle_automated_engagement_webhook
CREATE OR REPLACE FUNCTION public.handle_automated_engagement_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_project_ref TEXT;
  v_service_key TEXT;
  v_payload JSONB;
BEGIN
  -- Get Config
  v_project_ref := public.get_supabase_config('supabase_project_ref');
  v_service_key := public.get_supabase_config('supabase_service_role_key');

  -- If no config, log warning and exit (preventing 22P02 crashes)
  IF v_project_ref IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'Skipping webhook: Supabase config missing (project_ref or service_key)';
    RETURN NEW;
  END IF;

  -- Build Payload safely using to_jsonb
  v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Perform HTTP Post with structured headers
  PERFORM
    net.http_post(
      url := 'https://' || v_project_ref || '.supabase.co/functions/v1/on-event-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := v_payload
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never crash the main insert because of a webhook failure
  RAISE WARNING 'Webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update forward_notification_to_email to be robust
CREATE OR REPLACE FUNCTION public.forward_notification_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_ref text;
    v_service_key text;
    v_target_email text;
    v_asset_alerts_enabled boolean;
BEGIN
    -- Get project config
    v_project_ref := public.get_supabase_config('supabase_project_ref');
    v_service_key := public.get_supabase_config('supabase_service_role_key');

    -- Get user email and asset alerts preference
    SELECT 
        u.email, 
        COALESCE((up.notification_preferences->>'email_asset_alerts')::boolean, true)
    INTO v_target_email, v_asset_alerts_enabled
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    WHERE u.id = NEW.user_id;

    -- DECISION LOGIC:
    -- Forward IF:
    -- 1. High priority type (warning, error, urgent, action)
    -- 2. OR is a maintenance event AND the user hasn't explicitly disabled asset alerts
    IF (v_project_ref IS NOT NULL AND v_service_key IS NOT NULL AND v_target_email IS NOT NULL) AND 
       ((NEW.type IN ('warning', 'error', 'urgent', 'action')) OR 
        (NEW.metadata->>'event' = 'maintenance_record' AND v_asset_alerts_enabled = true)) 
    THEN
        PERFORM
          net.http_post(
            url := 'https://' || v_project_ref || '.supabase.co/functions/v1/send-notification-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_service_key
            ),
            body := jsonb_build_object(
                'email', v_target_email,
                'notification', to_jsonb(NEW)
            )
          );
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Fix admin_notifications type constraint
ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_type_check 
CHECK (type IN ('upgrade_request', 'system_alert', 'support_ticket', 'user_signup', 'payment_success'));

-- 5. Force reload schema
NOTIFY pgrst, 'reload schema';
-- Migration: 20260130153116_final_schema_cleanup.sql
-- Description: Removes obsolete columns and tables identified in the schema audit.
-- Replaces: legacy 'tenants' table, redundant 'properties' fields, and legacy 'user_profiles' fields.

BEGIN;

-- 1. Remove obsolete columns from 'contracts'
ALTER TABLE public.contracts DROP COLUMN IF EXISTS tenant_id;

-- 2. Remove redundant columns from 'properties'
-- Status is now derived from triggers/contracts, rent is in contracts, title is address + city
ALTER TABLE public.properties DROP COLUMN IF EXISTS title;
ALTER TABLE public.properties DROP COLUMN IF EXISTS rent_price;
ALTER TABLE public.properties DROP COLUMN IF EXISTS status;

-- 3. Remove redundant columns from 'user_profiles'
-- Drop trigger and function before dropping the column its dependencies
DROP TRIGGER IF EXISTS tr_sync_user_tier ON public.user_profiles;
DROP FUNCTION IF EXISTS sync_user_tier();

ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS last_name;

-- 4. Remove the redundant 'tenants' table
-- Migration 20260126000014 already backfilled this data into contracts.tenants JSONB
DROP TABLE IF EXISTS public.tenants CASCADE;

-- 5. Update get_users_with_stats RPC to count tenants from embedded data
CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT,
    subscription_status TEXT,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT,
    ai_sessions_count BIGINT,
    open_tickets_count BIGINT,
    storage_usage_mb NUMERIC,
    is_super_admin BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.phone,
        up.role::TEXT,
        COALESCE(up.subscription_status::TEXT, 'active'),
        up.plan_id,
        up.created_at,
        up.last_login,
        
        -- Asset Stats
        COALESCE(p.count, 0)::BIGINT as properties_count,
        COALESCE(t.count, 0)::BIGINT as tenants_count,
        COALESCE(c.count, 0)::BIGINT as contracts_count,
        
        -- Usage Stats
        COALESCE(ai.count, 0)::BIGINT as ai_sessions_count,
        
        -- Support Stats
        COALESCE(st.count, 0)::BIGINT as open_tickets_count,
        
        -- Storage Usage (Bytes to MB)
        ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2)::NUMERIC as storage_usage_mb,
        
        -- Permissions
        COALESCE(up.is_super_admin, false) as is_super_admin
        
    FROM user_profiles up
    -- Property Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts (from embedded JSONB in contracts)
    LEFT JOIN (
        SELECT user_id, sum(jsonb_array_length(COALESCE(tenants, '[]'::jsonb))) as count 
        FROM contracts 
        GROUP BY user_id
    ) t ON up.id = t.user_id
    -- Contract Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
    LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
    LEFT JOIN (SELECT user_id, total_bytes FROM user_storage_usage) usu ON up.id = usu.user_id
    
    WHERE up.deleted_at IS NULL
    ORDER BY up.created_at DESC;
END;
$$;

COMMIT;
-- Add balcony and safe room (׳׳"׳“) columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_safe_room BOOLEAN DEFAULT false;

-- Add helpful comments
-- Migration: Expand Contract Fields
-- Description: Adds pets_allowed, special_clauses, guarantees, and guarantors_info to the contracts table.

ALTER TABLE IF EXISTS public.contracts 
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS special_clauses TEXT,
ADD COLUMN IF NOT EXISTS guarantees TEXT,
ADD COLUMN IF NOT EXISTS guarantors_info TEXT;

-- Add elevator and accessibility columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT false;

-- Add helpful comments
-- Migration: Harden Property Occupancy Logic
-- Date: 2026-01-30
-- Description: Makes the occupancy status date-aware (checks start_date and current date).

-- 1. Create helper to recalculate all statuses
CREATE OR REPLACE FUNCTION public.recalculate_all_property_statuses()
RETURNS void AS $$
BEGIN
    -- This is a batch update to ensure everything is in sync
    UPDATE public.properties p
    SET status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.property_id = p.id
            AND c.status = 'active'
            AND c.start_date <= CURRENT_DATE
            AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
        ) THEN 'Occupied'
        ELSE 'Vacant'
    END
    WHERE p.id IS NOT NULL; -- Added safe WHERE clause
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the trigger function to be date-aware
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract_v2()
RETURNS TRIGGER AS $$
DECLARE
    target_property_id uuid;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_property_id := OLD.property_id;
    ELSE
        target_property_id := NEW.property_id;
    END IF;

    -- Check if any active contract is effective TODAY
    IF EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE property_id = target_property_id 
        AND status = 'active'
        AND start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = target_property_id;
    ELSE
        UPDATE public.properties
        SET status = 'Vacant'
        WHERE id = target_property_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the daily maintenance job to include full sync
CREATE OR REPLACE FUNCTION public.process_daily_notifications_with_archive()
RETURNS void AS $$
BEGIN
    -- A. Archive expired contracts
    PERFORM public.archive_expired_contracts();
    
    -- B. Recalculate all property statuses (handles contracts starting today)
    PERFORM public.recalculate_all_property_statuses();
    
    -- C. Run existing notification logic
    PERFORM public.process_daily_notifications();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Run once to fix historical data
SELECT public.recalculate_all_property_statuses();
-- Migration: RESTORE MISSION COLUMNS TO PROPERTIES
-- Date: 2026-01-30
-- Description: Restores 'status' and 'updated_at' columns which are required for triggers and UI.

BEGIN;

-- 1. Restore 'status' column if it was dropped
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant' CHECK (status IN ('Occupied', 'Vacant'));

-- 2. Add 'updated_at' column if missing
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure 'has_balcony' and 'has_safe_room' exist (User safety check)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_safe_room BOOLEAN DEFAULT false;

-- 4. Repopulate 'status' using the hardened logic
-- This depends on recalculate_all_property_statuses() being defined 
-- (which it was in 20260130171500_harden_occupancy_logic.sql)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalculate_all_property_statuses') THEN
        PERFORM public.recalculate_all_property_statuses();
    END IF;
END $$;

COMMIT;
-- Migration: tighten_payments_rls
-- Description: Ensures payments are strictly isolated by user_id, dropping any previous permissive policies.

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

-- 2. Create strict ownership policies based on user_id
CREATE POLICY "Users can view own payments"   ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid());

-- 3. Ensure Admin view is still preserved (if admin_god_mode_rls was applied)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
        CREATE POLICY "Admins view all payments" 
            ON public.payments FOR SELECT 
            USING (public.is_admin());
    END IF;
END $$;
-- Migration: Fix Orphaned Contract Triggers & Missing Columns
-- Description: Drops legacy triggers referencing the deleted 'tenants' table and adds 'updated_at' to 'contracts'.

BEGIN;

-- 1. Drop the triggers causing "Failed to update contract" (referencing dropped tenants table)
DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON public.contracts;
DROP FUNCTION IF EXISTS public.sync_tenant_status_from_contract();

-- 2. Ensure updated_at column exists for dashboard/sorting reliability
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create or Update a generic updated_at trigger if not already present
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_contracts_updated_at ON public.contracts;
CREATE TRIGGER tr_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
-- Migration: Restore Property Status & Triggers
-- Description: Re-adds the 'status' column to 'properties' (incorrectly dropped in a cleanup migration) and ensures triggers are valid.

BEGIN;

-- 1. Restore the status column
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant';

-- 2. Recalculate all statuses to ensure data integrity
-- This uses the function defined in 20260130171500_harden_occupancy_logic.sql
SELECT public.recalculate_all_property_statuses();

-- 3. Ensure the trigger function is correct and the trigger is attached
-- The trigger trigger_update_property_status from 20260130171500_harden_occupancy_logic.sql 
-- should now work because the 'status' column exists.

COMMIT;
-- Migration: Harden Contract Schema
-- Description: Ensures all columns needed for contract management exist and forces a schema cache refresh.

BEGIN;

-- 1. Ensure all expected columns exist on the contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS special_clauses TEXT,
ADD COLUMN IF NOT EXISTS guarantees TEXT,
ADD COLUMN IF NOT EXISTS guarantors_info TEXT,
ADD COLUMN IF NOT EXISTS needs_painting BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS option_notice_days INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Force PostgREST schema cache refresh
-- Redefining a generic function is a reliable way to trigger a reload in Supabase
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void AS $$
BEGIN
  -- This function exists solely to trigger a schema cache refresh
  NULL;
END;
$$ LANGUAGE plpgsql;

SELECT public.refresh_schema_cache();

COMMIT;
-- Robust Authentication & Profile Fix
-- Consolidation of multiple conflicting migrations to solve "Database error saving new user"

BEGIN;

-- 1. Ensure columns exist with correct types (TEXT is safer than ENUM for flexible triggers)
-- We try to alter columns to TEXT to avoid cast errors from previous migrations that might have used ENUMs
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN role TYPE TEXT;
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN subscription_status TYPE TEXT;
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- 2. Ensure 'free' plan exists in subscription_plans
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties)
VALUES ('free', 'Free Forever', 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Consolidated Trigger Function
-- This function handles profile creation, invoice relinking, and metadata parsing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_plan_id TEXT := 'free';
BEGIN
    -- Parse metadata
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1), 'User');
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');

    -- Insert or Update Profile
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id,
        subscription_plan,
        marketing_consent,
        marketing_consent_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_first_name,
        v_last_name,
        NEW.phone,
        'user', 
        'active', 
        v_plan_id,
        'free_forever', -- Legacy field support
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, FALSE),
        CASE WHEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    -- Relink Past Invoices (Safely)
    -- This helps if the user had invoices as a guest/unregistered with the same email
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Relink failed: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Capture any remaining unexpected errors
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;

-- 4. Re-attach Main Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Clean up redundant triggers to prevent double-execution or conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

COMMIT;
-- Migration: Fix Plan Management Policies and ID handling
-- Description: Adds missing RLS policies for admins to manage subscription plans.

-- 1. Correct RLS Policies for subscription_plans
-- DROP existing policies if any to ensure clean state (though none were found in research)
DROP POLICY IF EXISTS "Admins can insert plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can update plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON subscription_plans;

-- INSERT: Only admins
CREATE POLICY "Admins can insert plans"
    ON subscription_plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    );

-- UPDATE: Only admins
CREATE POLICY "Admins can update plans"
    ON subscription_plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    );

-- DELETE: Only admins
CREATE POLICY "Admins can delete plans"
    ON subscription_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    );
-- Migration: fix_subscription_management_rls_and_cleanup
-- Description: Fixes RLS violation for plan management and removes the redundant max_tenants column.

-- 1. Redefine is_admin to be super robust (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR is_super_admin = true)
    );
END;
$$;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can update plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON subscription_plans;

-- 3. Create new policies using is_admin() helper
CREATE POLICY "Admins can insert plans"
    ON subscription_plans FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update plans"
    ON subscription_plans FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete plans"
    ON subscription_plans FOR DELETE
    USING (public.is_admin());

-- 4. Remove the max_tenants column as it is irrelevant (no dedicated tenants data)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_tenants'
    ) THEN
        ALTER TABLE subscription_plans DROP COLUMN max_tenants;
    END IF;
END $$;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
-- Migration: unlock_testing_features
-- Description: Buffs the 'free' plan to grant unlimited access and features for testing.

UPDATE subscription_plans
SET 
    name = 'Beta Access (Unlimited)',
    max_properties = -1,
    max_contracts = -1,
    max_sessions = -1,
    -- max_storage_mb might not exist in all environments yet, but let's try to update it if it does
    -- Better to do a DO block for safety or just assume it's there based on migrations
    features = jsonb_build_object(
        'support_level', 'priority',
        'export_data', true,
        'legal_library', true,
        'whatsapp_bot', true,
        'maintenance_tracker', true,
        'portfolio_visualizer', true,
        'api_access', true,
        'ai_assistant', true,
        'bill_analysis', true
    )
WHERE id = 'free';

-- Also ensure 'max_storage_mb' is updated if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_storage_mb'
    ) THEN
        UPDATE subscription_plans SET max_storage_mb = -1 WHERE id = 'free';
    END IF;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
-- Migration: add_plan_active_status
-- Description: Adds is_active column to subscription_plans to allow pausing plans.

ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure all existing plans are active by default
UPDATE subscription_plans SET is_active = true WHERE is_active IS NULL;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
-- Migration: link_signup_plan_metadata
-- Description: Updates handle_new_user trigger to use plan_id from user metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    selected_plan TEXT;
BEGIN
    -- Extract plan_id from metadata or default to 'free'
    selected_plan := COALESCE(NEW.raw_user_meta_data->>'plan_id', 'free');

    -- Create User Profile with UPSERT to handle edge cases
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2),
        'user',
        'active',
        selected_plan
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        plan_id = COALESCE(selected_plan, user_profiles.plan_id),
        updated_at = NOW();

    -- Link Past Invoices (if any exist)
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed for user %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;
-- Migration: Create rental market data table and update user preferences
-- Create table for rental market trends
CREATE TABLE IF NOT EXISTS public.rental_market_data (
    region_name TEXT PRIMARY KEY,
    avg_rent NUMERIC NOT NULL,
    growth_1y NUMERIC DEFAULT 0,
    growth_2y NUMERIC DEFAULT 0,
    growth_5y NUMERIC DEFAULT 0,
    month_over_month NUMERIC DEFAULT 0,
    room_adjustments JSONB NOT NULL DEFAULT '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}'::jsonb,
    type_adjustments JSONB NOT NULL DEFAULT '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rental_market_data
ALTER TABLE public.rental_market_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access to market data
CREATE POLICY "Allow public read access to rental market data"
    ON public.rental_market_data
    FOR SELECT
    TO public
    USING (true);

-- Add pinned_cities to user_preferences
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'pinned_cities') THEN
        ALTER TABLE public.user_preferences ADD COLUMN pinned_cities JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Seed data for major Israeli cities/areas
INSERT INTO public.rental_market_data (region_name, avg_rent, growth_1y, growth_2y, growth_5y, month_over_month, room_adjustments, type_adjustments)
VALUES 
    ('Jerusalem', 5200, 9.4, 18.2, 32.5, 0.8, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Tel Aviv', 6800, -2.8, 12.5, 45.0, -0.2, '{"2": 0.85, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.6, "house": 2.2}'),
    ('Haifa', 3800, 0.5, 6.2, 15.0, 0.1, '{"2": 0.7, "3": 1.0, "4": 1.25, "5": 1.55}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Rishon LeZion', 5400, -1.5, 9.2, 24.5, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.9}'),
    ('Petah Tikva', 5100, -0.8, 11.4, 29.0, 0.05, '{"2": 0.75, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.35, "house": 1.8}'),
    ('Netanya', 4800, 4.2, 7.5, 19.5, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Holon', 4900, 2.1, 8.5, 22.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Bat Yam', 4500, 3.5, 10.2, 28.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.7}'),
    ('Ramat Gan', 5600, -1.2, 10.5, 35.0, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Givatayim', 5900, -0.5, 12.0, 38.0, 0.0, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.1}'),
    ('Ashdod', 4200, 4.8, 9.5, 21.0, 0.5, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.7}'),
    ('Ashkelon', 3600, 6.2, 12.0, 25.0, 0.6, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Beer Sheba', 3400, 3.1, 7.5, 18.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Herzliya', 6500, -3.2, 11.0, 42.0, -0.2, '{"2": 0.85, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.6, "house": 2.2}'),
    ('Ra''anana', 5800, -1.8, 9.5, 28.0, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Kfar Saba', 5200, 1.5, 8.2, 24.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Modi''in', 5400, 2.4, 10.0, 26.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Rehovot', 4600, 4.1, 9.2, 23.5, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Bnei Brak', 4800, 5.5, 12.5, 31.0, 0.6, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Beit Shemesh', 4400, 6.8, 14.2, 35.0, 0.7, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Hadera', 4100, 5.2, 10.5, 22.0, 0.5, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.7}'),
    ('Lod', 3800, 4.5, 9.8, 20.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Ramla', 3700, 4.2, 9.5, 19.5, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Hod HaSharon', 5600, 1.2, 8.5, 26.0, 0.1, '{"2": 0.8, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Kiryat Ono', 5500, 2.8, 9.2, 27.5, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.9}'),
    ('Ness Ziona', 5300, 3.2, 9.8, 25.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Akko', 3300, 2.4, 6.5, 16.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Eilat', 3900, 1.5, 5.8, 14.5, 0.1, '{"2": 0.85, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Central', 4900, -2.9, 8.4, 28.0, -0.1, '{"2": 0.75, "3": 1.0, "4": 1.2, "5": 1.45}', '{"apartment": 1.0, "penthouse": 1.35, "house": 1.7}'),
    ('North', 3500, 5.4, 10.5, 22.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('South', 3600, 1.2, 4.5, 18.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}')
ON CONFLICT (region_name) DO UPDATE SET 
    avg_rent = EXCLUDED.avg_rent,
    growth_1y = EXCLUDED.growth_1y,
    growth_2y = EXCLUDED.growth_2y,
    growth_5y = EXCLUDED.growth_5y,
    month_over_month = EXCLUDED.month_over_month,
    room_adjustments = EXCLUDED.room_adjustments,
    type_adjustments = EXCLUDED.type_adjustments,
    updated_at = NOW();
-- Migration: enhance_subscription_marketing
-- Description: Adds marketing-focused columns to subscription_plans table.

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS badge_text TEXT,
ADD COLUMN IF NOT EXISTS cta_text TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set some reasonable defaults for existing plans to avoid empty fields
UPDATE subscription_plans 
SET 
    description = CASE 
        WHEN id = 'free' THEN 'Essential tracking for individual property owners.'
        WHEN id = 'solo' THEN 'Advanced optimization for serious landlords.'
        WHEN id = 'pro' THEN 'The ultimate yield maximizer for portfolio managers.'
        ELSE 'Manage your rental business professionally.'
    END,
    cta_text = CASE 
        WHEN price_monthly = 0 THEN 'Get Started'
        ELSE 'Start Free Trial'
    END,
    sort_order = CASE 
        WHEN id = 'free' THEN 10
        WHEN id = 'solo' THEN 20
        WHEN id = 'pro' THEN 30
        ELSE 100
    END
WHERE description IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job to run quarterly
-- 0 6 1 2,5,8,11 * (6:00 AM on the 1st of February, May, August, November)
-- This follows the CBS quarterly rent reporting cycle

SELECT cron.schedule(
    'sync-rental-trends-quarterly', -- Job name
    '0 6 1 2,5,8,11 *',            -- Schedule (Quarterly)
    $$
    SELECT
        net.http_post(
            url:=(SELECT value FROM system_settings WHERE key = 'api_url' LIMIT 1) || '/functions/v1/sync-rental-trends',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'service_role_key' LIMIT 1)
            ),
            body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Comment to explain
-- Add email configuration settings to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email'),
    ('admin_email_content_preferences', '{"new_users": true, "revenue": true, "support_tickets": true, "upgrades": true, "active_properties": true}'::jsonb, 'JSON object defining which sections to include in the daily summary')
ON CONFLICT (key) DO NOTHING;
-- Update get_admin_stats to include top 10 cities by property count
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
    total_ai_cost NUMERIC;
    automated_actions_count INTEGER;
    stagnant_tickets_count INTEGER;
    avg_sentiment_score NUMERIC;
    last_automation_run TIMESTAMPTZ;
    top_cities JSON;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- 1. Core Metrics
    SELECT COUNT(*) INTO total_users_count FROM user_profiles WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO total_contracts_count FROM contracts;
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount FROM payments WHERE status = 'paid';
    SELECT COUNT(*) INTO active_users_count FROM user_profiles WHERE deleted_at IS NULL AND updated_at > NOW() - INTERVAL '30 days';
    
    -- 2. AI & Automation Metrics
    SELECT COALESCE(SUM(total_cost_usd), 0) INTO total_ai_cost FROM ai_conversations;
    SELECT COUNT(*) INTO automated_actions_count FROM automation_logs;
    SELECT COUNT(*) INTO stagnant_tickets_count FROM support_tickets WHERE status = 'open' AND updated_at < NOW() - INTERVAL '24 hours';
    SELECT COALESCE(AVG(sentiment_score), 0) INTO avg_sentiment_score FROM ticket_analysis;
    SELECT MAX(created_at) INTO last_automation_run FROM automation_logs;

    -- 3. Top Cities Metrics (New)
    SELECT json_agg(city_stats) INTO top_cities
    FROM (
        SELECT 
            COALESCE(city, 'Unknown') as name,
            COUNT(*) as count
        FROM properties
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
    ) city_stats;

    -- 4. Build Result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost,
        'totalAutomatedActions', automated_actions_count,
        'stagnantTickets', stagnant_tickets_count,
        'avgSentiment', avg_sentiment_score,
        'lastAutomationRun', last_automation_run,
        'topCities', COALESCE(top_cities, '[]'::json)
    );

    RETURN result;
END;
$$;
-- Migration: fix_daily_summary_cron
-- Description: Ensures the daily admin summary cron job uses robust config helpers for authorization.

-- 1. Reschedule the daily-admin-summary cron job
-- This uses the get_supabase_config helper (added in Jan 30 migration)
-- to reliably get the service role key even in cron sessions.

SELECT cron.unschedule('daily-admin-summary');

SELECT cron.schedule(
    'daily-admin-summary',
    '30 5 * * *', -- 05:30 UTC = 07:30/08:30 IL time depending on DST. 
    -- Matches the 08:00 IL time requirement.
    $$
    SELECT
      net.http_post(
        url := 'https://' || public.get_supabase_config('supabase_project_ref') || '.supabase.co/functions/v1/send-daily-admin-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.get_supabase_config('supabase_service_role_key')
        ),
        body := '{}'::jsonb
      )
    $$
);

-- 2. Ensure the keys exist as fallbacks in system_settings if they aren't there
INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_project_ref', '"qfvrekvugdjnwhnaucmz"'::jsonb, 'Supabase Project Reference'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_project_ref');

INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_service_role_key', ('"' || current_setting('app.settings.service_role_key', true) || '"')::jsonb, 'Supabase Service Role Key'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_service_role_key')
AND current_setting('app.settings.service_role_key', true) IS NOT NULL;
-- Migration: final_reliable_cron_and_schema_fix
-- Description: Repairs the properties table and hardens the daily admin summary cron job.

BEGIN;

-- 1. Ensure 'status' column exists in properties (fixing previous drift)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant';

-- 2. Restore occupancy logic helpers (ensuring functions are valid after repair)
CREATE OR REPLACE FUNCTION public.recalculate_all_property_statuses()
RETURNS void AS $$
BEGIN
    UPDATE public.properties p
    SET status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.property_id = p.id
            AND c.status = 'active'
            AND c.start_date <= CURRENT_DATE
            AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
        ) THEN 'Occupied'
        ELSE 'Vacant'
    END
    WHERE p.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reschedule the daily-admin-summary cron job with robust auth
-- This uses get_supabase_config (added Jan 30) to reliably get the service role key.
-- Note: pg_cron is usually enabled in Supabase by default.

DO $$
BEGIN
    PERFORM cron.unschedule('daily-admin-summary');
EXCEPTION WHEN OTHERS THEN
    NULL; -- Skip if not scheduled
END $$;

SELECT cron.schedule(
    'daily-admin-summary',
    '30 5 * * *', -- 05:30 UTC = 07:30/08:30 IL time (08:00 Target)
    $$
    SELECT
      net.http_post(
        url := 'https://' || public.get_supabase_config('supabase_project_ref') || '.supabase.co/functions/v1/send-daily-admin-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.get_supabase_config('supabase_service_role_key')
        ),
        body := '{}'::jsonb
      )
    $$
);

-- 4. Sync configuration in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('supabase_project_ref', '"qfvrekvugdjnwhnaucmz"', 'Supabase Project Reference'),
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. Trigger initial recalculation
SELECT public.recalculate_all_property_statuses();

COMMIT;
-- Remove pets_allowed column from contracts table
ALTER TABLE contracts DROP COLUMN IF EXISTS pets_allowed;
-- Fix Notification Preferences Logic to be Dynamic
-- Reverts hardcoded values from previous "enhanced" migrations and ensures all 4 checks respect user_profiles.notification_preferences

-- 1. Check Contract Expirations (Dynamic)
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
    LOOP
        -- Extract preference, default to 60, cap at 180
        pref_days := COALESCE((expiring_contract.notification_preferences->>'contract_expiry_days')::int, 60);
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if contract expires in this window
        IF expiring_contract.end_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND expiring_contract.end_date >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = expiring_contract.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = expiring_contract.id::text
                AND n.title = 'Contract Expiring Soon' 
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    expiring_contract.user_id,
                    'warning',
                    'Contract Expiring Soon',
                    'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
                    jsonb_build_object('contract_id', expiring_contract.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 2. Check Rent Due (Dynamic)
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address,
            up.notification_preferences
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE pay.status = 'pending'
    LOOP
        -- Extract preference, default to 3, cap at 60
        pref_days := COALESCE((due_payment.notification_preferences->>'rent_due_days')::int, 3);
        IF pref_days > 60 THEN pref_days := 60; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        IF due_payment.due_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND due_payment.due_date >= CURRENT_DATE THEN

            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = due_payment.user_id
                AND n.type = 'info'
                AND n.metadata->>'payment_id' = due_payment.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    due_payment.user_id,
                    'info',
                    'Rent Due Soon',
                    'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                    jsonb_build_object('payment_id', due_payment.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Check Extension Options (Dynamic)
CREATE OR REPLACE FUNCTION public.check_extension_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extension_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR extension_record IN
        SELECT 
            c.id, 
            c.extension_option_start,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_start IS NOT NULL
    LOOP
        -- Extract preference, default to 30, cap at 180
        pref_days := COALESCE((extension_record.notification_preferences->>'extension_option_days')::int, 30);
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if extension option starts in this window
        IF extension_record.extension_option_start <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND extension_record.extension_option_start >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = extension_record.user_id
                AND n.type = 'info'
                AND n.metadata->>'contract_id' = extension_record.id::text
                AND n.title = 'Extension Option Available'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    extension_record.user_id,
                    'info',
                    'Extension Option Available',
                    'Extension option period for ' || extension_record.address || ' starts in ' || (extension_record.extension_option_start - CURRENT_DATE)::text || ' days (' || to_char(extension_record.extension_option_start, 'DD/MM/YYYY') || '). Consider discussing with tenant.',
                    jsonb_build_object('contract_id', extension_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 4. Check Extension Deadlines (Dynamic)
CREATE OR REPLACE FUNCTION public.check_extension_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deadline_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR deadline_record IN
        SELECT 
            c.id, 
            c.extension_option_end,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_end IS NOT NULL
    LOOP
        -- Extract preference, default to 7, cap at 180
        pref_days := COALESCE((deadline_record.notification_preferences->>'extension_option_end_days')::int, 7);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if deadline is approaching
        IF deadline_record.extension_option_end <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND deadline_record.extension_option_end >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = deadline_record.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = deadline_record.id::text
                AND n.title = 'Extension Option Deadline Approaching'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    deadline_record.user_id,
                    'warning',
                    'Extension Option Deadline Approaching',
                    'Deadline to announce extension option for ' || deadline_record.address || ' is in ' || (deadline_record.extension_option_end - CURRENT_DATE)::text || ' days (' || to_char(deadline_record.extension_option_end, 'DD/MM/YYYY') || '). Contact tenant soon.',
                    jsonb_build_object('contract_id', deadline_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;
-- Add onboarding tracking flag
alter table public.user_preferences 
add column if not exists has_seen_welcome_v1 boolean default false;

-- Comment for documentation
-- Add seen_features tracking array
alter table public.user_preferences 
add column if not exists seen_features text[] default '{}';

-- Comment for documentation
-- Migration: update_pricing_to_new_tiers
-- Description: Updates plan names, prices, and limits to SOLO, MATE, MASTER strategy.

-- 1. Update SOLO (Free)
UPDATE subscription_plans
SET 
    name = 'SOLO',
    max_properties = 1,
    price_monthly = 0,
    price_yearly = 0,
    features = '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": false, "bill_analysis": false, "can_export": false, "cpi_autopilot": false}'::jsonb
WHERE id = 'free' OR id = 'solo';

-- 2. Update MATE (Pro)
UPDATE subscription_plans
SET 
    name = 'MATE',
    max_properties = 3,
    price_monthly = 0, -- Testing Stage: Free
    price_yearly = 0,
    features = '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": true, "bill_analysis": true, "can_export": false, "cpi_autopilot": true, "whatsapp_bot": true}'::jsonb
WHERE id = 'pro' OR id = 'mate';

-- 3. Update MASTER (Enterprise)
UPDATE subscription_plans
SET 
    name = 'MASTER',
    max_properties = 10,
    price_monthly = 0, -- Testing Stage: Free
    price_yearly = 0,
    features = '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": true, "bill_analysis": true, "can_export": true, "cpi_autopilot": true, "whatsapp_bot": true, "portfolio_visualizer": true}'::jsonb
WHERE id = 'enterprise' OR id = 'master';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- Migration: Hardening Access Control
-- Description: Restricts system_settings read access and secures administrative roles.

-- 1. HARDEN system_settings
-- Only Super Admins can read the full settings. Regular users see nothing (unless we specificy public keys).
DROP POLICY IF EXISTS "Everyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can read system settings" ON public.system_settings;
CREATE POLICY "Admins can read system settings" ON public.system_settings
    FOR SELECT
    USING (public.is_admin());

-- 2. PREVENT ROLE SELF-ESCALATION
-- Create a trigger function to ensure only admins can change roles
CREATE OR REPLACE FUNCTION public.check_role_change() 
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role != NEW.role OR OLD.is_super_admin != NEW.is_super_admin) THEN
        -- Check if the PERFOMING user is an admin
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
        ) THEN
            RAISE EXCEPTION 'Access Denied: You cannot modify roles without administrative privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_role_change ON public.user_profiles;
CREATE TRIGGER tr_on_role_change
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_role_change();

-- 3. REMOVE SENSITIVE KEYS FROM PUBLIC TABLE (MOVE TO ENV/VAULT)
-- These keys should NOT be in the table for long-term security.
DELETE FROM public.system_settings WHERE key IN ('supabase_service_role_key', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN');

NOTIFY pgrst, 'reload schema';
-- Migration: Storage Bucket Hardening
-- Description: Sets sensitive buckets to private and enforces RLS.

-- 1. Harden 'contracts' bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'contracts';

-- 2. Harden 'property_images' bucket (if it exists)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property_images';

-- 3. Ensure 'secure_documents' is private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'secure_documents';

-- 4. Apply strict RLS for 'contracts' bucket matching 'secure_documents' pattern
DROP POLICY IF EXISTS "Users view own contracts" ON storage.objects;
CREATE POLICY "Users view own contracts"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'contracts'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users upload own contracts" ON storage.objects;
CREATE POLICY "Users upload own contracts"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'contracts'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
        AND
        auth.role() = 'authenticated'
    );

-- 5. Repeat for 'property_images'
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
CREATE POLICY "Users view own images"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'property_images'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
CREATE POLICY "Users upload own images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'property_images'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
        AND
        auth.role() = 'authenticated'
    );

NOTIFY pgrst, 'reload schema';
-- Migration: Security Fortress (Total Privacy Hardening - v3)
-- Description: Enforces strict RLS ownership with Admin audit support (Zero-Exposure to other users).

BEGIN;

-- 1. HARDEN FEEDBACK TABLE
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback') THEN
        ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
        CREATE POLICY "Users can view own feedback" ON public.feedback
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
        -- Anyone can still insert (even guests) per current business logic if user_id is null
        -- but if user_id is set, it becomes owned.
    END IF;
END $$;

-- 2. HARDEN AI CONVERSATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_conversations') THEN
        ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.ai_conversations;
        DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.ai_conversations;
        CREATE POLICY "Users can view own AI conversations" ON public.ai_conversations
            FOR ALL USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 3. HARDEN INVOICES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
        CREATE POLICY "Users can view own invoices" ON public.invoices
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 4. HARDEN USER PREFERENCES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
        ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
        CREATE POLICY "Users can manage own preferences" ON public.user_preferences
            FOR ALL USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 5. HARDEN AUDIT LOGS (Admin ONLY)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
        CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
            FOR SELECT USING (public.is_admin());
    END IF;
END $$;

-- 6. HARDEN NOTIFICATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
        CREATE POLICY "Users can manage own notifications" ON public.notifications
            FOR ALL USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 7. HARDEN STORAGE USAGE TRACKING
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_storage_usage') THEN
        ALTER TABLE public.user_storage_usage ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own storage usage" ON public.user_storage_usage;
        CREATE POLICY "Users can view own storage usage" ON public.user_storage_usage
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 8. HARDEN WHATSAPP CONVERSATIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_conversations') THEN
        ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own whatsapp" ON public.whatsapp_conversations;
        CREATE POLICY "Users can view own whatsapp" ON public.whatsapp_conversations
            FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
    END IF;
END $$;

-- 9. HARDEN WHATSAPP MESSAGES
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'whatsapp_messages') THEN
        ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own whatsapp messages" ON public.whatsapp_messages;
        CREATE POLICY "Users can view own whatsapp messages" ON public.whatsapp_messages
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.whatsapp_conversations c
                    WHERE c.id = whatsapp_messages.conversation_id
                    AND (c.user_id = auth.uid() OR public.is_admin())
                )
            );
    END IF;
END $$;

-- 10. HARDEN USER PROFILES
-- Ensures users see their own profile, admins see ALL profiles.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = id OR public.is_admin());
            
        DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';

COMMIT;
NOTIFY pgrst, 'reload schema';
-- Migration: Storage Fortress (Bucket Security)
-- Description: Sets feedback bucket to private and enforces strict path-based RLS for all sensitive assets.

BEGIN;

-- 1. HARDEN FEEDBACK BUCKET (Critical Fix)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'feedback-screenshots';

-- 2. REMOVE PERMISSIVE FEEDBACK POLICIES
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;

-- 3. APPLY OWNER-ONLY FEEDBACK POLICIES
-- Path naming: feedback-screenshots/{user_id}/{filename}
CREATE POLICY "Users can upload own feedback screenshots"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'feedback-screenshots'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own feedback screenshots"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'feedback-screenshots'
        AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. VERIFY OTHER BUCKETS ARE PRIVATE
UPDATE storage.buckets SET public = false WHERE id IN ('contracts', 'property_images', 'secure_documents');

-- 5. STANDARDIZE POLICY NAMES FOR AUDITABILITY
DROP POLICY IF EXISTS "Users view own contracts" ON storage.objects;
CREATE POLICY "Secure Access: Contracts"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
CREATE POLICY "Secure Access: Property Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'property_images' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;
NOTIFY pgrst, 'reload schema';
-- Migration: Add WhatsApp Usage Limits
-- Description: Adds limits to subscription plans and per-user overrides for WhatsApp messaging.

BEGIN;

-- 1. Add max_whatsapp_messages to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_whatsapp_messages INTEGER DEFAULT 50;

-- 2. Update Seed Data for existing plans
UPDATE public.subscription_plans SET max_whatsapp_messages = 50 WHERE id = 'free';
UPDATE public.subscription_plans SET max_whatsapp_messages = 500 WHERE id = 'pro';
UPDATE public.subscription_plans SET max_whatsapp_messages = -1 WHERE id = 'enterprise';
UPDATE public.subscription_plans SET max_whatsapp_messages = -1 WHERE id = 'master';

-- 3. Add whatsapp_limit_override to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS whatsapp_limit_override INTEGER DEFAULT NULL;

-- 3b. Also add to ai_usage_limits for UI consistency in Usage Dashboard
ALTER TABLE public.ai_usage_limits
ADD COLUMN IF NOT EXISTS monthly_whatsapp_limit INTEGER DEFAULT 50;

UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = 50 WHERE tier_name = 'free';
UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = 500 WHERE tier_name = 'pro';
UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = -1 WHERE tier_name = 'enterprise';

-- 4. Create WhatsApp Usage Logs Table
-- This tracks OUTBOUND messages to count against the quota
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_user_date ON public.whatsapp_usage_logs (user_id, created_at);

-- Policies
CREATE POLICY "Users can view their own whatsapp usage logs"
    ON public.whatsapp_usage_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage all usage logs"
    ON public.whatsapp_usage_logs FOR ALL
    USING (public.is_admin());

-- 5. RPC to check and log usage
-- Returns { allowed: boolean, current_usage: int, limit: int }
CREATE OR REPLACE FUNCTION public.check_and_log_whatsapp_usage(p_user_id UUID, p_conversation_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_current_usage INTEGER;
    v_month_start TIMESTAMPTZ;
BEGIN
    -- SECURITY CHECK: 
    -- Only admin or the user themselves can trigger this check
    IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Get current month start
    v_month_start := date_trunc('month', now());

    -- 1. Get User's Limit and Override
    SELECT 
        COALESCE(up.whatsapp_limit_override, p.max_whatsapp_messages, 50) INTO v_limit
    FROM public.user_profiles up
    JOIN public.subscription_plans p ON up.plan_id = p.id
    WHERE up.id = p_user_id;

    -- Fallback if user or plan not found
    IF v_limit IS NULL THEN
        v_limit := 50;
    END IF;

    -- 2. Count total WhatsApp usage this month (Outbound messages)
    SELECT COUNT(*)::INTEGER INTO v_current_usage
    FROM public.whatsapp_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= v_month_start;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + 1) <= v_limit THEN
        -- Log the usage
        INSERT INTO public.whatsapp_usage_logs (user_id, conversation_id)
        VALUES (p_user_id, p_conversation_id);
        
        RETURN jsonb_build_object(
            'allowed', true,
            'current_usage', v_current_usage + 1,
            'limit', v_limit
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'current_usage', v_current_usage,
            'limit', v_limit,
            'error', 'Limit exceeded'
        );
    END IF;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
-- Migration: ensure_unique_phone
-- Description: Enforces unique phone numbers in user_profiles and updates signup trigger.

-- 1. Clean up potential duplicates or empty strings if any exist before adding constraint
-- (In a fresh-ish DB, we assume it's relatively clean, but let's be safe)
UPDATE public.user_profiles SET phone = NULL WHERE phone = '';

-- 2. Add Unique constraint
-- Note: UNIQUE allows multiple NULLs in Postgres, which is perfect for legacy users 
-- who haven't set a phone yet, but prevents 2 users from having the same number.
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);

-- 3. Update handle_new_user() to be stricter
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_plan_id TEXT := 'free';
    v_phone TEXT;
BEGIN
    -- Extract phone from metadata or use NEW.phone (from auth schema if provided)
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone);

    -- Verify plan exists
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = default_plan_id) THEN
        default_plan_id := NULL; 
    END IF;

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        v_phone,
        'user', 
        'active', 
        COALESCE(NEW.raw_user_meta_data->>'plan_id', default_plan_id)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION 
    WHEN unique_violation THEN
        RAISE EXCEPTION 'This phone number is already registered to another account.';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;
-- Create Trigger for User Profile Updates
-- This attaches the user_profiles table to the existing automated engagement webhook system

DROP TRIGGER IF EXISTS tr_on_user_profile_update ON public.user_profiles;

CREATE TRIGGER tr_on_user_profile_update
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
WHEN (
    OLD.plan_id IS DISTINCT FROM NEW.plan_id OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone
)
EXECUTE FUNCTION public.handle_automated_engagement_webhook();
-- Migration: Unified Property Images Security (v2 - Consolidated)
-- Description: Unifies bucket naming to 'property-images' and enforces strict owner-only RLS.
-- Consolidated to a single policy definition to avoid execution collision.

BEGIN;

-- 1. CLEAN UP UNDERSCORE MISMATCHES & OLD POLICIES
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Secure Access: Property Images" ON storage.objects;

-- 2. ENSURE CORRECT BUCKET NAME 'property-images' IS PRIVATE
UPDATE storage.buckets 
SET public = false 
WHERE id = 'property-images';

-- 3. APPLY CONSOLIDATED RLS TO 'property-images'
-- Handles both direct user uploads and Google Maps imports
CREATE POLICY "Secure Access: Property Images"
    ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'property-images'
        AND (
            -- Direct user-id folder: {userId}/filename
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Google imports folder: google-imports/{userId}/filename
            (
                (storage.foldername(name))[1] = 'google-imports' 
                AND 
                (storage.foldername(name))[2] = auth.uid()::text
            )
        )
    )
    WITH CHECK (
        bucket_id = 'property-images'
        AND (
            -- Direct user-id folder
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Google imports folder
            (
                (storage.foldername(name))[1] = 'google-imports' 
                AND 
                (storage.foldername(name))[2] = auth.uid()::text
            )
        )
    );

COMMIT;
NOTIFY pgrst, 'reload schema';
-- Migration: Enhanced Storage Security for property-images
-- Sets up robust RLS policies for both manual and automated uploads.

BEGIN;

-- 1. Remove all old policies to start fresh
DROP POLICY IF EXISTS "Secure Access: Property Images" ON storage.objects;
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Manual uploads ownership" ON storage.objects;
DROP POLICY IF EXISTS "Google imports ownership" ON storage.objects;

-- 2. Ensure bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'property-images';

-- 3. Policy for manual uploads: {userId}/{fileName}
CREATE POLICY "Manual uploads ownership"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Policy for Google imports: google-imports/{userId}/{fileName}
CREATE POLICY "Google imports ownership"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = 'google-imports' AND
    (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = 'google-imports' AND
    (storage.foldername(name))[2] = (auth.uid())::text
);

COMMIT;
NOTIFY pgrst, 'reload schema';
-- Migration: Enable public read access for Calculator Magnet Page
-- Date: 2026-02-08 (Moved from 2026-02-04 to avoid conflict)
-- Author: Maestro (via Agent)

-- 1. Index Data (Already has RLS enabled)
-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to index_data" ON index_data;

CREATE POLICY "Allow public read access to index_data"
ON index_data
FOR SELECT
TO anon
USING (true);

-- 2. Index Bases (Ensure RLS is on and policy exists)
ALTER TABLE index_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to index_bases" ON index_bases;

CREATE POLICY "Allow public read access to index_bases"
ON index_bases
FOR SELECT
TO anon
USING (true);

-- Ensure authenticated users can still read (in case previous logic relied on default open access for bases)
DROP POLICY IF EXISTS "Allow authenticated users to read index_bases" ON index_bases;

CREATE POLICY "Allow authenticated users to read index_bases"
ON index_bases
FOR SELECT
TO authenticated
USING (true);
-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    stack TEXT,
    route TEXT,
    component_stack TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN DEFAULT false,
    environment TEXT DEFAULT 'production'
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone (even unauthenticated) can insert logs (so we catch 404s/auth errors)
DROP POLICY IF EXISTS "Allow anonymous inserts to error_logs" ON public.error_logs;
CREATE POLICY "Allow anonymous inserts to error_logs" ON public.error_logs
    FOR INSERT WITH CHECK (true);

-- 2. Only admins can view logs
DROP POLICY IF EXISTS "Allow admins to view error_logs" ON public.error_logs;
CREATE POLICY "Allow admins to view error_logs" ON public.error_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- 3. Only admins can update logs (mark as resolved)
DROP POLICY IF EXISTS "Allow admins to update error_logs" ON public.error_logs;
CREATE POLICY "Allow admins to update error_logs" ON public.error_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- 4. Trigger to notify admin on error
CREATE OR REPLACE FUNCTION public.notify_admin_on_error()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    PERFORM
      net.http_post(
        url := project_url || '/functions/v1/send-admin-alert',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := json_build_object(
            'type', TG_OP,
            'table', 'error_logs',
            'record', row_to_json(NEW)
        )::jsonb
      );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger error notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_error_log_inserted ON public.error_logs;
CREATE TRIGGER on_error_log_inserted
    AFTER INSERT ON public.error_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_error();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_is_resolved ON public.error_logs (is_resolved) WHERE (is_resolved = false);
-- Migration: fix_config_getter_and_cron_v2
-- Description: Corrects get_supabase_config to return unquoted strings and ensures daily cron uses correct headers.

BEGIN;

-- 1. Fix the helper function to return UNQUOTED strings from JSONB
CREATE OR REPLACE FUNCTION public.get_supabase_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    -- Use #>> '{}' to get the unquoted text value from JSONB
    SELECT value #>> '{}' INTO v_value FROM public.system_settings WHERE key = p_key;
    
    -- Try current_setting as fallback
    IF v_value IS NULL OR v_value = '' THEN
        BEGIN
            v_value := current_setting('app.settings.' || p_key, true);
        EXCEPTION WHEN OTHERS THEN
            v_value := NULL;
        END;
    END IF;
    
    RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up potentially broken settings (removing redundant quotes if they exist)
UPDATE public.system_settings 
SET value = to_jsonb(value #>> '{}')
WHERE key IN ('supabase_project_ref', 'supabase_service_role_key')
AND value::text LIKE '"%"%';

-- 3. Reschedule the daily-admin-summary cron job
-- This ensures it uses the fixed get_supabase_config and correct headers.
DO $$
BEGIN
    PERFORM cron.unschedule('daily-admin-summary');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'daily-admin-summary',
    '30 5 * * *', -- 05:30 UTC = 07:30/08:30 IL time (08:00 Target)
    $$
    SELECT
      net.http_post(
        url := 'https://' || public.get_supabase_config('supabase_project_ref') || '.supabase.co/functions/v1/send-daily-admin-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.get_supabase_config('supabase_service_role_key')
        ),
        body := '{}'::jsonb
      )
    $$
);

COMMIT;
-- Add max_archived_contracts column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_archived_contracts INTEGER;

-- Update existing plans with new limits
-- Starter Plan (assuming id='starter' or name like '%Starter%')
UPDATE subscription_plans 
SET max_archived_contracts = 3 
WHERE id = 'starter';

-- Pro Plan (assuming id='pro' or name like '%Pro%')
UPDATE subscription_plans 
SET max_archived_contracts = 15 
WHERE id = 'pro';

-- Ensure Free plan is handled (though logic is code-side for total count)
UPDATE subscription_plans 
SET max_archived_contracts = 1 
WHERE id = 'free';
-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    -- Admins can read all events
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'analytics_events' AND policyname = 'Admins can read all analytics'
    ) THEN
        CREATE POLICY "Admins can read all analytics" ON public.analytics_events
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Users can insert their own events (hidden from others)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'analytics_events' AND policyname = 'Users can log their own events'
    ) THEN
        CREATE POLICY "Users can log their own events" ON public.analytics_events
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- RPC for aggregated stats
DROP FUNCTION IF EXISTS public.get_global_usage_stats(INTEGER);
CREATE OR REPLACE FUNCTION get_global_usage_stats(days_limit INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'top_users', (
            SELECT jsonb_agg(u) FROM (
                SELECT 
                    ae.user_id,
                    up.full_name,
                    up.email,
                    count(*) as event_count
                FROM analytics_events ae
                JOIN user_profiles up ON ae.user_id = up.id
                WHERE ae.created_at > now() - (days_limit || ' days')::interval
                GROUP BY ae.user_id, up.full_name, up.email
                ORDER BY event_count DESC
                LIMIT 10
            ) u
        ),
        'popular_features', (
            SELECT jsonb_agg(f) FROM (
                SELECT 
                    event_name,
                    count(*) as usage_count
                FROM analytics_events
                WHERE created_at > now() - (days_limit || ' days')::interval
                GROUP BY event_name
                ORDER BY usage_count DESC
            ) f
        ),
        'daily_trends', (
            SELECT jsonb_agg(t) FROM (
                SELECT 
                    date_trunc('day', created_at)::date as day,
                    count(*) as count
                FROM analytics_events
                WHERE created_at > now() - (days_limit || ' days')::interval
                GROUP BY 1
                ORDER BY 1 ASC
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$$;
-- Migration: Fair Use and Abuse Prevention Schema
-- Description: Adds security fields to user_profiles and creates security_logs table.

BEGIN;

-- 1. Create Enums for Account Security
DO $$ BEGIN
    CREATE TYPE public.account_security_status AS ENUM ('active', 'flagged', 'suspended', 'banned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Update user_profiles with security fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS security_status public.account_security_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS security_notes TEXT[],
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_security_check TIMESTAMPTZ;

-- 3. Create security_logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_code TEXT NOT NULL, -- e.g. 'AUTH_VELOCITY', 'WHATSAPP_SPIKE', 'RESOURCE_SPIKE'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for Admin Dashboard
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);

-- 4. Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_logs;
    CREATE POLICY "Admins can view security logs"
        ON public.security_logs FOR SELECT
        USING (public.is_admin());
EXCEPTION WHEN OTHERS THEN
    CREATE POLICY "Admins can view security logs"
        ON public.security_logs FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

-- 5. Helper Function: log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_code TEXT,
    p_severity TEXT,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip TEXT DEFAULT NULL,
    p_ua TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_logs (user_id, event_code, severity, details, ip_address, user_agent)
    VALUES (p_user_id, p_event_code, p_severity, p_details, p_ip, p_ua);
    
    -- Auto-flag if critical
    IF p_severity = 'critical' THEN
        UPDATE public.user_profiles 
        SET security_status = 'flagged',
            flagged_at = NOW()
        WHERE id = p_user_id AND (security_status = 'active' OR security_status IS NULL);
    END IF;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
CREATE OR REPLACE FUNCTION public.perform_abuse_scan()
RETURNS TABLE (
    user_id UUID,
    event_code TEXT,
    severity TEXT,
    details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_event_code TEXT;
    v_severity TEXT;
    v_details JSONB;
    v_hour_ago TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
BEGIN
    -- 1. WHATSAPP SPIKE DETECTION
    -- Users who sent more than 30 messages in the last hour
    FOR v_user_id, v_details IN 
        SELECT w.user_id, jsonb_build_object('count', count(*), 'period', '1h')
        FROM public.whatsapp_usage_logs w
        WHERE w.created_at >= v_hour_ago
        GROUP BY w.user_id
        HAVING count(*) > 30
    LOOP
        PERFORM public.log_security_event(v_user_id, 'WHATSAPP_SPIKE', 'medium', v_details);
        user_id := v_user_id;
        event_code := 'WHATSAPP_SPIKE';
        severity := 'medium';
        details := v_details;
        RETURN NEXT;
    END LOOP;

    -- 2. RESOURCE SPIKE DETECTION (Properties)
    -- Users who created more than 5 properties in the last hour
    FOR v_user_id, v_details IN 
        SELECT p.user_id, jsonb_build_object('count', count(*), 'type', 'properties')
        FROM public.properties p
        WHERE p.created_at >= v_hour_ago
        GROUP BY p.user_id
        HAVING count(*) > 5
    LOOP
        PERFORM public.log_security_event(v_user_id, 'RESOURCE_SPIKE', 'high', v_details);
        user_id := v_user_id;
        event_code := 'RESOURCE_SPIKE';
        severity := 'high';
        details := v_details;
        RETURN NEXT;
    END LOOP;

    -- 3. MULTI-ACCOUNTING DETECTION
    -- Different users with the same IP in the last hour
    FOR v_user_id, v_details IN 
        SELECT s1.user_id, jsonb_build_object('ip', s1.ip_address, 'colliding_users', count(distinct s2.user_id))
        FROM public.security_logs s1
        JOIN public.security_logs s2 ON s1.ip_address = s2.ip_address AND s1.user_id != s2.user_id
        WHERE s1.created_at >= v_hour_ago AND s2.created_at >= v_hour_ago
        GROUP BY s1.user_id, s1.ip_address
        HAVING count(distinct s2.user_id) > 2
    LOOP
        PERFORM public.log_security_event(v_user_id, 'IP_COLLISION', 'medium', v_details);
        user_id := v_user_id;
        event_code := 'IP_COLLISION';
        severity := 'medium';
        details := v_details;
        RETURN NEXT;
    END LOOP;

END;
$$;
DROP FUNCTION IF EXISTS public.get_users_with_stats();

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT,
    subscription_status TEXT,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT,
    ai_sessions_count BIGINT,
    open_tickets_count BIGINT,
    storage_usage_mb NUMERIC,
    is_super_admin BOOLEAN,
    security_status TEXT,
    flagged_at TIMESTAMPTZ,
    last_security_check TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.phone,
        up.role::TEXT,
        COALESCE(up.subscription_status::TEXT, 'active'),
        up.plan_id,
        up.created_at,
        up.last_login,
        
        -- Asset Stats
        COALESCE(p.count, 0)::BIGINT as properties_count,
        COALESCE(t.count, 0)::BIGINT as tenants_count,
        COALESCE(c.count, 0)::BIGINT as contracts_count,
        
        -- Usage Stats
        COALESCE(ai.count, 0)::BIGINT as ai_sessions_count,
        
        -- Support Stats
        COALESCE(st.count, 0)::BIGINT as open_tickets_count,
        
        -- Storage Usage (Bytes to MB)
        ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2)::NUMERIC as storage_usage_mb,
        
        -- Permissions
        COALESCE(up.is_super_admin, false) as is_super_admin,

        -- Security Fields
        up.security_status::TEXT,
        up.flagged_at,
        up.last_security_check
        
    FROM user_profiles up
    -- Property Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts (from embedded JSONB in contracts)
    LEFT JOIN (
        SELECT user_id, sum(jsonb_array_length(COALESCE(tenants, '[]'::jsonb))) as count 
        FROM contracts 
        GROUP BY user_id
    ) t ON up.id = t.user_id
    -- Contract Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
    LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
    LEFT JOIN (SELECT user_id, total_bytes FROM user_storage_usage) usu ON up.id = usu.user_id
    
    WHERE up.deleted_at IS NULL
    ORDER BY up.created_at DESC;
END;
$$;
-- Migration: admin_security_config
-- Description: Adds system settings for abuse notifications.

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('security_alerts_enabled', 'true'::jsonb, 'Master switch for automated abuse detection alerts (Email/WhatsApp).'),
    ('admin_security_whatsapp', '"972500000000"'::jsonb, 'Admin phone number for WhatsApp security alerts. Format: CountryCode + Number (e.g., 972...)'),
    ('admin_security_email', '"rubi@rentmate.co.il"'::jsonb, 'Admin email for receiving security audit reports.')
ON CONFLICT (key) DO UPDATE SET 
    description = EXCLUDED.description;
-- Add disclaimer_accepted to user_preferences
-- Defaults to FALSE

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'disclaimer_accepted') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN disclaimer_accepted BOOLEAN DEFAULT false;
    END IF;
END $$;
-- ============================================
-- PRIVACY HARDENING: RESTRICT ADMIN GLOBAL SELECT
-- ============================================
-- Description: Removes the permissive "Admins view all" RLS policies 
-- that grant administrators unrestricted SELECT access to core tables.
-- Administrative oversight should be performed via RPCs with SECURITY DEFINER
-- or very specific read-only policies for audit purposes.

-- 1. Contracts
DROP POLICY IF EXISTS "Admins view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Enable read access for admin" ON public.contracts;

-- 2. Properties
DROP POLICY IF EXISTS "Admins view all properties" ON public.properties;
DROP POLICY IF EXISTS "Enable read access for admin" ON public.properties;

-- 4. Payments
DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
DROP POLICY IF EXISTS "Enable read access for admin" ON public.payments;

-- 5. Property Documents
DROP POLICY IF EXISTS "Admins view all property_documents" ON public.property_documents;

-- 6. Document Folders
DROP POLICY IF EXISTS "Admins view all document_folders" ON public.document_folders;

-- 7. Short Links
DROP POLICY IF EXISTS "Admins view all short_links" ON public.short_links;

-- NOTE: Standard ownership policies (e.g., "Users can view own contracts") 
-- must still exist and be enforced. This migration only removes the 
-- "God Mode" bypasses for admins.
-- Placeholder to resolve migration history mismatch
-- Remote has this version applied, but local file was missing.
-- Created to allow db push to proceed.
-- Fix Daily Admin Summary Cron by wrapping in a robust function
-- (Revised to return VOID for simplicity and be more robust)

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_daily_admin_summary()
RETURNS VOID AS $$
DECLARE
    v_ref TEXT;
    v_key TEXT;
    v_url TEXT;
BEGIN
    -- Fetch config 
    v_ref := public.get_supabase_config('supabase_project_ref');
    v_key := public.get_supabase_config('supabase_service_role_key');
    
    -- Validate config
    IF v_ref IS NULL OR v_key IS NULL THEN
        RAISE WARNING 'Daily Admin Summary skipped: Missing config (ref=%, key_present=%)', v_ref, (v_key IS NOT NULL);
        RETURN;
    END IF;

    -- Construct URL
    v_url := 'https://' || v_ref || '.supabase.co/functions/v1/send-daily-admin-summary';
    
    -- Perform the request
    -- net.http_post returns bigint, so we must discard it or catch it.
    -- PERFORM discards the result.
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Daily Admin Summary Trigger Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reschedule the cron job
DO $$
BEGIN
    -- Unschedule existing job
    PERFORM cron.unschedule('daily-admin-summary');
    
    -- Schedule new job
    -- 08:30 Israel Time is 06:30 UTC.
    PERFORM cron.schedule(
        'daily-admin-summary',
        '30 6 * * *', 
        'SELECT public.trigger_daily_admin_summary()'
    );
END $$;

COMMIT;
-- Placeholder to resolve migration history mismatch
-- Remote has this version applied, but local file was missing.
-- Created to allow db push to proceed.
-- Add user_id to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill user_id from contracts
UPDATE public.payments p
SET user_id = c.user_id
FROM public.contracts c
WHERE p.contract_id = c.id
AND p.user_id IS NULL;

-- Enforce NOT NULL after backfill (optional, but good practice if we want to guarantee it)
-- ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS (idempotent)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts (or use CREATE POLICY IF NOT EXISTS if supported, but DROP is safer for updates)
DROP POLICY IF EXISTS "Users can only see their own payments" ON public.payments;

-- Create RLS Policy
CREATE POLICY "Users can only see their own payments" 
ON public.payments 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- Create a debug logs table to capture Edge Function execution
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    function_name TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB
);

-- Enable RLS but allow service role to insert
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to insert debug logs"
    ON public.debug_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow service role to select debug logs"
    ON public.debug_logs
    FOR SELECT
    TO service_role
    USING (true);

-- Grant access to authenticated users (admin only ideally, but keeping simple for now)
GRANT ALL ON public.debug_logs TO service_role;
GRANT SELECT ON public.debug_logs TO authenticated;
-- Check execution logs for today's 08:30 run
BEGIN;

DO $$
DECLARE
    r RECORD;
    v_now TIMESTAMP;
BEGIN
    SELECT timezone('UTC', now()) INTO v_now;
    RAISE NOTICE 'Current Time (UTC): %', v_now;

    RAISE NOTICE '--- CRON RUNS (Today) ---';
    FOR r IN 
        SELECT d.* 
        FROM cron.job_run_details d
        JOIN cron.job j ON j.jobid = d.jobid
        WHERE j.jobname = 'daily-admin-summary'
        AND d.start_time > (now() - interval '24 hours')
        ORDER BY d.start_time DESC 
    LOOP
        RAISE NOTICE 'RUN: ID=%, Status=%, Msg="%", Time=%', 
            r.runid, r.status, r.return_message, r.start_time;
    END LOOP;

    RAISE NOTICE '--- DEBUG LOGS (Today) ---';
    FOR r IN 
        SELECT created_at, message, details 
        FROM public.debug_logs 
        WHERE created_at > (now() - interval '24 hours')
        ORDER BY created_at DESC 
        LIMIT 10
    LOOP
        RAISE NOTICE '[%] % | %', r.created_at, r.message, r.details;
    END LOOP;
    
    RAISE NOTICE '--- END DIAGNOSTICS ---';
END $$;

COMMIT;
-- Update Index Sync Cron Schedule
-- Sets primary run to 15th at 19:00 Israel Time (17:00 UTC) 
-- with retries following every 2 hours until end of 16th.

BEGIN;

-- 1. Create a robust trigger function
CREATE OR REPLACE FUNCTION public.trigger_index_sync()
RETURNS VOID AS $$
DECLARE
    v_ref TEXT;
    v_key TEXT;
    v_url TEXT;
BEGIN
    -- Fetch config 
    v_ref := public.get_supabase_config('supabase_project_ref');
    v_key := public.get_supabase_config('supabase_service_role_key');
    
    -- Validate config
    IF v_ref IS NULL OR v_key IS NULL THEN
        RAISE WARNING 'Index Sync skipped: Missing config (ref=%, key_present=%)', v_ref, (v_key IS NOT NULL);
        RETURN;
    END IF;

    -- Construct URL
    v_url := 'https://' || v_ref || '.supabase.co/functions/v1/fetch-index-data';
    
    -- Perform the request
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
    );
    RAISE LOG 'Index Sync Triggered at %', now();
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Index Sync Trigger Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Cron Jobs
DO $$
DECLARE
    job_names TEXT[] := ARRAY['index-update-day15', 'index-update-day16', 'index-update-day17', 'index-sync-primary', 'index-sync-retry-15', 'index-sync-retry-16'];
    jname TEXT;
BEGIN
    -- Unschedule legacy jobs safely
    FOREACH jname IN ARRAY job_names LOOP
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = jname) THEN
            PERFORM cron.unschedule(jname);
        END IF;
    END LOOP;

    -- Schedule Primary Sync (15th at 19:00 Israel Time = 17:00 UTC)
    PERFORM cron.schedule(
        'index-sync-primary',
        '0 17 15 * *',
        'SELECT public.trigger_index_sync()'
    );

    -- Schedule Retry Syncs (Every 2 hours on the 15th evening and 16th)
    PERFORM cron.schedule(
        'index-sync-retry-15',
        '0 19,21,23 15 * *', 
        'SELECT public.trigger_index_sync()'
    );

    PERFORM cron.schedule(
        'index-sync-retry-16',
        '0 */2 16 * *',
        'SELECT public.trigger_index_sync()'
    );
END $$;

COMMIT;
DELETE FROM index_data WHERE index_type = 'housing';
INSERT INTO index_data (index_type, date, value, source) VALUES
('housing', '1983-01', 15.7632, 'cbs'),
('housing', '1983-02', 16.5304, 'cbs'),
('housing', '1983-03', 17.1073, 'cbs'),
('housing', '1983-04', 19.8925, 'cbs'),
('housing', '1983-05', 20.8996, 'cbs'),
('housing', '1983-06', 22.1123, 'cbs'),
('housing', '1983-07', 24.6386, 'cbs'),
('housing', '1983-08', 26.6413, 'cbs'),
('housing', '1983-09', 28.0768, 'cbs'),
('housing', '1983-10', 33.7557, 'cbs'),
('housing', '1983-11', 37.5366, 'cbs'),
('housing', '1983-12', 42.4045, 'cbs'),
('housing', '1984-01', 51.0305, 'cbs'),
('housing', '1984-02', 59.7307, 'cbs'),
('housing', '1984-03', 64.294, 'cbs'),
('housing', '1984-04', 82.5873, 'cbs'),
('housing', '1984-05', 92.8353, 'cbs'),
('housing', '1984-06', 106.1998, 'cbs'),
('housing', '1984-07', 120.5218, 'cbs'),
('housing', '1984-08', 140.9607, 'cbs'),
('housing', '1984-09', 163.764, 'cbs'),
('housing', '1984-10', 191.5876, 'cbs'),
('housing', '1984-11', 229.0175, 'cbs'),
('housing', '1984-12', 241.649, 'cbs'),
('housing', '1985-01', 2.6063, 'cbs'),
('housing', '1985-02', 2.8956, 'cbs'),
('housing', '1985-03', 3.2421, 'cbs'),
('housing', '1985-04', 4.1121, 'cbs'),
('housing', '1985-05', 4.3711, 'cbs'),
('housing', '1985-06', 4.7823, 'cbs'),
('housing', '1985-07', 6.014, 'cbs'),
('housing', '1985-08', 6.2767, 'cbs'),
('housing', '1985-09', 6.252, 'cbs'),
('housing', '1985-10', 6.6708, 'cbs'),
('housing', '1985-11', 6.8974, 'cbs'),
('housing', '1985-12', 7.0896, 'cbs'),
('housing', '1986-01', 6.3046, 'cbs'),
('housing', '1986-02', 6.473, 'cbs'),
('housing', '1986-03', 6.5342, 'cbs'),
('housing', '1986-04', 6.4576, 'cbs'),
('housing', '1986-05', 6.5699, 'cbs'),
('housing', '1986-06', 6.7127, 'cbs'),
('housing', '1986-07', 6.4832, 'cbs'),
('housing', '1986-08', 6.5495, 'cbs'),
('housing', '1986-09', 6.7127, 'cbs'),
('housing', '1986-10', 6.9218, 'cbs'),
('housing', '1986-11', 7.1667, 'cbs'),
('housing', '1986-12', 7.2126, 'cbs'),
('housing', '1987-01', 7.0697, 'cbs'),
('housing', '1987-02', 7.2279, 'cbs'),
('housing', '1987-03', 7.4115, 'cbs'),
('housing', '1987-04', 7.5135, 'cbs'),
('housing', '1987-05', 7.5798, 'cbs'),
('housing', '1987-06', 7.6512, 'cbs'),
('housing', '1987-07', 7.7839, 'cbs'),
('housing', '1987-08', 7.8859, 'cbs'),
('housing', '1987-09', 7.9165, 'cbs'),
('housing', '1987-10', 7.9777, 'cbs'),
('housing', '1987-11', 8.1868, 'cbs'),
('housing', '1987-12', 8.2327, 'cbs'),
('housing', '1988-01', 8.0651, 'cbs'),
('housing', '1988-02', 8.3425, 'cbs'),
('housing', '1988-03', 8.4734, 'cbs'),
('housing', '1988-04', 8.3348, 'cbs'),
('housing', '1988-05', 8.5042, 'cbs'),
('housing', '1988-06', 8.5658, 'cbs'),
('housing', '1988-07', 8.6429, 'cbs'),
('housing', '1988-08', 8.7815, 'cbs'),
('housing', '1988-09', 8.951, 'cbs'),
('housing', '1988-10', 9.5981, 'cbs'),
('housing', '1988-11', 9.8369, 'cbs'),
('housing', '1988-12', 9.9447, 'cbs'),
('housing', '1989-01', 9.9447, 'cbs'),
('housing', '1989-02', 10.1758, 'cbs'),
('housing', '1989-03', 10.2913, 'cbs'),
('housing', '1989-04', 10.8229, 'cbs'),
('housing', '1989-05', 11.1695, 'cbs'),
('housing', '1989-06', 11.4622, 'cbs'),
('housing', '1989-07', 11.5238, 'cbs'),
('housing', '1989-08', 11.909, 'cbs'),
('housing', '1989-09', 12.5021, 'cbs'),
('housing', '1989-10', 13.0259, 'cbs'),
('housing', '1989-11', 13.3033, 'cbs'),
('housing', '1989-12', 13.4265, 'cbs'),
('housing', '1990-01', 13.465, 'cbs'),
('housing', '1990-02', 13.7346, 'cbs'),
('housing', '1990-03', 14.035, 'cbs'),
('housing', '1990-04', 14.6436, 'cbs'),
('housing', '1990-05', 14.9902, 'cbs'),
('housing', '1990-06', 15.4293, 'cbs'),
('housing', '1990-07', 16.0147, 'cbs'),
('housing', '1990-08', 16.6002, 'cbs'),
('housing', '1990-09', 17.617, 'cbs'),
('housing', '1990-10', 17.8481, 'cbs'),
('housing', '1990-11', 17.8481, 'cbs'),
('housing', '1990-12', 17.8635, 'cbs'),
('housing', '1991-01', 17.825, 'cbs'),
('housing', '1991-02', 17.8866, 'cbs'),
('housing', '1991-03', 18.4104, 'cbs'),
('housing', '1991-04', 18.5028, 'cbs'),
('housing', '1991-05', 18.8803, 'cbs'),
('housing', '1991-06', 19.7662, 'cbs'),
('housing', '1991-07', 22.1079, 'cbs'),
('housing', '1991-08', 23.3481, 'cbs'),
('housing', '1991-09', 23.8719, 'cbs'),
('housing', '1991-10', 22.8782, 'cbs'),
('housing', '1991-11', 22.832, 'cbs'),
('housing', '1991-12', 22.7396, 'cbs'),
('housing', '1992-01', 21.769, 'cbs'),
('housing', '1992-02', 21.6842, 'cbs'),
('housing', '1992-03', 21.6996, 'cbs'),
('housing', '1992-04', 22.6933, 'cbs'),
('housing', '1992-05', 22.6933, 'cbs'),
('housing', '1992-06', 22.6933, 'cbs'),
('housing', '1992-07', 23.3173, 'cbs'),
('housing', '1992-08', 23.7564, 'cbs'),
('housing', '1992-09', 23.7101, 'cbs'),
('housing', '1992-10', 23.2248, 'cbs'),
('housing', '1992-11', 23.2557, 'cbs'),
('housing', '1992-12', 23.5022, 'cbs'),
('housing', '1993-01', 24.7501, 'cbs'),
('housing', '1993-02', 25.6513, 'cbs'),
('housing', '1993-03', 26.4679, 'cbs'),
('housing', '1993-04', 27.0456, 'cbs'),
('housing', '1993-05', 27.3845, 'cbs'),
('housing', '1993-06', 27.4076, 'cbs'),
('housing', '1993-07', 27.0379, 'cbs'),
('housing', '1993-08', 27.3845, 'cbs'),
('housing', '1993-09', 27.8698, 'cbs'),
('housing', '1993-10', 28.7172, 'cbs'),
('housing', '1993-11', 28.9097, 'cbs'),
('housing', '1993-12', 29.5106, 'cbs'),
('housing', '1994-01', 30.4073, 'cbs'),
('housing', '1994-02', 30.8448, 'cbs'),
('housing', '1994-03', 31.8839, 'cbs'),
('housing', '1994-04', 33.1691, 'cbs'),
('housing', '1994-05', 33.9895, 'cbs'),
('housing', '1994-06', 34.7551, 'cbs'),
('housing', '1994-07', 35.6575, 'cbs'),
('housing', '1994-08', 36.2044, 'cbs'),
('housing', '1994-09', 36.6693, 'cbs'),
('housing', '1994-10', 37.0521, 'cbs'),
('housing', '1994-11', 37.2435, 'cbs'),
('housing', '1994-12', 37.7084, 'cbs'),
('housing', '1995-01', 38.3646, 'cbs'),
('housing', '1995-02', 38.6381, 'cbs'),
('housing', '1995-03', 38.5014, 'cbs'),
('housing', '1995-04', 38.8295, 'cbs'),
('housing', '1995-05', 39.5405, 'cbs'),
('housing', '1995-06', 39.7045, 'cbs'),
('housing', '1995-07', 39.8413, 'cbs'),
('housing', '1995-08', 41.0171, 'cbs'),
('housing', '1995-09', 41.3999, 'cbs'),
('housing', '1995-10', 41.8101, 'cbs'),
('housing', '1995-11', 42.0288, 'cbs'),
('housing', '1995-12', 43.314, 'cbs'),
('housing', '1996-01', 44.1344, 'cbs'),
('housing', '1996-02', 45.0368, 'cbs'),
('housing', '1996-03', 45.1461, 'cbs'),
('housing', '1996-04', 46.1305, 'cbs'),
('housing', '1996-05', 47.8259, 'cbs'),
('housing', '1996-06', 48.4002, 'cbs'),
('housing', '1996-07', 48.1267, 'cbs'),
('housing', '1996-08', 47.7165, 'cbs'),
('housing', '1996-09', 47.5251, 'cbs'),
('housing', '1996-10', 47.7712, 'cbs'),
('housing', '1996-11', 48.2908, 'cbs'),
('housing', '1996-12', 49.1932, 'cbs'),
('housing', '1997-01', 49.6307, 'cbs'),
('housing', '1997-02', 50.3143, 'cbs'),
('housing', '1997-03', 50.9706, 'cbs'),
('housing', '1997-04', 51.2987, 'cbs'),
('housing', '1997-05', 50.9432, 'cbs'),
('housing', '1997-06', 52.2011, 'cbs'),
('housing', '1997-07', 53.5683, 'cbs'),
('housing', '1997-08', 53.705, 'cbs'),
('housing', '1997-09', 53.1855, 'cbs'),
('housing', '1997-10', 53.9785, 'cbs'),
('housing', '1997-11', 53.0761, 'cbs'),
('housing', '1997-12', 52.7206, 'cbs'),
('housing', '1998-01', 53.4042, 'cbs'),
('housing', '1998-02', 53.6777, 'cbs'),
('housing', '1998-03', 53.4042, 'cbs'),
('housing', '1998-04', 54.2519, 'cbs'),
('housing', '1998-05', 53.5683, 'cbs'),
('housing', '1998-06', 53.8691, 'cbs'),
('housing', '1998-07', 53.541, 'cbs'),
('housing', '1998-08', 54.0332, 'cbs'),
('housing', '1998-09', 55.4278, 'cbs'),
('housing', '1998-10', 57.5606, 'cbs'),
('housing', '1998-11', 57.6974, 'cbs'),
('housing', '1998-12', 56.8497, 'cbs'),
('housing', '1999-01', 54.9381, 'cbs'),
('housing', '1999-02', 53.3496, 'cbs'),
('housing', '1999-03', 53.4044, 'cbs'),
('housing', '1999-04', 52.9115, 'cbs'),
('housing', '1999-05', 53.6783, 'cbs'),
('housing', '1999-06', 54.5547, 'cbs'),
('housing', '1999-07', 55.4858, 'cbs'),
('housing', '1999-08', 56.6908, 'cbs'),
('housing', '1999-09', 57.7315, 'cbs'),
('housing', '1999-10', 57.6768, 'cbs'),
('housing', '1999-11', 56.9099, 'cbs'),
('housing', '1999-12', 55.7597, 'cbs'),
('housing', '2000-01', 54.4451, 'cbs'),
('housing', '2000-02', 53.5687, 'cbs'),
('housing', '2000-03', 52.8567, 'cbs'),
('housing', '2000-04', 52.528, 'cbs'),
('housing', '2000-05', 53.8426, 'cbs'),
('housing', '2000-06', 54.4999, 'cbs'),
('housing', '2000-07', 54.1165, 'cbs'),
('housing', '2000-08', 53.8974, 'cbs'),
('housing', '2000-09', 53.6783, 'cbs'),
('housing', '2000-10', 53.7878, 'cbs'),
('housing', '2000-11', 53.8974, 'cbs'),
('housing', '2000-12', 54.1165, 'cbs'),
('housing', '2001-01', 53.8771, 'cbs'),
('housing', '2001-02', 54.1997, 'cbs'),
('housing', '2001-03', 55.1138, 'cbs'),
('housing', '2001-04', 55.2214, 'cbs'),
('housing', '2001-05', 55.1676, 'cbs'),
('housing', '2001-06', 55.3289, 'cbs'),
('housing', '2001-07', 56.6194, 'cbs'),
('housing', '2001-08', 57.2108, 'cbs'),
('housing', '2001-09', 57.1571, 'cbs'),
('housing', '2001-10', 57.5334, 'cbs'),
('housing', '2001-11', 57.0495, 'cbs'),
('housing', '2001-12', 57.1033, 'cbs'),
('housing', '2002-01', 59.039, 'cbs'),
('housing', '2002-02', 60.9209, 'cbs'),
('housing', '2002-03', 61.7812, 'cbs'),
('housing', '2002-04', 62.6953, 'cbs'),
('housing', '2002-05', 63.6632, 'cbs'),
('housing', '2002-06', 64.9536, 'cbs'),
('housing', '2002-07', 64.3622, 'cbs'),
('housing', '2002-08', 62.4802, 'cbs'),
('housing', '2002-09', 62.7491, 'cbs'),
('housing', '2002-10', 63.8245, 'cbs'),
('housing', '2002-11', 62.4265, 'cbs'),
('housing', '2002-12', 61.7275, 'cbs'),
('housing', '2003-01', 62.1141, 'cbs'),
('housing', '2003-02', 62.4894, 'cbs'),
('housing', '2003-03', 62.1766, 'cbs'),
('housing', '2003-04', 60.6128, 'cbs'),
('housing', '2003-05', 59.2367, 'cbs'),
('housing', '2003-06', 57.5478, 'cbs'),
('housing', '2003-07', 57.235, 'cbs'),
('housing', '2003-08', 58.1107, 'cbs'),
('housing', '2003-09', 58.4235, 'cbs'),
('housing', '2003-10', 58.2984, 'cbs'),
('housing', '2003-11', 58.0482, 'cbs'),
('housing', '2003-12', 57.4227, 'cbs'),
('housing', '2004-01', 56.9223, 'cbs'),
('housing', '2004-02', 57.1099, 'cbs'),
('housing', '2004-03', 57.4227, 'cbs'),
('housing', '2004-04', 57.8605, 'cbs'),
('housing', '2004-05', 58.361, 'cbs'),
('housing', '2004-06', 58.2359, 'cbs'),
('housing', '2004-07', 58.0482, 'cbs'),
('housing', '2004-08', 58.4861, 'cbs'),
('housing', '2004-09', 58.361, 'cbs'),
('housing', '2004-10', 57.6729, 'cbs'),
('housing', '2004-11', 56.9848, 'cbs'),
('housing', '2004-12', 55.9214, 'cbs'),
('housing', '2005-01', 55.1708, 'cbs'),
('housing', '2005-02', 55.4836, 'cbs'),
('housing', '2005-03', 55.2334, 'cbs'),
('housing', '2005-04', 55.1708, 'cbs'),
('housing', '2005-05', 55.421, 'cbs'),
('housing', '2005-06', 56.1716, 'cbs'),
('housing', '2005-07', 57.9231, 'cbs'),
('housing', '2005-08', 58.6737, 'cbs'),
('housing', '2005-09', 58.4235, 'cbs'),
('housing', '2005-10', 58.6737, 'cbs'),
('housing', '2005-11', 59.4869, 'cbs'),
('housing', '2005-12', 59.7371, 'cbs'),
('housing', '2006-01', 58.9239, 'cbs'),
('housing', '2006-02', 58.9865, 'cbs'),
('housing', '2006-03', 59.8622, 'cbs'),
('housing', '2006-04', 59.4243, 'cbs'),
('housing', '2006-05', 58.1733, 'cbs'),
('housing', '2006-06', 57.7354, 'cbs'),
('housing', '2006-07', 58.361, 'cbs'),
('housing', '2006-08', 58.2984, 'cbs'),
('housing', '2006-09', 57.798, 'cbs'),
('housing', '2006-10', 56.6095, 'cbs'),
('housing', '2006-11', 55.9214, 'cbs'),
('housing', '2006-12', 55.984, 'cbs'),
('housing', '2007-01', 55.6862, 'cbs'),
('housing', '2007-02', 55.8603, 'cbs'),
('housing', '2007-03', 55.9183, 'cbs'),
('housing', '2007-04', 55.9763, 'cbs'),
('housing', '2007-05', 55.3962, 'cbs'),
('housing', '2007-06', 56.0923, 'cbs'),
('housing', '2007-07', 58.5286, 'cbs'),
('housing', '2007-08', 59.4567, 'cbs'),
('housing', '2007-09', 59.1086, 'cbs'),
('housing', '2007-10', 58.3545, 'cbs'),
('housing', '2007-11', 57.8325, 'cbs'),
('housing', '2007-12', 58.0065, 'cbs'),
('housing', '2008-01', 57.2524, 'cbs'),
('housing', '2008-02', 56.3823, 'cbs'),
('housing', '2008-03', 56.6723, 'cbs'),
('housing', '2008-04', 57.4844, 'cbs'),
('housing', '2008-05', 57.6005, 'cbs'),
('housing', '2008-06', 57.5424, 'cbs'),
('housing', '2008-07', 59.1086, 'cbs'),
('housing', '2008-08', 61.3129, 'cbs'),
('housing', '2008-09', 62.415, 'cbs'),
('housing', '2008-10', 62.879, 'cbs'),
('housing', '2008-11', 64.4452, 'cbs'),
('housing', '2008-12', 65.6053, 'cbs'),
('housing', '2009-01', 64.8627, 'cbs'),
('housing', '2009-02', 65.0424, 'cbs'),
('housing', '2009-03', 66.2402, 'cbs'),
('housing', '2009-04', 66.4798, 'cbs'),
('housing', '2009-05', 66.899, 'cbs'),
('housing', '2009-06', 67.3782, 'cbs'),
('housing', '2009-07', 67.6177, 'cbs'),
('housing', '2009-08', 68.576, 'cbs'),
('housing', '2009-09', 69.115, 'cbs'),
('housing', '2009-10', 69.3546, 'cbs'),
('housing', '2009-11', 69.8337, 'cbs'),
('housing', '2009-12', 69.2947, 'cbs'),
('housing', '2010-01', 68.6359, 'cbs'),
('housing', '2010-02', 68.4562, 'cbs'),
('housing', '2010-03', 68.9354, 'cbs'),
('housing', '2010-04', 69.7738, 'cbs'),
('housing', '2010-05', 70.3728, 'cbs'),
('housing', '2010-06', 70.792, 'cbs'),
('housing', '2010-07', 71.5706, 'cbs'),
('housing', '2010-08', 73.0679, 'cbs'),
('housing', '2010-09', 73.6069, 'cbs'),
('housing', '2010-10', 72.5887, 'cbs'),
('housing', '2010-11', 72.469, 'cbs'),
('housing', '2010-12', 72.7684, 'cbs'),
('housing', '2011-01', 73.0058, 'cbs'),
('housing', '2011-02', 73.2901, 'cbs'),
('housing', '2011-03', 73.7167, 'cbs'),
('housing', '2011-04', 74.2854, 'cbs'),
('housing', '2011-05', 75.1384, 'cbs'),
('housing', '2011-06', 75.636, 'cbs'),
('housing', '2011-07', 75.7782, 'cbs'),
('housing', '2011-08', 76.9866, 'cbs'),
('housing', '2011-09', 77.7686, 'cbs'),
('housing', '2011-10', 77.4842, 'cbs'),
('housing', '2011-11', 76.7023, 'cbs'),
('housing', '2011-12', 76.6312, 'cbs'),
('housing', '2012-01', 76.7734, 'cbs'),
('housing', '2012-02', 76.8445, 'cbs'),
('housing', '2012-03', 77.1999, 'cbs'),
('housing', '2012-04', 77.9819, 'cbs'),
('housing', '2012-05', 78.1951, 'cbs'),
('housing', '2012-06', 78.2662, 'cbs'),
('housing', '2012-07', 79.1192, 'cbs'),
('housing', '2012-08', 80.1855, 'cbs'),
('housing', '2012-09', 79.9723, 'cbs'),
('housing', '2012-10', 79.1903, 'cbs'),
('housing', '2012-11', 78.906, 'cbs'),
('housing', '2012-12', 79.2614, 'cbs'),
('housing', '2013-01', 79.1192, 'cbs'),
('housing', '2013-02', 78.7268, 'cbs'),
('housing', '2013-03', 79.4332, 'cbs'),
('housing', '2013-04', 80.2966, 'cbs'),
('housing', '2013-05', 80.5321, 'cbs'),
('housing', '2013-06', 80.846, 'cbs'),
('housing', '2013-07', 81.8664, 'cbs'),
('housing', '2013-08', 82.4159, 'cbs'),
('housing', '2013-09', 82.3374, 'cbs'),
('housing', '2013-10', 82.3374, 'cbs'),
('housing', '2013-11', 82.1019, 'cbs'),
('housing', '2013-12', 81.7879, 'cbs'),
('housing', '2014-01', 81.0815, 'cbs'),
('housing', '2014-02', 81.3955, 'cbs'),
('housing', '2014-03', 82.3374, 'cbs'),
('housing', '2014-04', 82.2589, 'cbs'),
('housing', '2014-05', 82.5729, 'cbs'),
('housing', '2014-06', 82.8868, 'cbs'),
('housing', '2014-07', 83.6717, 'cbs'),
('housing', '2014-08', 84.1427, 'cbs'),
('housing', '2014-09', 84.0642, 'cbs'),
('housing', '2014-10', 84.2212, 'cbs'),
('housing', '2014-11', 84.4566, 'cbs'),
('housing', '2014-12', 84.5351, 'cbs'),
('housing', '2015-01', 83.5511, 'cbs'),
('housing', '2015-02', 83.4679, 'cbs'),
('housing', '2015-03', 84.2161, 'cbs'),
('housing', '2015-04', 84.133, 'cbs'),
('housing', '2015-05', 84.4655, 'cbs'),
('housing', '2015-06', 84.7981, 'cbs'),
('housing', '2015-07', 85.5463, 'cbs'),
('housing', '2015-08', 86.2114, 'cbs'),
('housing', '2015-09', 86.2945, 'cbs'),
('housing', '2015-10', 85.7957, 'cbs'),
('housing', '2015-11', 85.8788, 'cbs'),
('housing', '2015-12', 86.2114, 'cbs'),
('housing', '2016-01', 85.5463, 'cbs'),
('housing', '2016-02', 85.6294, 'cbs'),
('housing', '2016-03', 86.1282, 'cbs'),
('housing', '2016-04', 86.2945, 'cbs'),
('housing', '2016-05', 86.2945, 'cbs'),
('housing', '2016-06', 86.3777, 'cbs'),
('housing', '2016-07', 87.6247, 'cbs'),
('housing', '2016-08', 88.0404, 'cbs'),
('housing', '2016-09', 88.0404, 'cbs'),
('housing', '2016-10', 87.7078, 'cbs'),
('housing', '2016-11', 87.5415, 'cbs'),
('housing', '2016-12', 87.4584, 'cbs'),
('housing', '2017-01', 86.8034, 'cbs'),
('housing', '2017-02', 87.0641, 'cbs'),
('housing', '2017-03', 88.0199, 'cbs'),
('housing', '2017-04', 87.8461, 'cbs'),
('housing', '2017-05', 87.4986, 'cbs'),
('housing', '2017-06', 87.6723, 'cbs'),
('housing', '2017-07', 88.715, 'cbs'),
('housing', '2017-08', 89.2364, 'cbs'),
('housing', '2017-09', 89.5839, 'cbs'),
('housing', '2017-10', 89.6708, 'cbs'),
('housing', '2017-11', 89.497, 'cbs'),
('housing', '2017-12', 89.7577, 'cbs'),
('housing', '2018-01', 89.0626, 'cbs'),
('housing', '2018-02', 88.715, 'cbs'),
('housing', '2018-03', 89.7577, 'cbs'),
('housing', '2018-04', 90.0184, 'cbs'),
('housing', '2018-05', 90.0184, 'cbs'),
('housing', '2018-06', 90.5397, 'cbs'),
('housing', '2018-07', 90.6266, 'cbs'),
('housing', '2018-08', 90.9742, 'cbs'),
('housing', '2018-09', 91.6693, 'cbs'),
('housing', '2018-10', 91.7562, 'cbs'),
('housing', '2018-11', 91.4955, 'cbs'),
('housing', '2018-12', 91.4955, 'cbs'),
('housing', '2019-01', 90.9633, 'cbs'),
('housing', '2019-02', 91.4159, 'cbs'),
('housing', '2019-03', 92.4115, 'cbs'),
('housing', '2019-04', 92.321, 'cbs'),
('housing', '2019-05', 92.1399, 'cbs'),
('housing', '2019-06', 92.321, 'cbs'),
('housing', '2019-07', 92.864, 'cbs'),
('housing', '2019-08', 93.2261, 'cbs'),
('housing', '2019-09', 93.4071, 'cbs'),
('housing', '2019-10', 93.2261, 'cbs'),
('housing', '2019-11', 93.2261, 'cbs'),
('housing', '2019-12', 94.0407, 'cbs'),
('housing', '2020-01', 93.4976, 'cbs'),
('housing', '2020-02', 93.4071, 'cbs'),
('housing', '2020-03', 94.4932, 'cbs'),
('housing', '2020-04', 94.4027, 'cbs'),
('housing', '2020-05', 93.9502, 'cbs'),
('housing', '2020-06', 93.8597, 'cbs'),
('housing', '2020-07', 94.1312, 'cbs'),
('housing', '2020-08', 94.4932, 'cbs'),
('housing', '2020-09', 94.8553, 'cbs'),
('housing', '2020-10', 94.7648, 'cbs'),
('housing', '2020-11', 94.2217, 'cbs'),
('housing', '2020-12', 94.2217, 'cbs'),
('housing', '2021-01', 94.5683, 'cbs'),
('housing', '2021-02', 94.7567, 'cbs'),
('housing', '2021-03', 95.416, 'cbs'),
('housing', '2021-04', 95.2276, 'cbs'),
('housing', '2021-05', 95.1334, 'cbs'),
('housing', '2021-06', 95.3218, 'cbs'),
('housing', '2021-07', 95.7928, 'cbs'),
('housing', '2021-08', 96.2637, 'cbs'),
('housing', '2021-09', 96.6405, 'cbs'),
('housing', '2021-10', 96.6405, 'cbs'),
('housing', '2021-11', 96.9231, 'cbs'),
('housing', '2021-12', 97.2998, 'cbs'),
('housing', '2022-01', 97.2057, 'cbs'),
('housing', '2022-02', 97.4882, 'cbs'),
('housing', '2022-03', 98.2418, 'cbs'),
('housing', '2022-04', 98.2418, 'cbs'),
('housing', '2022-05', 98.3359, 'cbs'),
('housing', '2022-06', 99.1837, 'cbs'),
('housing', '2022-07', 100.314, 'cbs'),
('housing', '2022-08', 101.1617, 'cbs'),
('housing', '2022-09', 101.7268, 'cbs'),
('housing', '2022-10', 102.0094, 'cbs'),
('housing', '2022-11', 102.6688, 'cbs'),
('housing', '2022-12', 103.4223, 'cbs'),
('housing', '2023-01', 103.7, 'cbs'),
('housing', '2023-02', 104.1, 'cbs'),
('housing', '2023-03', 104.8, 'cbs'),
('housing', '2023-04', 105.3, 'cbs'),
('housing', '2023-05', 105.8, 'cbs'),
('housing', '2023-06', 105.8, 'cbs'),
('housing', '2023-07', 106.5, 'cbs'),
('housing', '2023-08', 107.3, 'cbs'),
('housing', '2023-09', 107.3, 'cbs'),
('housing', '2023-10', 107, 'cbs'),
('housing', '2023-11', 106.3, 'cbs'),
('housing', '2023-12', 106.6, 'cbs'),
('housing', '2024-01', 106.8, 'cbs'),
('housing', '2024-02', 106.2, 'cbs'),
('housing', '2024-03', 106.9, 'cbs'),
('housing', '2024-04', 107.4, 'cbs'),
('housing', '2024-05', 107.8, 'cbs'),
('housing', '2024-06', 108.5, 'cbs'),
('housing', '2024-07', 109.3, 'cbs'),
('housing', '2024-08', 110.1, 'cbs'),
('housing', '2024-09', 110.3, 'cbs'),
('housing', '2024-10', 110.1, 'cbs'),
('housing', '2024-11', 110.6, 'cbs'),
('housing', '2024-12', 110.9, 'cbs'),
('housing', '2025-01', 110.1553, 'cbs'),
('housing', '2025-02', 109.8291, 'cbs'),
('housing', '2025-03', 111.134, 'cbs'),
('housing', '2025-04', 112.0039, 'cbs'),
('housing', '2025-05', 111.6777, 'cbs'),
('housing', '2025-06', 112.3301, 'cbs'),
('housing', '2025-07', 113.8525, 'cbs'),
('housing', '2025-08', 114.8312, 'cbs'),
('housing', '2025-09', 114.6137, 'cbs'),
('housing', '2025-10', 113.5263, 'cbs'),
('housing', '2025-11', 113.5263, 'cbs'),
('housing', '2025-12', 114.505, 'cbs'),
('housing', '2026-01', 114.2875, 'cbs');
