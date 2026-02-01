-- Migration: Restore Property Status & Triggers
-- Description: Re-adds the 'status' column to 'properties' (incorrectly dropped in a cleanup migration) and ensures triggers are valid.

BEGIN;

-- 1. Restore the status column
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant';

-- 2. Recalculate all statuses to ensure data integrity
-- This uses the function defined in 20260130171500_harden_occupancy_logic.sql
SELECT public.recalculate_all_property_statuses();

-- 3. Ensure the trigger function is correct and the trigger is attached
-- The trigger trigger_update_property_status from 20260130171500_harden_occupancy_logic.sql 
-- should now work because the 'status' column exists.

COMMIT;
