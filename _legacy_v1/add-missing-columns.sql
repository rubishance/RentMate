-- ============================================
-- Add Missing Columns to Supabase Properties Table
-- ============================================

-- Add price column (if missing)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Add status column (if missing)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'פנוי';

-- Verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'properties'
ORDER BY ordinal_position;

SELECT '✅ Missing columns added to properties table!' AS status;
