-- Migration: RESTORE MISSION COLUMNS TO PROPERTIES
-- Date: 2026-01-30
-- Description: Restores 'status' and 'updated_at' columns which are required for triggers and UI.

BEGIN;

-- 1. Restore 'status' column if it was dropped
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Vacant' CHECK (status IN ('Occupied', 'Vacant'));

-- 2. Add 'updated_at' column if missing
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure 'has_balcony' and 'has_safe_room' exist (User safety check)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_safe_room BOOLEAN DEFAULT false;

-- 4. Repopulate 'status' using the hardened logic
-- This depends on recalculate_all_property_statuses() being defined 
-- (which it was in 20260130171500_harden_occupancy_logic.sql)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalculate_all_property_statuses') THEN
        PERFORM public.recalculate_all_property_statuses();
    END IF;
END $$;

COMMIT;
