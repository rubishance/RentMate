-- Migration: unlock_testing_features
-- Description: Buffs the 'free' plan to grant unlimited access and features for testing.

UPDATE subscription_plans
SET 
    name = 'Beta Access (Unlimited)',
    max_properties = -1,
    max_contracts = -1,
    max_sessions = -1,
    -- max_storage_mb might not exist in all environments yet, but let's try to update it if it does
    -- Better to do a DO block for safety or just assume it's there based on migrations
    features = jsonb_build_object(
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
WHERE id = 'free';

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
NOTIFY pgrst, 'reload schema';
