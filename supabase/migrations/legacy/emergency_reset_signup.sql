-- ============================================
-- EMERGENCY SIGNUP RESET
-- ============================================

-- 1. DROP ALL TRIGGERS (Clear the conflict)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

-- 2. CONSOLIDATED TRIGGER FUNCTION
-- Handles both Profile Creation and Invoice Recovery in one safe transaction.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public -- Force Public Schema
AS $$
BEGIN
    -- A. Create User Profile
    -- We use a simpler INSERT to minimize potential type errors
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'::user_role,
        'active'::subscription_status,
        'free_forever'::subscription_plan_type
    )
    ON CONFLICT (id) DO NOTHING; -- Idempotency: If it exists, skip.

    -- B. Link Past Invoices (Safely)
    -- We wrap this in a block so if it fails, the user is still created.
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed for users %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If the main profile creation fails, we must fail the signup to prevent phantom users.
    RAISE EXCEPTION 'Signup Critical Error: %', SQLERRM;
END;
$$;

-- 3. RE-ATTACH SINGLE TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
