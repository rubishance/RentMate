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
