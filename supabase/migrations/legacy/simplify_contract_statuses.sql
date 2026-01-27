-- Migration: Simplify Contract Statuses
-- 1. Update existing data to match new statuses
UPDATE public.contracts 
SET status = 'active' 
WHERE status = 'pending';

UPDATE public.contracts 
SET status = 'archived' 
WHERE status IN ('ended', 'terminated');

-- 2. Drop existing check constraint if it exists (it might be implicit or named)
-- We'll try to drop any existing constraint on status just in case, but usually it's just a text column.
-- If there was a constraint named 'contracts_status_check', we would drop it.
-- ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- 3. Add new check constraint
ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('active', 'archived'));

-- 4. Set default value to 'active'
ALTER TABLE public.contracts 
ALTER COLUMN status SET DEFAULT 'active';
