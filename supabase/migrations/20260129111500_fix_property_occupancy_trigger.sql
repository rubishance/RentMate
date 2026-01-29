-- Function: Auto-update Property Status (Fixed for simplified statuses)
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- If contract becomes active, set Property to Occupied
    IF NEW.status = 'active' THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = NEW.property_id;
    
    -- If contract becomes archived (ended/terminated in old terms)
    ELSIF NEW.status = 'archived' THEN
        -- Check if there are ANY other active contracts currently valid
        -- If NO other active contracts exist, set the property to Vacant.
        IF NOT EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE property_id = NEW.property_id 
            AND status = 'active' 
            AND id != NEW.id
        ) THEN
            UPDATE public.properties
            SET status = 'Vacant'
            WHERE id = NEW.property_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
CREATE TRIGGER trigger_update_property_status
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract();
