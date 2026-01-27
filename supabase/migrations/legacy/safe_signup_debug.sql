-- ============================================
-- SAFE DEBUG SIGNUP (Basic)
-- ============================================

-- 1. Drop existing triggers to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create a Minimal, Safe Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Just insert the profile. 
    -- We assume the columns allow text if they are Enums (Postgres auto-cast).
    -- If "free_forever" doesn't match the enum label, it will fail, 
    -- so we are careful to match the exact string from the CREATE TYPE.
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
        'user',           -- Text, let Postgres cast to user_role
        'active',         -- Text, let Postgres cast to subscription_status
        'free_forever'    -- Text, let Postgres cast to subscription_plan_type
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If this fails, we catch it and raise a VERY CLEAR error
    RAISE EXCEPTION 'DEBUG ERROR: %', SQLERRM;
END;
$$;

-- 3. Re-Attach
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
