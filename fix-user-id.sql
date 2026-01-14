-- ============================================
-- Fix user_id column in properties table
-- Make it nullable or add a default value
-- ============================================

-- Option 1: Make user_id nullable (recommended for testing)
ALTER TABLE properties 
ALTER COLUMN user_id DROP NOT NULL;

-- Option 2: Add a default value (uncomment if you prefer this)
-- ALTER TABLE properties 
-- ALTER COLUMN user_id SET DEFAULT 'default-user';

-- Verify the change
SELECT column_name, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'properties' AND column_name = 'user_id';

SELECT '✅ user_id column is now nullable!' AS status;
