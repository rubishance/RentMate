-- Backfill missing user_id in payments table
-- This is necessary because some payments were created without user_id before the code fix was deployed
-- or because the RLS policy prevents seeing them, so we must ensure they have owners.

UPDATE public.payments p
SET user_id = c.user_id
FROM public.contracts c
WHERE p.contract_id = c.id
AND p.user_id IS NULL;
