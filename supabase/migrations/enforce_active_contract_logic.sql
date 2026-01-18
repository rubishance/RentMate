-- Function: Enforce NO OVERLAPPING Active Contracts per Property
CREATE OR REPLACE FUNCTION public.check_active_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if the status is being set to 'active'
    IF NEW.status = 'active' THEN
        IF EXISTS (
            SELECT 1 FROM public.contracts
            WHERE property_id = NEW.property_id
            AND status = 'active'
            AND id != NEW.id -- Exclude self during updates
            AND (
                (start_date <= NEW.end_date) AND (end_date >= NEW.start_date)
            )
        ) THEN
            RAISE EXCEPTION 'Property % has an overlapping active contract. Dates cannot overlap with an existing active contract.', NEW.property_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check before insert or update on contracts
DROP TRIGGER IF EXISTS trigger_check_active_contract ON public.contracts;
CREATE TRIGGER trigger_check_active_contract
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.check_active_contract();


-- Function: Auto-sync Tenant Status
CREATE OR REPLACE FUNCTION public.sync_tenant_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Case 1: Contract becomes ACTIVE (Insert or Update)
    IF NEW.status = 'active' THEN
        -- Link tenant to property and set active
        UPDATE public.tenants
        SET property_id = NEW.property_id,
            status = 'active'
        WHERE id = NEW.tenant_id;
        
        -- Optional: Should we unlink other tenants from this property?
        -- For now, we assume the strict contract logic handles the "one active" rule, 
        -- so we just ensure THIS tenant is the active one.
    END IF;

    -- Case 2: Contract ends or changes from active to something else
    IF (OLD.status = 'active' AND NEW.status != 'active') THEN
        -- Unlink tenant (set to past)
        UPDATE public.tenants
        SET property_id = NULL,
            status = 'past'
        WHERE id = NEW.tenant_id 
        AND property_id = NEW.property_id; -- Only if they are still linked to this property
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync Tenant Status
DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON public.contracts;
CREATE TRIGGER trigger_sync_tenant_status
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_status_from_contract();


-- Function: Auto-update Property Status
CREATE OR REPLACE FUNCTION public.update_property_status_from_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- If contract becomes active, set Property to Occupied
    IF NEW.status = 'active' THEN
        UPDATE public.properties
        SET status = 'Occupied'
        WHERE id = NEW.property_id;
    
    -- If contract ends (ended/terminated) and was previously active
    ELSIF (NEW.status IN ('ended', 'terminated')) THEN
        -- Check if there are ANY other active contracts currently valid (by date)
        -- Actually, simplistically, if we just ended the active one, we might differ to Vacant unless another covers TODAY.
        -- For simplicity, if NO active contracts exist at all, set Vacant.
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

-- Trigger: Update Property Status after contract changes
DROP TRIGGER IF EXISTS trigger_update_property_status ON public.contracts;
CREATE TRIGGER trigger_update_property_status
AFTER INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_property_status_from_contract();
