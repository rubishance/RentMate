-- Migration: Add payment_method to contracts
-- Description: Adds missing payment_method column to the contracts table.

ALTER TABLE IF EXISTS public.contracts 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

COMMENT ON COLUMN public.contracts.payment_method IS 'The method used for rent payments (e.g., bank_transfer, check, cash, credit_card).';
