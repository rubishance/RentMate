-- ============================================
-- RELAX SESSION LIMITS (Increase to 5)
-- ============================================

-- Update the manage_session_limits function to be more lenient
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
    -- FIX: Increased from 1 to 5 to prevent aggressive logouts
    max_sessions_per_type INT := 5; 
BEGIN
    -- Identify what kind of device is trying to log in
    new_device_type := public.get_device_type(NEW.user_agent);

    -- Count EXISTING sessions for this user of the SAME type
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id
    AND public.get_device_type(user_agent) = new_device_type;

    -- If we are at (or above) the limit, we need to make room.
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
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
