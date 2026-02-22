-- ============================================
-- NOTE FOR STAGING: To enable admin notifications, run this in SQL Editor:
-- ALTER DATABASE postgres SET "app.settings.service_role_key" = 'your-service-role-key-here';
-- ============================================

-- ============================================

-- TYPE FOUNDATION (Safe Lazy Init)

-- ============================================

DO $$ BEGIN

    CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');

EXCEPTION WHEN duplicate_object THEN null; END $$;



DO $$ BEGIN

    CREATE TYPE subscription_status AS ENUM ('active', 'suspended'); 

EXCEPTION WHEN duplicate_object THEN null; END $$;



DO $$ BEGIN

    CREATE TYPE subscription_plan_type AS ENUM ('free_forever', 'custom_enterprise');

EXCEPTION WHEN duplicate_object THEN null; END $$;



DO $$ BEGIN

    CREATE TYPE crm_interaction_type AS ENUM ('note', 'call', 'email', 'support_ticket');

EXCEPTION WHEN duplicate_object THEN null; END $$;



DO $$ BEGIN

    CREATE TYPE invoice_status AS ENUM ('paid', 'pending', 'void');

EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================

-- STAGE 1: TOTAL MODERN FOUNDATION

-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";



-- USER PROFILES

CREATE TABLE IF NOT EXISTS public.user_profiles (

    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    email TEXT,

    full_name TEXT,

    first_name TEXT,

    last_name TEXT,

    phone TEXT,

    role TEXT DEFAULT 'user',

    subscription_status TEXT DEFAULT 'active',

    subscription_plan TEXT DEFAULT 'free_forever',

    plan_id TEXT DEFAULT 'free',

    marketing_consent BOOLEAN DEFAULT FALSE,

    marketing_consent_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT true,

    last_login TIMESTAMPTZ,

    deleted_at TIMESTAMPTZ,

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

    rooms NUMERIC DEFAULT 0,

    size_sqm NUMERIC DEFAULT 0,

    property_type TEXT DEFAULT 'apartment',

    status TEXT DEFAULT 'Occupied',

    rent_price NUMERIC(10, 2) DEFAULT 0,

    image_url TEXT,

    has_parking BOOLEAN DEFAULT false,

    has_storage BOOLEAN DEFAULT false,

    has_balcony BOOLEAN DEFAULT false,

    has_safe_room BOOLEAN DEFAULT false,

    has_elevator BOOLEAN DEFAULT false,

    is_accessible BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- TENANTS

CREATE TABLE IF NOT EXISTS public.tenants (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,

    name TEXT,

    full_name TEXT,

    email TEXT,

    phone TEXT,

    id_number TEXT,

    status TEXT DEFAULT 'active',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- CONTRACTS

CREATE TABLE IF NOT EXISTS public.contracts (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,

    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,

    status TEXT DEFAULT 'active',

    signing_date DATE,

    start_date DATE,

    end_date DATE,

    base_rent NUMERIC(10, 2) DEFAULT 0,

    currency TEXT DEFAULT 'ILS',

    payment_frequency TEXT DEFAULT 'monthly',

    payment_day INTEGER DEFAULT 1,

    linkage_type TEXT DEFAULT 'none',

    base_index_date TEXT,

    base_index_value NUMERIC,

    security_deposit_amount NUMERIC DEFAULT 0,

    needs_painting BOOLEAN DEFAULT false,

    ai_extracted BOOLEAN DEFAULT false,

    ai_extraction_data JSONB,

    contract_file_url TEXT,

    contract_file_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- PAYMENTS

CREATE TABLE IF NOT EXISTS public.payments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,

    amount NUMERIC NOT NULL,

    currency TEXT DEFAULT 'ILS',

    due_date DATE NOT NULL,

    status TEXT DEFAULT 'pending',

    paid_date DATE,

    payment_method TEXT,

    reference TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- NOTIFICATIONS

CREATE TABLE IF NOT EXISTS public.notifications (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    type TEXT DEFAULT 'info',

    title TEXT,

    message TEXT,

    metadata JSONB,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);



-- AUDIT LOGS

CREATE TABLE IF NOT EXISTS public.audit_logs (

    id BIGSERIAL PRIMARY KEY,

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    action TEXT NOT NULL,

    details JSONB,

    ip_address TEXT,

    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);



-- INVOICES

CREATE TABLE IF NOT EXISTS public.invoices (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    amount NUMERIC(10, 2) NOT NULL,

    currency TEXT DEFAULT 'ILS',

    status invoice_status DEFAULT 'paid',

    issue_date DATE DEFAULT CURRENT_DATE,

    pdf_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);



-- STORAGE USAGE

CREATE TABLE IF NOT EXISTS public.user_storage_usage (

    user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    total_bytes BIGINT DEFAULT 0,

    file_count INTEGER DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- USER PREFERENCES

CREATE TABLE IF NOT EXISTS public.user_preferences (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,

    language TEXT DEFAULT 'he',

    theme TEXT DEFAULT 'light',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- ============================================

-- BASELINE TABLES (Phase 1 - Additional)

-- ============================================



-- SUBSCRIPTION PLANS

CREATE TABLE IF NOT EXISTS public.subscription_plans (

    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    price_monthly NUMERIC(10, 2) DEFAULT 0,

    max_properties INTEGER DEFAULT 1,

    max_tenants INTEGER DEFAULT 2,

    max_contracts INTEGER DEFAULT 1,

    max_sessions INTEGER DEFAULT 1,

    features JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- SUPPORT TICKETS

CREATE TABLE IF NOT EXISTS public.support_tickets (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    status TEXT DEFAULT 'open',

    priority TEXT DEFAULT 'normal',

    category TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- CRM INTERACTIONS

CREATE TABLE IF NOT EXISTS public.crm_interactions (

    id BIGSERIAL PRIMARY KEY,

    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    admin_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    type crm_interaction_type DEFAULT 'note',

    title TEXT,

    content TEXT,

    status TEXT DEFAULT 'open',

    created_at TIMESTAMPTZ DEFAULT NOW()

);



-- AI CONVERSATIONS

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



-- AUTOMATION RULES

CREATE TABLE IF NOT EXISTS public.automation_rules (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    trigger_type TEXT NOT NULL,

    condition JSONB,

    action_type TEXT NOT NULL,

    action_config JSONB,

    is_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- AUTOMATION LOGS

CREATE TABLE IF NOT EXISTS public.automation_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rule_id UUID REFERENCES public.automation_rules(id),

    user_id UUID REFERENCES auth.users(id),

    entity_id UUID,

    action_taken TEXT,

    status TEXT,

    details JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()

);



-- TICKET ANALYSIS

CREATE TABLE IF NOT EXISTS public.ticket_analysis (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,

    sentiment_score FLOAT,

    urgency_level TEXT,

    category TEXT,

    confidence_score FLOAT,

    ai_summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);



-- USER AUTOMATION SETTINGS

CREATE TABLE IF NOT EXISTS public.user_automation_settings (

    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    lease_expiry_days INTEGER DEFAULT 100,

    extension_notice_days INTEGER DEFAULT 60,

    rent_overdue_days INTEGER DEFAULT 5,

    auto_reply_enabled BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);



-- ATTACH SIGNUP TRIGGER

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created

    AFTER INSERT ON auth.users

    FOR EACH ROW

    EXECUTE FUNCTION public.handle_new_user();

-- ============================================

-- HELPER FUNCTIONS (Foundational)

-- ============================================



-- Safe Admin Check

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

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

        AND role = 'admin'

    );

END; $$;



-- Get User Role

DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID DEFAULT auth.uid())

RETURNS user_role

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

    v_role user_role;

BEGIN

    SELECT role INTO v_role FROM public.user_profiles WHERE id = p_user_id;

    RETURN COALESCE(v_role, 'user'::user_role);

END; $$;



-- Handle New User Registration (Robust Version)

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()

RETURNS TRIGGER 

LANGUAGE plpgsql 

SECURITY DEFINER

SET search_path = public

AS $$ 

DECLARE

    v_full_name TEXT;

    v_first_name TEXT;

    v_last_name TEXT;

    v_plan_id TEXT := 'free';

BEGIN

    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1), 'User');

    v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');



    INSERT INTO public.user_profiles (

        id, email, full_name, first_name, last_name, phone, role, 

        subscription_status, plan_id, subscription_plan, 

        marketing_consent, marketing_consent_at

    )

    VALUES (

        NEW.id, NEW.email, v_full_name, v_first_name, v_last_name, 

        NEW.phone, 'user', 'active', v_plan_id, 'free_forever',

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

    RETURN NEW;

END; $$;


















