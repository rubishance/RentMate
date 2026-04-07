-- Update get_public_protocol to enforce 7 days expiration
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
    AND p.status = 'pending_signature'
    AND created_at > now() - interval '7 days';

    RETURN result;
END;
$$;

-- Update sign_public_protocol to enforce 7 days expiration
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
    WHERE tenant_signing_token = p_token 
    AND status = 'pending_signature'
    AND updated_at > now() - interval '7 days';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$;
