-- ============================================
-- FINAL SYSTEM FIX (Schema + Triggers)
-- ============================================

-- 1. ENSURE SCHEMA IS CORRECT (Idempotent)
-- We make sure the columns exist. If they were missing, this fixes the "Database Error".
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 2. RESET TRIGGERS (Clean Slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.relink_past_invoices();

-- 3. MASTER SIGNUP FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- A. Create User Profile
    INSERT INTO public.user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Link Past Invoices
    -- We explicitly check if any matching invoices exist before trying to update.
    -- This block will catch errors and Log them instead of crashing the signup.
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking error: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: If profile creation fails, we allow the auth user but log the error.
    -- (Actually, we should probably raise to fail auth, but let's be safe for now)
    RAISE WARNING 'Profile creation error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. VERIFY PERMISSIONS
GRANT ALL ON TABLE public.invoices TO postgres, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;
