-- Migration: Harden Property Occupancy Logic
-- Date: 2026-01-30
-- Description: Makes the occupancy status date-aware (checks start_date and current date).

-- 1. Create helper to recalculate all statuses
CREATE OR REPLACE FUNCTION public.recalculate_all_property_statuses()
RETURNS void AS $$
BEGIN
    -- This is a batch update to ensure everything is in sync
    UPDATE public.properties p
    SET status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.property_id = p.id
            AND c.status = 'active'
            AND c.start_date <= CURRENT_DATE
            AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
        ) THEN 'Occupied'
        ELSE 'Vacant'
    END
    WHERE p.id IS NOT NULL; -- Added safe WHERE clause
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the trigger function to be date-aware
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract_v2()
RETURNS TRIGGER AS $$
DECLARE
    target_property_id uuid;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_property_id := OLD.property_id;
    ELSE
        target_property_id := NEW.property_id;
    END IF;

    -- Check if any active contract is effective TODAY
    IF EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE property_id = target_property_id 
        AND status = 'active'
        AND start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = target_property_id;
    ELSE
        UPDATE public.properties
        SET status = 'Vacant'
        WHERE id = target_property_id;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the daily maintenance job to include full sync
CREATE OR REPLACE FUNCTION public.process_daily_notifications_with_archive()
RETURNS void AS $$
BEGIN
    -- A. Archive expired contracts
    PERFORM public.archive_expired_contracts();
    
    -- B. Recalculate all property statuses (handles contracts starting today)
    PERFORM public.recalculate_all_property_statuses();
    
    -- C. Run existing notification logic
    PERFORM public.process_daily_notifications();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Run once to fix historical data
SELECT public.recalculate_all_property_statuses();
