-- Migration: link_signup_plan_metadata
-- Description: Updates handle_new_user trigger to use plan_id from user metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    selected_plan TEXT;
BEGIN
    -- Extract plan_id from metadata or default to 'free'
    selected_plan := COALESCE(NEW.raw_user_meta_data->>'plan_id', 'free');

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
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2),
        'user',
        'active',
        selected_plan
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        plan_id = COALESCE(selected_plan, user_profiles.plan_id),
        updated_at = NOW();

    -- Link Past Invoices (if any exist)
    BEGIN
        UPDATE public.invoices
        SET user_id = NEW.id
        WHERE user_id IS NULL 
        AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Invoice linking failed for user %: %', NEW.email, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile for %: %', NEW.email, SQLERRM;
END;
$$;
