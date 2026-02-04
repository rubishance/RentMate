-- Migration: add_plan_active_status
-- Description: Adds is_active column to subscription_plans to allow pausing plans.

ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure all existing plans are active by default
UPDATE subscription_plans SET is_active = true WHERE is_active IS NULL;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
