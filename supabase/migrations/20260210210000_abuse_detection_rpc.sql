CREATE OR REPLACE FUNCTION public.perform_abuse_scan()
RETURNS TABLE (
    user_id UUID,
    event_code TEXT,
    severity TEXT,
    details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_event_code TEXT;
    v_severity TEXT;
    v_details JSONB;
    v_hour_ago TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
BEGIN
    -- 1. WHATSAPP SPIKE DETECTION
    -- Users who sent more than 30 messages in the last hour
    FOR v_user_id, v_details IN 
        SELECT w.user_id, jsonb_build_object('count', count(*), 'period', '1h')
        FROM public.whatsapp_usage_logs w
        WHERE w.created_at >= v_hour_ago
        GROUP BY w.user_id
        HAVING count(*) > 30
    LOOP
        PERFORM public.log_security_event(v_user_id, 'WHATSAPP_SPIKE', 'medium', v_details);
        user_id := v_user_id;
        event_code := 'WHATSAPP_SPIKE';
        severity := 'medium';
        details := v_details;
        RETURN NEXT;
    END LOOP;

    -- 2. RESOURCE SPIKE DETECTION (Properties)
    -- Users who created more than 5 properties in the last hour
    FOR v_user_id, v_details IN 
        SELECT p.user_id, jsonb_build_object('count', count(*), 'type', 'properties')
        FROM public.properties p
        WHERE p.created_at >= v_hour_ago
        GROUP BY p.user_id
        HAVING count(*) > 5
    LOOP
        PERFORM public.log_security_event(v_user_id, 'RESOURCE_SPIKE', 'high', v_details);
        user_id := v_user_id;
        event_code := 'RESOURCE_SPIKE';
        severity := 'high';
        details := v_details;
        RETURN NEXT;
    END LOOP;

    -- 3. MULTI-ACCOUNTING DETECTION
    -- Different users with the same IP in the last hour
    FOR v_user_id, v_details IN 
        SELECT s1.user_id, jsonb_build_object('ip', s1.ip_address, 'colliding_users', count(distinct s2.user_id))
        FROM public.security_logs s1
        JOIN public.security_logs s2 ON s1.ip_address = s2.ip_address AND s1.user_id != s2.user_id
        WHERE s1.created_at >= v_hour_ago AND s2.created_at >= v_hour_ago
        GROUP BY s1.user_id, s1.ip_address
        HAVING count(distinct s2.user_id) > 2
    LOOP
        PERFORM public.log_security_event(v_user_id, 'IP_COLLISION', 'medium', v_details);
        user_id := v_user_id;
        event_code := 'IP_COLLISION';
        severity := 'medium';
        details := v_details;
        RETURN NEXT;
    END LOOP;

END;
$$;
