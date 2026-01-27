-- ============================================
-- RESCUE SCRIPT: Fix Missing Profile
-- ============================================

-- If you can't log in, it's likely your "User Profile" wasn't created due to the previous error.
-- This script manually creates it for you.

DO $$
DECLARE
    target_email TEXT := 'rentmate.rubi@gmail.com'; -- <--- YOUR EMAIL HERE
    v_user_id UUID;
BEGIN
    -- 1. Find the User ID from the Auth table
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found in Auth system. Please Sign Up first.', target_email;
    END IF;

    -- 2. Create the Profile manually if it's missing
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        v_user_id,
        target_email,
        'Admin User', -- Default name
        'admin',      -- Give yourself Admin access
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', subscription_status = 'active';

    RAISE NOTICE 'Fixed profile for %', target_email;
END;
$$;
