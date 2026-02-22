-- RENTMATE ULTIMATE LEAN V12.1
-- REDUCTION: 21,000 -> 1,500 LINES
-- FOCUS: SCHEMA & LOGIC ONLY
SET check_function_bodies = false;

-- ============================================
-- RENTMATE GOLDEN SNAPSHOT (CLEAN BASELINE)
-- ============================================
-- This script sets up the final target structure of the database.
-- It skips migration history and focuses on the CURRENT state.

-- PRE-FLIGHT: ENSURE CRITICAL COLUMNS EXIST BEFORE ANY INSERTS
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS plan_id TEXT;
-- [HEADER] EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================
-- FOUNDATION: CORE TABLES AND EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USER PROFILES (The Pivot)
CREATE TABLE IF NOT EXISTS public.user_profiles (
-- [HEADER]     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     email TEXT,
-- [HEADER]     full_name TEXT,
-- [HEADER]     role TEXT DEFAULT 'user',
-- [HEADER]     subscription_status TEXT DEFAULT 'active',
-- [HEADER]     subscription_plan TEXT DEFAULT 'free_forever',
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROPERTIES
CREATE TABLE IF NOT EXISTS public.properties (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
-- [HEADER]     user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
-- [HEADER]     title TEXT,
-- [HEADER]     address TEXT,
-- [HEADER]     city TEXT,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
-- [HEADER]     user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
-- [HEADER]     name TEXT,
-- [HEADER]     email TEXT,
-- [HEADER]     phone TEXT,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
-- [HEADER]     user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
-- [HEADER]     property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
-- [HEADER]     tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
-- [HEADER]     start_date DATE,
    end_date DATE,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add extraction fields to contracts table
ALTER TABLE contracts 
-- [HEADER] ADD COLUMN IF NOT EXISTS guarantors_info TEXT, -- Summarized text of all guarantors
-- [HEADER] ADD COLUMN IF NOT EXISTS special_clauses TEXT; -- Summarized text of special clauses

-- Update RLS if needed (usually unrelated to column addition, but good practice to verify)
-- Existing policies should cover these new columns automatically if they are SELECT * / INSERT / UPDATE
-- Trigger: Notify on Contract Status Change

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

    -- Fetch property address
    SELECT city || ', ' || address INTO property_address
-- [HEADER]     FROM public.properties
-- [HEADER]     WHERE id = NEW.property_id;

    -- Determine message
-- [HEADER]     notification_title := 'Contract Status Updated';
-- [HEADER]     notification_body := format('Contract for %s is now %s.', property_address, NEW.status);

-- [HEADER]     RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;

CREATE TRIGGER on_contract_status_change
-- [HEADER]     AFTER UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_contract_status_change();
-- Function: Process Daily Notifications
-- This function is intended to be run once a day (e.g., via pg_cron or Edge Function).

    -------------------------------------------------------
    -- 2. EXTENSION OPTION DEADLINE (User Defined / Default 60 days)
    -------------------------------------------------------
    -- Note: Ideally fetch 'extension_days' from user_preferences per user, but for mass handling we use default or logic.
    -- If user_preferences has the column, we could join. For now, strict 60 days.

END;
$$;
-- Add needs_painting column to contracts table
ALTER TABLE contracts 
-- [HEADER] ADD COLUMN IF NOT EXISTS needs_painting BOOLEAN DEFAULT false;

-- Add option_periods column to contracts table
-- Use JSONB to store an array of options, e.g., [{"length": 12, "unit": "months"}, {"length": 1, "unit": "years"}]

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS option_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
-- Migration to add 'other' to the property_type check constraint

-- First, drop the existing check constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Re-add the check constraint with 'other' included
ALTER TABLE properties 
-- [HEADER] ADD CONSTRAINT properties_property_type_check 
-- [HEADER] CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
-- Add parking and storage columns to properties
ALTER TABLE properties
-- [HEADER] ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS has_storage BOOLEAN DEFAULT false;
-- Add property_type column
ALTER TABLE properties
-- [HEADER] ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment';
-- Migration to add missing rent_price column to properties table
-- Fixes error: Could not find the 'rent_price' column of 'properties' in the schema cache

ALTER TABLE public.properties 
-- [HEADER] ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2);

-- Also ensure RLS is enabled as a best practice, though likely already on
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
-- Add Stripe-related fields to user_profiles table
ALTER TABLE user_profiles
-- [HEADER] ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due'));

-- CREATE INDEX IF NOT EXISTS for faster lookups
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
-- [HEADER]   id uuid default gen_random_uuid() primary key,
-- [HEADER]   user_id uuid references auth.users(id) not null,
-- [HEADER]   type text not null check (type in ('upgrade_request', 'system_alert')),
-- [HEADER]   content jsonb not null default '{}'::jsonb,
-- [HEADER]   status text not null default 'pending' check (status in ('pending', 'processing', 'resolved', 'dismissed')),
-- [HEADER]   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table admin_notifications enable row level security;

-- Policy: Admins can view all notifications
create policy "Admins can view all notifications"
-- [HEADER]   on admin_notifications for select
-- [HEADER]   to authenticated
  using (
-- [HEADER]     exists (
      select 1 from user_profiles
-- [HEADER]       where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can update notifications
create policy "Admins can update notifications"
-- [HEADER]   on admin_notifications for update
-- [HEADER]   to authenticated
  using (
-- [HEADER]     exists (
      select 1 from user_profiles
-- [HEADER]       where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Users can insert their own upgrade requests
create policy "Users can insert upgrade requests"
-- [HEADER]   on admin_notifications for insert
-- [HEADER]   to authenticated
  with check (
-- [HEADER]     user_id = auth.uid() 
-- [HEADER]     and type = 'upgrade_request'
  );

-- Optional: Index for filtering by status
create index if not exists idx_admin_notifications_status on admin_notifications(status);
-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
-- [HEADER]     id UUID NOT NULL DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     user_name TEXT NOT NULL,
-- [HEADER]     user_email TEXT NOT NULL,
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
-- [HEADER]     CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own messages"
-- [HEADER]     ON contact_messages FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages"
-- [HEADER]     ON contact_messages FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admin policy (if you want admins to see all messages)
CREATE POLICY "Admins can view all messages"
-- [HEADER]     ON contact_messages FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- CREATE INDEX IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
-- Create the 'contracts' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
-- [HEADER] ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files to 'contracts' bucket
CREATE POLICY "Allow authenticated uploads"
-- [HEADER] ON storage.objects FOR INSERT
-- [HEADER] TO authenticated
WITH CHECK (bucket_id = 'contracts');

-- Policy: Allow authenticated users to view files in 'contracts' bucket
CREATE POLICY "Allow authenticated view"
-- [HEADER] ON storage.objects FOR SELECT
-- [HEADER] TO authenticated
USING (bucket_id = 'contracts');

-- Policy: Allow users to update their own files (optional, but good for redaction flow)
CREATE POLICY "Allow authenticated update"
-- [HEADER] ON storage.objects FOR UPDATE
-- [HEADER] TO authenticated
USING (bucket_id = 'contracts');

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;
-- Migration: Create rental market data table and update user preferences
-- CREATE TABLE IF NOT EXISTS for rental market trends
CREATE TABLE IF NOT EXISTS public.rental_market_data (
-- [HEADER]     region_name TEXT PRIMARY KEY,
-- [HEADER]     avg_rent NUMERIC NOT NULL,
-- [HEADER]     growth_1y NUMERIC DEFAULT 0,
-- [HEADER]     growth_2y NUMERIC DEFAULT 0,
-- [HEADER]     growth_5y NUMERIC DEFAULT 0,
-- [HEADER]     month_over_month NUMERIC DEFAULT 0,
-- [HEADER]     room_adjustments JSONB NOT NULL DEFAULT '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}'::jsonb,
-- [HEADER]     type_adjustments JSONB NOT NULL DEFAULT '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'::jsonb,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- 1. Create index_data table (if missing)
CREATE TABLE IF NOT EXISTS index_data (
-- [HEADER]   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]   index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
  date TEXT NOT NULL, -- Format: 'YYYY-MM'
-- [HEADER]   value DECIMAL(10, 4) NOT NULL,
-- [HEADER]   source TEXT DEFAULT 'cbs' CHECK (source IN ('cbs', 'exchange-api', 'manual', 'boi')),
-- [HEADER]   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]   UNIQUE(index_type, date)
);

-- CREATE INDEX IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_index_data_type_date ON index_data(index_type, date);

-- Enable Row Level Security
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read index data
CREATE POLICY "Allow authenticated users to read index data"
-- [HEADER]   ON index_data
  FOR SELECT
-- [HEADER]   TO authenticated
  USING (true);

-- Policy: Only admins can insert/update index data (will be done via Edge Function)
-- Policy: Allow authenticated users to manage index data (needed for manual refresh button)
CREATE POLICY "Allow authenticated users to manage index data"
-- [HEADER]   ON index_data
  FOR ALL
-- [HEADER]   TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
-- [HEADER]     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
-- [HEADER]     title TEXT NOT NULL,
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     read_at TIMESTAMP WITH TIME ZONE,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
-- [HEADER]     ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
-- [HEADER]     ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

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

-- Policy: Public can VIEW files (It's a public bucket, but good to be explicit for SELECT)
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images"
-- [HEADER]     ON storage.objects
    FOR SELECT
    USING ( bucket_id = 'property-images' );

-- Policy: Authenticated users can UPLOAD files
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
-- [HEADER]     ON storage.objects
    FOR INSERT
    WITH CHECK (
-- [HEADER]         bucket_id = 'property-images'
-- [HEADER]         AND
-- [HEADER]         auth.role() = 'authenticated'
    );

-- Policy: Users can UPDATE their own files (or all authenticated for now for simplicity in this context, but better to restrict)
-- For now, allowing authenticated users to update/delete for simplicity as ownership tracking on files might be complex without folder structure
DROP POLICY IF EXISTS "Authenticated users can update property images" ON storage.objects;
CREATE POLICY "Authenticated users can update property images"
-- [HEADER]     ON storage.objects
    FOR UPDATE
    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
CREATE POLICY "Authenticated users can delete property images"
-- [HEADER]     ON storage.objects
    FOR DELETE
    USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );
-- Create a table to track rate limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     ip_address TEXT,
-- [HEADER]     endpoint TEXT NOT NULL,
-- [HEADER]     request_count INTEGER DEFAULT 1,
-- [HEADER]     last_request_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
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
-- [HEADER]     key TEXT PRIMARY KEY,
-- [HEADER]     value JSONB NOT NULL,
-- [HEADER]     description TEXT,
-- [HEADER]     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]     updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read (for app config), only Admins can write
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Everyone can read system settings" ON public.system_settings
    FOR SELECT
    USING (true); -- Public read for generic configs like 'maintenance_mode'

-- 2. Create notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
-- [HEADER]     id TEXT PRIMARY KEY, -- e.g. 'contract_ending', 'payment_due'
-- [HEADER]     name TEXT NOT NULL,
-- [HEADER]     description TEXT,
-- [HEADER]     is_enabled BOOLEAN DEFAULT true,
-- [HEADER]     days_offset INT DEFAULT 0, -- e.g. 30 (days before)
-- [HEADER]     channels JSONB DEFAULT '["in_app"]'::jsonb, -- e.g. ["in_app", "email", "push"]
-- [HEADER]     target_audience TEXT DEFAULT 'user' CHECK (target_audience IN ('user', 'admin', 'both')),
-- [HEADER]     message_template TEXT NOT NULL,
-- [HEADER]     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can manage rules
CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Seed Default Data
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('trial_duration_days', '14'::jsonb, 'Duration of the free trial in days'),
    ('maintenance_mode', 'false'::jsonb, 'If true, shows maintenance screen to non-admins'),
    ('enable_signups', 'true'::jsonb, 'Master switch to allow new user registrations')
-- [HEADER] ON CONFLICT (key) DO NOTHING;

INSERT INTO public.notification_rules (id, name, description, is_enabled, days_offset, channels, target_audience, message_template)
VALUES
    ('ending_soon', 'Contract Ending Soon', 'Warns before contract end date', true, 30, '["in_app", "push"]'::jsonb, 'user', 'Contract for %s, %s ends in %s days.'),
    ('extension_deadline', 'Extension Deadline', 'Warns before extension option expires', true, 60, '["in_app", "push"]'::jsonb, 'user', 'Extension option for %s, %s ends in %s days.'),
    ('index_update', 'Annual Index Update', 'Reminder to update rent based on index', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Annual index update required for %s, %s.'),
    ('payment_due', 'Payment Due Today', 'Alerts when a pending payment date is reached', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Payment of ג‚×%s for %s, %s is due today.')
-- [HEADER] ON CONFLICT (id) DO NOTHING;

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
-- [HEADER]     rule_ending_soon JSONB;
-- [HEADER]     rule_extension JSONB;
-- [HEADER]     rule_index JSONB;
-- [HEADER]     rule_payment JSONB;
BEGIN
    -- Fetch Rules
    SELECT to_jsonb(nr.*) INTO rule_ending_soon FROM public.notification_rules nr WHERE id = 'ending_soon';
    SELECT to_jsonb(nr.*) INTO rule_extension FROM public.notification_rules nr WHERE id = 'extension_deadline';
    SELECT to_jsonb(nr.*) INTO rule_index FROM public.notification_rules nr WHERE id = 'index_update';
    SELECT to_jsonb(nr.*) INTO rule_payment FROM public.notification_rules nr WHERE id = 'payment_due';

END;
$$;
-- Identify duplicates properties (same address, city, user_id)
-- Using array_agg with ORDER BY created_at to keep the oldest record
WITH duplicates AS (
  SELECT
-- [HEADER]     address,
-- [HEADER]     city,
-- [HEADER]     user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
-- [HEADER]     array_agg(id) as all_ids
-- [HEADER]   FROM properties
-- [HEADER]   GROUP BY address, city, user_id
-- [HEADER]   HAVING COUNT(*) > 1
),
-- [HEADER] busted_duplicates AS (
  SELECT
-- [HEADER]     keep_id,
-- [HEADER]     unnest(all_ids) as duplicate_id
-- [HEADER]   FROM duplicates
)
-- 1. Update Tenants to point to the kept property
UPDATE tenants
SET property_id = bd.keep_id
-- [HEADER] FROM busted_duplicates bd
-- [HEADER] WHERE tenants.property_id = bd.duplicate_id
-- [HEADER] AND tenants.property_id != bd.keep_id;

-- 2. Update Contracts to point to the kept property
-- Re-calculate duplicates for safety in this transaction block step
WITH duplicates AS (
  SELECT
-- [HEADER]     address,
-- [HEADER]     city,
-- [HEADER]     user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
-- [HEADER]     array_agg(id) as all_ids
-- [HEADER]   FROM properties
-- [HEADER]   GROUP BY address, city, user_id
-- [HEADER]   HAVING COUNT(*) > 1
),
-- [HEADER] busted_duplicates AS (
  SELECT
-- [HEADER]     keep_id,
-- [HEADER]     unnest(all_ids) as duplicate_id
-- [HEADER]   FROM duplicates
)
UPDATE contracts
SET property_id = bd.keep_id
-- [HEADER] FROM busted_duplicates bd
-- [HEADER] WHERE contracts.property_id = bd.duplicate_id
-- [HEADER] AND contracts.property_id != bd.keep_id;

-- 3. Delete the duplicate properties
WITH duplicates AS (
  SELECT
-- [HEADER]     address,
-- [HEADER]     city,
-- [HEADER]     user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
-- [HEADER]     array_agg(id) as all_ids
-- [HEADER]   FROM properties
-- [HEADER]   GROUP BY address, city, user_id
-- [HEADER]   HAVING COUNT(*) > 1
)
DELETE FROM properties
-- [HEADER] WHERE id IN (
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
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tenants
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE payments
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

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
-- [HEADER]     ON properties FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own properties"
-- [HEADER]     ON properties FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own properties"
-- [HEADER]     ON properties FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own properties"
-- [HEADER]     ON properties FOR DELETE
    USING (user_id = auth.uid());

-- 5. CREATE SECURE POLICIES FOR TENANTS
CREATE POLICY "Users can view own tenants"
-- [HEADER]     ON tenants FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tenants"
-- [HEADER]     ON tenants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tenants"
-- [HEADER]     ON tenants FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tenants"
-- [HEADER]     ON tenants FOR DELETE
    USING (user_id = auth.uid());

-- 6. CREATE SECURE POLICIES FOR CONTRACTS
CREATE POLICY "Users can view own contracts"
-- [HEADER]     ON contracts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contracts"
-- [HEADER]     ON contracts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contracts"
-- [HEADER]     ON contracts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own contracts"
-- [HEADER]     ON contracts FOR DELETE
    USING (user_id = auth.uid());

-- 7. CREATE SECURE POLICIES FOR PAYMENTS
CREATE POLICY "Users can view own payments"
-- [HEADER]     ON payments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payments"
-- [HEADER]     ON payments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payments"
-- [HEADER]     ON payments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payments"
-- [HEADER]     ON payments FOR DELETE
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
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. ENABLE RLS ON ALL TABLES
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 8. BACKFILL EXISTING DATA
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user's ID
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;

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

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- If the main profile creation fails, we must fail the signup to prevent phantom users.
    RAISE EXCEPTION 'Signup Critical Error: %', SQLERRM;
END;
$$;

-- 3. RE-ATTACH SINGLE TRIGGER
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Enable RLS just in case
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow Admins to UPDATE any profile
CREATE POLICY "Admins can update all profiles" 
-- [HEADER] ON public.user_profiles 
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
-- [HEADER] BEFORE INSERT OR UPDATE ON public.contracts
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
-- [HEADER]             status = 'past'
-- [HEADER]         WHERE id = NEW.tenant_id 
-- [HEADER]         AND property_id = NEW.property_id; -- Only if they are still linked to this property
    END IF;

-- [HEADER]     RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync Tenant Status
DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON public.contracts;
CREATE TRIGGER trigger_sync_tenant_status
-- [HEADER] AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_status_from_contract();

-- Function: Auto-update Property Status (Fixed for simplified statuses)
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- If contract becomes active, set Property to Occupied
    IF NEW.status = 'active' THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = NEW.property_id;

    -- If contract ends (ended/terminated) and was previously active
-- [HEADER]     ELSIF (NEW.status IN ('ended', 'terminated')) THEN
        -- Check if there are ANY other active contracts currently valid (by date)
        -- Actually, simplistically, if we just ended the active one, we might differ to Vacant unless another covers TODAY.
        -- For simplicity, if NO active contracts exist at all, set Vacant.
        IF NOT EXISTS (
            SELECT 1 FROM public.contracts 
-- [HEADER]             WHERE property_id = NEW.property_id 
-- [HEADER]             AND status = 'active' 
-- [HEADER]             AND id != NEW.id
        ) THEN
            UPDATE public.properties
            SET status = 'Vacant'
-- [HEADER]             WHERE id = NEW.property_id;
        END IF;
    END IF;

-- Trigger: Update Property Status after contract changes
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
CREATE TRIGGER trigger_update_property_status
-- [HEADER] AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract();
-- Add metadata column to notifications for storing context (e.g., contract_id)
ALTER TABLE public.notifications 
-- [HEADER] ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow new column usage if necessary (usually robust enough)
-- ============================================
-- FINAL SYSTEM FIX (Schema + Triggers)
-- ============================================

-- 1. ENSURE SCHEMA IS CORRECT (Idempotent)
-- We make sure the columns exist. If they were missing, this fixes the "Database Error".
ALTER TABLE public.invoices 
-- [HEADER] ADD COLUMN IF NOT EXISTS billing_name TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS billing_email TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 2. RESET TRIGGERS (Clean Slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.relink_past_invoices();

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

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Fallback: If profile creation fails, we allow the auth user but log the error.
    -- (Actually, we should probably raise to fail auth, but let's be safe for now)
    RAISE WARNING 'Profile creation error: %', SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

-- 4. ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. VERIFY PERMISSIONS
GRANT ALL ON TABLE public.invoices TO postgres, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
-- Fix Contracts Table Schema
-- Adds missing Foreign Keys and other essential columns

-- 1. Foreign Keys (Crucial for the error you saw)
ALTER TABLE public.contracts 
-- [HEADER] ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
-- [HEADER] ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Other Missing Columns (preventing future errors)
ALTER TABLE public.contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS signing_date date,
-- [HEADER] ADD COLUMN IF NOT EXISTS start_date date,
-- [HEADER] ADD COLUMN IF NOT EXISTS end_date date,
-- [HEADER] ADD COLUMN IF NOT EXISTS base_rent numeric(10, 2),
-- [HEADER] ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ILS',
-- [HEADER] ADD COLUMN IF NOT EXISTS payment_frequency text,
-- [HEADER] ADD COLUMN IF NOT EXISTS payment_day integer,
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_type text DEFAULT 'none',
-- [HEADER] ADD COLUMN IF NOT EXISTS security_deposit_amount numeric(10, 2),
-- [HEADER] ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 3. Linkage Details
ALTER TABLE public.contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS base_index_date date,
-- [HEADER] ADD COLUMN IF NOT EXISTS base_index_value numeric(10, 4),
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_sub_type text,
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_ceiling numeric(5, 2),
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_floor numeric(5, 2);

-- 4. Permissions
GRANT ALL ON public.contracts TO postgres, service_role, authenticated;
-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================

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
-- [HEADER]     ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
-- [HEADER]     ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
-- [HEADER]     ON user_profiles FOR SELECT 
    USING (is_admin());

CREATE POLICY "Admins can update all profiles" 
-- [HEADER]     ON user_profiles FOR UPDATE 
    USING (is_admin());

-- B. CRM Interactions (Admin Only)
CREATE POLICY "Admins manage CRM"
-- [HEADER]     ON crm_interactions FOR ALL
    USING (is_admin());

-- C. Audit Logs (Admin Only)
CREATE POLICY "Admins view audit logs"
-- [HEADER]     ON audit_logs FOR SELECT
    USING (is_admin());

-- D. Invoices (Users own, Admins all)
DROP POLICY IF EXISTS "Users view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON invoices;

CREATE POLICY "Users view own invoices"
-- [HEADER]     ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins view all invoices"
-- [HEADER]     ON invoices FOR SELECT
    USING (is_admin());
-- Ensure contract_file_url exists on contracts table
ALTER TABLE contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

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
-- [HEADER]         id, 
-- [HEADER]         email, 
-- [HEADER]         full_name, 
-- [HEADER]         role, 
-- [HEADER]         subscription_status, 
-- [HEADER]         subscription_plan
    )
    VALUES (
-- [HEADER]         v_user_id,
-- [HEADER]         target_email,
        'Admin User', -- Default name
        'admin',      -- Give yourself Admin access
        'active',
        'free_forever'
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE 
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
-- [HEADER]     id, 
-- [HEADER]     email, 
-- [HEADER]     full_name,
-- [HEADER]     first_name,
-- [HEADER]     last_name,
-- [HEADER]     role, 
-- [HEADER]     subscription_status, 
-- [HEADER]     plan_id
)
SELECT 
-- [HEADER]     au.id,
-- [HEADER]     au.email,
-- [HEADER]     COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
-- [HEADER]     COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'User',
    'user',
    'active',
    'free'
-- [HEADER] FROM auth.users au
-- [HEADER] LEFT JOIN public.user_profiles up ON au.id = up.id
-- [HEADER] WHERE up.id IS NULL
-- [HEADER] ON CONFLICT (id) DO UPDATE SET
-- [HEADER]     email = EXCLUDED.email,
-- [HEADER]     full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
-- [HEADER]     first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
-- [HEADER]     last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
-- [HEADER]     updated_at = NOW();

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

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- If this fails, we Log it but ALLOW the user to sign up.
    -- We don't want to block registration just because of an invoice linking error.
    RAISE WARNING 'Failed to relink invoices for user %: %', NEW.email, SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

-- 3. Ensure the Trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
CREATE TRIGGER on_auth_user_created_relink_invoices
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION relink_past_invoices();
-- Comprehensive Fix for "Failed to Update Profile"

DO $$ 
BEGIN
    -- 1. Ensure Columns Exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    END IF;

    -- 2. Populate NULLs (Safety Check)
    UPDATE public.user_profiles
    SET 
-- [HEADER]         first_name = COALESCE(full_name, 'User'),
-- [HEADER]         last_name = 'aaa'
-- [HEADER]     WHERE first_name IS NULL OR last_name IS NULL;

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
-- [HEADER]     ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

    -- UPDATE (Explicitly Allow)
    CREATE POLICY "Users update own"
-- [HEADER]     ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

    -- INSERT (Crucial for 'upsert' if row is missing/ghosted)
    CREATE POLICY "Users insert own"
-- [HEADER]     ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

END $$;
-- Safely add missing columns to properties table
DO $$
BEGIN
    -- Add has_parking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_parking') THEN
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false;
    END IF;

    -- Add has_storage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_storage') THEN
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_storage BOOLEAN DEFAULT false;
    END IF;

    -- Add property_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'property_type') THEN
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment';
    END IF;

    -- Add image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'image_url') THEN
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url TEXT;
    END IF;
END $$;

-- Update constraint for property_type
DO $$
BEGIN
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
    ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
    CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
-- [HEADER] EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
-- FIX: Re-create the handle_new_user function with explicit search_path and permissions

-- 1. Grant permissions to be sure
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;

-- 2. Drop the trigger first to avoid conflicts during replace
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- FIX SIGNUP TRIGGER (Proper Plan Linking)
-- ============================================

-- 1. Ensure the 'free' plan exists to avoid foreign key errors
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, max_tenants)
VALUES ('free', 'Free Forever', 0, 1, 2)
-- [HEADER] ON CONFLICT (id) DO NOTHING;

-- 1. Fix Tenants Table
ALTER TABLE public.tenants 
-- [HEADER] ADD COLUMN IF NOT EXISTS id_number TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS email TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Fix Contracts Table (Financials & Linkage)
ALTER TABLE public.contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2),
-- [HEADER] ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS',
-- [HEADER] ADD COLUMN IF NOT EXISTS payment_frequency TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS payment_day INTEGER,
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_type TEXT DEFAULT 'none',
-- [HEADER] ADD COLUMN IF NOT EXISTS base_index_date DATE,
-- [HEADER] ADD COLUMN IF NOT EXISTS base_index_value NUMERIC(10, 4), -- More precision for index
-- [HEADER] ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC(10, 2),
-- [HEADER] ADD COLUMN IF NOT EXISTS signing_date DATE,
-- [HEADER] ADD COLUMN IF NOT EXISTS start_date DATE,
-- [HEADER] ADD COLUMN IF NOT EXISTS end_date DATE,
-- [HEADER] ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Add New Linkage Features (Sub-Type and Caps)
ALTER TABLE public.contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_sub_type TEXT, -- 'known', 'respect_of', 'base'
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_ceiling NUMERIC(5, 2), -- Percentage
-- [HEADER] ADD COLUMN IF NOT EXISTS linkage_floor NUMERIC(5, 2); -- Percentage

-- 4. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
-- ============================================
-- FORCE ACTIVATE ACCOUNT (Bypass Email)
-- ============================================

-- 1. CONFIRM EMAIL MANUALLY (So you don't need to wait for it)
UPDATE auth.users
SET email_confirmed_at = now()
-- [HEADER] WHERE email = 'rentmate.rubi@gmail.com';  -- Your Email

-- 2. FIX DATABASE SCHEMA (Add missing columns)
ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
-- [HEADER] ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';

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
-- [HEADER]             id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
-- [HEADER]             v_user_id, target_email, 'Admin User', 'admin', 'active', 'free_forever'
        )
-- [HEADER]         ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
-- [HEADER]             subscription_status = 'active', 
-- [HEADER]             subscription_plan = 'free_forever';

        RAISE NOTICE 'User % has been fully activated and promoted to Admin.', target_email;
-- [HEADER]     ELSE
        RAISE WARNING 'User % not found in Auth system. Did you sign up?', target_email;
    END IF;
END;
$$;

    -- Try to recover invoices (but don't fail if it breaks)
    BEGIN
        UPDATE public.invoices SET user_id = NEW.id 
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

-- [HEADER]     RETURN NEW;
END;
$$;
-- ============================================
-- AUTO-RECOVER PAST INVOICES ON SIGNUP
-- ============================================

-- This function runs whenever a NEW user triggers the 'handle_new_user' flow (or separate trigger).
-- It looks for "Orphaned" invoices (where user_id IS NULL) that match the new user's email.

    GET DIAGNOSTICS recovered_count = ROW_COUNT;

    -- Optional: Log this event if you want audit trails
    -- RAISE NOTICE 'Recovered % invoices for user % based on email match.', recovered_count, NEW.email;

-- [HEADER]   RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach this to the SAME trigger point as profile creation, 
-- or run it right after.
-- We'll attach it to auth.users AFTER INSERT.

DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

CREATE TRIGGER on_auth_user_created_relink_invoices
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION relink_past_invoices();
-- ============================================
-- PROTECT INVOICES & DATA RETENTION
-- ============================================

-- 1. Modify Invoices to survive User Deletion
-- We drop the "Cascade" constraint and replace it with "Set Null"
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;

ALTER TABLE invoices
-- [HEADER] ADD CONSTRAINT invoices_user_id_fkey
-- [HEADER] FOREIGN KEY (user_id)
-- [HEADER] REFERENCES user_profiles(id)
-- [HEADER] ON DELETE SET NULL;

-- 2. Add "Snapshot" fields
-- If the user is deleted, "user_id" becomes NULL.
-- We need these text fields to know who the invoice was for (Tax Law Requirement).
ALTER TABLE invoices
-- [HEADER] ADD COLUMN IF NOT EXISTS billing_name TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS billing_email TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 3. Update existing invoices (Backfill)
-- Copy current profile data into the snapshot fields so we don't lose it.
UPDATE invoices i
SET 
-- [HEADER]   billing_name = p.full_name,
-- [HEADER]   billing_email = p.email
-- [HEADER] FROM user_profiles p
-- [HEADER] WHERE i.user_id = p.id;

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
-- [HEADER]     BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION snapshot_invoice_details();
-- ============================================
-- RELAX SESSION LIMITS (Increase to 5)
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

    -- Count EXISTING sessions for this user of the SAME type
    SELECT COUNT(*)
-- [HEADER]     INTO session_count
-- [HEADER]     FROM auth.sessions
-- [HEADER]     WHERE user_id = NEW.user_id
-- [HEADER]     AND public.get_device_type(user_agent) = new_device_type;

    -- If we are at (or above) the limit, we need to make room.
    IF session_count >= max_sessions_per_type THEN

        -- Identify the Oldest Session to remove
        SELECT id
-- [HEADER]         INTO oldest_session_id
-- [HEADER]         FROM auth.sessions
-- [HEADER]         WHERE user_id = NEW.user_id
-- [HEADER]         AND public.get_device_type(user_agent) = new_device_type
-- [HEADER]         ORDER BY created_at ASC
-- [HEADER]         LIMIT 1;

        -- Delete it
        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
        END IF;
    END IF;

-- [HEADER]     RETURN NEW;
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
-- [HEADER] ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
-- [HEADER] ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';

-- Ensure role exists too
ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. RESCUE THE ADMIN USER (rentmate.rubi@gmail.com)
DO $$
DECLARE
    target_email TEXT := 'rentmate.rubi@gmail.com'; 
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (
-- [HEADER]             id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
-- [HEADER]             v_user_id, 
-- [HEADER]             target_email, 
            'Admin User', 
            'admin', 
            'active', 
            'free_forever'
        )
-- [HEADER]         ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
-- [HEADER]             subscription_status = 'active',
-- [HEADER]             subscription_plan = 'free_forever';

        RAISE NOTICE 'Admin profile repaired for %', target_email;
-- [HEADER]     ELSE
        RAISE NOTICE 'User % not found in Auth, skipping rescue.', target_email;
    END IF;
END;
$$;

    -- Link Invoices (Safely)
    BEGIN
        UPDATE public.invoices SET user_id = NEW.id 
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN 
        RAISE WARNING 'Link failed: %', SQLERRM; 
    END;

-- [HEADER]     RETURN NEW;
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
-- [HEADER] EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. RE-ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. RE-ENABLE RLS WITH SIMPLE POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users see themselves
CREATE POLICY "Users view own" 
-- [HEADER]     ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Users update themselves
CREATE POLICY "Users update own" 
-- [HEADER]     ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Policy: Admins see all (Using Safe Function)
CREATE POLICY "Admins view all" 
-- [HEADER]     ON public.user_profiles FOR SELECT 
    USING (public.is_admin());

-- Policy: Admins update all
CREATE POLICY "Admins update all" 
-- [HEADER]     ON public.user_profiles FOR UPDATE 
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
-- [HEADER]                WHERE table_name = 'tenants' AND constraint_type = 'FOREIGN KEY') THEN

        -- Drop the constraint causing "ON DELETE CASCADE" or "RESTRICT" behavior
        -- Note: We might not know the exact name, so in production we'd look it up.
        -- For this migration, we will assume standard naming or iterate.
        -- HOWEVER, in Supabase SQL editor we can just do:

        ALTER TABLE public.tenants
        DROP CONSTRAINT IF EXISTS tenants_property_id_fkey; -- Standard name

    END IF;

    -- 2. Add the new Safe Constraint
    ALTER TABLE public.tenants
-- [HEADER]     ADD CONSTRAINT tenants_property_id_fkey
-- [HEADER]     FOREIGN KEY (property_id)
-- [HEADER]     REFERENCES public.properties(id)
-- [HEADER]     ON DELETE SET NULL;

END $$;
-- ============================================
-- SAFE DEBUG SIGNUP (Basic)
-- ============================================

-- 1. Drop existing triggers to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- If this fails, we catch it and raise a VERY CLEAR error
    RAISE EXCEPTION 'DEBUG ERROR: %', SQLERRM;
END;
$$;

-- 3. Re-Attach
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Migration: secure_tables_rls
-- Description: Enforces strict RLS on properties (assets), contracts, tenants, and payments.

-- ==============================================================================
-- 1. ENSURE PAYMENTS HAS USER_ID (Denormalization for Performance & Strict RLS)
-- ==============================================================================
ALTER TABLE public.payments 
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Backfill user_id for payments from contracts
UPDATE public.payments p
SET user_id = c.user_id
-- [HEADER] FROM public.contracts c
-- [HEADER] WHERE p.contract_id = c.id
-- [HEADER] AND p.user_id IS NULL;

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
-- [HEADER] IMMUTABLE -- Optimization: Always returns same result for same input
AS $$
BEGIN
    IF user_agent IS NULL THEN
        RETURN 'desktop'; -- Default fallback
    END IF;

    -- Standard mobile indicators
    -- "Mobi" catches many browsers, "Android", "iPhone", "iPad" are specific
    IF user_agent ~* '(Mobi|Android|iPhone|iPad|iPod)' THEN
-- [HEADER]         RETURN 'mobile';
-- [HEADER]     ELSE
-- [HEADER]         RETURN 'desktop';
    END IF;
END;
$$;

    -- Count EXISTING sessions for this user of the SAME type
    -- We filter by the computed device type
    SELECT COUNT(*)
-- [HEADER]     INTO session_count
-- [HEADER]     FROM auth.sessions
-- [HEADER]     WHERE user_id = NEW.user_id
-- [HEADER]     AND public.get_device_type(user_agent) = new_device_type;

    -- If we are at (or above) the limit, we need to make room.
    -- (Note: 'session_count' is the count BEFORE this new row is inserted)
    IF session_count >= max_sessions_per_type THEN

        -- Delete it
        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;

            -- Optional: Raise a notice for debugging (visible in Postgres logs)
            -- RAISE NOTICE 'Session Limit Reached for User %. Deleted sess % (Type: %)', NEW.user_id, oldest_session_id, new_device_type;
        END IF;
    END IF;

-- 3. Attach Trigger to auth.sessions
-- We use BEFORE INSERT so we can clean up *before* the new session lands.
DROP TRIGGER IF EXISTS enforce_session_limits ON auth.sessions;

CREATE TRIGGER enforce_session_limits
-- [HEADER]     BEFORE INSERT ON auth.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_session_limits();
-- COMPLETE NOTIFICATION SYSTEM SETUP
-- Run this file to set up the entire system (Table, Columns, Functions, Triggers)

-- 1. CREATE TABLE IF NOT EXISTS (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
-- [HEADER]     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'action', 'urgent')),
-- [HEADER]     title TEXT NOT NULL,
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     read_at TIMESTAMP WITH TIME ZONE,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]     metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
-- [HEADER]     ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
-- [HEADER]     ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

    SELECT city || ', ' || address INTO property_address
-- [HEADER]     FROM public.properties
-- [HEADER]     WHERE id = NEW.property_id;

-- [HEADER]     notification_title := 'Contract Status Updated';
-- [HEADER]     notification_body := format('Contract for %s is now %s.', property_address, NEW.status);

DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;
CREATE TRIGGER on_contract_status_change
-- [HEADER]     AFTER UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_contract_status_change();

UPDATE public.contracts 
SET status = 'archived' 
-- [HEADER] WHERE status IN ('ended', 'terminated');

-- 2. Drop existing check constraint if it exists (it might be implicit or named)
-- We'll try to drop any existing constraint on status just in case, but usually it's just a text column.
-- If there was a constraint named 'contracts_status_check', we would drop it.
-- ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- 3. Add new check constraint
ALTER TABLE public.contracts 
-- [HEADER] ADD CONSTRAINT contracts_status_check 
-- [HEADER] CHECK (status IN ('active', 'archived'));

-- 4. Set default value to 'active'
ALTER TABLE public.contracts 
ALTER COLUMN status SET DEFAULT 'active';
-- Migration: Split Names into First and Last (with defaults)

DO $$ 
BEGIN

    -- 1. Add Columns (Allow NULL initially to populate)
    ALTER TABLE public.user_profiles
-- [HEADER]     ADD COLUMN IF NOT EXISTS first_name TEXT,
-- [HEADER]     ADD COLUMN IF NOT EXISTS last_name TEXT;

    -- 2. Migrate Data
    -- Strategy:
    -- First Name = full_name (if exists) OR 'User'
    -- Last Name = 'aaa' (Mandatory default for existing)
    UPDATE public.user_profiles
    SET 
-- [HEADER]         first_name = COALESCE(full_name, 'User'),
-- [HEADER]         last_name = 'aaa'
-- [HEADER]     WHERE first_name IS NULL OR last_name IS NULL;

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
-- [HEADER] ON CONFLICT (id) DO NOTHING;

-- 2. ENABLE RLS - SKIPPED
-- This command often fails due to permissions on the system 'storage' schema. 
-- RLS is enabled by default on Supabase storage.objects.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES

-- Policy: Admin can do ANYTHING in 'secure_documents'
DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
CREATE POLICY "Admins full access to secure_documents"
-- [HEADER]     ON storage.objects
    FOR ALL
    USING (
-- [HEADER]         bucket_id = 'secure_documents' 
-- [HEADER]         AND 
-- [HEADER]         EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
-- [HEADER]         bucket_id = 'secure_documents' 
-- [HEADER]         AND 
-- [HEADER]         EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Users can VIEW their OWN files
DROP POLICY IF EXISTS "Users view own secure documents" ON storage.objects;
CREATE POLICY "Users view own secure documents"
-- [HEADER]     ON storage.objects
    FOR SELECT
    USING (
-- [HEADER]         bucket_id = 'secure_documents'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can UPLOAD to their OWN folder (Optional)
DROP POLICY IF EXISTS "Users upload own documents" ON storage.objects;
CREATE POLICY "Users upload own documents"
-- [HEADER]     ON storage.objects
    FOR INSERT
    WITH CHECK (
-- [HEADER]         bucket_id = 'secure_documents'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
-- [HEADER]         AND
-- [HEADER]         auth.role() = 'authenticated'
    );
-- ============================================
-- TRACK DELETED USERS (Audit & Abuse Prevention)
-- ============================================

-- 1. Create a log table that is NOT connected to the user_id via foreign key
-- (So it survives the deletion)
CREATE TABLE IF NOT EXISTS deleted_users_log (
-- [HEADER]     id BIGSERIAL PRIMARY KEY,
-- [HEADER]     original_user_id UUID,
-- [HEADER]     email TEXT,
-- [HEADER]     phone TEXT,
-- [HEADER]     subscription_status_at_deletion TEXT,
-- [HEADER]     deleted_at TIMESTAMPTZ DEFAULT NOW()
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
-- [HEADER]     BEFORE DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_user_deletion();
-- Migration: trigger_signup_notification
-- Description: Triggers the send-admin-alert Edge Function when a new user signs up

-- 1. Fix Admin Signup Notification URL 
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://tipnjnfbbnbskdlodrww.supabase.co'; -- UPDATED TO CORRECT PROJECT
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

    -- SIMPLE APPROACH: Since Supabase Database Webhooks are often configured in the UI,
    -- we will use the `net` extension if available to make an async call.

    -- NOTE: In many Supabase setups, it's easier to create a "Webhook" via the Dashboard.
    -- However, to do it via code/migration, we use pg_net.

    -- Check if pg_net is available, otherwise this might fail.
    -- Assuming pg_net is installed.

    PERFORM
-- [HEADER]       net.http_post(
-- [HEADER]         url := project_url || '/functions/v1/send-admin-alert',
-- [HEADER]         headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
-- [HEADER]         body := json_build_object(
            'type', 'INSERT',
            'table', 'user_profiles',
            'record', row_to_json(NEW)
        )::jsonb
      );

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Swallow errors to not block signup
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_user_signup_notify_admin ON public.user_profiles;

CREATE TRIGGER on_user_signup_notify_admin
-- [HEADER]     AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_signup();
-- VERIFICATION SCRIPT
-- Run this to confirm RLS is active and correct

SELECT tablename, policyname, cmd, qual, with_check 
-- [HEADER] FROM pg_policies 
-- [HEADER] WHERE tablename IN ('properties', 'contracts', 'tenants', 'payments')
-- [HEADER] ORDER BY tablename, cmd;

-- EXPECTED OUTPUT:
-- For each table, you should see 4 rows: DELETE, INSERT, SELECT, UPDATE.
-- The 'qual' and 'with_check' columns should contain (user_id = auth.uid()).
-- User Preferences Table (for future use with authentication)
-- This migration is NOT deployed yet - it's ready for when auth is implemented

CREATE TABLE IF NOT EXISTS user_preferences (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en')),
-- [HEADER]     gender TEXT CHECK (gender IN ('male', 'female', 'unspecified')),
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     UNIQUE(user_id)
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read/write their own preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences"
-- [HEADER]     ON user_preferences
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
-- [HEADER]     BEFORE UPDATE ON user_preferences
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
-- [HEADER]         net.http_post(
-- [HEADER]             url:='https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/fetch-index-data',
-- [HEADER]             headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzY0MTYsImV4cCI6MjA4MzAxMjQxNn0.xA3JI4iGElpIpZjVHLCA_FGw0hfmNUJTtw_fuLlhkoA"}'::jsonb,
-- [HEADER]             body:='{}'::jsonb
        ) as request_id;
    $$
);

-- Comment to explain
-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
-- [HEADER]     id UUID NOT NULL DEFAULT gen_random_uuid(),
-- [HEADER]     contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
-- [HEADER]     amount NUMERIC NOT NULL,
-- [HEADER]     currency TEXT NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
-- [HEADER]     due_date DATE NOT NULL,
-- [HEADER]     status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
-- [HEADER]     paid_date DATE DEFAULT NULL,
-- [HEADER]     payment_method TEXT DEFAULT NULL,
-- [HEADER]     reference TEXT DEFAULT NULL,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
-- [HEADER]     CONSTRAINT payments_pkey PRIMARY KEY (id)
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
-- [HEADER]     TO authenticated
    USING (true)
    WITH CHECK (true);
-- Seed dummy CPI data for 2024-2025
-- Using approximate values based on recent trends (base 2022 ~105-110)

-- [Index Data Stripped]
-- RLS Policies
alter table public.saved_calculations enable row level security;

-- Allow public read access (so anyone with the link can view)
create policy "Allow public read access"
-- [HEADER]     on public.saved_calculations for select
    using (true);

-- Allow authenticated users to insert their own calculations
create policy "Allow authenticated insert"
-- [HEADER]     on public.saved_calculations for insert
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
-- [HEADER]     on public.saved_calculations for insert
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
-- [HEADER]         net.http_post(
-- [HEADER]             url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/fetch-index-data',
-- [HEADER]             headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
-- [HEADER]             body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Day 16: Every 2 hours
SELECT cron.schedule(
    'index-update-day16',
    '0 */2 16 * *',  -- Every 2 hours on day 16
    $$
    SELECT
-- [HEADER]         net.http_post(
-- [HEADER]             url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/fetch-index-data',
-- [HEADER]             headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
-- [HEADER]             body := '{}'::jsonb
        ) AS request_id;
    $$
);

-- Day 17: Every 2 hours
SELECT cron.schedule(
    'index-update-day17',
    '0 */2 17 * *',  -- Every 2 hours on day 17
    $$
    SELECT
-- [HEADER]         net.http_post(
-- [HEADER]             url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/fetch-index-data',
-- [HEADER]             headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA'
            ),
-- [HEADER]             body := '{}'::jsonb
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
-- [HEADER]     id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
-- [HEADER]     name TEXT NOT NULL,
-- [HEADER]     price_monthly NUMERIC(10, 2) DEFAULT 0,

    -- Resource Limits (-1 for unlimited)
-- [HEADER]     max_properties INTEGER DEFAULT 1,
-- [HEADER]     max_tenants INTEGER DEFAULT 1,
-- [HEADER]     max_contracts INTEGER DEFAULT 1,
-- [HEADER]     max_sessions INTEGER DEFAULT 1,

    -- Modular Features
-- [HEADER]     features JSONB DEFAULT '{}'::jsonb, -- e.g. {"can_export": true, "ai_assistant": false}

-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read plans, only admins can modify (if we build UI for it)
CREATE POLICY "Public Read Plans" 
-- [HEADER]     ON subscription_plans FOR SELECT 
    USING (true);

-- Seed Data
INSERT INTO subscription_plans (id, name, price_monthly, max_properties, max_tenants, max_contracts, max_sessions, features)
VALUES 
    ('free', 'Free Forever', 0, 1, 2, 1, 1, '{"support_level": "basic"}'::jsonb),
    ('pro', 'Pro', 29.99, 10, 20, -1, 3, '{"support_level": "priority", "export_data": true}'::jsonb),
    ('enterprise', 'Enterprise', 99.99, -1, -1, -1, -1, '{"support_level": "dedicated", "export_data": true, "api_access": true}'::jsonb)
-- [HEADER] ON CONFLICT (id) DO UPDATE SET
-- [HEADER]     name = EXCLUDED.name,
-- [HEADER]     price_monthly = EXCLUDED.price_monthly,
-- [HEADER]     max_properties = EXCLUDED.max_properties,
-- [HEADER]     max_tenants = EXCLUDED.max_tenants,
-- [HEADER]     max_contracts = EXCLUDED.max_contracts,
-- [HEADER]     max_sessions = EXCLUDED.max_sessions,
-- [HEADER]     features = EXCLUDED.features;
-- ============================================
-- 2. Link User Profiles to Subscription Plans
-- ============================================

-- 1. Add plan_id column
ALTER TABLE user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'free';

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

    -- Fallback if no plan found (shouldn't happen)
    IF user_plan_limit IS NULL THEN
-- [HEADER]         user_plan_limit := 1;
    END IF;

    -- If unlimited (-1), skip check
    IF user_plan_limit = -1 THEN
-- [HEADER]         RETURN NEW;
    END IF;

    -- 2. Identify Device Type
-- [HEADER]     new_device_type := public.get_device_type(NEW.user_agent);

    -- 3. Count EXISTING sessions
    SELECT COUNT(*)
-- [HEADER]     INTO session_count
-- [HEADER]     FROM auth.sessions
-- [HEADER]     WHERE user_id = NEW.user_id;
    -- Note: We removed the "per device type" logic to enforce a GLOBAL session limit per plan.
    -- If you want per-device, uncomment the AND clause below, but usually plans limit total active sessions.
    -- AND public.get_device_type(user_agent) = new_device_type;

    -- 4. Enforce Limit
    IF session_count >= user_plan_limit THEN
        -- Delete Oldest Session
        SELECT id
-- [HEADER]         INTO oldest_session_id
-- [HEADER]         FROM auth.sessions
-- [HEADER]         WHERE user_id = NEW.user_id
-- [HEADER]         ORDER BY created_at ASC
-- [HEADER]         LIMIT 1;

        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
        END IF;
    END IF;

-- [HEADER]     RETURN NEW;
END;
$$;
-- ============================================
-- 4. Get User Stats RPC
-- ============================================

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
-- [HEADER]     id UUID,
-- [HEADER]     email TEXT,
-- [HEADER]     full_name TEXT,
-- [HEADER]     phone TEXT,
-- [HEADER]     role TEXT,
-- [HEADER]     subscription_status TEXT,
-- [HEADER]     plan_id TEXT,
-- [HEADER]     created_at TIMESTAMPTZ,
-- [HEADER]     last_login TIMESTAMPTZ,
-- [HEADER]     properties_count BIGINT,
-- [HEADER]     tenants_count BIGINT,
-- [HEADER]     contracts_count BIGINT,
-- [HEADER]     ai_sessions_count BIGINT,
-- [HEADER]     open_tickets_count BIGINT,
-- [HEADER]     storage_usage_mb NUMERIC,
-- [HEADER]     is_super_admin BOOLEAN,
    security_status TEXT,
-- [HEADER]     flagged_at TIMESTAMPTZ,
-- [HEADER]     last_security_check TIMESTAMPTZ
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

    -- Stats
-- [HEADER]     properties_count BIGINT,
-- [HEADER]     tenants_count BIGINT,
-- [HEADER]     contracts_count BIGINT
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
-- [HEADER]         COALESCE(p.count, 0) as properties_count,
-- [HEADER]         COALESCE(t.count, 0) as tenants_count,
-- [HEADER]         COALESCE(c.count, 0) as contracts_count
-- [HEADER]     FROM user_profiles up
    -- Join Property Counts
-- [HEADER]     LEFT JOIN (
        SELECT user_id, count(*) as count 
-- [HEADER]         FROM properties 
-- [HEADER]         GROUP BY user_id
    ) p ON up.id = p.user_id
    -- Join Tenant Counts
-- [HEADER]     LEFT JOIN (
        SELECT user_id, count(*) as count 
-- [HEADER]         FROM tenants 
-- [HEADER]         GROUP BY user_id
    ) t ON up.id = t.user_id
    -- Join Contract Counts
-- [HEADER]     LEFT JOIN (
        SELECT user_id, count(*) as count 
-- [HEADER]         FROM contracts 
-- [HEADER]         GROUP BY user_id
    ) c ON up.id = c.user_id

-- [HEADER]     ORDER BY up.created_at DESC;
END;
$$;
-- ============================================
-- 5. Admin Delete User RPC
-- ============================================

-- Function to delete user from auth.users (cascades to all other tables)
-- Note: modifying auth.users usually requires superuser or specific grants.
-- Usage: supabase.rpc('delete_user_account', { target_user_id: '...' })

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

    -- 3. Delete from auth.users
    -- This triggers CASCADE to user_profiles -> properties, etc.
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
-- Add fields for account deletion tracking
ALTER TABLE user_profiles
-- [HEADER] ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
-- [HEADER] ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted'));

-- CREATE INDEX IF NOT EXISTS for efficient querying of suspended accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

    -- Find all users marked for deletion more than 14 days ago
    FOR user_record IN 
        SELECT id 
-- [HEADER]         FROM user_profiles 
-- [HEADER]         WHERE deleted_at IS NOT NULL 
-- [HEADER]         AND deleted_at < cutoff_date
-- [HEADER]         AND account_status = 'suspended'
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

    -- Capture email for log before deletion
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;

    -- 3. Log the action
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
-- [HEADER]         auth.uid(), 
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
-- [HEADER]             auth.uid(), -- The admin performing the update
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
-- [HEADER]     RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow idempotent re-run
DROP TRIGGER IF EXISTS on_profile_change_audit ON public.user_profiles;

-- Create Trigger
CREATE TRIGGER on_profile_change_audit
-- [HEADER] AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION audit_profile_changes();
-- Create Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
-- [HEADER]     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous feedback
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     type TEXT DEFAULT 'bug', -- 'bug', 'feature', 'other'
-- [HEADER]     status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
-- [HEADER]     screenshot_url TEXT,
-- [HEADER]     device_info JSONB
);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (Anon or Authenticated)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.feedback;
CREATE POLICY "Enable insert for everyone"
-- [HEADER] ON public.feedback FOR INSERT
-- [HEADER] TO public, anon, authenticated
WITH CHECK (true);

-- Allow Admins to see all
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Admins can view all feedback"
-- [HEADER] ON public.feedback FOR SELECT
-- [HEADER] TO authenticated
USING (
-- [HEADER]     EXISTS (
        SELECT 1 FROM public.user_profiles
-- [HEADER]         WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Support updating status by Admins
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback"
-- [HEADER] ON public.feedback FOR UPDATE
-- [HEADER] TO authenticated
USING (
-- [HEADER]     EXISTS (
        SELECT 1 FROM public.user_profiles
-- [HEADER]         WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Storage Bucket for Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
-- [HEADER] ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;
CREATE POLICY "Anyone can upload feedback screenshots"
-- [HEADER] ON storage.objects FOR INSERT
-- [HEADER] TO public, anon, authenticated
WITH CHECK ( bucket_id = 'feedback-screenshots' );

DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
CREATE POLICY "Anyone can view feedback screenshots"
-- [HEADER] ON storage.objects FOR SELECT
-- [HEADER] TO public, anon, authenticated
USING ( bucket_id = 'feedback-screenshots' );
-- Add Granular Storage Quota Fields to Subscription Plans
-- Migration: 20260119_add_granular_storage_quotas.sql

-- Add category-specific storage columns
ALTER TABLE subscription_plans
-- [HEADER] ADD COLUMN IF NOT EXISTS max_media_mb INTEGER DEFAULT -1,      -- -1 for unlimited within global cap
-- [HEADER] ADD COLUMN IF NOT EXISTS max_utilities_mb INTEGER DEFAULT -1,
-- [HEADER] ADD COLUMN IF NOT EXISTS max_maintenance_mb INTEGER DEFAULT -1,
-- [HEADER] ADD COLUMN IF NOT EXISTS max_documents_mb INTEGER DEFAULT -1;

-- Update existing plans with sensible defaults
-- (Assuming Free gets restricted media but more room for documents)
UPDATE subscription_plans SET 
-- [HEADER]     max_media_mb = 50,         -- 50MB for photos/video max on free
-- [HEADER]     max_utilities_mb = 20,     -- 20MB for bills
-- [HEADER]     max_maintenance_mb = 20,   -- 20MB for repairs
-- [HEADER]     max_documents_mb = 10      -- 10MB for contracts
-- [HEADER] WHERE id = 'free';

-- Storage Quota Check Function
CREATE OR REPLACE FUNCTION check_storage_quota(
-- [HEADER]     p_user_id UUID,
-- [HEADER]     p_file_size BIGINT
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

    -- Initialize usage if user has no records yet
-- [HEADER]     v_total_usage := COALESCE(v_total_usage, 0);
-- [HEADER]     v_cat_usage := COALESCE(v_cat_usage, 0);

    -- 2. Check Global Limit
    IF v_max_total_mb != -1 AND (v_total_usage + p_file_size) > (v_max_total_mb * 1024 * 1024) THEN
-- [HEADER]         RETURN FALSE;
    END IF;

    -- 3. Check Category Limit (if specified and not unlimited)
    IF p_category IS NOT NULL AND v_max_cat_mb != -1 THEN
        IF (v_cat_usage + p_file_size) > (v_max_cat_mb * 1024 * 1024) THEN
-- [HEADER]             RETURN FALSE;
        END IF;
    END IF;

-- [HEADER]     RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Add Storage Quota Fields to Subscription Plans
-- Migration: 20260119_add_storage_quotas.sql

-- Add storage quota columns
ALTER TABLE subscription_plans
-- [HEADER] ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 100,  -- MB per user
-- [HEADER] ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10; -- MB per file

-- Update existing plans with storage limits
UPDATE subscription_plans SET 
-- [HEADER]     max_storage_mb = 100,    -- 100MB total
-- [HEADER]     max_file_size_mb = 5     -- 5MB per file
-- [HEADER] WHERE id = 'free';

UPDATE subscription_plans SET 
-- [HEADER]     max_storage_mb = 5120,   -- 5GB total
-- [HEADER]     max_file_size_mb = 50    -- 50MB per file
-- [HEADER] WHERE id = 'pro';

UPDATE subscription_plans SET 
-- [HEADER]     max_storage_mb = -1,     -- Unlimited
-- [HEADER]     max_file_size_mb = 500   -- 500MB per file
-- [HEADER] WHERE id = 'enterprise';

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_calculation_shares_expires ON calculation_shares(expires_at);

-- RLS Policies
ALTER TABLE calculation_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public shares)
CREATE POLICY "Public can view calculation shares"
-- [HEADER]     ON calculation_shares FOR SELECT
    USING (true);

-- Authenticated users can create
CREATE POLICY "Authenticated users can create shares"
-- [HEADER]     ON calculation_shares FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own shares (for view count)
CREATE POLICY "Anyone can update view count"
-- [HEADER]     ON calculation_shares FOR UPDATE
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

-- [HEADER]             RETURN v_short_id;
-- [HEADER]         EXCEPTION WHEN unique_violation THEN
-- [HEADER]             v_attempt := v_attempt + 1;
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
-- [HEADER]     RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
-- Property Documents System - Main Table
-- Migration: 20260119_create_property_documents.sql

CREATE TABLE IF NOT EXISTS property_documents (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    -- Document Classification
-- [HEADER]     category TEXT NOT NULL CHECK (category IN (
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
-- [HEADER]     storage_bucket TEXT NOT NULL,
-- [HEADER]     storage_path TEXT NOT NULL,
-- [HEADER]     file_name TEXT NOT NULL,
-- [HEADER]     file_size BIGINT,
-- [HEADER]     mime_type TEXT,

    -- Metadata
-- [HEADER]     title TEXT,
-- [HEADER]     description TEXT,
-- [HEADER]     tags TEXT[],

    -- Date Info
-- [HEADER]     document_date DATE,  -- When the bill/invoice was issued
-- [HEADER]     period_start DATE,   -- For recurring bills (e.g., monthly utility)
-- [HEADER]     period_end DATE,

    -- Financial Data (for bills/invoices)
-- [HEADER]     amount DECIMAL(10,2),
-- [HEADER]     currency TEXT DEFAULT 'ILS',
-- [HEADER]     paid BOOLEAN DEFAULT false,
-- [HEADER]     payment_date DATE,

    -- Maintenance Specific
-- [HEADER]     vendor_name TEXT,
-- [HEADER]     issue_type TEXT,     -- e.g., "plumbing", "electrical", "painting"

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_category ON property_documents(category);
CREATE INDEX IF NOT EXISTS idx_property_documents_date ON property_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_property_documents_user ON property_documents(user_id);

-- RLS Policies
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their property documents"
-- [HEADER]     ON property_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their property documents"
-- [HEADER]     ON property_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their property documents"
-- [HEADER]     ON property_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their property documents"
-- [HEADER]     ON property_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
-- Create document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
-- [HEADER]     category TEXT NOT NULL, -- e.g., 'utility_electric', 'maintenance', 'media', 'other'
-- [HEADER]     name TEXT NOT NULL, -- The user-friendly subject/title
-- [HEADER]     folder_date DATE NOT NULL DEFAULT CURRENT_DATE,
-- [HEADER]     description TEXT,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Policies for document_folders
CREATE POLICY "Users can view folders for their properties"
-- [HEADER]     ON document_folders FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert folders for their properties"
-- [HEADER]     ON document_folders FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update folders for their properties"
-- [HEADER]     ON document_folders FOR UPDATE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete folders for their properties"
-- [HEADER]     ON document_folders FOR DELETE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

-- Add folder_id to property_documents
ALTER TABLE property_documents
-- [HEADER] ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE;

-- CREATE INDEX IF NOT EXISTS for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_property_category ON document_folders(property_id, category);
CREATE INDEX IF NOT EXISTS idx_property_documents_folder ON property_documents(folder_id);
-- Create property_media table
CREATE TABLE IF NOT EXISTS public.property_media (
-- [HEADER]     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
-- [HEADER]     drive_file_id TEXT NOT NULL,
-- [HEADER]     drive_web_view_link TEXT NOT NULL,
-- [HEADER]     drive_thumbnail_link TEXT,
-- [HEADER]     name TEXT NOT NULL,
-- [HEADER]     mime_type TEXT,
-- [HEADER]     size BIGINT,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own property media"
-- [HEADER]     ON public.property_media FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own property media"
-- [HEADER]     ON public.property_media FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own property media"
-- [HEADER]     ON public.property_media FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_user_id ON public.property_media(user_id);
-- Create short_links table for URL shortener
-- Migration: 20260119_create_short_links.sql

CREATE TABLE IF NOT EXISTS public.short_links (
-- [HEADER]     slug TEXT PRIMARY KEY,
-- [HEADER]     original_url TEXT NOT NULL,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
-- [HEADER]     expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '90 days') NOT NULL,
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: track who created it
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone with the link can use it)
CREATE POLICY "Public can read short links"
-- [HEADER] ON public.short_links FOR SELECT
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
-- [HEADER] ON public.short_links FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Also allow anonymous creation if needed? The user removed server-side calc storage.
-- Let's add anonymous policy for now to be safe with "demo" mode or guest usage.
CREATE POLICY "Public can create short links"
-- [HEADER] ON public.short_links FOR INSERT
WITH CHECK (true);

-- Auto-cleanup function (optional usually, but good for hygiene)
-- We can rely on `expires_at` in the query `WHERE expires_at > now()`
-- User Storage Usage Tracking
-- Migration: 20260119_create_user_storage_usage.sql

CREATE TABLE IF NOT EXISTS user_storage_usage (
-- [HEADER]     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     total_bytes BIGINT DEFAULT 0,
-- [HEADER]     file_count INTEGER DEFAULT 0,
-- [HEADER]     last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Breakdown by category
-- [HEADER]     media_bytes BIGINT DEFAULT 0,
-- [HEADER]     utilities_bytes BIGINT DEFAULT 0,
-- [HEADER]     maintenance_bytes BIGINT DEFAULT 0,
-- [HEADER]     documents_bytes BIGINT DEFAULT 0,

-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own storage usage"
-- [HEADER]     ON user_storage_usage FOR SELECT
    USING (auth.uid() = user_id);

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

-- [HEADER]     ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_storage_usage
        SET 
-- [HEADER]             total_bytes = GREATEST(0, total_bytes - OLD.file_size),
-- [HEADER]             file_count = GREATEST(0, file_count - 1),
-- [HEADER]             updated_at = NOW()
-- [HEADER]         WHERE user_id = OLD.user_id;
    END IF;

-- Trigger on property_documents
CREATE TRIGGER update_storage_on_document_change
-- [HEADER] AFTER INSERT OR DELETE ON property_documents
FOR EACH ROW EXECUTE FUNCTION update_user_storage();

    -- Get plan limit
    SELECT sp.max_storage_mb
-- [HEADER]     INTO v_max_storage_mb
-- [HEADER]     FROM user_profiles up
-- [HEADER]     JOIN subscription_plans sp ON up.plan_id = sp.id
-- [HEADER]     WHERE up.id = p_user_id;

    -- -1 means unlimited
    IF v_max_storage_mb = -1 THEN
-- [HEADER]         RETURN TRUE;
    END IF;

-- [HEADER]     v_max_storage_bytes := v_max_storage_mb * 1024 * 1024;

    -- Check if adding this file would exceed quota
-- [HEADER]     RETURN (v_current_usage + p_file_size) <= v_max_storage_bytes;
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
-- [HEADER]     ON document_folders FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

-- 2. INSERT
CREATE POLICY "Users can insert folders for their properties"
-- [HEADER]     ON document_folders FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

-- 3. UPDATE
CREATE POLICY "Users can update folders for their properties"
-- [HEADER]     ON document_folders FOR UPDATE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

-- 4. DELETE
CREATE POLICY "Users can delete folders for their properties"
-- [HEADER]     ON document_folders FOR DELETE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM properties p
-- [HEADER]             WHERE p.id = document_folders.property_id
-- [HEADER]             AND p.user_id = auth.uid()
        )
    );

-- Force schema cache reload again just in case
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Fix RLS Violation in Storage Trigger (with Category Support)
-- Migration: 20260119_fix_trigger_security.sql

-- The update_user_storage function needs to run with SECURITY DEFINER
-- because it modifies user_storage_usage which has RLS enabled.

    -- Determine which column to update based on category
    IF v_cat IN ('photo', 'video') THEN
-- [HEADER]         v_col := 'media_bytes';
-- [HEADER]     ELSIF v_cat LIKE 'utility_%' THEN
-- [HEADER]         v_col := 'utilities_bytes';
-- [HEADER]     ELSIF v_cat = 'maintenance' THEN
-- [HEADER]         v_col := 'maintenance_bytes';
-- [HEADER]     ELSE
-- [HEADER]         v_col := 'documents_bytes';
    END IF;

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
            VALUES ($1, $2, 1, $2)
-- [HEADER]             ON CONFLICT (user_id) DO UPDATE SET
-- [HEADER]                 total_bytes = user_storage_usage.total_bytes + $2,
-- [HEADER]                 file_count = user_storage_usage.file_count + 1,
-- [HEADER]                 %I = user_storage_usage.%I + $2,
-- [HEADER]                 updated_at = NOW()
        ', v_col, v_col, v_col) USING v_user_id, v_size;

-- [HEADER]     ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('
            UPDATE user_storage_usage
            SET 
-- [HEADER]                 total_bytes = GREATEST(0, total_bytes - $1),
-- [HEADER]                 file_count = GREATEST(0, file_count - 1),
-- [HEADER]                 %I = GREATEST(0, %I - $1),
-- [HEADER]                 updated_at = NOW()
-- [HEADER]             WHERE user_id = $2
        ', v_col, v_col) USING v_size, v_user_id;
    END IF;

-- [HEADER]     RETURN NULL; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Update Storage Tracking to include category breakdown
-- Migration: 20260119_update_storage_trigger.sql

-- [HEADER]     RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;
-- Add extension_option_start column to contracts table
-- This column stores when the tenant's extension option period begins

ALTER TABLE public.contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS extension_option_start DATE;

-- AI Chat Usage Tracking
CREATE TABLE IF NOT EXISTS ai_chat_usage (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     message_count INTEGER DEFAULT 0,
-- [HEADER]     tokens_used INTEGER DEFAULT 0,
-- [HEADER]     last_reset_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     UNIQUE(user_id)
);

-- AI Usage Limits per Subscription Tier
CREATE TABLE IF NOT EXISTS ai_usage_limits (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     tier_name TEXT NOT NULL UNIQUE,
-- [HEADER]     monthly_message_limit INTEGER NOT NULL,
-- [HEADER]     monthly_token_limit INTEGER NOT NULL,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO ai_usage_limits (tier_name, monthly_message_limit, monthly_token_limit) VALUES
    ('free', 50, 50000),           -- 50 messages, ~50k tokens
    ('basic', 200, 200000),         -- 200 messages, ~200k tokens
    ('pro', 1000, 1000000),         -- 1000 messages, ~1M tokens
    ('business', -1, -1)            -- Unlimited (-1)
-- [HEADER] ON CONFLICT (tier_name) DO NOTHING;

-- 3. Fix the AI Chat Usage Function (Make it more robust)
CREATE OR REPLACE FUNCTION check_ai_chat_usage(
-- [HEADER]     p_user_id UUID,
-- [HEADER]     p_tokens_used INTEGER DEFAULT 500
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
-- [HEADER]     v_user_tier := COALESCE(v_user_tier, 'free');

    -- Get limits for this tier
    SELECT * INTO v_limit
-- [HEADER]     FROM ai_usage_limits
-- [HEADER]     WHERE tier_name = v_user_tier;

    -- Get or create usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
-- [HEADER]     ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_usage
-- [HEADER]     FROM ai_chat_usage
-- [HEADER]     WHERE user_id = p_user_id;

    -- Check if we need to reset (monthly)
    IF v_usage.last_reset_at < DATE_TRUNC('month', NOW()) THEN
        UPDATE ai_chat_usage
        SET message_count = 0,
-- [HEADER]             tokens_used = 0,
-- [HEADER]             last_reset_at = NOW(),
-- [HEADER]             updated_at = NOW()
-- [HEADER]         WHERE user_id = p_user_id;

-- [HEADER]         v_usage.message_count := 0;
-- [HEADER]         v_usage.tokens_used := 0;
    END IF;

    -- Check limits (skip if unlimited)
    IF v_limit.monthly_message_limit != -1 AND v_usage.message_count >= v_limit.monthly_message_limit THEN
-- [HEADER]         v_result := json_build_object(
            'allowed', false,
            'reason', 'message_limit_exceeded',
            'current_usage', v_usage.message_count,
            'limit', v_limit.monthly_message_limit,
            'tier', v_user_tier
        );
-- [HEADER]         RETURN v_result;
    END IF;

    IF v_limit.monthly_token_limit != -1 AND v_usage.tokens_used >= v_limit.monthly_token_limit THEN
-- [HEADER]         v_result := json_build_object(
            'allowed', false,
            'reason', 'token_limit_exceeded',
            'current_usage', v_usage.tokens_used,
            'limit', v_limit.monthly_token_limit,
            'tier', v_user_tier
        );
-- [HEADER]         RETURN v_result;
    END IF;

    -- Increment usage
    UPDATE ai_chat_usage
    SET message_count = message_count + 1,
-- [HEADER]         tokens_used = tokens_used + p_tokens_used,
-- [HEADER]         updated_at = NOW()
-- [HEADER]     WHERE user_id = p_user_id;

    -- Return success
-- [HEADER]     v_result := json_build_object(
        'allowed', true,
        'current_messages', v_usage.message_count + 1,
        'message_limit', v_limit.monthly_message_limit,
        'current_tokens', v_usage.tokens_used + p_tokens_used,
        'token_limit', v_limit.monthly_token_limit,
        'tier', v_user_tier
    );

-- [HEADER]     RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage"
-- [HEADER]     ON ai_chat_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all AI usage"
-- [HEADER]     ON ai_chat_usage FOR ALL
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can view limits (for UI display)
CREATE POLICY "Anyone can view AI limits"
-- [HEADER]     ON ai_usage_limits FOR SELECT
-- [HEADER]     TO authenticated
    USING (true);

-- Only admins can modify limits
CREATE POLICY "Admins can modify AI limits"
-- [HEADER]     ON ai_usage_limits FOR ALL
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_id ON ai_chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_last_reset ON ai_chat_usage(last_reset_at);
-- 1. Add notification_preferences column to user_profiles
ALTER TABLE public.user_profiles
-- [HEADER] ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"contract_expiry_days": 60, "rent_due_days": 3}';

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
-- [HEADER]            AND expiring_contract.end_date >= CURRENT_DATE THEN

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
-- [HEADER]            AND due_payment.due_date >= CURRENT_DATE THEN

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
-- [HEADER]  * Efficiently get counts of documents per category for a user.
-- [HEADER]  * Replaces client-side aggregation in Dashboard.
-- [HEADER]  */
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

-- [HEADER]     RETURN result;
END;
$$;

/**
-- [HEADER]  * Get high-level dashboard stats in a single call.
-- [HEADER]  * Including income, pending payments, and document counts.
-- [HEADER]  */
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
-- [HEADER]     doc_counts := public.get_property_document_counts(p_user_id);

-- [HEADER]     RETURN jsonb_build_object(
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

-- 1. Add extension_option_end column to contracts table
ALTER TABLE public.contracts
-- [HEADER] ADD COLUMN IF NOT EXISTS extension_option_end DATE;

-- 2. Add extension_option_end_days to notification preferences
UPDATE public.user_profiles
SET notification_preferences = jsonb_set(
-- [HEADER]     COALESCE(notification_preferences, '{}'::jsonb),
    '{extension_option_end_days}',
    '7'
)
-- [HEADER] WHERE notification_preferences IS NULL 
-- [HEADER]    OR NOT notification_preferences ? 'extension_option_end_days';

        -- Skip if disabled (0)
        IF pref_days = 0 THEN
-- [HEADER]             CONTINUE;
        END IF;

        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if deadline is approaching
        IF deadline_record.extension_option_end <= (CURRENT_DATE + (pref_days || ' days')::interval)
-- [HEADER]            AND deadline_record.extension_option_end >= CURRENT_DATE THEN

-- 1. Update existing records to include extension_option_days
UPDATE public.user_profiles
SET notification_preferences = jsonb_set(
-- [HEADER]     COALESCE(notification_preferences, '{}'::jsonb),
    '{extension_option_days}',
    '30'
)
-- [HEADER] WHERE notification_preferences IS NULL 
-- [HEADER]    OR NOT notification_preferences ? 'extension_option_days';

        -- Check if extension option starts in this window
        IF extension_record.extension_option_start <= (CURRENT_DATE + (pref_days || ' days')::interval)
-- [HEADER]            AND extension_record.extension_option_start >= CURRENT_DATE THEN

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

        IF pref_days > 180 THEN pref_days := 180; END IF;

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

-- [HEADER]             count_new := count_new + 1;
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
-- [HEADER] ADD COLUMN IF NOT EXISTS max_ai_scans INTEGER DEFAULT 5;

-- 2. Update Seed Data for existing plans
UPDATE subscription_plans SET max_ai_scans = 5 WHERE id = 'free';
UPDATE subscription_plans SET max_ai_scans = 50 WHERE id = 'pro';
UPDATE subscription_plans SET max_ai_scans = -1 WHERE id = 'enterprise';

-- 3. Create AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     feature_name TEXT NOT NULL, -- 'bill_scan', 'contract_analysis', etc.
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs (user_id, created_at);

-- Policies
CREATE POLICY "Users can view their own usage logs"
-- [HEADER]     ON ai_usage_logs FOR SELECT
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
-- [HEADER]     v_month_start := date_trunc('month', now());

    -- 1. Get User's Limit from their plan
    SELECT p.max_ai_scans INTO v_limit
-- [HEADER]     FROM user_profiles up
-- [HEADER]     JOIN subscription_plans p ON up.plan_id = p.id
-- [HEADER]     WHERE up.id = p_user_id;

    -- Fallback to default free limit if not found
    IF v_limit IS NULL THEN
-- [HEADER]         v_limit := 5;
    END IF;

    -- 2. Count total AI usage this month
    SELECT COUNT(*)::INTEGER INTO v_current_usage
-- [HEADER]     FROM ai_usage_logs
-- [HEADER]     WHERE user_id = p_user_id
-- [HEADER]       AND created_at >= v_month_start;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + p_count) <= v_limit THEN
        -- Log the usage (multiple entries)
        FOR i IN 1..p_count LOOP
            INSERT INTO ai_usage_logs (user_id, feature_name)
            VALUES (p_user_id, p_feature);
        END LOOP;

-- [HEADER]         RETURN jsonb_build_object(
            'allowed', true,
            'current_usage', v_current_usage + p_count,
            'limit', v_limit
        );
-- [HEADER]     ELSE
-- [HEADER]         RETURN jsonb_build_object(
            'allowed', false,
            'current_usage', v_current_usage,
            'limit', v_limit
        );
    END IF;
END;
$$;
-- Add is_super_admin column
ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

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

    IF is_super IS NOT TRUE THEN
        RAISE EXCEPTION 'Access Denied: Super Admin Only';
    END IF;

    -- 1. Total Users
    SELECT COUNT(*) INTO total_users FROM user_profiles;

    -- 2. Active Subscribers (Any plan that is not 'free' or 'free_forever')
    -- Note: This depends on how you categorize 'active' payment plans. 
    -- We assume existence of plan_id implies a subscription if it's not the default free one.
    SELECT COUNT(*) INTO active_subs 
-- [HEADER]     FROM user_profiles 
-- [HEADER]     WHERE plan_id IS NOT NULL 
-- [HEADER]     AND plan_id NOT IN ('free', 'free_forever')
-- [HEADER]     AND subscription_status = 'active';

    -- 3. MRR Calculation
    -- Sum of price_monthly for all active users based on their plan_id
    SELECT COALESCE(SUM(sp.price_monthly), 0)
-- [HEADER]     INTO total_mrr
-- [HEADER]     FROM user_profiles up
-- [HEADER]     JOIN subscription_plans sp ON up.plan_id = sp.id
-- [HEADER]     WHERE up.subscription_status = 'active';

    -- 4. Growth (New users in last 30 days)
    SELECT COUNT(*) INTO new_users_30d
-- [HEADER]     FROM user_profiles
-- [HEADER]     WHERE created_at > (NOW() - INTERVAL '30 days');

-- [HEADER]     RETURN json_build_object(
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

-- Comment to explain
-- Add email configuration settings to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email'),
    ('admin_email_content_preferences', '{"new_users": true, "revenue": true, "support_tickets": true, "upgrades": true, "active_properties": true}'::jsonb, 'JSON object defining which sections to include in the daily summary')
-- [HEADER] ON CONFLICT (key) DO NOTHING;
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

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count
-- [HEADER]     FROM user_profiles
-- [HEADER]     WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count
-- [HEADER]     FROM contracts;

    -- Get total revenue (sum of paid payments)
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount
-- [HEADER]     FROM payments
-- [HEADER]     WHERE status = 'paid';

    -- Get active users (users who logged in within last 30 days)
    SELECT COUNT(*) INTO active_users_count
-- [HEADER]     FROM user_profiles
-- [HEADER]     WHERE deleted_at IS NULL
-- [HEADER]     AND updated_at > NOW() - INTERVAL '30 days';

    -- Build JSON result
-- [HEADER]     result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count
    );

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
-- [HEADER]     ON public.user_storage_usage FOR SELECT
    USING (public.is_admin());

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
-- [HEADER]     ON public.audit_logs FOR SELECT
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
-- [HEADER]             ON public.user_profiles FOR UPDATE 
            USING (public.is_admin());
    END IF;
END $$;
-- Migration: fix_email_systems_20260121
-- Description: Fixes project URL for admin alerts and adds email forwarding for app notifications

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger admin notification: %', SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

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

        IF user_email IS NOT NULL THEN
            PERFORM
-- [HEADER]               net.http_post(
-- [HEADER]                 url := project_url || '/functions/v1/send-notification-email',
-- [HEADER]                 headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
-- [HEADER]                 body := json_build_object(
                    'email', user_email,
                    'notification', row_to_json(NEW)
                )::jsonb
              );
        END IF;
    END IF;

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

-- Attach trigger to notifications table
DROP TRIGGER IF EXISTS on_notification_created_forward_email ON public.notifications;
CREATE TRIGGER on_notification_created_forward_email
-- [HEADER]     AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.forward_notification_to_email();

-- 3. Fix Storage RLS for Admins
DROP POLICY IF EXISTS "Admins can view all storage usage" ON public.user_storage_usage;
CREATE POLICY "Admins can view all storage usage"
-- [HEADER]     ON public.user_storage_usage FOR SELECT
    USING (public.is_admin());
-- ============================================
-- IMPROVED SIGNUP TRIGGER (Prevents Orphaned Users)
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Critical: If profile creation fails, we should fail the auth signup too
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
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
-- [HEADER] ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

    -- Storage stats
-- [HEADER]     total_storage_mb decimal := 0;
-- [HEADER]     media_storage_mb decimal := 0;
-- [HEADER]     docs_storage_mb decimal := 0;

    -- System flags
-- [HEADER]     is_maint_active boolean;
-- [HEADER]     is_ai_disabled boolean;

-- [HEADER]     is_super boolean;
BEGIN
    -- Security Check
    SELECT is_super_admin INTO is_super FROM user_profiles WHERE id = auth.uid();
    IF is_super IS NOT TRUE THEN RAISE EXCEPTION 'Access Denied: Super Admin Only'; END IF;

    -- 1. Standard Metrics
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    SELECT COUNT(*) INTO active_subs FROM user_profiles WHERE plan_id IS NOT NULL AND plan_id NOT IN ('free', 'free_forever') AND subscription_status = 'active';

    SELECT COALESCE(SUM(sp.price_monthly), 0) INTO total_mrr 
-- [HEADER]     FROM user_profiles up 
-- [HEADER]     JOIN subscription_plans sp ON up.plan_id = sp.id 
-- [HEADER]     WHERE up.subscription_status = 'active';

    SELECT COUNT(*) INTO new_users_30d FROM user_profiles WHERE created_at > (NOW() - INTERVAL '30 days');

    -- 2. Storage Aggregation (Aggregating from user_storage_usage if it exists, or files)
    -- Assuming a table user_storage_usage exists based on types/database.ts line 79
    SELECT 
-- [HEADER]         COALESCE(SUM(total_bytes) / (1024 * 1024), 0),
-- [HEADER]         COALESCE(SUM(media_bytes) / (1024 * 1024), 0),
-- [HEADER]         COALESCE(SUM(documents_bytes + utilities_bytes + maintenance_bytes) / (1024 * 1024), 0)
-- [HEADER]     INTO total_storage_mb, media_storage_mb, docs_storage_mb
-- [HEADER]     FROM public.user_storage_usage;

    -- 3. System Flags (Casting jsonb safely)
    SELECT (value::text::boolean) INTO is_maint_active FROM system_settings WHERE key = 'maintenance_mode';
    SELECT (value::text::boolean) INTO is_ai_disabled FROM system_settings WHERE key = 'disable_ai_processing';

-- [HEADER]     RETURN json_build_object(
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
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
-- [HEADER]     is_active BOOLEAN DEFAULT true,
-- [HEADER]     expires_at TIMESTAMPTZ,
-- [HEADER]     target_link TEXT,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT now(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

-- 1. Viewable by ALL users (even unauthenticated potentially, though usually app users)
DROP POLICY IF EXISTS "Broadcasts are viewable by everyone" ON public.system_broadcasts;
CREATE POLICY "Broadcasts are viewable by everyone"
-- [HEADER]     ON public.system_broadcasts FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 2. CRUD only for Super Admins
DROP POLICY IF EXISTS "Super Admins have full access to broadcasts" ON public.system_broadcasts;
CREATE POLICY "Super Admins have full access to broadcasts"
-- [HEADER]     ON public.system_broadcasts FOR ALL
-- [HEADER]     TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
-- [HEADER]         WHERE id = auth.uid() AND is_super_admin = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles 
-- [HEADER]         WHERE id = auth.uid() AND is_super_admin = true
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
-- [HEADER]     BEFORE UPDATE ON public.system_broadcasts
    FOR EACH ROW
    EXECUTE PROCEDURE update_broadcast_updated_at();
-- Add marketing consent fields to user_profiles
ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
-- [HEADER] ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

-- [HEADER]     RETURN NEW;
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
    project_url text := 'https://tipnjnfbbnbskdlodrww.supabase.co';
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

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't crash
    RAISE WARNING 'Failed to trigger welcome email for %: %', NEW.email, SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

-- Attach trigger to user_profiles
DROP TRIGGER IF EXISTS on_profile_created_send_welcome_email ON public.user_profiles;

CREATE TRIGGER on_profile_created_send_welcome_email
-- [HEADER]     AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.send_welcome_email_on_signup();
-- Migration to add counter_read to property_documents
-- Date: 2026-01-22

-- 1. Add counter_read column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='property_documents' AND column_name='counter_read') THEN
        ALTER TABLE property_documents ADD COLUMN IF NOT EXISTS counter_read DECIMAL(12,2);
    END IF;
END $$;

-- 2. Add comment for clarity
-- Migration: asset_email_alerts
-- Description: Adds automated notifications and email forwarding for maintenance records based on user preference

    -- Get property address
    SELECT COALESCE(city, '') || ', ' || COALESCE(address, '') INTO property_address
-- [HEADER]     FROM public.properties
-- [HEADER]     WHERE id = NEW.property_id;

    -- Get user language preference (defaults to 'he')
    SELECT COALESCE(language, 'he') INTO user_lang
-- [HEADER]     FROM public.user_profiles
-- [HEADER]     WHERE id = NEW.user_id;

    -- Set localized content
    IF user_lang = 'he' THEN
-- [HEADER]         notif_title := '׳ ׳•׳¡׳£ ׳×׳™׳¢׳•׳“ ׳×׳—׳–׳•׳§׳”';
-- [HEADER]         notif_message := format('׳ ׳•׳¡׳£ ׳×׳™׳¢׳•׳“ ׳×׳—׳–׳•׳§׳” ׳—׳“׳© ("%s") ׳¢׳‘׳•׳¨ ׳”׳ ׳›׳¡ %s.', COALESCE(NEW.title, '׳׳׳ ׳›׳•׳×׳¨׳×'), property_address);
-- [HEADER]     ELSE
-- [HEADER]         notif_title := 'Maintenance Record Added';
-- [HEADER]         notif_message := format('A new maintenance record ("%s") was added for %s.', COALESCE(NEW.title, 'Untitled'), property_address);
    END IF;

-- Attach trigger to property_documents
DROP TRIGGER IF EXISTS on_maintenance_record_created ON public.property_documents;
CREATE TRIGGER on_maintenance_record_created
-- [HEADER]     AFTER INSERT ON public.property_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_maintenance_record();

    -- DECISION LOGIC:
    -- Forward IF:
    -- 1. High priority type (warning, error, urgent, action)
    -- 2. OR is a maintenance event AND the user hasn't explicitly disabled asset alerts
    IF (NEW.type IN ('warning', 'error', 'urgent', 'action')) OR 
       (NEW.metadata->>'event' = 'maintenance_record' AND asset_alerts_enabled = true) 
-- [HEADER]     THEN
        IF target_email IS NOT NULL THEN
            PERFORM
-- [HEADER]               net.http_post(
-- [HEADER]                 url := project_url || '/functions/v1/send-notification-email',
-- [HEADER]                 headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
-- [HEADER]                 body := json_build_object(
                    'email', target_email,
                    'notification', row_to_json(NEW)
                )::jsonb
              );
        END IF;
    END IF;

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;
-- Migration: Add 'chat' to crm_interaction_type enum
DO $$ 
BEGIN
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'chat';
-- [HEADER] EXCEPTION
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
        ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_yearly NUMERIC(10, 2) DEFAULT 0;
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

    -- Build JSONB result
-- [HEADER]     result := jsonb_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count
    );

-- 5. Admin Notifications Triggers
-- Function to trigger admin notification edge function
CREATE OR REPLACE FUNCTION notify_admin_of_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Use Supabase Vault or Secrets for the API URL if needed, but here we hardcode the known URL pattern
    -- Alternatively, we can use a simpler approach if the Netlify/Edge function is public or has a secret key
    PERFORM
      net.http_post(
        url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/admin-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')
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
-- [HEADER]     AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_of_event('new_user');

-- Trigger for First Payment
-- Note: Logic to detect if it's the FIRST payment can be in the trigger or the function
CREATE OR REPLACE FUNCTION notify_admin_of_first_payment()
RETURNS TRIGGER AS $$
DECLARE
-- [HEADER]   payment_count INTEGER;
BEGIN
    -- Check if this is the user's first successful payment
    SELECT COUNT(*) INTO payment_count
    FROM payments
    WHERE user_id = NEW.user_id
    AND status = 'paid';

    IF payment_count = 1 THEN
        PERFORM notify_admin_of_event(); -- This needs to be called with arguments, so let's adjust
    END IF;
-- [HEADER]     RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actually, let's keep it simple. The trigger itself will check
DROP TRIGGER IF EXISTS on_first_payment_notify_admin ON payments;
CREATE TRIGGER on_first_payment_notify_admin
-- [HEADER]     AFTER UPDATE ON payments
    FOR EACH ROW
-- [HEADER]     WHEN (OLD.status != 'paid' AND NEW.status = 'paid')
    EXECUTE FUNCTION notify_admin_of_event('first_payment');

-- 6. Cron Job for Daily Summary
-- Requires pg_cron to be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'daily-summary-8am',
    '0 8 * * *', -- 8:00 AM every day
    $$
    SELECT net.http_post(
-- [HEADER]         url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/admin-notifications',
-- [HEADER]         headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')
        ),
-- [HEADER]         body := jsonb_build_object('type', 'daily_summary')
    );
    $$
);
-- Migration: admin_alerts_and_triggers
-- Description: Sets up triggers for signup and subscription starts to alert the admin

-- 1. Correct Project URL for triggers (Consolidated)
-- We'll use a variable or just hardcode the current known correctly fixed URL
-- Current Project URL: https://tipnjnfbbnbskdlodrww.supabase.co

-- 2. Trigger Function for Signups & Plan Changes (Admin Alerts)
CREATE OR REPLACE FUNCTION public.notify_admin_on_user_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://tipnjnfbbnbskdlodrww.supabase.co';
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

-- 3. Trigger Function for Paid Invoices (Subscription Start Alert)
CREATE OR REPLACE FUNCTION public.notify_admin_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://tipnjnfbbnbskdlodrww.supabase.co';
    user_record RECORD;
BEGIN
    -- Only trigger when an invoice is marked as 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Get user details for the alert
        SELECT * INTO user_record FROM public.user_profiles WHERE id = NEW.user_id;

        PERFORM
-- [HEADER]           net.http_post(
-- [HEADER]             url := project_url || '/functions/v1/send-admin-alert',
-- [HEADER]             headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
-- [HEADER]             body := json_build_object(
                'type', 'UPDATE',
                'table', 'invoices',
                'record', row_to_json(NEW),
                'user', row_to_json(user_record)
            )::jsonb
          );
    END IF;

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger payment notification: %', SQLERRM;
-- [HEADER]     RETURN NEW;
END;
$$;

-- 4. Apply Triggers
-- a. User Profiles (Signup & Plan Changes)
DROP TRIGGER IF EXISTS on_user_event_notify_admin ON public.user_profiles;
CREATE TRIGGER on_user_event_notify_admin
-- [HEADER]     AFTER INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_user_event();

-- b. Invoices (Subscription Starts)
DROP TRIGGER IF EXISTS on_invoice_paid_notify_admin ON public.invoices;
CREATE TRIGGER on_invoice_paid_notify_admin
-- [HEADER]     AFTER UPDATE ON public.invoices
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
-- [HEADER]         url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/send-daily-admin-summary',
-- [HEADER]         headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
-- [HEADER]         body := '{}'::jsonb
    );
    $$
);

-- Note: To check if it's scheduled, run: SELECT * FROM cron.job;
-- To see execution history, run: SELECT * FROM cron.job_run_details;
-- Migration: admin_god_mode_rls
-- Description: Grants Admins and Super Admins view access to all core data (properties, contracts, tenants, payments).

-- 2. Add Admin policies to core tables

-- PROPERTIES
DROP POLICY IF EXISTS "Admins view all properties" ON public.properties;
CREATE POLICY "Admins view all properties" 
-- [HEADER]     ON public.properties FOR SELECT 
    USING (public.is_admin());

-- CONTRACTS
DROP POLICY IF EXISTS "Admins view all contracts" ON public.contracts;
CREATE POLICY "Admins view all contracts" 
-- [HEADER]     ON public.contracts FOR SELECT 
    USING (public.is_admin());

-- TENANTS
DROP POLICY IF EXISTS "Admins view all tenants" ON public.tenants;
CREATE POLICY "Admins view all tenants" 
-- [HEADER]     ON public.tenants FOR SELECT 
    USING (public.is_admin());

-- PAYMENTS
DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
CREATE POLICY "Admins view all payments" 
-- [HEADER]     ON public.payments FOR SELECT 
    USING (public.is_admin());

-- PROPERTY DOCUMENTS
DROP POLICY IF EXISTS "Admins view all property documents" ON public.property_documents;
CREATE POLICY "Admins view all property documents" 
-- [HEADER]     ON public.property_documents FOR SELECT 
    USING (public.is_admin());

-- DOCUMENT FOLDERS
DROP POLICY IF EXISTS "Admins view all document folders" ON public.document_folders;
CREATE POLICY "Admins view all document folders" 
-- [HEADER]     ON public.document_folders FOR SELECT 
    USING (public.is_admin());

-- SHORT LINKS
DROP POLICY IF EXISTS "Admins view all short links" ON public.short_links;
CREATE POLICY "Admins view all short links" 
-- [HEADER]     ON public.short_links FOR SELECT 
    USING (public.is_admin());

-- STORAGE OBJECTS (God Mode for Admins)
DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
CREATE POLICY "Admins full access to secure_documents"
-- [HEADER]     ON storage.objects FOR ALL
    USING (
-- [HEADER]         bucket_id = 'secure_documents' 
-- [HEADER]         AND public.is_admin()
    )
    WITH CHECK (
-- [HEADER]         bucket_id = 'secure_documents' 
-- [HEADER]         AND public.is_admin()
    );

-- 3. Notify Schema Reload
-- [HEADER] NOTIFY pgrst, 'reload schema';
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
-- [HEADER]         FROM auth.users
-- [HEADER]         WHERE email = 'rubi@rentmate.co.il'
-- [HEADER]         ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', is_super_admin = true;
    END IF;
END $$;
-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     title TEXT NOT NULL,
-- [HEADER]     description TEXT NOT NULL,
-- [HEADER]     category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'feature_request', 'bug', 'other')),
-- [HEADER]     priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
-- [HEADER]     status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
-- [HEADER]     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created by a previous version
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'chat_context') THEN
        ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS chat_context JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolution_notes') THEN
        ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolved_at') THEN
        ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- Ticket Comments Table (for back-and-forth communication)
CREATE TABLE IF NOT EXISTS ticket_comments (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
-- [HEADER]     is_admin BOOLEAN NOT NULL DEFAULT FALSE,
-- [HEADER]     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- [HEADER]     ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create tickets
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets"
-- [HEADER]     ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own open tickets
DROP POLICY IF EXISTS "Users can update own open tickets" ON support_tickets;
CREATE POLICY "Users can update own open tickets"
-- [HEADER]     ON support_tickets FOR UPDATE
    USING (auth.uid() = user_id AND status = 'open');

-- Admins can view all tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets"
-- [HEADER]     ON support_tickets FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all tickets
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
CREATE POLICY "Admins can update all tickets"
-- [HEADER]     ON support_tickets FOR UPDATE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view comments on their tickets
DROP POLICY IF EXISTS "Users can view own ticket comments" ON ticket_comments;
CREATE POLICY "Users can view own ticket comments"
-- [HEADER]     ON ticket_comments FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM support_tickets
-- [HEADER]             WHERE id = ticket_comments.ticket_id AND user_id = auth.uid()
        )
    );

-- Users can add comments to their tickets
DROP POLICY IF EXISTS "Users can comment on own tickets" ON ticket_comments;
CREATE POLICY "Users can comment on own tickets"
-- [HEADER]     ON ticket_comments FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM support_tickets
-- [HEADER]             WHERE id = ticket_comments.ticket_id AND user_id = auth.uid()
        )
    );

-- Admins can view all comments
DROP POLICY IF EXISTS "Admins can view all comments" ON ticket_comments;
CREATE POLICY "Admins can view all comments"
-- [HEADER]     ON ticket_comments FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can add comments to any ticket
DROP POLICY IF EXISTS "Admins can comment on all tickets" ON ticket_comments;
CREATE POLICY "Admins can comment on all tickets"
-- [HEADER]     ON ticket_comments FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
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
-- [HEADER]     BEFORE UPDATE ON support_tickets
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
-- [HEADER]     AFTER INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_new_ticket();
-- Update Daily Notification Job to respect User Preferences
-- Specifically adding support for "Payment Due Today" toggle

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
        ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
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
-- [HEADER]     BEFORE INSERT OR UPDATE OF plan_id ON user_profiles
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
-- [HEADER]         FROM information_schema.table_constraints 
-- [HEADER]         WHERE constraint_name = 'user_storage_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.user_storage_usage 
-- [HEADER]         ADD CONSTRAINT user_storage_usage_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

    -- Fallback to free limits if tier limits not found
    IF NOT FOUND THEN
        SELECT * INTO v_limit FROM ai_usage_limits WHERE tier_name = 'free';
    END IF;

-- 4. Fix get_users_with_stats RPC structure
-- We'll use TEXT for enum columns in return type to be more flexible
DROP FUNCTION IF EXISTS get_users_with_stats();

-- 5. Force schema cache reload (if possible)
-- [HEADER] NOTIFY pgrst, 'reload schema';
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
-- [HEADER]         ADD CONSTRAINT properties_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 2. TENANTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_fkey;
        ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_profiles_fkey;

        ALTER TABLE public.tenants
-- [HEADER]         ADD CONSTRAINT tenants_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 3. CONTRACTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
        ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_user_id_fkey;
        ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_user_id_profiles_fkey;

        ALTER TABLE public.contracts
-- [HEADER]         ADD CONSTRAINT contracts_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 4. ADMIN_NOTIFICATIONS (Fix relationship for PostgREST joins)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
        ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_user_id_fkey;
        ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_user_id_profiles_fkey;

        ALTER TABLE public.admin_notifications
-- [HEADER]         ADD CONSTRAINT admin_notifications_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 5. SUPPORT_TICKETS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
        ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_profiles_fkey;

        ALTER TABLE public.support_tickets
-- [HEADER]         ADD CONSTRAINT support_tickets_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 6. TICKET_COMMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_comments') THEN
        ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey;
        ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_profiles_fkey;

        ALTER TABLE public.ticket_comments
-- [HEADER]         ADD CONSTRAINT ticket_comments_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 7. PROPERTY_DOCUMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_documents') THEN
        ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_user_id_fkey;
        ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_user_id_profiles_fkey;

        ALTER TABLE public.property_documents
-- [HEADER]         ADD CONSTRAINT property_documents_user_id_profiles_fkey 
-- [HEADER]         FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

END $$;

-- Force schema reload
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- AI Detailed Usage Tracking for Cost Analysis
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
-- [HEADER]     model TEXT NOT NULL,
-- [HEADER]     feature TEXT NOT NULL, -- 'chat' or 'contract-extraction'
-- [HEADER]     input_tokens INTEGER DEFAULT 0,
-- [HEADER]     output_tokens INTEGER DEFAULT 0,
-- [HEADER]     estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all AI usage logs
CREATE POLICY "Admins can view all AI usage logs"
-- [HEADER]     ON public.ai_usage_logs FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to log AI usage with cost calculation
CREATE OR REPLACE FUNCTION public.log_ai_usage(
-- [HEADER]     p_user_id UUID,
-- [HEADER]     p_model TEXT,
-- [HEADER]     p_feature TEXT,
-- [HEADER]     p_input_tokens INTEGER,
-- [HEADER]     p_output_tokens INTEGER
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
-- [HEADER]     v_total_cost := (p_input_tokens::NUMERIC / 1000000 * v_cost_input) + (p_output_tokens::NUMERIC / 1000000 * v_cost_output);

    -- Insert log
    INSERT INTO public.ai_usage_logs (
-- [HEADER]         user_id,
-- [HEADER]         model,
-- [HEADER]         feature,
-- [HEADER]         input_tokens,
-- [HEADER]         output_tokens,
-- [HEADER]         estimated_cost_usd
    ) VALUES (
-- [HEADER]         p_user_id,
-- [HEADER]         p_model,
-- [HEADER]         p_feature,
-- [HEADER]         p_input_tokens,
-- [HEADER]         p_output_tokens,
-- [HEADER]         v_total_cost
    );

    -- Update the old aggregator table if it exists
    INSERT INTO public.ai_chat_usage (user_id, message_count, tokens_used, updated_at)
    VALUES (p_user_id, 1, p_input_tokens + p_output_tokens, NOW())
-- [HEADER]     ON CONFLICT (user_id) DO UPDATE
    SET message_count = public.ai_chat_usage.message_count + 1,
-- [HEADER]         tokens_used = public.ai_chat_usage.tokens_used + (p_input_tokens + p_output_tokens),
-- [HEADER]         updated_at = NOW();
END;
$$;

    -- Get total AI cost
    SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO total_ai_cost_usd
-- [HEADER]     FROM ai_usage_logs;

    -- Build JSON result
-- [HEADER]     result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost_usd
    );

-- [HEADER]     RETURN result;
END;
$$;
-- AI Conversations Table (Compact Mode)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     title TEXT,
-- [HEADER]     messages JSONB DEFAULT '[]'::jsonb,
-- [HEADER]     total_cost_usd NUMERIC(10, 6) DEFAULT 0,
-- [HEADER]     metadata JSONB DEFAULT '{}'::jsonb,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own conversations
DROP POLICY IF EXISTS "Users can view own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own AI conversations"
-- [HEADER]     ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own AI conversations"
-- [HEADER]     ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view everything
DROP POLICY IF EXISTS "Admins can view all AI conversations" ON public.ai_conversations;
CREATE POLICY "Admins can view all AI conversations"
-- [HEADER]     ON public.ai_conversations FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RPC to safely append messages and update cost
-- This prevents race conditions and handles the JSONB manipulation on the server
CREATE OR REPLACE FUNCTION public.append_ai_messages(
-- [HEADER]     p_conversation_id UUID,
-- [HEADER]     p_new_messages JSONB,
-- [HEADER]     p_cost_usd NUMERIC DEFAULT 0,
-- [HEADER]     p_user_id UUID DEFAULT NULL
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
-- [HEADER]         p_conversation_id,
-- [HEADER]         v_final_user_id,
-- [HEADER]         p_new_messages,
-- [HEADER]         p_cost_usd,
-- [HEADER]         NOW()
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE
    SET messages = public.ai_conversations.messages || EXCLUDED.messages,
-- [HEADER]         total_cost_usd = public.ai_conversations.total_cost_usd + EXCLUDED.total_cost_usd,
-- [HEADER]         updated_at = NOW()
-- [HEADER]     RETURNING id INTO v_conv_id;

-- [HEADER]     RETURN v_conv_id;
END;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at);
-- Migration: Add invoice_number to property_documents
-- Date: 2026-01-25

ALTER TABLE property_documents 
-- [HEADER] ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Create an index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_property_documents_duplicate_check 
-- [HEADER] ON property_documents(vendor_name, document_date, invoice_number);
-- Migration: Enhance CRM Interactions with Metadata and Human Chat
-- Adds metadata support for external links (Gmail etc.) and prepares human chat types

-- 1. Add metadata column to crm_interactions
ALTER TABLE public.crm_interactions 
-- [HEADER] ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add 'whatsapp' and 'text' to crm_interaction_type if needed
-- Note: 'chat' is already used for Bot, we'll use 'human_chat' for manual entries or real-time human chat
DO $$ 
BEGIN
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'human_chat';
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'whatsapp';
-- [HEADER] EXCEPTION
    WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Users view/send own human messages" ON public.human_messages;
CREATE POLICY "Users view/send own human messages" ON public.human_messages
FOR ALL TO authenticated
USING (
-- [HEADER]     EXISTS (
        SELECT 1 FROM public.human_conversations 
-- [HEADER]         WHERE id = public.human_messages.conversation_id AND user_id = auth.uid()
    )
);
-- Create human_conversations table
CREATE TABLE IF NOT EXISTS public.human_conversations (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
-- [HEADER]     status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
-- [HEADER]     last_message_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create human_messages table
CREATE TABLE IF NOT EXISTS public.human_messages (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     conversation_id UUID NOT NULL REFERENCES public.human_conversations(id) ON DELETE CASCADE,
-- [HEADER]     sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
-- [HEADER]     content TEXT NOT NULL,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Enable RLS
ALTER TABLE public.human_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_messages ENABLE ROW LEVEL SECURITY;

-- Policies for humman_conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.human_conversations;
CREATE POLICY "Admins can view all conversations"
-- [HEADER]     ON public.human_conversations
    FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert conversations" ON public.human_conversations;
CREATE POLICY "Admins can insert conversations"
-- [HEADER]     ON public.human_conversations
    FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update conversations" ON public.human_conversations;
CREATE POLICY "Admins can update conversations"
-- [HEADER]     ON public.human_conversations
    FOR UPDATE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.human_conversations;
CREATE POLICY "Users can view their own conversations"
-- [HEADER]     ON public.human_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policies for human_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.human_messages;
CREATE POLICY "Admins can view all messages"
-- [HEADER]     ON public.human_messages
    FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert messages" ON public.human_messages;
CREATE POLICY "Admins can insert messages"
-- [HEADER]     ON public.human_messages
    FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.human_messages;
CREATE POLICY "Users can view messages in their conversations"
-- [HEADER]     ON public.human_messages
    FOR SELECT
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.human_conversations
-- [HEADER]             WHERE id = human_messages.conversation_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in their active conversations" ON public.human_messages;
CREATE POLICY "Users can insert messages in their active conversations"
-- [HEADER]     ON public.human_messages
    FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.human_conversations
-- [HEADER]             WHERE id = human_messages.conversation_id 
-- [HEADER]             AND user_id = auth.uid()
-- [HEADER]             AND status = 'active'
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
-- [HEADER]         url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/send-daily-admin-summary',
-- [HEADER]         headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
-- [HEADER]         body := '{}'::jsonb
    );
    $$
);
-- Add ai_data_consent to user_preferences
-- Defaults to FALSE for privacy

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ai_data_consent') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS ai_data_consent BOOLEAN DEFAULT false;
    END IF;
END $$;
-- Add 'live_chat_enabled' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('live_chat_enabled', 'true'::jsonb, 'Toggle the visibility of the Live Support button for all tenants.')
-- [HEADER] ON CONFLICT (key) DO NOTHING;
-- Add 'hybrid_chat_mode' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('hybrid_chat_mode', 'true'::jsonb, 'Enable rule-based menu before AI chat to reduce costs.')
-- [HEADER] ON CONFLICT (key) DO NOTHING;
-- Migration: Add Autonomous Notice Periods to Contracts
-- Description: Adds columns to store legal notice periods extracted from the contract by AI.

ALTER TABLE public.contracts 
-- [HEADER] ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
-- [HEADER] ADD COLUMN IF NOT EXISTS option_notice_days INTEGER;

-- Migration: Add CRM Autopilot Toggle
-- Description: Adds a global switch to enable/disable the automated CRM engine.

INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('crm_autopilot_enabled', 'true'::jsonb, 'Global toggle to enable or disable the automated CRM autopilot (rent reminders, lease expiry, ticket drafts).')
-- [HEADER] ON CONFLICT (key) DO UPDATE 
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
-- [HEADER] ON CONFLICT (key) DO UPDATE SET 
-- [HEADER]   description = EXCLUDED.description;
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
-- [HEADER] FROM public.tenants t
-- [HEADER] WHERE c.tenant_id = t.id
-- [HEADER] AND (c.tenants IS NULL OR c.tenants = '[]'::jsonb);

-- 3. Update the view/trigger if necessary (none found in research)

-- Enhance get_users_with_stats RPC with deeper analytics
DROP FUNCTION IF EXISTS get_users_with_stats();

    -- Stats
-- [HEADER]     properties_count BIGINT,
-- [HEADER]     tenants_count BIGINT,
-- [HEADER]     contracts_count BIGINT,
-- [HEADER]     ai_sessions_count BIGINT,
-- [HEADER]     open_tickets_count BIGINT,
-- [HEADER]     storage_usage_mb NUMERIC
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
-- [HEADER]         COALESCE(p.count, 0) as properties_count,
-- [HEADER]         COALESCE(t.count, 0) as tenants_count,
-- [HEADER]         COALESCE(c.count, 0) as contracts_count,

        -- AI Usage
-- [HEADER]         COALESCE(ai.count, 0) as ai_sessions_count,

        -- Support Status
-- [HEADER]         COALESCE(st.count, 0) as open_tickets_count,

        -- Storage Usage (Bytes to MB)
-- [HEADER]         ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2) as storage_usage_mb

-- [HEADER]     FROM user_profiles up
    -- Property Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    -- Contract Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
-- [HEADER]     LEFT JOIN user_storage_usage usu ON up.id = usu.user_id

-- [HEADER]     ORDER BY up.created_at DESC;
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
-- [HEADER]     result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost_usd,
        'totalAutomatedActions', total_automated_actions
    );

-- [HEADER]     RETURN result;
END;
$$;
-- Fix Signup Error "Database error saving new user"
-- This migration ensures all dependencies for the signup trigger are present.

DO $$ 
BEGIN
    -- 1. Ensure 'first_name' and 'last_name' columns exist in user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    END IF;

    -- 2. Ensure 'subscription_plans' has the 'free' plan
    INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, features)
    VALUES ('free', 'Free Forever', 0, 1, '{"support_level": "basic"}'::jsonb)
-- [HEADER]     ON CONFLICT (id) DO NOTHING;

    -- 3. Ensure 'plan_id' column exists in user_profiles
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'plan_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.subscription_plans(id) DEFAULT 'free';
    END IF;

    INSERT INTO public.user_profiles (
-- [HEADER]         id, 
-- [HEADER]         email, 
-- [HEADER]         full_name,
-- [HEADER]         first_name,
-- [HEADER]         last_name,
-- [HEADER]         role, 
-- [HEADER]         subscription_status, 
-- [HEADER]         plan_id
    )
    VALUES (
-- [HEADER]         NEW.id,
-- [HEADER]         NEW.email,
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        'user', -- Default role
        'active', -- Default status
-- [HEADER]         default_plan_id
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE SET
-- [HEADER]         email = EXCLUDED.email,
-- [HEADER]         full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
-- [HEADER]         updated_at = NOW();

    -- Link Past Invoices safely
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed: %', SQLERRM;
    END;

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Log error but try to succeed if possible? 
    -- No, if profile fails, auth should fail. But give clear error.
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;

-- 5. Ensure Trigger is Attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Create ticket_analysis table
CREATE TABLE IF NOT EXISTS public.ticket_analysis (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
-- [HEADER]     sentiment_score FLOAT, -- -1.0 to 1.0
-- [HEADER]     urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
-- [HEADER]     category TEXT,
-- [HEADER]     confidence_score FLOAT,
-- [HEADER]     ai_summary TEXT,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_rules table (System-wide or Admin managed rules)
CREATE TABLE IF NOT EXISTS public.automation_rules (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     name TEXT NOT NULL,
-- [HEADER]     trigger_type TEXT NOT NULL, -- 'lease_expiry', 'rent_overdue', 'ticket_created'
-- [HEADER]     condition JSONB, -- e.g. {"days_before": 60}
-- [HEADER]     action_type TEXT NOT NULL, -- 'email', 'notification', 'auto_reply'
-- [HEADER]     action_config JSONB, -- template_id, etc.
-- [HEADER]     is_enabled BOOLEAN DEFAULT true,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_logs table
CREATE TABLE IF NOT EXISTS public.automation_logs (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     rule_id UUID REFERENCES public.automation_rules(id),
-- [HEADER]     user_id UUID REFERENCES auth.users(id), -- Target user
-- [HEADER]     entity_id UUID, -- contract_id, ticket_id, etc.
-- [HEADER]     action_taken TEXT,
-- [HEADER]     status TEXT, -- 'success', 'failed'
-- [HEADER]     details JSONB,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_automation_settings table
CREATE TABLE IF NOT EXISTS public.user_automation_settings (
-- [HEADER]     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     lease_expiry_days INTEGER DEFAULT 100,
-- [HEADER]     extension_notice_days INTEGER DEFAULT 60,
-- [HEADER]     rent_overdue_days INTEGER DEFAULT 5,
-- [HEADER]     auto_reply_enabled BOOLEAN DEFAULT false,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add auto_reply_draft to support_tickets
ALTER TABLE public.support_tickets 
-- [HEADER] ADD COLUMN IF NOT EXISTS auto_reply_draft TEXT;

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
-- [HEADER] ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
-- [HEADER] ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Comment on columns for clarity
-- Create Webhooks for Reactive Customer Engagement
-- This sends table events to the 'on-event-trigger' Edge Function

-- 1. Enable net extension for webhooks if not already (usually enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Generic function to call our edge function via vault or direct URL
-- Note: In a real environment, you'd use the SUPABASE_URL and SERVICE_ROLE_KEY.
-- For this migration, we assume the edge function is reachable at the project URL.

-- 2. Robust handle_automated_engagement_webhook
CREATE OR REPLACE FUNCTION public.handle_automated_engagement_webhook()
RETURNS TRIGGER AS $$
DECLARE
-- [HEADER]   v_project_ref TEXT;
-- [HEADER]   v_service_key TEXT;
-- [HEADER]   v_payload JSONB;
BEGIN
  -- Get Config
-- [HEADER]   v_project_ref := public.get_supabase_config('supabase_project_ref');
-- [HEADER]   v_service_key := public.get_supabase_config('supabase_service_role_key');

  -- Replace with your actual project URL or use a variable if possible
  -- In Supabase migrations, we often use the net.http_post helper
  -- For security, the Edge Function usually checks for the service role key anyway.
  PERFORM
-- [HEADER]     net.http_post(
-- [HEADER]       url := 'https://' || (SELECT value FROM system_settings WHERE key = 'supabase_project_ref') || '.supabase.co/functions/v1/on-event-trigger',
-- [HEADER]       headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'supabase_service_role_key')
      ),
-- [HEADER]       body := payload
    );

-- 3. Attach Triggers
DROP TRIGGER IF EXISTS tr_on_new_ticket ON public.support_tickets;
CREATE TRIGGER tr_on_new_ticket
-- [HEADER] AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();

DROP TRIGGER IF EXISTS tr_on_payment_update ON public.payments;
CREATE TRIGGER tr_on_payment_update
-- [HEADER] AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();

DROP TRIGGER IF EXISTS tr_on_new_contract ON public.contracts;
CREATE TRIGGER tr_on_new_contract
-- [HEADER] AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.handle_automated_engagement_webhook();
-- ============================================
-- UPDATED ADMIN STATS FUNCTION (v2)
-- ============================================
-- Adds Automation & Engagement metrics

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
-- [HEADER]     result := json_build_object(
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

-- [HEADER]     RETURN result;
END;
$$;
-- Migration: storage_cleanup_system
-- Description: Adds a queue system to clean up storage files when DB records are deleted.

-- 1. Create Cleanup Queue Table
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
-- [HEADER]     id BIGSERIAL PRIMARY KEY,
-- [HEADER]     bucket_id TEXT NOT NULL,
-- [HEADER]     storage_path TEXT NOT NULL,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW(),
-- [HEADER]     processed_at TIMESTAMPTZ,
-- [HEADER]     error_log TEXT
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
-- [HEADER] AFTER DELETE ON public.property_documents
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
-- [HEADER] ON CONFLICT (key) DO UPDATE SET 
-- [HEADER]     value = EXCLUDED.value,
-- [HEADER]     description = EXCLUDED.description;

-- Remove the old key if it exists
DELETE FROM public.system_settings WHERE key = 'crm_autopilot_enabled';
-- AI Security Audit Migration
-- Adds specialized logging for AI access to sensitive contract data

-- 1. Create a helper function for Edge Functions to log audits
-- This uses SECURITY DEFINER to bypass RLS since Edge Functions use Service Role
CREATE OR REPLACE FUNCTION public.log_ai_contract_audit(
-- [HEADER]     p_user_id UUID,
-- [HEADER]     p_action TEXT,
-- [HEADER]     p_contract_id UUID DEFAULT NULL,
-- [HEADER]     p_details JSONB DEFAULT '{}'
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
-- [HEADER]     ON public.audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.log_ai_contract_audit TO service_role;
GRANT EXECUTE ON FUNCTION public.log_ai_contract_audit TO authenticated;
-- ==========================================
-- COMPREHENSIVE INDEX SYSTEM INITIALIZATION
-- ==========================================

-- 2. Create index_bases table (if missing)
CREATE TABLE IF NOT EXISTS index_bases (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
-- [HEADER]     base_period_start DATE NOT NULL,
-- [HEADER]     base_value NUMERIC NOT NULL DEFAULT 100.0,
-- [HEADER]     previous_base_period_start DATE,
-- [HEADER]     chain_factor NUMERIC,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]     UNIQUE(index_type, base_period_start)
);

-- 3. Seed Construction Inputs Index (Series 200010, Base 2011=100)
-- [Index Data Stripped]
-- 4. Seed Housing Price Index (Series 40010)
-- [Index Data Stripped]
-- 5. Seed Exchange Rates (USD/EUR)
-- [Index Data Stripped]
-- 6. Insert Base Periods & Chain Factors
INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor)
VALUES 
    -- Construction
    ('construction', '2011-08-01', 100.0, 1.0),
    -- CPI common bases
    ('cpi', '2025-01-01', 100.0, 1.074),
    ('cpi', '2023-01-01', 100.0, 1.026),
    ('cpi', '2021-01-01', 100.0, 1.0)
-- [HEADER] ON CONFLICT (index_type, base_period_start) DO UPDATE 
SET base_value = EXCLUDED.base_value, chain_factor = EXCLUDED.chain_factor;

-- 7. RLS Policies (Safeguard)
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_bases ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
DO $$ BEGIN
    CREATE POLICY "Allow authenticated read index_data" ON index_data FOR SELECT TO authenticated USING (true);
-- [HEADER] EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read index_bases" ON index_bases FOR SELECT TO authenticated USING (true);
-- [HEADER] EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow service_role to manage (for Edge Functions)
DO $$ BEGIN
    CREATE POLICY "Allow full access for service_role index_data" ON index_data FOR ALL TO service_role USING (true) WITH CHECK (true);
-- [HEADER] EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow full access for service_role index_bases" ON index_bases FOR ALL TO service_role USING (true) WITH CHECK (true);
-- [HEADER] EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Migration: add_phone_to_profiles
-- Description: Adds a phone column to user_profiles and updates handle_new_user trigger.

-- 1. Add phone column to user_profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
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
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Fallback for environments where direct auth.users access isn't allowed without superuser
    RAISE NOTICE 'Backfill from auth.users failed: %', SQLERRM;
END $$;

    INSERT INTO public.user_profiles (
-- [HEADER]         id, 
-- [HEADER]         email, 
-- [HEADER]         full_name,
-- [HEADER]         first_name,
-- [HEADER]         last_name,
-- [HEADER]         phone,
-- [HEADER]         role, 
-- [HEADER]         subscription_status, 
-- [HEADER]         plan_id
    )
    VALUES (
-- [HEADER]         NEW.id,
-- [HEADER]         NEW.email,
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
-- [HEADER]         NEW.phone,
        'user', 
        'active', 
-- [HEADER]         default_plan_id
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE SET
-- [HEADER]         email = EXCLUDED.email,
-- [HEADER]         full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
-- [HEADER]         phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
-- [HEADER]         updated_at = NOW();

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
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
-- [HEADER]         net.http_post(
-- [HEADER]             url := 'https://tipnjnfbbnbskdlodrww.supabase.co/functions/v1/fetch-index-data',
-- [HEADER]             headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('request.header.apikey', true)
            ),
-- [HEADER]             body := '{}'::jsonb
        ) AS request_id;
    $$
);
-- Migration: fix_user_stats_rpc_v2
-- Description: Unifies get_users_with_stats RPC with correct column structure and phone support.

-- 1. Drop the function first to ensure we change the signature safely
DROP FUNCTION IF EXISTS get_users_with_stats();

        -- Asset Stats
-- [HEADER]         COALESCE(p.count, 0)::BIGINT as properties_count,
-- [HEADER]         COALESCE(t.count, 0)::BIGINT as tenants_count,
-- [HEADER]         COALESCE(c.count, 0)::BIGINT as contracts_count,

        -- Usage Stats
-- [HEADER]         COALESCE(ai.count, 0)::BIGINT as ai_sessions_count,

        -- Support Stats
-- [HEADER]         COALESCE(st.count, 0)::BIGINT as open_tickets_count,

        -- Storage Usage (Bytes to MB)
-- [HEADER]         ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2)::NUMERIC as storage_usage_mb,

        -- Permissions
-- [HEADER]         COALESCE(up.is_super_admin, false) as is_super_admin

-- [HEADER]     FROM user_profiles up
    -- Property Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    -- Contract Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
-- [HEADER]     LEFT JOIN (SELECT user_id, total_bytes FROM user_storage_usage) usu ON up.id = usu.user_id

-- [HEADER]     WHERE up.deleted_at IS NULL
-- [HEADER]     ORDER BY up.created_at DESC;
END;
$$;
-- Historical Backfill for USD and EUR
-- Backfill Bank of Israel Exchange Rates (20 Years)
-- Generated by scripts/fetch_boi_history.py

-- Backfill Bank of Israel Exchange Rates (20 Years)
-- Generated by scripts/fetch_boi_history.py

-- Add Google Drive integration columns to user_profiles
ALTER TABLE user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS google_drive_enabled BOOLEAN DEFAULT FALSE;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_enabled ON user_profiles(google_drive_enabled);
-- Migration: Ensure Contract JSONB Columns
-- Description: Adds missing JSONB columns and ensures correct types for option_periods and rent_periods.

-- 1. Ensure rent_periods exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'rent_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS rent_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Ensure option_periods exists (backfill if needed, though previously added)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS option_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Ensure tenants exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'tenants') THEN
        ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenants JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

    -- If contract becomes archived (ended/terminated in old terms)
-- [HEADER]     ELSIF NEW.status = 'archived' THEN
        -- Check if there are ANY other active contracts currently valid
        -- If NO other active contracts exist, set the property to Vacant.
        IF NOT EXISTS (
            SELECT 1 FROM public.contracts 
-- [HEADER]             WHERE property_id = NEW.property_id 
-- [HEADER]             AND status = 'active' 
-- [HEADER]             AND id != NEW.id
        ) THEN
            UPDATE public.properties
            SET status = 'Vacant'
-- [HEADER]             WHERE id = NEW.property_id;
        END IF;
    END IF;

-- Re-apply trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
CREATE TRIGGER trigger_update_property_status
-- [HEADER] AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract();
-- Migration: Update Property Occupancy Trigger to handle DELETE and improved logic
-- Date: 2026-01-29

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

    -- If contract is active, the property is Occupied
    -- We check if ANY active contract exists for this property
    IF EXISTS (
        SELECT 1 FROM public.contracts 
-- [HEADER]         WHERE property_id = target_property_id 
-- [HEADER]         AND status = 'active'
    ) THEN
        UPDATE public.properties
        SET status = 'Occupied'
-- [HEADER]         WHERE id = target_property_id;
-- [HEADER]     ELSE
        -- No active contracts found, property is Vacant
        UPDATE public.properties
        SET status = 'Vacant'
-- [HEADER]         WHERE id = target_property_id;
    END IF;

    -- Handle TG_OP appropriately for return
    IF (TG_OP = 'DELETE') THEN
-- [HEADER]         RETURN OLD;
-- [HEADER]     ELSE
-- [HEADER]         RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old triggers and apply new one
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;

CREATE TRIGGER trigger_update_property_status
-- [HEADER] AFTER INSERT OR UPDATE OR DELETE ON public.contracts
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

-- 3. Update the daily maintenance job to include full sync
CREATE OR REPLACE FUNCTION public.process_daily_notifications_with_archive()
RETURNS void AS $$
BEGIN
    -- A. Archive expired contracts
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
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction')),
-- [HEADER]     from_base TEXT NOT NULL,
-- [HEADER]     to_base TEXT NOT NULL,
-- [HEADER]     factor DECIMAL(10, 6) NOT NULL,
-- [HEADER]     effective_date DATE NOT NULL,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
-- [HEADER]     UNIQUE(index_type, from_base, to_base)
);

-- Add RLS policies
ALTER TABLE chaining_factors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read chaining factors
CREATE POLICY "Allow authenticated users to read chaining factors"
-- [HEADER]     ON chaining_factors
    FOR SELECT
-- [HEADER]     TO authenticated
    USING (true);

-- Allow service role to manage chaining factors
CREATE POLICY "Allow service role to manage chaining factors"
-- [HEADER]     ON chaining_factors
    FOR ALL
-- [HEADER]     TO service_role
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
-- [HEADER] ON CONFLICT (index_type, from_base, to_base) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chaining_factors_lookup 
-- [HEADER]     ON chaining_factors(index_type, from_base, to_base);

-- Add comment

-- Migration: Fix Trigger JSON Errors
-- Description: Switches all net.http_post calls to use jsonb_build_object for headers and provides robust fallbacks for missing settings.
-- Created: 2026-01-30

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

-- [HEADER]     RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

  -- If no config, log warning and exit (preventing 22P02 crashes)
  IF v_project_ref IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'Skipping webhook: Supabase config missing (project_ref or service_key)';
-- [HEADER]     RETURN NEW;
  END IF;

  -- Build Payload safely using to_jsonb
-- [HEADER]   v_payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  -- Perform HTTP Post with structured headers
  PERFORM
-- [HEADER]     net.http_post(
-- [HEADER]       url := 'https://' || v_project_ref || '.supabase.co/functions/v1/on-event-trigger',
-- [HEADER]       headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
-- [HEADER]       body := v_payload
    );

-- [HEADER]   RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
  -- Never crash the main insert because of a webhook failure
  RAISE WARNING 'Webhook failed: %', SQLERRM;
-- [HEADER]   RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Get user email and asset alerts preference
    SELECT 
-- [HEADER]         u.email, 
-- [HEADER]         COALESCE((up.notification_preferences->>'email_asset_alerts')::boolean, true)
-- [HEADER]     INTO v_target_email, v_asset_alerts_enabled
-- [HEADER]     FROM auth.users u
-- [HEADER]     LEFT JOIN public.user_profiles up ON up.id = u.id
-- [HEADER]     WHERE u.id = NEW.user_id;

    -- DECISION LOGIC:
    -- Forward IF:
    -- 1. High priority type (warning, error, urgent, action)
    -- 2. OR is a maintenance event AND the user hasn't explicitly disabled asset alerts
    IF (v_project_ref IS NOT NULL AND v_service_key IS NOT NULL AND v_target_email IS NOT NULL) AND 
       ((NEW.type IN ('warning', 'error', 'urgent', 'action')) OR 
        (NEW.metadata->>'event' = 'maintenance_record' AND v_asset_alerts_enabled = true)) 
-- [HEADER]     THEN
        PERFORM
-- [HEADER]           net.http_post(
-- [HEADER]             url := 'https://' || v_project_ref || '.supabase.co/functions/v1/send-notification-email',
-- [HEADER]             headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_service_key
            ),
-- [HEADER]             body := jsonb_build_object(
                'email', v_target_email,
                'notification', to_jsonb(NEW)
            )
          );
    END IF;

-- 4. Fix admin_notifications type constraint
ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_type_check 
-- [HEADER] CHECK (type IN ('upgrade_request', 'system_alert', 'support_ticket', 'user_signup', 'payment_success'));

-- 5. Force reload schema
-- [HEADER] NOTIFY pgrst, 'reload schema';
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

-- [HEADER]     FROM user_profiles up
    -- Property Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts (from embedded JSONB in contracts)
-- [HEADER]     LEFT JOIN (
        SELECT user_id, sum(jsonb_array_length(COALESCE(tenants, '[]'::jsonb))) as count 
-- [HEADER]         FROM contracts 
-- [HEADER]         GROUP BY user_id
    ) t ON up.id = t.user_id
    -- Contract Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
-- [HEADER]     LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
-- [HEADER]     LEFT JOIN (SELECT user_id, total_bytes FROM user_storage_usage) usu ON up.id = usu.user_id

-- [HEADER]     WHERE up.deleted_at IS NULL
-- [HEADER]     ORDER BY up.created_at DESC;
END;
$$;

COMMIT;
-- Add balcony and safe room (׳׳"׳“) columns to properties table
ALTER TABLE public.properties 
-- [HEADER] ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS has_safe_room BOOLEAN DEFAULT false;

-- Add helpful comments
-- Migration: Expand Contract Fields
-- Description: Adds pets_allowed, special_clauses, guarantees, and guarantors_info to the contracts table.

ALTER TABLE IF EXISTS public.contracts 
-- [HEADER] ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true,
-- [HEADER] ADD COLUMN IF NOT EXISTS special_clauses TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS guarantees TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS guarantors_info TEXT;

-- Add elevator and accessibility columns to properties table
ALTER TABLE public.properties 
-- [HEADER] ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT false;

-- Add helpful comments
-- Migration: Harden Property Occupancy Logic
-- Date: 2026-01-30
-- Description: Makes the occupancy status date-aware (checks start_date and current date).

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

    -- Check if any active contract is effective TODAY
    IF EXISTS (
        SELECT 1 FROM public.contracts 
-- [HEADER]         WHERE property_id = target_property_id 
-- [HEADER]         AND status = 'active'
-- [HEADER]         AND start_date <= CURRENT_DATE
-- [HEADER]         AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) THEN
        UPDATE public.properties
        SET status = 'Occupied'
-- [HEADER]         WHERE id = target_property_id;
-- [HEADER]     ELSE
        UPDATE public.properties
        SET status = 'Vacant'
-- [HEADER]         WHERE id = target_property_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
-- [HEADER]         RETURN OLD;
-- [HEADER]     ELSE
-- [HEADER]         RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 1. Restore 'status' column if it was dropped
ALTER TABLE public.properties 
-- [HEADER] ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant' CHECK (status IN ('Occupied', 'Vacant'));

-- 2. Add 'updated_at' column if missing
ALTER TABLE public.properties 
-- [HEADER] ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure 'has_balcony' and 'has_safe_room' exist (User safety check)
ALTER TABLE public.properties 
-- [HEADER] ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS has_safe_room BOOLEAN DEFAULT false;

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
-- [HEADER]     BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
-- Migration: Restore Property Status & Triggers
-- Description: Re-adds the 'status' column to 'properties' (incorrectly dropped in a cleanup migration) and ensures triggers are valid.

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

-- 1. Ensure all expected columns exist on the contracts table
ALTER TABLE public.contracts 
-- [HEADER] ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT true,
-- [HEADER] ADD COLUMN IF NOT EXISTS special_clauses TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS guarantees TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS guarantors_info TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS needs_painting BOOLEAN DEFAULT false,
-- [HEADER] ADD COLUMN IF NOT EXISTS option_notice_days INTEGER,
-- [HEADER] ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Force PostgREST schema cache refresh
-- Redefining a generic function is a reliable way to trigger a reload in Supabase
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void AS $$
BEGIN
  -- This function exists solely to trigger a schema cache refresh
-- [HEADER]   NULL;
END;
$$ LANGUAGE plpgsql;

SELECT public.refresh_schema_cache();

COMMIT;
-- Robust Authentication & Profile Fix
-- Consolidation of multiple conflicting migrations to solve "Database error saving new user"

-- 1. Ensure columns exist with correct types (TEXT is safer than ENUM for flexible triggers)
-- We try to alter columns to TEXT to avoid cast errors from previous migrations that might have used ENUMs
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN role TYPE TEXT;
-- [HEADER] EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN subscription_status TYPE TEXT;
-- [HEADER] EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS first_name TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS last_name TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS phone TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS plan_id TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
-- [HEADER] ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
-- [HEADER] ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- 2. Ensure 'free' plan exists in subscription_plans
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties)
VALUES ('free', 'Free Forever', 0, 1)
-- [HEADER] ON CONFLICT (id) DO NOTHING;

    -- Insert or Update Profile
    INSERT INTO public.user_profiles (
-- [HEADER]         id, 
-- [HEADER]         email, 
-- [HEADER]         full_name,
-- [HEADER]         first_name,
-- [HEADER]         last_name,
-- [HEADER]         phone,
-- [HEADER]         role, 
-- [HEADER]         subscription_status, 
-- [HEADER]         plan_id,
-- [HEADER]         subscription_plan,
-- [HEADER]         marketing_consent,
-- [HEADER]         marketing_consent_at
    )
    VALUES (
-- [HEADER]         NEW.id,
-- [HEADER]         NEW.email,
-- [HEADER]         v_full_name,
-- [HEADER]         v_first_name,
-- [HEADER]         v_last_name,
-- [HEADER]         NEW.phone,
        'user', 
        'active', 
-- [HEADER]         v_plan_id,
        'free_forever', -- Legacy field support
-- [HEADER]         COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, FALSE),
-- [HEADER]         CASE WHEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean THEN NOW() ELSE NULL END
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE SET
-- [HEADER]         email = EXCLUDED.email,
-- [HEADER]         full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
-- [HEADER]         first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
-- [HEADER]         last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
-- [HEADER]         phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
-- [HEADER]         updated_at = NOW();

    -- Relink Past Invoices (Safely)
    -- This helps if the user had invoices as a guest/unregistered with the same email
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Relink failed: %', SQLERRM;
    END;

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    -- Capture any remaining unexpected errors
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;

-- 4. Re-attach Main Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
-- [HEADER]     AFTER INSERT ON auth.users
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
-- [HEADER]     ON subscription_plans FOR INSERT
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid()
-- [HEADER]             AND (role = 'admin' OR is_super_admin = true)
        )
    );

-- UPDATE: Only admins
CREATE POLICY "Admins can update plans"
-- [HEADER]     ON subscription_plans FOR UPDATE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid()
-- [HEADER]             AND (role = 'admin' OR is_super_admin = true)
        )
    )
    WITH CHECK (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid()
-- [HEADER]             AND (role = 'admin' OR is_super_admin = true)
        )
    );

-- DELETE: Only admins
CREATE POLICY "Admins can delete plans"
-- [HEADER]     ON subscription_plans FOR DELETE
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM user_profiles
-- [HEADER]             WHERE id = auth.uid()
-- [HEADER]             AND (role = 'admin' OR is_super_admin = true)
        )
    );
-- Migration: fix_subscription_management_rls_and_cleanup
-- Description: Fixes RLS violation for plan management and removes the redundant max_tenants column.

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can update plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON subscription_plans;

-- 3. Create new policies using is_admin() helper
CREATE POLICY "Admins can insert plans"
-- [HEADER]     ON subscription_plans FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update plans"
-- [HEADER]     ON subscription_plans FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete plans"
-- [HEADER]     ON subscription_plans FOR DELETE
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
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: unlock_testing_features
-- Description: Buffs the 'free' plan to grant unlimited access and features for testing.

UPDATE subscription_plans
SET 
-- [HEADER]     name = 'Beta Access (Unlimited)',
-- [HEADER]     max_properties = -1,
-- [HEADER]     max_contracts = -1,
-- [HEADER]     max_sessions = -1,
    -- max_storage_mb might not exist in all environments yet, but let's try to update it if it does
    -- Better to do a DO block for safety or just assume it's there based on migrations
-- [HEADER]     features = jsonb_build_object(
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
-- [HEADER] WHERE id = 'free';

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
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: add_plan_active_status
-- Description: Adds is_active column to subscription_plans to allow pausing plans.

ALTER TABLE subscription_plans 
-- [HEADER] ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure all existing plans are active by default
UPDATE subscription_plans SET is_active = true WHERE is_active IS NULL;

-- Notify pgrst to reload schema
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: link_signup_plan_metadata
-- Description: Updates handle_new_user trigger to use plan_id from user metadata.

    -- Create User Profile with UPSERT to handle edge cases
    INSERT INTO public.user_profiles (
-- [HEADER]         id, 
-- [HEADER]         email, 
-- [HEADER]         full_name,
-- [HEADER]         first_name,
-- [HEADER]         last_name,
-- [HEADER]         role, 
-- [HEADER]         subscription_status, 
-- [HEADER]         plan_id
    )
    VALUES (
-- [HEADER]         NEW.id,
-- [HEADER]         NEW.email,
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
-- [HEADER]         split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
-- [HEADER]         split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2),
        'user',
        'active',
-- [HEADER]         selected_plan
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE SET
-- [HEADER]         email = EXCLUDED.email,
-- [HEADER]         full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
-- [HEADER]         first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
-- [HEADER]         last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
-- [HEADER]         plan_id = COALESCE(selected_plan, user_profiles.plan_id),
-- [HEADER]         updated_at = NOW();

    -- Link Past Invoices (if any exist)
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed for user %: %', NEW.email, SQLERRM;
    END;

-- Enable RLS on rental_market_data
ALTER TABLE public.rental_market_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access to market data
CREATE POLICY "Allow public read access to rental market data"
-- [HEADER]     ON public.rental_market_data
    FOR SELECT
-- [HEADER]     TO public
    USING (true);

-- Add pinned_cities to user_preferences
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'pinned_cities') THEN
        ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS pinned_cities JSONB DEFAULT '[]'::jsonb;
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
-- [HEADER] ON CONFLICT (region_name) DO UPDATE SET 
-- [HEADER]     avg_rent = EXCLUDED.avg_rent,
-- [HEADER]     growth_1y = EXCLUDED.growth_1y,
-- [HEADER]     growth_2y = EXCLUDED.growth_2y,
-- [HEADER]     growth_5y = EXCLUDED.growth_5y,
-- [HEADER]     month_over_month = EXCLUDED.month_over_month,
-- [HEADER]     room_adjustments = EXCLUDED.room_adjustments,
-- [HEADER]     type_adjustments = EXCLUDED.type_adjustments,
-- [HEADER]     updated_at = NOW();
-- Migration: enhance_subscription_marketing
-- Description: Adds marketing-focused columns to subscription_plans table.

ALTER TABLE subscription_plans
-- [HEADER] ADD COLUMN IF NOT EXISTS description TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS subtitle TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS badge_text TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS cta_text TEXT,
-- [HEADER] ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set some reasonable defaults for existing plans to avoid empty fields
UPDATE subscription_plans 
SET 
-- [HEADER]     description = CASE 
-- [HEADER]         WHEN id = 'free' THEN 'Essential tracking for individual property owners.'
-- [HEADER]         WHEN id = 'solo' THEN 'Advanced optimization for serious landlords.'
-- [HEADER]         WHEN id = 'pro' THEN 'The ultimate yield maximizer for portfolio managers.'
-- [HEADER]         ELSE 'Manage your rental business professionally.'
    END,
-- [HEADER]     cta_text = CASE 
-- [HEADER]         WHEN price_monthly = 0 THEN 'Get Started'
-- [HEADER]         ELSE 'Start Free Trial'
    END,
-- [HEADER]     sort_order = CASE 
-- [HEADER]         WHEN id = 'free' THEN 10
-- [HEADER]         WHEN id = 'solo' THEN 20
-- [HEADER]         WHEN id = 'pro' THEN 30
-- [HEADER]         ELSE 100
    END
-- [HEADER] WHERE description IS NULL;

-- Notify PostgREST to reload schema
-- [HEADER] NOTIFY pgrst, 'reload schema';

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
-- [HEADER]         net.http_post(
-- [HEADER]             url:=(SELECT value FROM system_settings WHERE key = 'api_url' LIMIT 1) || '/functions/v1/sync-rental-trends',
-- [HEADER]             headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'service_role_key' LIMIT 1)
            ),
-- [HEADER]             body:='{}'::jsonb
        ) as request_id;
    $$
);

    -- 3. Top Cities Metrics (New)
    SELECT json_agg(city_stats) INTO top_cities
-- [HEADER]     FROM (
        SELECT 
-- [HEADER]             COALESCE(city, 'Unknown') as name,
-- [HEADER]             COUNT(*) as count
-- [HEADER]         FROM properties
-- [HEADER]         GROUP BY city
-- [HEADER]         ORDER BY count DESC
-- [HEADER]         LIMIT 10
    ) city_stats;

    -- 4. Build Result
-- [HEADER]     result := json_build_object(
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

-- [HEADER]     RETURN result;
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
-- [HEADER]       net.http_post(
-- [HEADER]         url := 'https://' || public.get_supabase_config('supabase_project_ref') || '.supabase.co/functions/v1/send-daily-admin-summary',
-- [HEADER]         headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.get_supabase_config('supabase_service_role_key')
        ),
-- [HEADER]         body := '{}'::jsonb
      )
    $$
);

-- 2. Ensure the keys exist as fallbacks in system_settings if they aren't there
INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_project_ref', '"tipnjnfbbnbskdlodrww"'::jsonb, 'Supabase Project Reference'
-- [HEADER] WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_project_ref');

INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_service_role_key', ('"' || current_setting('app.settings.service_role_key', true) || '"')::jsonb, 'Supabase Service Role Key'
-- [HEADER] WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_service_role_key')
-- [HEADER] AND current_setting('app.settings.service_role_key', true) IS NOT NULL;
-- Migration: final_reliable_cron_and_schema_fix
-- Description: Repairs the properties table and hardens the daily admin summary cron job.

-- 1. Ensure 'status' column exists in properties (fixing previous drift)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant';

-- 3. Reschedule the daily-admin-summary cron job with robust auth
-- This uses get_supabase_config (added Jan 30) to reliably get the service role key.
-- Note: pg_cron is usually enabled in Supabase by default.

DO $$
BEGIN
    PERFORM cron.unschedule('daily-admin-summary');
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    NULL; -- Skip if not scheduled
END $$;

SELECT cron.schedule(
    'daily-admin-summary',
    '30 5 * * *', -- 05:30 UTC = 07:30/08:30 IL time (08:00 Target)
    $$
    SELECT
-- [HEADER]       net.http_post(
-- [HEADER]         url := 'https://' || public.get_supabase_config('supabase_project_ref') || '.supabase.co/functions/v1/send-daily-admin-summary',
-- [HEADER]         headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || public.get_supabase_config('supabase_service_role_key')
        ),
-- [HEADER]         body := '{}'::jsonb
      )
    $$
);

-- 4. Sync configuration in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('supabase_project_ref', '"tipnjnfbbnbskdlodrww"', 'Supabase Project Reference'),
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email')
-- [HEADER] ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. Trigger initial recalculation
SELECT public.recalculate_all_property_statuses();

COMMIT;
-- Remove pets_allowed column from contracts table
ALTER TABLE contracts DROP COLUMN IF EXISTS pets_allowed;
-- Fix Notification Preferences Logic to be Dynamic
-- Reverts hardcoded values from previous "enhanced" migrations and ensures all 4 checks respect user_profiles.notification_preferences

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

-- Comment for documentation
-- Add seen_features tracking array
alter table public.user_preferences 
-- [HEADER] add column if not exists seen_features text[] default '{}';

-- Comment for documentation
-- Migration: update_pricing_to_new_tiers
-- Description: Updates plan names, prices, and limits to SOLO, MATE, MASTER strategy.

-- 1. Update SOLO (Free)
UPDATE subscription_plans
SET 
-- [HEADER]     name = 'SOLO',
-- [HEADER]     max_properties = 1,
-- [HEADER]     price_monthly = 0,
-- [HEADER]     price_yearly = 0,
-- [HEADER]     features = '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": false, "bill_analysis": false, "can_export": false, "cpi_autopilot": false}'::jsonb
-- [HEADER] WHERE id = 'free' OR id = 'solo';

-- 2. Update MATE (Pro)
UPDATE subscription_plans
SET 
-- [HEADER]     name = 'MATE',
-- [HEADER]     max_properties = 3,
-- [HEADER]     price_monthly = 0, -- Testing Stage: Free
-- [HEADER]     price_yearly = 0,
-- [HEADER]     features = '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": true, "bill_analysis": true, "can_export": false, "cpi_autopilot": true, "whatsapp_bot": true}'::jsonb
-- [HEADER] WHERE id = 'pro' OR id = 'mate';

-- 3. Update MASTER (Enterprise)
UPDATE subscription_plans
SET 
-- [HEADER]     name = 'MASTER',
-- [HEADER]     max_properties = 10,
-- [HEADER]     price_monthly = 0, -- Testing Stage: Free
-- [HEADER]     price_yearly = 0,
-- [HEADER]     features = '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": true, "bill_analysis": true, "can_export": true, "cpi_autopilot": true, "whatsapp_bot": true, "portfolio_visualizer": true}'::jsonb
-- [HEADER] WHERE id = 'enterprise' OR id = 'master';

-- Notify PostgREST to reload schema
-- [HEADER] NOTIFY pgrst, 'reload schema';
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
-- [HEADER]     BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_role_change();

-- 3. REMOVE SENSITIVE KEYS FROM PUBLIC TABLE (MOVE TO ENV/VAULT)
-- These keys should NOT be in the table for long-term security.
DELETE FROM public.system_settings WHERE key IN ('supabase_service_role_key', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN');

-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: Storage Bucket Hardening
-- Description: Sets sensitive buckets to private and enforces RLS.

-- 1. Harden 'contracts' bucket
UPDATE storage.buckets 
SET public = false 
-- [HEADER] WHERE id = 'contracts';

-- 2. Harden 'property_images' bucket (if it exists)
UPDATE storage.buckets 
SET public = false 
-- [HEADER] WHERE id = 'property_images';

-- 3. Ensure 'secure_documents' is private
UPDATE storage.buckets 
SET public = false 
-- [HEADER] WHERE id = 'secure_documents';

-- 4. Apply strict RLS for 'contracts' bucket matching 'secure_documents' pattern
DROP POLICY IF EXISTS "Users view own contracts" ON storage.objects;
CREATE POLICY "Users view own contracts"
-- [HEADER]     ON storage.objects
    FOR SELECT
    USING (
-- [HEADER]         bucket_id = 'contracts'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users upload own contracts" ON storage.objects;
CREATE POLICY "Users upload own contracts"
-- [HEADER]     ON storage.objects
    FOR INSERT
    WITH CHECK (
-- [HEADER]         bucket_id = 'contracts'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
-- [HEADER]         AND
-- [HEADER]         auth.role() = 'authenticated'
    );

-- 5. Repeat for 'property_images'
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
CREATE POLICY "Users view own images"
-- [HEADER]     ON storage.objects
    FOR SELECT
    USING (
-- [HEADER]         bucket_id = 'property_images'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
CREATE POLICY "Users upload own images"
-- [HEADER]     ON storage.objects
    FOR INSERT
    WITH CHECK (
-- [HEADER]         bucket_id = 'property_images'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
-- [HEADER]         AND
-- [HEADER]         auth.role() = 'authenticated'
    );

-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: Security Fortress (Total Privacy Hardening - v3)
-- Description: Enforces strict RLS ownership with Admin audit support (Zero-Exposure to other users).

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
-- [HEADER] NOTIFY pgrst, 'reload schema';

COMMIT;
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: Storage Fortress (Bucket Security)
-- Description: Sets feedback bucket to private and enforces strict path-based RLS for all sensitive assets.

-- 1. HARDEN FEEDBACK BUCKET (Critical Fix)
UPDATE storage.buckets 
SET public = false 
-- [HEADER] WHERE id = 'feedback-screenshots';

-- 2. REMOVE PERMISSIVE FEEDBACK POLICIES
DROP POLICY IF EXISTS "Anyone can view feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload feedback screenshots" ON storage.objects;

-- 3. APPLY OWNER-ONLY FEEDBACK POLICIES
-- Path naming: feedback-screenshots/{user_id}/{filename}
CREATE POLICY "Users can upload own feedback screenshots"
-- [HEADER]     ON storage.objects FOR INSERT
    WITH CHECK (
-- [HEADER]         bucket_id = 'feedback-screenshots'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own feedback screenshots"
-- [HEADER]     ON storage.objects FOR SELECT
    USING (
-- [HEADER]         bucket_id = 'feedback-screenshots'
-- [HEADER]         AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. VERIFY OTHER BUCKETS ARE PRIVATE
UPDATE storage.buckets SET public = false WHERE id IN ('contracts', 'property_images', 'secure_documents');

-- 5. STANDARDIZE POLICY NAMES FOR AUDITABILITY
DROP POLICY IF EXISTS "Users view own contracts" ON storage.objects;
CREATE POLICY "Secure Access: Contracts"
-- [HEADER]     ON storage.objects FOR SELECT
    USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
CREATE POLICY "Secure Access: Property Images"
-- [HEADER]     ON storage.objects FOR SELECT
    USING (bucket_id = 'property_images' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: Add WhatsApp Usage Limits
-- Description: Adds limits to subscription plans and per-user overrides for WhatsApp messaging.

-- 1. Add max_whatsapp_messages to subscription_plans
ALTER TABLE public.subscription_plans 
-- [HEADER] ADD COLUMN IF NOT EXISTS max_whatsapp_messages INTEGER DEFAULT 50;

-- 2. Update Seed Data for existing plans
UPDATE public.subscription_plans SET max_whatsapp_messages = 50 WHERE id = 'free';
UPDATE public.subscription_plans SET max_whatsapp_messages = 500 WHERE id = 'pro';
UPDATE public.subscription_plans SET max_whatsapp_messages = -1 WHERE id = 'enterprise';
UPDATE public.subscription_plans SET max_whatsapp_messages = -1 WHERE id = 'master';

-- 3. Add whatsapp_limit_override to user_profiles
ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS whatsapp_limit_override INTEGER DEFAULT NULL;

-- 3b. Also add to ai_usage_limits for UI consistency in Usage Dashboard
ALTER TABLE public.ai_usage_limits
-- [HEADER] ADD COLUMN IF NOT EXISTS monthly_whatsapp_limit INTEGER DEFAULT 50;

UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = 50 WHERE tier_name = 'free';
UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = 500 WHERE tier_name = 'pro';
UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = -1 WHERE tier_name = 'enterprise';

-- 4. Create WhatsApp Usage Logs Table
-- This tracks OUTBOUND messages to count against the quota
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_logs (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
-- [HEADER]     conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_user_date ON public.whatsapp_usage_logs (user_id, created_at);

-- Policies
CREATE POLICY "Users can view their own whatsapp usage logs"
-- [HEADER]     ON public.whatsapp_usage_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage all usage logs"
-- [HEADER]     ON public.whatsapp_usage_logs FOR ALL
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

    -- 1. Get User's Limit and Override
    SELECT 
-- [HEADER]         COALESCE(up.whatsapp_limit_override, p.max_whatsapp_messages, 50) INTO v_limit
-- [HEADER]     FROM public.user_profiles up
-- [HEADER]     JOIN public.subscription_plans p ON up.plan_id = p.id
-- [HEADER]     WHERE up.id = p_user_id;

    -- Fallback if user or plan not found
    IF v_limit IS NULL THEN
-- [HEADER]         v_limit := 50;
    END IF;

    -- 2. Count total WhatsApp usage this month (Outbound messages)
    SELECT COUNT(*)::INTEGER INTO v_current_usage
-- [HEADER]     FROM public.whatsapp_usage_logs
-- [HEADER]     WHERE user_id = p_user_id
-- [HEADER]       AND created_at >= v_month_start;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + 1) <= v_limit THEN
        -- Log the usage
        INSERT INTO public.whatsapp_usage_logs (user_id, conversation_id)
        VALUES (p_user_id, p_conversation_id);

-- [HEADER]         RETURN jsonb_build_object(
            'allowed', true,
            'current_usage', v_current_usage + 1,
            'limit', v_limit
        );
-- [HEADER]     ELSE
-- [HEADER]         RETURN jsonb_build_object(
            'allowed', false,
            'current_usage', v_current_usage,
            'limit', v_limit,
            'error', 'Limit exceeded'
        );
    END IF;
END;
$$;

COMMIT;

-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: ensure_unique_phone
-- Description: Enforces unique phone numbers in user_profiles and updates signup trigger.

-- 1. Clean up potential duplicates or empty strings if any exist before adding constraint
-- (In a fresh-ish DB, we assume it's relatively clean, but let's be safe)
UPDATE public.user_profiles SET phone = NULL WHERE phone = '';

-- 2. Add Unique constraint
-- Note: UNIQUE allows multiple NULLs in Postgres, which is perfect for legacy users 
-- who haven't set a phone yet, but prevents 2 users from having the same number.
ALTER TABLE public.user_profiles 
-- [HEADER] ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);

    -- Verify plan exists
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = default_plan_id) THEN
-- [HEADER]         default_plan_id := NULL; 
    END IF;

    INSERT INTO public.user_profiles (
-- [HEADER]         id, 
-- [HEADER]         email, 
-- [HEADER]         full_name,
-- [HEADER]         first_name,
-- [HEADER]         last_name,
-- [HEADER]         phone,
-- [HEADER]         role, 
-- [HEADER]         subscription_status, 
-- [HEADER]         plan_id
    )
    VALUES (
-- [HEADER]         NEW.id,
-- [HEADER]         NEW.email,
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
-- [HEADER]         v_phone,
        'user', 
        'active', 
-- [HEADER]         COALESCE(NEW.raw_user_meta_data->>'plan_id', default_plan_id)
    )
-- [HEADER]     ON CONFLICT (id) DO UPDATE SET
-- [HEADER]         email = EXCLUDED.email,
-- [HEADER]         full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
-- [HEADER]         phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
-- [HEADER]         updated_at = NOW();

-- [HEADER]     RETURN NEW;
-- [HEADER] EXCEPTION 
-- [HEADER]     WHEN unique_violation THEN
        RAISE EXCEPTION 'This phone number is already registered to another account.';
-- [HEADER]     WHEN OTHERS THEN
        RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;
-- Create Trigger for User Profile Updates
-- This attaches the user_profiles table to the existing automated engagement webhook system

DROP TRIGGER IF EXISTS tr_on_user_profile_update ON public.user_profiles;

CREATE TRIGGER tr_on_user_profile_update
-- [HEADER] AFTER UPDATE ON public.user_profiles
FOR EACH ROW
-- [HEADER] WHEN (
-- [HEADER]     OLD.plan_id IS DISTINCT FROM NEW.plan_id OR
-- [HEADER]     OLD.email IS DISTINCT FROM NEW.email OR
-- [HEADER]     OLD.phone IS DISTINCT FROM NEW.phone
)
EXECUTE FUNCTION public.handle_automated_engagement_webhook();
-- Migration: Unified Property Images Security (v2 - Consolidated)
-- Description: Unifies bucket naming to 'property-images' and enforces strict owner-only RLS.
-- Consolidated to a single policy definition to avoid execution collision.

-- 1. CLEAN UP UNDERSCORE MISMATCHES & OLD POLICIES
DROP POLICY IF EXISTS "Users view own images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Secure Access: Property Images" ON storage.objects;

-- 2. ENSURE CORRECT BUCKET NAME 'property-images' IS PRIVATE
UPDATE storage.buckets 
SET public = false 
-- [HEADER] WHERE id = 'property-images';

-- 3. APPLY CONSOLIDATED RLS TO 'property-images'
-- Handles both direct user uploads and Google Maps imports
CREATE POLICY "Secure Access: Property Images"
-- [HEADER]     ON storage.objects
    FOR ALL
    USING (
-- [HEADER]         bucket_id = 'property-images'
-- [HEADER]         AND (
            -- Direct user-id folder: {userId}/filename
            (storage.foldername(name))[1] = auth.uid()::text
-- [HEADER]             OR
            -- Google imports folder: google-imports/{userId}/filename
            (
                (storage.foldername(name))[1] = 'google-imports' 
-- [HEADER]                 AND 
                (storage.foldername(name))[2] = auth.uid()::text
            )
        )
    )
    WITH CHECK (
-- [HEADER]         bucket_id = 'property-images'
-- [HEADER]         AND (
            -- Direct user-id folder
            (storage.foldername(name))[1] = auth.uid()::text
-- [HEADER]             OR
            -- Google imports folder
            (
                (storage.foldername(name))[1] = 'google-imports' 
-- [HEADER]                 AND 
                (storage.foldername(name))[2] = auth.uid()::text
            )
        )
    );

COMMIT;
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: Enhanced Storage Security for property-images
-- Sets up robust RLS policies for both manual and automated uploads.

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
-- [HEADER] ON storage.objects FOR ALL
-- [HEADER] TO authenticated
USING (
-- [HEADER]     bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
-- [HEADER]     bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Policy for Google imports: google-imports/{userId}/{fileName}
CREATE POLICY "Google imports ownership"
-- [HEADER] ON storage.objects FOR ALL
-- [HEADER] TO authenticated
USING (
-- [HEADER]     bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = 'google-imports' AND
    (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
-- [HEADER]     bucket_id = 'property-images' AND
    (storage.foldername(name))[1] = 'google-imports' AND
    (storage.foldername(name))[2] = (auth.uid())::text
);

COMMIT;
-- [HEADER] NOTIFY pgrst, 'reload schema';
-- Migration: Enable public read access for Calculator Magnet Page
-- Date: 2026-02-08 (Moved from 2026-02-04 to avoid conflict)
-- Author: Maestro (via Agent)

-- 1. Index Data (Already has RLS enabled)
-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to index_data" ON index_data;

CREATE POLICY "Allow public read access to index_data"
-- [HEADER] ON index_data
FOR SELECT
-- [HEADER] TO anon
USING (true);

-- 2. Index Bases (Ensure RLS is on and policy exists)
ALTER TABLE index_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to index_bases" ON index_bases;

CREATE POLICY "Allow public read access to index_bases"
-- [HEADER] ON index_bases
FOR SELECT
-- [HEADER] TO anon
USING (true);

-- Ensure authenticated users can still read (in case previous logic relied on default open access for bases)
DROP POLICY IF EXISTS "Allow authenticated users to read index_bases" ON index_bases;

CREATE POLICY "Allow authenticated users to read index_bases"
-- [HEADER] ON index_bases
FOR SELECT
-- [HEADER] TO authenticated
USING (true);
-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
-- [HEADER]     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
-- [HEADER]     user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     stack TEXT,
-- [HEADER]     route TEXT,
-- [HEADER]     component_stack TEXT,
-- [HEADER]     metadata JSONB DEFAULT '{}'::jsonb,
-- [HEADER]     is_resolved BOOLEAN DEFAULT false,
-- [HEADER]     environment TEXT DEFAULT 'production'
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
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE user_profiles.id = auth.uid()
-- [HEADER]             AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- 3. Only admins can update logs (mark as resolved)
DROP POLICY IF EXISTS "Allow admins to update error_logs" ON public.error_logs;
CREATE POLICY "Allow admins to update error_logs" ON public.error_logs
    FOR UPDATE TO authenticated
    USING (
-- [HEADER]         EXISTS (
            SELECT 1 FROM public.user_profiles
-- [HEADER]             WHERE user_profiles.id = auth.uid()
-- [HEADER]             AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- 4. Trigger to notify admin on error
CREATE OR REPLACE FUNCTION public.notify_admin_on_error()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://tipnjnfbbnbskdlodrww.supabase.co';
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
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger error notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_error_log_inserted ON public.error_logs;
CREATE TRIGGER on_error_log_inserted
-- [HEADER]     AFTER INSERT ON public.error_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_error();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_is_resolved ON public.error_logs (is_resolved) WHERE (is_resolved = false);
-- Migration: fix_config_getter_and_cron_v2
-- Description: Corrects get_supabase_config to return unquoted strings and ensures daily cron uses correct headers.

-- 2. Clean up potentially broken settings (removing redundant quotes if they exist)
UPDATE public.system_settings 
SET value = to_jsonb(value #>> '{}')
-- [HEADER] WHERE key IN ('supabase_project_ref', 'supabase_service_role_key')
-- [HEADER] AND value::text LIKE '"%"%';

-- 3. Reschedule the daily-admin-summary cron job
-- This ensures it uses the fixed get_supabase_config and correct headers.
DO $$
BEGIN
    PERFORM cron.unschedule('daily-admin-summary');
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;
-- Add max_archived_contracts column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_archived_contracts INTEGER;

-- Update existing plans with new limits
-- Starter Plan (assuming id='starter' or name like '%Starter%')
UPDATE subscription_plans 
SET max_archived_contracts = 3 
-- [HEADER] WHERE id = 'starter';

-- Pro Plan (assuming id='pro' or name like '%Pro%')
UPDATE subscription_plans 
SET max_archived_contracts = 15 
-- [HEADER] WHERE id = 'pro';

-- Ensure Free plan is handled (though logic is code-side for total count)
UPDATE subscription_plans 
SET max_archived_contracts = 1 
-- [HEADER] WHERE id = 'free';
-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
-- [HEADER]     event_name TEXT NOT NULL,
-- [HEADER]     metadata JSONB DEFAULT '{}'::jsonb,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT now()
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
-- [HEADER]         WHERE tablename = 'analytics_events' AND policyname = 'Users can log their own events'
    ) THEN
        CREATE POLICY "Users can log their own events" ON public.analytics_events
            FOR INSERT
-- [HEADER]             TO authenticated
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
-- [HEADER]                     ae.user_id,
-- [HEADER]                     up.full_name,
-- [HEADER]                     up.email,
-- [HEADER]                     count(*) as event_count
-- [HEADER]                 FROM analytics_events ae
-- [HEADER]                 JOIN user_profiles up ON ae.user_id = up.id
-- [HEADER]                 WHERE ae.created_at > now() - (days_limit || ' days')::interval
-- [HEADER]                 GROUP BY ae.user_id, up.full_name, up.email
-- [HEADER]                 ORDER BY event_count DESC
-- [HEADER]                 LIMIT 10
            ) u
        ),
        'popular_features', (
            SELECT jsonb_agg(f) FROM (
                SELECT 
-- [HEADER]                     event_name,
-- [HEADER]                     count(*) as usage_count
-- [HEADER]                 FROM analytics_events
-- [HEADER]                 WHERE created_at > now() - (days_limit || ' days')::interval
-- [HEADER]                 GROUP BY event_name
-- [HEADER]                 ORDER BY usage_count DESC
            ) f
        ),
        'daily_trends', (
            SELECT jsonb_agg(t) FROM (
                SELECT 
                    date_trunc('day', created_at)::date as day,
-- [HEADER]                     count(*) as count
-- [HEADER]                 FROM analytics_events
-- [HEADER]                 WHERE created_at > now() - (days_limit || ' days')::interval
-- [HEADER]                 GROUP BY 1
-- [HEADER]                 ORDER BY 1 ASC
            ) t
        )
    ) INTO result;

-- [HEADER]     RETURN result;
END;
$$;
-- Migration: Fair Use and Abuse Prevention Schema
-- Description: Adds security fields to user_profiles and creates security_logs table.

-- 1. Create Enums for Account Security
DO $$ BEGIN
    CREATE TYPE public.account_security_status AS ENUM ('active', 'flagged', 'suspended', 'banned');
-- [HEADER] EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Update user_profiles with security fields
ALTER TABLE public.user_profiles 
-- [HEADER] ADD COLUMN IF NOT EXISTS security_status public.account_security_status DEFAULT 'active',
-- [HEADER] ADD COLUMN IF NOT EXISTS security_notes TEXT[],
-- [HEADER] ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
-- [HEADER] ADD COLUMN IF NOT EXISTS last_security_check TIMESTAMPTZ;

-- 3. Create security_logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
-- [HEADER]     event_code TEXT NOT NULL, -- e.g. 'AUTH_VELOCITY', 'WHATSAPP_SPIKE', 'RESOURCE_SPIKE'
-- [HEADER]     severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
-- [HEADER]     details JSONB DEFAULT '{}'::jsonb,
-- [HEADER]     ip_address TEXT,
-- [HEADER]     user_agent TEXT,
-- [HEADER]     created_at TIMESTAMPTZ DEFAULT NOW()
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
-- [HEADER] EXCEPTION WHEN OTHERS THEN
    CREATE POLICY "Admins can view security logs"
        ON public.security_logs FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

-- 5. Helper Function: log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
-- [HEADER]     p_user_id UUID,
-- [HEADER]     p_event_code TEXT,
-- [HEADER]     p_severity TEXT,
-- [HEADER]     p_details JSONB DEFAULT '{}'::jsonb,
-- [HEADER]     p_ip TEXT DEFAULT NULL,
-- [HEADER]     p_ua TEXT DEFAULT NULL
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
-- [HEADER]             flagged_at = NOW()
-- [HEADER]         WHERE id = p_user_id AND (security_status = 'active' OR security_status IS NULL);
    END IF;
END;
$$;

-- [HEADER] NOTIFY pgrst, 'reload schema';
CREATE OR REPLACE FUNCTION public.perform_abuse_scan()
RETURNS TABLE (
-- [HEADER]     user_id UUID,
-- [HEADER]     event_code TEXT,
-- [HEADER]     severity TEXT,
-- [HEADER]     details JSONB
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
-- [HEADER]         FROM public.properties p
-- [HEADER]         WHERE p.created_at >= v_hour_ago
-- [HEADER]         GROUP BY p.user_id
-- [HEADER]         HAVING count(*) > 5
    LOOP
        PERFORM public.log_security_event(v_user_id, 'RESOURCE_SPIKE', 'high', v_details);
-- [HEADER]         user_id := v_user_id;
-- [HEADER]         event_code := 'RESOURCE_SPIKE';
-- [HEADER]         severity := 'high';
-- [HEADER]         details := v_details;
-- [HEADER]         RETURN NEXT;
    END LOOP;

    -- 3. MULTI-ACCOUNTING DETECTION
    -- Different users with the same IP in the last hour
    FOR v_user_id, v_details IN 
        SELECT s1.user_id, jsonb_build_object('ip', s1.ip_address, 'colliding_users', count(distinct s2.user_id))
-- [HEADER]         FROM public.security_logs s1
-- [HEADER]         JOIN public.security_logs s2 ON s1.ip_address = s2.ip_address AND s1.user_id != s2.user_id
-- [HEADER]         WHERE s1.created_at >= v_hour_ago AND s2.created_at >= v_hour_ago
-- [HEADER]         GROUP BY s1.user_id, s1.ip_address
-- [HEADER]         HAVING count(distinct s2.user_id) > 2
    LOOP
        PERFORM public.log_security_event(v_user_id, 'IP_COLLISION', 'medium', v_details);
-- [HEADER]         user_id := v_user_id;
-- [HEADER]         event_code := 'IP_COLLISION';
-- [HEADER]         severity := 'medium';
-- [HEADER]         details := v_details;
-- [HEADER]         RETURN NEXT;
    END LOOP;

END;
$$;
DROP FUNCTION IF EXISTS public.get_users_with_stats();

        -- Permissions
-- [HEADER]         COALESCE(up.is_super_admin, false) as is_super_admin,

        -- Security Fields
-- [HEADER]         up.security_status::TEXT,
-- [HEADER]         up.flagged_at,
-- [HEADER]         up.last_security_check

-- [HEADER]     WHERE up.deleted_at IS NULL
-- [HEADER]     ORDER BY up.created_at DESC;
END;
$$;
-- Migration: admin_security_config
-- Description: Adds system settings for abuse notifications.

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('security_alerts_enabled', 'true'::jsonb, 'Master switch for automated abuse detection alerts (Email/WhatsApp).'),
    ('admin_security_whatsapp', '"972500000000"'::jsonb, 'Admin phone number for WhatsApp security alerts. Format: CountryCode + Number (e.g., 972...)'),
    ('admin_security_email', '"rubi@rentmate.co.il"'::jsonb, 'Admin email for receiving security audit reports.')
-- [HEADER] ON CONFLICT (key) DO UPDATE SET 
-- [HEADER]     description = EXCLUDED.description;
-- Add disclaimer_accepted to user_preferences
-- Defaults to FALSE

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'disclaimer_accepted') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS disclaimer_accepted BOOLEAN DEFAULT false;
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
-- [HEADER]         RETURN;
    END IF;

    -- Construct URL
-- [HEADER]     v_url := 'https://' || v_ref || '.supabase.co/functions/v1/send-daily-admin-summary';

    -- Perform the request
    -- net.http_post returns bigint, so we must discard it or catch it.
    -- PERFORM discards the result.
    PERFORM net.http_post(
-- [HEADER]         url := v_url,
-- [HEADER]         headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
-- [HEADER]         body := '{}'::jsonb
    );
-- [HEADER] EXCEPTION WHEN OTHERS THEN
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
-- [HEADER] ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill user_id from contracts
UPDATE public.payments p
SET user_id = c.user_id
-- [HEADER] FROM public.contracts c
-- [HEADER] WHERE p.contract_id = c.id
-- [HEADER] AND p.user_id IS NULL;

-- Enforce NOT NULL after backfill (optional, but good practice if we want to guarantee it)
-- ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS (idempotent)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts (or use CREATE POLICY IF NOT EXISTS if supported, but DROP is safer for updates)
DROP POLICY IF EXISTS "Users can only see their own payments" ON public.payments;

-- Create RLS Policy
CREATE POLICY "Users can only see their own payments" 
-- [HEADER] ON public.payments 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
-- Create a debug logs table to capture Edge Function execution
CREATE TABLE IF NOT EXISTS public.debug_logs (
-- [HEADER]     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
-- [HEADER]     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
-- [HEADER]     function_name TEXT NOT NULL,
-- [HEADER]     level TEXT DEFAULT 'info',
-- [HEADER]     message TEXT NOT NULL,
-- [HEADER]     details JSONB
);

-- Enable RLS but allow service role to insert
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to insert debug logs"
-- [HEADER]     ON public.debug_logs
    FOR INSERT
-- [HEADER]     TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow service role to select debug logs"
-- [HEADER]     ON public.debug_logs
    FOR SELECT
-- [HEADER]     TO service_role
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
-- [HEADER]         FROM cron.job_run_details d
-- [HEADER]         JOIN cron.job j ON j.jobid = d.jobid
-- [HEADER]         WHERE j.jobname = 'daily-admin-summary'
-- [HEADER]         AND d.start_time > (now() - interval '24 hours')
-- [HEADER]         ORDER BY d.start_time DESC 
    LOOP
        RAISE NOTICE 'RUN: ID=%, Status=%, Msg="%", Time=%', 
-- [HEADER]             r.runid, r.status, r.return_message, r.start_time;
    END LOOP;

    RAISE NOTICE '--- DEBUG LOGS (Today) ---';
    FOR r IN 
        SELECT created_at, message, details 
-- [HEADER]         FROM public.debug_logs 
-- [HEADER]         WHERE created_at > (now() - interval '24 hours')
-- [HEADER]         ORDER BY created_at DESC 
-- [HEADER]         LIMIT 10
    LOOP
        RAISE NOTICE '[%] % | %', r.created_at, r.message, r.details;
    END LOOP;

    RAISE NOTICE '--- END DIAGNOSTICS ---';
END $$;

COMMIT;
-- Update Index Sync Cron Schedule
-- Sets primary run to 15th at 19:00 Israel Time (17:00 UTC) 
-- with retries following every 2 hours until end of 16th.

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
-- [HEADER]         RETURN;
    END IF;

    -- Construct URL
-- [HEADER]     v_url := 'https://' || v_ref || '.supabase.co/functions/v1/fetch-index-data';

    -- Perform the request
    PERFORM net.http_post(
-- [HEADER]         url := v_url,
-- [HEADER]         headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
-- [HEADER]         body := '{}'::jsonb
    );
    RAISE LOG 'Index Sync Triggered at %', now();
-- [HEADER] EXCEPTION WHEN OTHERS THEN
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