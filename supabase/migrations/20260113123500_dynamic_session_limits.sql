-- ============================================
-- 3. Dynamic Session Limits
-- ============================================

CREATE OR REPLACE FUNCTION public.manage_session_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_device_type TEXT;
    session_count INT;
    oldest_session_id UUID;
    user_plan_limit INT;
BEGIN
    -- 1. Get User's Plan Limit
    SELECT sp.max_sessions
    INTO user_plan_limit
    FROM public.user_profiles up
    JOIN public.subscription_plans sp ON up.plan_id = sp.id
    WHERE up.id = NEW.user_id;

    -- Fallback if no plan found (shouldn't happen)
    IF user_plan_limit IS NULL THEN
        user_plan_limit := 1;
    END IF;

    -- If unlimited (-1), skip check
    IF user_plan_limit = -1 THEN
        RETURN NEW;
    END IF;

    -- 2. Identify Device Type
    new_device_type := public.get_device_type(NEW.user_agent);

    -- 3. Count EXISTING sessions
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id;
    -- Note: We removed the "per device type" logic to enforce a GLOBAL session limit per plan.
    -- If you want per-device, uncomment the AND clause below, but usually plans limit total active sessions.
    -- AND public.get_device_type(user_agent) = new_device_type;

    -- 4. Enforce Limit
    IF session_count >= user_plan_limit THEN
        -- Delete Oldest Session
        SELECT id
        INTO oldest_session_id
        FROM auth.sessions
        WHERE user_id = NEW.user_id
        ORDER BY created_at ASC
        LIMIT 1;

        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
