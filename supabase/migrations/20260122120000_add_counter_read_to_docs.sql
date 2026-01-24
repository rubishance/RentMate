-- Migration to add counter_read to property_documents
-- Date: 2026-01-22

-- 1. Add counter_read column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='property_documents' AND column_name='counter_read') THEN
        ALTER TABLE property_documents ADD COLUMN counter_read DECIMAL(12,2);
    END IF;
END $$;

-- 2. Add comment for clarity
COMMENT ON COLUMN property_documents.counter_read IS 'The meter/counter reading extracted from utility bills (water, gas, electricity)';
