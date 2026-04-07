-- Add token column
ALTER TABLE public.protocols
ADD COLUMN IF NOT EXISTS tenant_signing_token UUID DEFAULT NULL;

-- Modify status constraint to allow 'pending_signature'
ALTER TABLE public.protocols DROP CONSTRAINT IF EXISTS protocols_status_check;
ALTER TABLE public.protocols ADD CONSTRAINT protocols_status_check CHECK (status IN ('draft', 'pending_signature', 'signed'));

-- Create RPC to get the protocol securely via the token
CREATE OR REPLACE FUNCTION public.get_public_protocol(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'property_id', p.property_id,
        'status', p.status,
        'handover_date', p.handover_date,
        'tenants_details', p.tenants_details,
        'content', p.content,
        'evidence_urls', p.evidence_urls,
        'landlord_signature', p.landlord_signature,
        'tenant_signature', p.tenant_signature,
        'created_at', p.created_at,
        'properties', jsonb_build_object(
            'address', pr.address,
            'city', pr.city
        )
    ) INTO result
    FROM public.protocols p
    JOIN public.properties pr ON pr.id = p.property_id
    WHERE p.tenant_signing_token = p_token
    AND p.status = 'pending_signature';

    RETURN result;
END;
$$;

-- Create RPC to securely sign the protocol
CREATE OR REPLACE FUNCTION public.sign_public_protocol(p_token UUID, p_signature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.protocols
    SET 
        tenant_signature = p_signature,
        status = 'signed',
        updated_at = NOW()
    WHERE tenant_signing_token = p_token AND status = 'pending_signature';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$;
