-- Fix Integer Overflow in check_storage_quota
-- We cast v_max_storage_mb to BIGINT before multiplication to prevent the overflow.

-- Overload 1: Without category
CREATE OR REPLACE FUNCTION public.check_storage_quota(
    p_user_id UUID,
    p_file_size BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_usage BIGINT;
    v_max_storage_mb INTEGER;
    v_max_storage_bytes BIGINT;
BEGIN
    SELECT COALESCE(total_bytes, 0) INTO v_current_usage FROM user_storage_usage WHERE user_id = p_user_id;
    
    SELECT sp.max_storage_mb INTO v_max_storage_mb
    FROM user_profiles up
    JOIN subscription_plans sp ON up.plan_id = sp.id
    WHERE up.id = p_user_id;
    
    IF v_max_storage_mb = -1 THEN RETURN TRUE; END IF;
    
    v_max_storage_bytes := v_max_storage_mb::BIGINT * 1024 * 1024;
    RETURN (v_current_usage + p_file_size) <= v_max_storage_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Overload 2: With category
CREATE OR REPLACE FUNCTION public.check_storage_quota(
    p_user_id UUID,
    p_file_size BIGINT,
    p_category TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_usage BIGINT;
    v_cat_usage BIGINT;
    v_max_total_mb INTEGER;
    v_max_cat_mb INTEGER;
BEGIN
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

    v_total_usage := COALESCE(v_total_usage, 0);
    v_cat_usage := COALESCE(v_cat_usage, 0);

    IF v_max_total_mb != -1 AND (v_total_usage + p_file_size) > (v_max_total_mb::BIGINT * 1024 * 1024) THEN
        RETURN FALSE;
    END IF;

    IF p_category IS NOT NULL AND v_max_cat_mb != -1 THEN
        IF (v_cat_usage + p_file_size) > (v_max_cat_mb::BIGINT * 1024 * 1024) THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
