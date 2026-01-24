-- Fix RLS Violation in Storage Trigger (with Category Support)
-- Migration: 20260119_fix_trigger_security.sql

-- The update_user_storage function needs to run with SECURITY DEFINER
-- because it modifies user_storage_usage which has RLS enabled.

CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
DECLARE
    v_col TEXT;
    v_size BIGINT;
    v_user_id UUID;
    v_cat TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_size := NEW.file_size;
        v_user_id := NEW.user_id;
        v_cat := NEW.category;
    ELSE
        v_size := OLD.file_size;
        v_user_id := OLD.user_id;
        v_cat := OLD.category;
    END IF;

    -- Determine which column to update based on category
    IF v_cat IN ('photo', 'video') THEN
        v_col := 'media_bytes';
    ELSIF v_cat LIKE 'utility_%' THEN
        v_col := 'utilities_bytes';
    ELSIF v_cat = 'maintenance' THEN
        v_col := 'maintenance_bytes';
    ELSE
        v_col := 'documents_bytes';
    END IF;

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
            VALUES ($1, $2, 1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                updated_at = NOW()
        ', v_col, v_col, v_col) USING v_user_id, v_size;
            
    ELSIF TG_OP = 'DELETE' THEN
        EXECUTE format('
            UPDATE user_storage_usage
            SET 
                total_bytes = GREATEST(0, total_bytes - $1),
                file_count = GREATEST(0, file_count - 1),
                %I = GREATEST(0, %I - $1),
                updated_at = NOW()
            WHERE user_id = $2
        ', v_col, v_col) USING v_size, v_user_id;
    END IF;
    
    RETURN NULL; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
