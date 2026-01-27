-- ============================================
-- TRACK DELETED USERS (Audit & Abuse Prevention)
-- ============================================

-- 1. Create a log table that is NOT connected to the user_id via foreign key
-- (So it survives the deletion)
CREATE TABLE IF NOT EXISTS deleted_users_log (
    id BIGSERIAL PRIMARY KEY,
    original_user_id UUID,
    email TEXT,
    phone TEXT,
    subscription_status_at_deletion TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deleted_users_log (
        original_user_id,
        email,
        subcription_status_at_deletion
    )
    VALUES (
        OLD.id,
        OLD.email,
        OLD.subscription_status::text
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger (BEFORE DELETE) to user_profiles
DROP TRIGGER IF EXISTS on_user_profile_deleted ON user_profiles;

CREATE TRIGGER on_user_profile_deleted
    BEFORE DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_user_deletion();
