-- ============================================
-- USER MANAGEMENT SYSTEM MIGRATION (FINAL v3)
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ENUMS & TYPES
-- ============================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Simplified Subscription Status
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'suspended'); 
    -- Everyone is 'active' by default now. 'Suspended' is for manual block.
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Simplified Plans (Placeholder for future)
DO $$ BEGIN
    CREATE TYPE subscription_plan_type AS ENUM ('free_forever', 'custom_enterprise');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Interaction Types for CRM
DO $$ BEGIN
    CREATE TYPE crm_interaction_type AS ENUM ('note', 'call', 'email', 'support_ticket');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('paid', 'pending', 'void');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- 2. CREATE USER PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role user_role DEFAULT 'user',
    
    -- Simplified Subscription
    subscription_status subscription_status DEFAULT 'active',
    subscription_plan subscription_plan_type DEFAULT 'free_forever',
    
    -- Minimal payment info for future
    payment_provider TEXT DEFAULT 'none', 
    
    -- Activity
    is_active BOOLEAN DEFAULT true, -- Redundant with subscription_status but good for explicit "ban"
    last_login TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- 3. CRM INTERACTIONS TABLE (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS crm_interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    type crm_interaction_type DEFAULT 'note',
    title TEXT,
    content TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_user_id ON crm_interactions(user_id);

-- ============================================
-- 4. AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL, -- Admin
    target_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL, 
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. INVOICES TABLE (Simplified)
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ILS',
    status invoice_status DEFAULT 'paid',
    issue_date DATE DEFAULT CURRENT_DATE,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. RLS POLICIES
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ... (Same policies as before for profiles/audit/invoices) ...

-- CRM Policies
-- Users can view their own tickets? Or internal only? 
-- Let's say internal only for now ("Simple CRM").
CREATE POLICY "Admins manage CRM"
    ON crm_interactions FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 7. FUNCTIONS
-- ============================================

-- ... (Same helper functions: is_admin, get_user_role) ...

-- Auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user',
        'active',
        'free_forever'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

