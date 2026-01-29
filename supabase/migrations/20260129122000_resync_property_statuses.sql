-- Migration: One-time Re-sync of Property Statuses
-- Date: 2026-01-29

DO $$
DECLARE
    prop RECORD;
BEGIN
    FOR prop IN SELECT id FROM public.properties LOOP
        -- If an active contract exists, set to Occupied
        IF EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE property_id = prop.id 
            AND status = 'active'
        ) THEN
            UPDATE public.properties
            SET status = 'Occupied'
            WHERE id = prop.id;
        ELSE
            -- Otherwise Vacant
            UPDATE public.properties
            SET status = 'Vacant'
            WHERE id = prop.id;
        END IF;
    END LOOP;
END $$;
