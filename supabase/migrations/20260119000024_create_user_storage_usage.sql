-- User Storage Usage Tracking
-- Migration: 20260119_create_user_storage_usage.sql

CREATE TABLE IF NOT EXISTS user_storage_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Breakdown by category
    media_bytes BIGINT DEFAULT 0,
    utilities_bytes BIGINT DEFAULT 0,
    maintenance_bytes BIGINT DEFAULT 0,
    documents_bytes BIGINT DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own storage usage"
    ON user_storage_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_storage_usage (user_id, total_bytes, file_count)
        VALUES (NEW.user_id, NEW.file_size, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_bytes = user_storage_usage.total_bytes + NEW.file_size,
            file_count = user_storage_usage.file_count + 1,
            updated_at = NOW();
            
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_storage_usage
        SET 
            total_bytes = GREATEST(0, total_bytes - OLD.file_size),
            file_count = GREATEST(0, file_count - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on property_documents
CREATE TRIGGER update_storage_on_document_change
AFTER INSERT OR DELETE ON property_documents
FOR EACH ROW EXECUTE FUNCTION update_user_storage();

-- Storage Quota Check Function
CREATE OR REPLACE FUNCTION check_storage_quota(
    p_user_id UUID,
    p_file_size BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_usage BIGINT;
    v_max_storage_mb INTEGER;
    v_max_storage_bytes BIGINT;
BEGIN
    -- Get current usage
    SELECT COALESCE(total_bytes, 0)
    INTO v_current_usage
    FROM user_storage_usage
    WHERE user_id = p_user_id;
    
    -- Get plan limit
    SELECT sp.max_storage_mb
    INTO v_max_storage_mb
    FROM user_profiles up
    JOIN subscription_plans sp ON up.plan_id = sp.id
    WHERE up.id = p_user_id;
    
    -- -1 means unlimited
    IF v_max_storage_mb = -1 THEN
        RETURN TRUE;
    END IF;
    
    v_max_storage_bytes := v_max_storage_mb * 1024 * 1024;
    
    -- Check if adding this file would exceed quota
    RETURN (v_current_usage + p_file_size) <= v_max_storage_bytes;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE user_storage_usage IS 'Tracks storage usage per user for quota enforcement';
COMMENT ON FUNCTION check_storage_quota IS 'Checks if user can upload a file based on their plan quota';
