-- ============================================
-- 2. Link User Profiles to Subscription Plans
-- ============================================

-- 1. Add plan_id column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'free';

-- 2. Migrate existing users based on old enum (if needed)
-- Assuming 'free_forever' -> 'free', anything else -> 'free' or 'enterprise'
-- Since we are just starting, defaulting to 'free' is safe.
UPDATE user_profiles SET plan_id = 'free' WHERE plan_id IS NULL;

-- 3. Drop old columns if they exist (optional cleanup)
-- We'll keep them for a moment just in case, but let's drop the reliance on the enum type eventually.
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_plan;

-- 4. Update Trigger for New Users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        id, email, full_name, role, subscription_status, plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user',
        'active',
        'free' -- Default to free plan
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
