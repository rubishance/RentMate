-- Add user_id to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill user_id from contracts
UPDATE public.payments p
SET user_id = c.user_id
FROM public.contracts c
WHERE p.contract_id = c.id
AND p.user_id IS NULL;

-- Enforce NOT NULL after backfill (optional, but good practice if we want to guarantee it)
-- ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS (idempotent)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts (or use CREATE POLICY IF NOT EXISTS if supported, but DROP is safer for updates)
DROP POLICY IF EXISTS "Users can only see their own payments" ON public.payments;

-- Create RLS Policy
CREATE POLICY "Users can only see their own payments" 
ON public.payments 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
