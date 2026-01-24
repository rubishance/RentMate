-- Comprehensive Daily Notification Logic

-- 1. Updated Contract Expiration Check (60 days)
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        WHERE c.status = 'active'
        -- Changed to 60 days
        AND c.end_date <= (CURRENT_DATE + INTERVAL '60 days')
        AND c.end_date >= CURRENT_DATE
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = expiring_contract.user_id
            AND n.type = 'warning'
            AND n.metadata->>'contract_id' = expiring_contract.id::text
            AND n.title = 'Contract Expiring Soon' 
        ) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                metadata
            ) VALUES (
                expiring_contract.user_id,
                'warning',
                'Contract Expiring Soon',
                'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
                jsonb_build_object('contract_id', expiring_contract.id)
            );
            count_new := count_new + 1;
        END IF;
    END LOOP;
END;
$$;

-- 2. New Rent Due Check (3 days before)
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
BEGIN
    -- This logic assumes we have 'payments' records generated. 
    -- Alternatively, it could calculate "next payment date" dynamically from contracts if payments aren't pre-generated.
    -- For robustness, we'll assume we are looking for payments in 'pending' status due nicely soon.

    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        WHERE pay.status = 'pending'
        AND pay.due_date <= (CURRENT_DATE + INTERVAL '3 days')
        AND pay.due_date >= CURRENT_DATE
    LOOP
        -- Avoid dupes for this specific payment ID
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = due_payment.user_id
            AND n.type = 'info'
            AND n.metadata->>'payment_id' = due_payment.id::text
        ) THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                metadata
            ) VALUES (
                due_payment.user_id,
                'info',
                'Rent Due Soon',
                'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                jsonb_build_object('payment_id', due_payment.id)
            );
            count_new := count_new + 1;
        END IF;
    END LOOP;
END;
$$;

-- 3. Master Orchestrator
CREATE OR REPLACE FUNCTION public.check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_contract_expirations();
    PERFORM public.check_rent_due();
END;
$$;
