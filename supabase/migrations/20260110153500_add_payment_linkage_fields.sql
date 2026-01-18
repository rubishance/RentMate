-- Add columns for linkage tracking to payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC, -- The base amount before linkage
ADD COLUMN IF NOT EXISTS index_linkage_rate NUMERIC, -- The linkage percentage applied
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC; -- What was actually paid
