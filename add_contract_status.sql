ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
