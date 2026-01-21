-- Add Storage Quota Fields to Subscription Plans
-- Migration: 20260119_add_storage_quotas.sql

-- Add storage quota columns
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 100,  -- MB per user
ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10; -- MB per file

-- Update existing plans with storage limits
UPDATE subscription_plans SET 
    max_storage_mb = 100,    -- 100MB total
    max_file_size_mb = 5     -- 5MB per file
WHERE id = 'free';

UPDATE subscription_plans SET 
    max_storage_mb = 5120,   -- 5GB total
    max_file_size_mb = 50    -- 50MB per file
WHERE id = 'pro';

UPDATE subscription_plans SET 
    max_storage_mb = -1,     -- Unlimited
    max_file_size_mb = 500   -- 500MB per file
WHERE id = 'enterprise';

-- Comments
COMMENT ON COLUMN subscription_plans.max_storage_mb IS 'Maximum storage in MB per user (-1 for unlimited)';
COMMENT ON COLUMN subscription_plans.max_file_size_mb IS 'Maximum file size in MB per upload';
