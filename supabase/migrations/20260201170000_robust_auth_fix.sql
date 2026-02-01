-- Robust Authentication & Profile Fix
-- Consolidation of multiple conflicting migrations to solve "Database error saving new user"

BEGIN;

-- 1. Ensure columns exist with correct types (TEXT is safer than ENUM for flexible triggers)
-- We try to alter columns to TEXT to avoid cast errors from previous migrations that might have used ENUMs
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN role TYPE TEXT;
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ALTER COLUMN subscription_status TYPE TEXT;
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

-- 2. Ensure 'free' plan exists in subscription_plans
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties)
VALUES ('free', 'Free Forever', 0, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Consolidated Trigger Function
-- This function handles profile creation, invoice relinking, and metadata parsing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_plan_id TEXT := 'free';
BEGIN
    -- Parse metadata
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1), 'User');
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');

    -- Insert or Update Profile
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id,
        subscription_plan,
        marketing_consent,
        marketing_consent_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_first_name,
        v_last_name,
        NEW.phone,
        'user', 
        'active', 
        v_plan_id,
        'free_forever', -- Legacy field support
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, FALSE),
        CASE WHEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    -- Relink Past Invoices (Safely)
    -- This helps if the user had invoices as a guest/unregistered with the same email
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Relink failed: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Capture any remaining unexpected errors
    RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$;

-- 4. Re-attach Main Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Clean up redundant triggers to prevent double-execution or conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

COMMIT;
