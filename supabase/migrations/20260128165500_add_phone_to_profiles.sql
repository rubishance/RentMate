-- Migration: add_phone_to_profiles
-- Description: Adds a phone column to user_profiles and updates handle_new_user trigger.

-- 1. Add phone column to user_profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. Backfill phone from auth.users (if possible)
-- auth.users might have phone stored in 'phone' column or 'raw_user_meta_data'
DO $$
BEGIN
    UPDATE public.user_profiles up
    SET phone = au.phone
    FROM auth.users au
    WHERE up.id = au.id
    AND up.phone IS NULL
    AND au.phone IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- Fallback for environments where direct auth.users access isn't allowed without superuser
    RAISE NOTICE 'Backfill from auth.users failed: %', SQLERRM;
END $$;

-- 3. Update handle_new_user() to include phone on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_plan_id TEXT := 'free';
BEGIN
    -- Verify plan exists, fallback to NULL if 'free' is missing (to prevent crash)
    IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = default_plan_id) THEN
        default_plan_id := NULL; 
    END IF;

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        NEW.phone,
        'user', 
        'active', 
        default_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;
