-- RENTMATE LEAN SCHEMA V12.0
-- PURE STRUCTURE - ZERO BLOAT
SET check_function_bodies = false;

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

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;
-- Migration: Create rental market data table and update user preferences
-- CREATE TABLE IF NOT EXISTS for rental market trends
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

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

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

-- 1. CREATE TABLE IF NOT EXISTS (if not exists)
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

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en')),
    gender TEXT CHECK (gender IN ('male', 'female', 'unspecified')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
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

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
    name TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) DEFAULT 0,

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

CREATE TABLE IF NOT EXISTS property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

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

-- CREATE INDEX IF NOT EXISTS for performance
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

CREATE TABLE IF NOT EXISTS public.short_links (
    slug TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '90 days') NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: track who created it
);

CREATE TABLE IF NOT EXISTS user_storage_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),

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

-- 3. Create AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL, -- 'bill_scan', 'contract_analysis', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Ticket Comments Table (for back-and-forth communication)
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 1. Create Cleanup Queue Table
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
    id BIGSERIAL PRIMARY KEY,
    bucket_id TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_log TEXT
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

-- 4. Create WhatsApp Usage Logs Table
-- This tracks OUTBOUND messages to count against the quota
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Function to clean up old rate limit entries (e.g., older than 1 hour)
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE last_request_at < (now() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

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

-- Function: Auto-update Property Status (Fixed for simplified statuses)
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- If contract becomes active, set Property to Occupied
    IF NEW.status = 'active' THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = NEW.property_id;

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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Cleanup function for expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM calculation_shares
    WHERE expires_at < NOW();

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

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Create sync trigger
CREATE OR REPLACE FUNCTION sync_user_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subscription_tier := NEW.plan_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- 1. Fix the helper function to return UNQUOTED strings from JSONB
CREATE OR REPLACE FUNCTION public.get_supabase_config(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    -- Use #>> '{}' to get the unquoted text value from JSONB
    SELECT value #>> '{}' INTO v_value FROM public.system_settings WHERE key = p_key;

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

-- 3. Create or Update a generic updated_at trigger if not already present
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Force PostgREST schema cache refresh
-- Redefining a generic function is a reliable way to trigger a reload in Supabase
CREATE OR REPLACE FUNCTION public.refresh_schema_cache()
RETURNS void AS $$
BEGIN
  -- This function exists solely to trigger a schema cache refresh
  NULL;
END;
$$ LANGUAGE plpgsql;

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
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger error notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

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

-- CREATE INDEX IF NOT EXISTS for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);

-- CREATE INDEX IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
-- Create the 'contracts' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_index_bases_type_date ON index_bases (index_type, base_period_start);

-- CREATE INDEX IF NOT EXISTS for faster queries
CREATE INDEX IF NOT EXISTS idx_index_data_type_date ON index_data(index_type, date);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_idx ON public.rate_limits(ip_address, endpoint);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add indexes for faster lookups if needed (though UUID lookup is fast)
create index if not exists saved_calculations_id_idx on public.saved_calculations(id);
-- Update RLS policies for saved_calculations to allow public/anonymous inserts

-- CREATE INDEX IF NOT EXISTS for efficient querying of suspended accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_calculation_shares_expires ON calculation_shares(expires_at);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_category ON property_documents(category);
CREATE INDEX IF NOT EXISTS idx_property_documents_date ON property_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_property_documents_user ON property_documents(user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_user_id ON public.property_media(user_id);
-- Create short_links table for URL shortener
-- Migration: 20260119_create_short_links.sql

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_id ON ai_chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_last_reset ON ai_chat_usage(last_reset_at);
-- 1. Add notification_preferences column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"contract_expiry_days": 60, "rent_due_days": 3}';

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

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs (user_id, created_at);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at);
-- Migration: Add invoice_number to property_documents
-- Date: 2026-01-25

-- Create an index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_property_documents_duplicate_check 
ON property_documents(vendor_name, document_date, invoice_number);
-- Migration: Enhance CRM Interactions with Metadata and Human Chat
-- Adds metadata support for external links (Gmail etc.) and prepares human chat types

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_human_conversations_user_id ON public.human_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_human_messages_conversation_id ON public.human_messages(conversation_id);
-- Migration: reschedule_email_il_time
-- Description: Updates the daily admin summary schedule to 06:00 UTC (08:00 Israel Time)

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_enabled ON user_profiles(google_drive_enabled);
-- Migration: Ensure Contract JSONB Columns
-- Description: Adds missing JSONB columns and ensures correct types for option_periods and rent_periods.

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chaining_factors_lookup 
    ON chaining_factors(index_type, from_base, to_base);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_user_date ON public.whatsapp_usage_logs (user_id, created_at);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_is_resolved ON public.error_logs (is_resolved) WHERE (is_resolved = false);
-- Migration: fix_config_getter_and_cron_v2
-- Description: Corrects get_supabase_config to return unquoted strings and ensures daily cron uses correct headers.

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Indexing for Admin Dashboard
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);

