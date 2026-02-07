-- Migration: ensure_unique_phone
-- Description: Enforces unique phone numbers in user_profiles and updates signup trigger.

-- 1. Clean up potential duplicates or empty strings if any exist before adding constraint
-- (In a fresh-ish DB, we assume it's relatively clean, but let's be safe)
UPDATE public.user_profiles SET phone = NULL WHERE phone = '';

-- 2. Add Unique constraint
-- Note: UNIQUE allows multiple NULLs in Postgres, which is perfect for legacy users 
-- who haven't set a phone yet, but prevents 2 users from having the same number.
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_phone_key UNIQUE (phone);

-- 3. Update handle_new_user() to be stricter
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_plan_id TEXT := 'free';
    v_phone TEXT;
BEGIN
    -- Extract phone from metadata or use NEW.phone (from auth schema if provided)
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone);

    -- Verify plan exists
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
        v_phone,
        'user', 
        'active', 
        COALESCE(NEW.raw_user_meta_data->>'plan_id', default_plan_id)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION 
    WHEN unique_violation THEN
        RAISE EXCEPTION 'This phone number is already registered to another account.';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;
