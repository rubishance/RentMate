-- Fix Signup Error "Database error saving new user"
-- This migration ensures all dependencies for the signup trigger are present.

DO $$ 
BEGIN
    -- 1. Ensure 'first_name' and 'last_name' columns exist in user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_name TEXT;
    END IF;

    -- 2. Ensure 'subscription_plans' has the 'free' plan
    INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, features)
    VALUES ('free', 'Free Forever', 0, 1, '{"support_level": "basic"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Ensure 'plan_id' column exists in user_profiles
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'plan_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN plan_id TEXT REFERENCES public.subscription_plans(id) DEFAULT 'free';
    END IF;

END $$;

-- 4. Redefine handle_new_user with robust error handling and column usage
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
        'user', -- Default role
        'active', -- Default status
        default_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        updated_at = NOW();

    -- Link Past Invoices safely
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but try to succeed if possible? 
    -- No, if profile fails, auth should fail. But give clear error.
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;

-- 5. Ensure Trigger is Attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
