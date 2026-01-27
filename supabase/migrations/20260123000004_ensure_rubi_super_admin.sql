-- Migration: ensure_rubi_super_admin
-- Description: Ensures the rubi@rentmate.co.il account has super admin privileges.

DO $$
BEGIN
    -- Update rubi@rentmate.co.il if it exists
    UPDATE public.user_profiles
    SET role = 'admin',
        is_super_admin = true
    WHERE email = 'rubi@rentmate.co.il';

    -- If the user exists in auth.users but not in profiles (unlikely), handle_new_user should have created it.
    -- But let's be safe.
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'rubi@rentmate.co.il') THEN
        INSERT INTO public.user_profiles (id, email, role, is_super_admin)
        SELECT id, email, 'admin', true
        FROM auth.users
        WHERE email = 'rubi@rentmate.co.il'
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', is_super_admin = true;
    END IF;
END $$;
