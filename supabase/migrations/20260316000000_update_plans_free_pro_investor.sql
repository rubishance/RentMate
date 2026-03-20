-- Migration: 20260316000000_update_plans_free_pro_investor
-- Description: Updates the 'subscription_plans' table with 'FREE', 'PRO', and 'INVESTOR' plans.
-- Implements robust limits for App.

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_monthly numeric;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_yearly numeric;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_properties integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_contracts integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_archived_contracts integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_sessions integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_whatsapp_messages integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_storage_mb integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS features jsonb;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_active boolean;

-- 1. Upsert FREE Plan (replace basic/solo)
INSERT INTO subscription_plans (
    id, name, description, price_monthly, price_yearly, 
    max_properties, max_contracts, max_archived_contracts, 
    max_sessions, max_whatsapp_messages, max_storage_mb, features, is_active
) VALUES (
    'free', 'FREE', 'Digital peace of mind for the single-unit owner.', 0, 0, 
    1, 1, 1, 
    10, 0, 50, '{"legal_library": false, "maintenance_tracker": true, "ai_assistant": false, "export_data": false, "whatsapp_bot": false}', true
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_properties = EXCLUDED.max_properties,
    max_contracts = EXCLUDED.max_contracts,
    max_archived_contracts = EXCLUDED.max_archived_contracts,
    max_whatsapp_messages = EXCLUDED.max_whatsapp_messages,
    features = EXCLUDED.features;

-- 2. Upsert PRO Plan
INSERT INTO subscription_plans (
    id, name, description, price_monthly, price_yearly, 
    max_properties, max_contracts, max_archived_contracts, 
    max_sessions, max_whatsapp_messages, max_storage_mb, features, is_active
) VALUES (
    'pro', 'PRO', 'Full autopilot for growing investors and managers.', 49, 348, 
    3, 3, 15, 
    100, 100, 500, '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": true, "export_data": true, "whatsapp_bot": true}', true
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_properties = EXCLUDED.max_properties,
    max_contracts = EXCLUDED.max_contracts,
    max_archived_contracts = EXCLUDED.max_archived_contracts,
    max_whatsapp_messages = EXCLUDED.max_whatsapp_messages,
    features = EXCLUDED.features;

-- 3. Upsert INVESTOR Plan
INSERT INTO subscription_plans (
    id, name, description, price_monthly, price_yearly, 
    max_properties, max_contracts, max_archived_contracts, 
    max_sessions, max_whatsapp_messages, max_storage_mb, features, is_active
) VALUES (
    'investor', 'INVESTOR', 'Premium suite for serious investors.', 119, 1188, 
    10, 10, 50, 
    -1, -1, 2048, '{"legal_library": true, "maintenance_tracker": true, "ai_assistant": true, "export_data": true, "whatsapp_bot": true, "vip_support": true, "portfolio_visualizer": true}', true
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_properties = EXCLUDED.max_properties,
    max_contracts = EXCLUDED.max_contracts,
    max_archived_contracts = EXCLUDED.max_archived_contracts,
    max_whatsapp_messages = EXCLUDED.max_whatsapp_messages,
    features = EXCLUDED.features;

-- Support legacy ids if any clients still use them
UPDATE subscription_plans SET max_properties = 3, max_contracts = 3, price_monthly = 49 WHERE id = 'mate';
UPDATE subscription_plans SET max_properties = 10, max_contracts = 10, price_monthly = 119 WHERE id = 'master';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
