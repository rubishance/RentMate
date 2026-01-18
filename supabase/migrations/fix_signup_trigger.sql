-- FIX: Re-create the handle_new_user function with explicit search_path and permissions

-- 1. Grant permissions to be sure
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;

-- 2. Drop the trigger first to avoid conflicts during replace
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Re-define the function with `SET search_path = public`
-- This fixes issues where the function can't find 'user_profiles' or the enums.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- In case of error, we raise it so we know WHY it failed in the logs, 
    -- but for the user it will just say "Database error".
    -- We try to make the above INSERT bulletproof by casting.
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
END;
$$;

-- 4. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
