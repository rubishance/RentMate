-- ============================================
-- AUTO-RECOVER PAST INVOICES ON SIGNUP
-- ============================================

-- This function runs whenever a NEW user triggers the 'handle_new_user' flow (or separate trigger).
-- It looks for "Orphaned" invoices (where user_id IS NULL) that match the new user's email.

CREATE OR REPLACE FUNCTION relink_past_invoices()
RETURNS TRIGGER AS $$
DECLARE
    recovered_count INT;
BEGIN
    -- Update invoices that have NO owner (user_id is NULL) 
    -- but match the new user's email string.
    UPDATE public.invoices
    SET user_id = NEW.id
    WHERE user_id IS NULL 
    AND billing_email = NEW.email;

    GET DIAGNOSTICS recovered_count = ROW_COUNT;

    -- Optional: Log this event if you want audit trails
    -- RAISE NOTICE 'Recovered % invoices for user % based on email match.', recovered_count, NEW.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach this to the SAME trigger point as profile creation, 
-- or run it right after.
-- We'll attach it to auth.users AFTER INSERT.

DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;

CREATE TRIGGER on_auth_user_created_relink_invoices
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION relink_past_invoices();
