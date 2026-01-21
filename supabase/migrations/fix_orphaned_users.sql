-- ============================================
-- FIX ORPHANED USERS
-- ============================================
-- This script finds users in auth.users who don't have a user_profiles entry
-- and creates the missing profiles for them.

-- 1. Create missing profiles for orphaned auth users
INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name,
    first_name,
    last_name,
    role, 
    subscription_status, 
    plan_id
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'User',
    'user',
    'active',
    'free'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    updated_at = NOW();

-- 2. Log the fix
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL;
    
    RAISE NOTICE 'Fixed % orphaned user profiles', orphaned_count;
END $$;
