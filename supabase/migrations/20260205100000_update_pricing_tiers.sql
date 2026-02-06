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
