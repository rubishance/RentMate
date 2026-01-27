-- Clean up legacy/unnecessary columns from contracts table
-- Use with caution: Only drops columns that are confirmed unused by current codebase

DO $$
BEGIN
    -- Drop 'index_base' if it exists (legacy name, replaced by base_index_value)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'index_base') THEN
        ALTER TABLE contracts DROP COLUMN index_base;
    END IF;

    -- Drop 'linkage_rate' if it exists (legacy name, replaced by linkage_value or coefficient)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'linkage_rate') THEN
        ALTER TABLE contracts DROP COLUMN linkage_rate;
    END IF;

    -- Drop 'index_linkage_rate' if it exists on contracts (it belongs on payments)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'index_linkage_rate') THEN
        ALTER TABLE contracts DROP COLUMN index_linkage_rate;
    END IF;

     -- Drop 'user_confirmed' if it exists on properties (not used)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'user_confirmed') THEN
        ALTER TABLE properties DROP COLUMN user_confirmed;
    END IF;

END $$;
