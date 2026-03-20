CREATE TABLE IF NOT EXISTS public.protocols (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
    handover_date TIMESTAMPTZ,
    tenants_details JSONB,
    content JSONB,
    evidence_urls JSONB,
    landlord_signature TEXT,
    tenant_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own protocols via the property they own
CREATE POLICY "Users can view their own protocols"
    ON public.protocols FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.properties
        WHERE properties.id = protocols.property_id
        AND properties.user_id = auth.uid()
    ));

-- Allow users to insert protocols if they own the related property
CREATE POLICY "Users can insert their own protocols"
    ON public.protocols FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.properties
        WHERE properties.id = protocols.property_id
        AND properties.user_id = auth.uid()
    ));

-- Allow users to update protocols if they own the related property (and it's not locked/signed in application logic)
CREATE POLICY "Users can update their own protocols"
    ON public.protocols FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.properties
        WHERE properties.id = protocols.property_id
        AND properties.user_id = auth.uid()
    ));

-- Allow users to delete protocols if they own the related property
CREATE POLICY "Users can delete their own protocols"
    ON public.protocols FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.properties
        WHERE properties.id = protocols.property_id
        AND properties.user_id = auth.uid()
    ));

-- Setup for storage bucket (handled internally by Supabase logic or we can add rules directly to objects table)
INSERT INTO storage.buckets (id, name, public)
VALUES ('protocol_evidence', 'protocol_evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for protocol evidence"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'protocol_evidence' );

CREATE POLICY "Authenticated users can upload protocol evidence"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'protocol_evidence' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can delete protocol evidence"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'protocol_evidence' AND auth.role() = 'authenticated' );
