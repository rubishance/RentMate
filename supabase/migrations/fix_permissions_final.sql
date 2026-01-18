-- ============================================
-- FINAL FIX FOR SIGNUP ERRORS
-- ============================================

-- 1. Grant Permissions to be absolutely safe
GRANT ALL ON TABLE public.invoices TO postgres, service_role;
GRANT ALL ON TABLE public.user_profiles TO postgres, service_role;

-- 2. Update the Invoice Relinking Trigger to be ROBUST
-- We add 'SET search_path = public' to ensure it finds the table.
-- We add a Try/Catch block to prevent blocking signup if this fails.

CREATE OR REPLACE FUNCTION relink_past_invoices()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Update invoices that have NO owner (user_id is NULL) 
    -- but match the new user's email string.
    UPDATE public.invoices
    SET user_id = NEW.id
    WHERE user_id IS NULL 
    AND billing_email = NEW.email;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If this fails, we Log it but ALLOW the user to sign up.
    -- We don't want to block registration just because of an invoice linking error.
    RAISE WARNING 'Failed to relink invoices for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Ensure the Trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
CREATE TRIGGER on_auth_user_created_relink_invoices
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION relink_past_invoices();
