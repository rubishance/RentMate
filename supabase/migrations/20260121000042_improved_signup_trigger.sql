-- ============================================
-- IMPROVED SIGNUP TRIGGER (Prevents Orphaned Users)
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved signup function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create User Profile with UPSERT to handle edge cases
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'User',
        'user',
        'active',
        'free'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        updated_at = NOW();

    -- Link Past Invoices (if any exist)
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail signup
        RAISE WARNING 'Invoice linking failed for user %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Critical: If profile creation fails, we should fail the auth signup too
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;

-- Attach trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role, authenticated;
GRANT ALL ON TABLE public.invoices TO postgres, service_role;

-- Verify trigger is active
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE 'Signup trigger successfully installed';
    ELSE
        RAISE WARNING 'Signup trigger installation failed!';
    END IF;
END $$;
