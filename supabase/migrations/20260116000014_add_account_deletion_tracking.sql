-- Add fields for account deletion tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted'));

-- Create index for efficient querying of suspended accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create function to permanently delete accounts after 14 days
CREATE OR REPLACE FUNCTION cleanup_suspended_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    user_record RECORD;
BEGIN
    -- Calculate cutoff date (14 days ago)
    cutoff_date := NOW() - INTERVAL '14 days';
    
    -- Find all users marked for deletion more than 14 days ago
    FOR user_record IN 
        SELECT id 
        FROM user_profiles 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < cutoff_date
        AND account_status = 'suspended'
    LOOP
        -- Delete user data (cascades will handle related records)
        DELETE FROM user_profiles WHERE id = user_record.id;
        
        -- Delete from auth.users (requires admin privileges)
        DELETE FROM auth.users WHERE id = user_record.id;
        
        RAISE NOTICE 'Deleted user account: %', user_record.id;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users (will be called by Edge Function)
GRANT EXECUTE ON FUNCTION cleanup_suspended_accounts() TO service_role;

COMMENT ON FUNCTION cleanup_suspended_accounts() IS 'Permanently deletes user accounts that have been suspended for more than 14 days';
