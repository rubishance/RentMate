-- Add Granular Storage Quota Fields to Subscription Plans
-- Migration: 20260119_add_granular_storage_quotas.sql

-- Add category-specific storage columns
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_media_mb INTEGER DEFAULT -1,      -- -1 for unlimited within global cap
ADD COLUMN IF NOT EXISTS max_utilities_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_maintenance_mb INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS max_documents_mb INTEGER DEFAULT -1;

-- Update existing plans with sensible defaults
-- (Assuming Free gets restricted media but more room for documents)
UPDATE subscription_plans SET 
    max_media_mb = 50,         -- 50MB for photos/video max on free
    max_utilities_mb = 20,     -- 20MB for bills
    max_maintenance_mb = 20,   -- 20MB for repairs
    max_documents_mb = 10      -- 10MB for contracts
WHERE id = 'free';

-- Update the quota check function to support categories
CREATE OR REPLACE FUNCTION check_storage_quota(
    p_user_id UUID,
    p_file_size BIGINT,
    p_category TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_usage BIGINT;
    v_cat_usage BIGINT;
    v_max_total_mb INTEGER;
    v_max_cat_mb INTEGER;
    v_col_name TEXT;
BEGIN
    -- 1. Get current usage and plan limits
    SELECT 
        u.total_bytes,
        CASE 
            WHEN p_category IN ('photo', 'video') THEN u.media_bytes
            WHEN p_category LIKE 'utility_%' THEN u.utilities_bytes
            WHEN p_category = 'maintenance' THEN u.maintenance_bytes
            ELSE u.documents_bytes
        END,
        s.max_storage_mb,
        CASE 
            WHEN p_category IN ('photo', 'video') THEN s.max_media_mb
            WHEN p_category LIKE 'utility_%' THEN s.max_utilities_mb
            WHEN p_category = 'maintenance' THEN s.max_maintenance_mb
            ELSE s.max_documents_mb
        END
    INTO 
        v_total_usage,
        v_cat_usage,
        v_max_total_mb,
        v_max_cat_mb
    FROM user_profiles up
    JOIN subscription_plans s ON up.plan_id = s.id
    LEFT JOIN user_storage_usage u ON u.user_id = up.id
    WHERE up.id = p_user_id;

    -- Initialize usage if user has no records yet
    v_total_usage := COALESCE(v_total_usage, 0);
    v_cat_usage := COALESCE(v_cat_usage, 0);

    -- 2. Check Global Limit
    IF v_max_total_mb != -1 AND (v_total_usage + p_file_size) > (v_max_total_mb * 1024 * 1024) THEN
        RETURN FALSE;
    END IF;

    -- 3. Check Category Limit (if specified and not unlimited)
    IF p_category IS NOT NULL AND v_max_cat_mb != -1 THEN
        IF (v_cat_usage + p_file_size) > (v_max_cat_mb * 1024 * 1024) THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
