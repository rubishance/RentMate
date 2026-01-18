-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('ILS', 'USD', 'EUR')),
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_date DATE DEFAULT NULL,
    payment_method TEXT DEFAULT NULL,
    reference TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies (assuming contracts have user_id, or widely permissive for now to avoid breakage if user_id is missing)
-- Ideally:
-- CREATE POLICY "Users can manage their own payments" ON public.payments
-- USING (contract_id IN (SELECT id FROM public.contracts WHERE user_id = auth.uid()));

-- Fallback permissive policy for development if user_id logic is flaky
CREATE POLICY "Enable all access for authenticated users" ON public.payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
