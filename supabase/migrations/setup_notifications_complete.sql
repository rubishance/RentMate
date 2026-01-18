-- COMPLETE NOTIFICATION SYSTEM SETUP
-- Run this file to set up the entire system (Table, Columns, Functions, Triggers)

-- 1. Create Table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'action', 'urgent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Contract Status Change Trigger
CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    notification_title text;
    notification_body text;
BEGIN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT city || ', ' || address INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    notification_title := 'Contract Status Updated';
    notification_body := format('Contract for %s is now %s.', property_address, NEW.status);

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info',
        notification_title,
        notification_body,
        json_build_object(
            'contract_id', NEW.id,
            'event', 'status_change',
            'old_status', OLD.status,
            'new_status', NEW.status
        )::jsonb
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;
CREATE TRIGGER on_contract_status_change
    AFTER UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_contract_status_change();


-- 5. Daily Notification Job Function
CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    extension_days int := 60;
BEGIN
    -- Contract Ending Soon (30 Days)
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.end_date = CURRENT_DATE + INTERVAL '30 days'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'ending_soon') THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'warning', 'Contract Ending Soon', format('Contract for %s, %s ends in 30 days.', r.city, r.address), json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb);
        END IF;
    END LOOP;

    -- Extension Deadline
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.extension_option = TRUE
        AND c.end_date = CURRENT_DATE + (extension_days || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'extension_deadline') THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'action', 'Extension Deadline Approaching', format('Extension option for %s, %s ends in %s days.', r.city, r.address, extension_days), json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb);
        END IF;
    END LOOP;

    -- Annual Index Update
    FOR r IN
        SELECT c.id, c.user_id, c.start_date, p.city, p.address
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        WHERE c.status = 'active'
        AND c.linkage_type != 'none'
        AND (c.start_date + INTERVAL '1 year' = CURRENT_DATE OR c.start_date + INTERVAL '2 years' = CURRENT_DATE OR c.start_date + INTERVAL '3 years' = CURRENT_DATE)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'contract_id' = r.id::text AND metadata->>'event' = 'index_update' AND metadata->>'date' = CURRENT_DATE::text) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'urgent', 'Annual Index Update', format('Annual index update required for %s, %s.', r.city, r.address), json_build_object('contract_id', r.id, 'event', 'index_update', 'date', CURRENT_DATE)::jsonb);
        END IF;
    END LOOP;

    -- Payment Due Today
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = r.user_id AND metadata->>'payment_id' = r.id::text AND metadata->>'event' = 'payment_due') THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (r.user_id, 'warning', 'Payment Due Today', format('Payment of ₪%s for %s, %s is due today.', r.amount, r.city, r.address), json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb);
        END IF;
    END LOOP;
END;
$$;
