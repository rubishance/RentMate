-- Function: Process Daily Notifications
-- This function is intended to be run once a day (e.g., via pg_cron or Edge Function).

CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    extension_days int := 60; -- Default extension notice period
BEGIN
    -------------------------------------------------------
    -- 1. CONTRACT ENDING SOON (30 Days)
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.end_date = CURRENT_DATE + INTERVAL '30 days'
    LOOP
        -- Check if we already sent this notification (idempotency)
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'ending_soon'
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Contract Ending Soon',
                format('Contract for %s, %s ends in 30 days (%s).', r.city, r.address, r.end_date),
                json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 2. EXTENSION OPTION DEADLINE (User Defined / Default 60 days)
    -------------------------------------------------------
    -- Note: Ideally fetch 'extension_days' from user_preferences per user, but for mass handling we use default or logic.
    -- If user_preferences has the column, we could join. For now, strict 60 days.
    
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.extension_option = TRUE
        -- Assuming deadline IS the end_date if not specified otherwise, or checking user preference
        AND c.end_date = CURRENT_DATE + (extension_days || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'extension_deadline'
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'action', -- Custom type 'action' or 'info'
                'Extension Deadline Approaching',
                format('Extension option for %s, %s ends in %s days.', r.city, r.address, extension_days),
                json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 3. ANNUAL INDEX UPDATE (1 Year after Start)
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.start_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.linkage_type != 'none' -- Only if linked
        AND (
            c.start_date + INTERVAL '1 year' = CURRENT_DATE OR
            c.start_date + INTERVAL '2 years' = CURRENT_DATE OR
            c.start_date + INTERVAL '3 years' = CURRENT_DATE
        )
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'index_update'
            AND metadata->>'date' = CURRENT_DATE::text
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'urgent',
                'Annual Index Update',
                format('Annual index update required for %s, %s.', r.city, r.address),
                json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 4. PAYMENT DUE TODAY
    -------------------------------------------------------
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'payment_id' = r.id::text 
            AND metadata->>'event' = 'payment_due'
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Payment Due Today',
                format('Payment of ₪%s for %s, %s is due today.', r.amount, r.city, r.address),
                json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
            );
        END IF;
    END LOOP;

END;
$$;
