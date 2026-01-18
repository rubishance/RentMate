-- ============================================
-- SESSION LIMITS MIGRATION (1 PC + 1 Mobile)
-- ============================================

-- 1. Helper Function: Detect Device Type from User Agent
-- Returns 'mobile' for phones/tablets, 'desktop' for everything else
CREATE OR REPLACE FUNCTION public.get_device_type(user_agent TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE -- Optimization: Always returns same result for same input
AS $$
BEGIN
    IF user_agent IS NULL THEN
        RETURN 'desktop'; -- Default fallback
    END IF;

    -- Standard mobile indicators
    -- "Mobi" catches many browsers, "Android", "iPhone", "iPad" are specific
    IF user_agent ~* '(Mobi|Android|iPhone|iPad|iPod)' THEN
        RETURN 'mobile';
    ELSE
        RETURN 'desktop';
    END IF;
END;
$$;

-- 2. Trigger Function: Enforce Limits
CREATE OR REPLACE FUNCTION public.manage_session_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to delete other sessions
SET search_path = public, auth -- Access to auth schema
AS $$
DECLARE
    new_device_type TEXT;
    session_count INT;
    oldest_session_id UUID;
    max_sessions_per_type INT := 1; -- Hardcoded limit: 1 per group
BEGIN
    -- Identify what kind of device is trying to log in
    new_device_type := public.get_device_type(NEW.user_agent);

    -- Count EXISTING sessions for this user of the SAME type
    -- We filter by the computed device type
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id
    AND public.get_device_type(user_agent) = new_device_type;

    -- If we are at (or above) the limit, we need to make room.
    -- (Note: 'session_count' is the count BEFORE this new row is inserted)
    IF session_count >= max_sessions_per_type THEN
        
        -- Identify the Oldest Session to remove
        SELECT id
        INTO oldest_session_id
        FROM auth.sessions
        WHERE user_id = NEW.user_id
        AND public.get_device_type(user_agent) = new_device_type
        ORDER BY created_at ASC
        LIMIT 1;

        -- Delete it
        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
            
            -- Optional: Raise a notice for debugging (visible in Postgres logs)
            -- RAISE NOTICE 'Session Limit Reached for User %. Deleted sess % (Type: %)', NEW.user_id, oldest_session_id, new_device_type;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Attach Trigger to auth.sessions
-- We use BEFORE INSERT so we can clean up *before* the new session lands.
DROP TRIGGER IF EXISTS enforce_session_limits ON auth.sessions;

CREATE TRIGGER enforce_session_limits
    BEFORE INSERT ON auth.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_session_limits();
