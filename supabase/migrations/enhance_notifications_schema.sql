-- Add metadata column to notifications for storing context (e.g., contract_id)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow new column usage if necessary (usually robust enough)
