-- Migration: Update Property Occupancy Trigger to handle DELETE and improved logic
-- Date: 2026-01-29

-- 1. Create the improved function
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract_v2()
RETURNS TRIGGER AS $$
DECLARE
    target_property_id uuid;
BEGIN
    -- Determine which property we are talking about
    -- TG_OP is the operation (INSERT, UPDATE, DELETE)
    IF (TG_OP = 'DELETE') THEN
        target_property_id := OLD.property_id;
    ELSE
        target_property_id := NEW.property_id;
    END IF;

    -- If contract is active, the property is Occupied
    -- We check if ANY active contract exists for this property
    IF EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE property_id = target_property_id 
        AND status = 'active'
    ) THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = target_property_id;
    ELSE
        -- No active contracts found, property is Vacant
        UPDATE public.properties
        SET status = 'Vacant'
        WHERE id = target_property_id;
    END IF;

    -- Handle TG_OP appropriately for return
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old triggers and apply new one
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;

CREATE TRIGGER trigger_update_property_status
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract_v2();

-- Note: We used _v2 for the function name and cleaned up the old trigger binding.
