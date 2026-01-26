-- Migration: Add Autonomous Notice Periods to Contracts
-- Description: Adds columns to store legal notice periods extracted from the contract by AI.

ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
ADD COLUMN IF NOT EXISTS option_notice_days INTEGER;

COMMENT ON COLUMN public.contracts.notice_period_days IS 'Number of days notice required for non-renewal (extracted from contract).';
COMMENT ON COLUMN public.contracts.option_notice_days IS 'Number of days notice required to exercise a renewal option (extracted from contract).';
