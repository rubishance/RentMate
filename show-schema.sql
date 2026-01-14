-- ============================================
-- Show all columns and their constraints
-- This will help us understand the table structure
-- ============================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'properties'
ORDER BY ordinal_position;
