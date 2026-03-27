-- Create Tenant Candidates Table
CREATE TABLE IF NOT EXISTS public.tenant_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    id_number TEXT,
    monthly_income NUMERIC,
    employment_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    documents JSONB DEFAULT '{}',
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tenant_candidates
ALTER TABLE public.tenant_candidates ENABLE ROW LEVEL SECURITY;

-- Policies for tenant_candidates
DROP POLICY IF EXISTS "Users can view candidates for their properties" ON public.tenant_candidates;
CREATE POLICY "Users can view candidates for their properties"
ON public.tenant_candidates
FOR SELECT
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update candidates for their properties" ON public.tenant_candidates;
CREATE POLICY "Users can update candidates for their properties"
ON public.tenant_candidates
FOR UPDATE
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete candidates for their properties" ON public.tenant_candidates;
CREATE POLICY "Users can delete candidates for their properties"
ON public.tenant_candidates
FOR DELETE
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

-- Allow anonymous inserts via the public token link (Application Form)
DROP POLICY IF EXISTS "Anyone can insert candidates" ON public.tenant_candidates;
CREATE POLICY "Anyone can insert candidates"
ON public.tenant_candidates
FOR INSERT
WITH CHECK (true);

-- Create Property Protocols Table
CREATE TABLE IF NOT EXISTS public.property_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('move_in', 'move_out')),
    date DATE NOT NULL,
    meters JSONB DEFAULT '{}',
    inventory JSONB DEFAULT '{}',
    condition_notes TEXT,
    landlord_signature TEXT,
    tenant_signature TEXT,
    tenant_signing_token TEXT UNIQUE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_tenant', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for property_protocols
ALTER TABLE public.property_protocols ENABLE ROW LEVEL SECURITY;

-- Policies for property_protocols
DROP POLICY IF EXISTS "Users can view protocols for their properties" ON public.property_protocols;
CREATE POLICY "Users can view protocols for their properties"
ON public.property_protocols
FOR SELECT
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert protocols for their properties" ON public.property_protocols;
CREATE POLICY "Users can insert protocols for their properties"
ON public.property_protocols
FOR INSERT
WITH CHECK (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update protocols for their properties" ON public.property_protocols;
CREATE POLICY "Users can update protocols for their properties"
ON public.property_protocols
FOR UPDATE
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete protocols for their properties" ON public.property_protocols;
CREATE POLICY "Users can delete protocols for their properties"
ON public.property_protocols
FOR DELETE
USING (
    property_id IN (
        SELECT id FROM public.properties WHERE user_id = auth.uid()
    )
);

-- Allow anonymous updates via the tenant signing token
DROP POLICY IF EXISTS "Tenants can update protocol with unique token" ON public.property_protocols;
CREATE POLICY "Tenants can update protocol with unique token"
ON public.property_protocols
FOR UPDATE
USING (
    tenant_signing_token IS NOT NULL
);


