-- Function to check for expiring contracts and generate notifications
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
BEGIN
    -- Loop through active contracts expiring in the next 30 days
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
        AND c.end_date <= (CURRENT_DATE + INTERVAL '30 days')
        AND c.end_date >= CURRENT_DATE
    LOOP
        -- Check if a 'warning' notification already exists for this contract to avoid duplicates
        -- We check metadata->>'contract_id'
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = expiring_contract.user_id
            AND n.type = 'warning'
            AND n.metadata->>'contract_id' = expiring_contract.id::text
        ) THEN
            -- Insert Notification
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
                'The contract for ' || expiring_contract.address || ', ' || expiring_contract.city || ' ends on ' || to_char(expiring_contract.end_date, 'YYYY-MM-DD') || '.',
                jsonb_build_object('contract_id', expiring_contract.id)
            );
            
            count_new := count_new + 1;
        END IF;
    END LOOP;

    -- Optional: Log execution (if you had a logs table, or just raise notice for debugging)
    -- RAISE NOTICE 'Generated % new expiration notifications', count_new;
END;
$$;
