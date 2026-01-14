-- ============================================
-- Make title column nullable in properties
-- ============================================

ALTER TABLE properties 
ALTER COLUMN title DROP NOT NULL;

SELECT '✅ title column is now nullable!' AS status;
