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
