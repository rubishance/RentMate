-- ============================================
-- RentMate Database Migration
-- Add missing columns to properties table
-- ============================================

-- Step 1: Add missing columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Verify the structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'properties'
ORDER BY ordinal_position;

-- Step 3: Show success message
SELECT 'Migration completed! Properties table now has all required columns.' AS status;
