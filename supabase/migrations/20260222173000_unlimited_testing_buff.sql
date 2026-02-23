-- Migration: unlimited_testing_buff_v3 (Self-Healing)
-- Description: Ensures storage columns exist and then unlocks everything for testing.

BEGIN;

-- 1. Ensure all storage columns exist in subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_media_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_utilities_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_maintenance_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_documents_mb INTEGER DEFAULT -1;

-- 2. Ensure 'free' plan has unlimited capabilities
UPDATE subscription_plans
SET 
    name = 'Beta Access (Unlimited)',
    max_properties = -1,
    max_contracts = -1,
    max_storage_mb = -1,
    max_media_mb = -1,
    max_utilities_mb = -1,
    max_maintenance_mb = -1,
    max_documents_mb = -1,
    features = features || jsonb_build_object(
        'legal_library', true,
        'whatsapp_bot', true,
        'ai_assistant', true,
        'bill_analysis', true,
        'maintenance_tracker', true,
        'portfolio_visualizer', true,
        'api_access', true
    )
WHERE id = 'free';

-- 3. Unlock AI Usage limits for all tiers for testing
UPDATE ai_usage_limits
SET 
    monthly_message_limit = -1,
    monthly_token_limit = -1;

COMMIT;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
