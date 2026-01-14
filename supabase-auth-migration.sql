-- ============================================
-- SUPABASE AUTHENTICATION MIGRATION
-- ============================================
-- This migration adds user_id columns and updates RLS policies
-- to support multi-user authentication with Supabase Auth
--
-- IMPORTANT: Run this AFTER enabling Supabase Auth in your project
-- ============================================

-- ============================================
-- ADD user_id COLUMNS TO ALL TABLES
-- ============================================

-- Add user_id to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to settings
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to files
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

-- ============================================
-- UPDATE ROW LEVEL SECURITY POLICIES
-- ============================================

-- PROPERTIES POLICIES
DROP POLICY IF EXISTS "Allow all on properties" ON properties;

CREATE POLICY "Users can view their own properties"
    ON properties FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties"
    ON properties FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
    ON properties FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
    ON properties FOR DELETE
    USING (auth.uid() = user_id);

-- TENANTS POLICIES
DROP POLICY IF EXISTS "Allow all on tenants" ON tenants;

CREATE POLICY "Users can view their own tenants"
    ON tenants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tenants"
    ON tenants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenants"
    ON tenants FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenants"
    ON tenants FOR DELETE
    USING (auth.uid() = user_id);

-- CONTRACTS POLICIES
DROP POLICY IF EXISTS "Allow all on contracts" ON contracts;

CREATE POLICY "Users can view their own contracts"
    ON contracts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contracts"
    ON contracts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts"
    ON contracts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts"
    ON contracts FOR DELETE
    USING (auth.uid() = user_id);

-- SETTINGS POLICIES
DROP POLICY IF EXISTS "Allow all on settings" ON settings;

CREATE POLICY "Users can view their own settings"
    ON settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON settings FOR DELETE
    USING (auth.uid() = user_id);

-- FILES POLICIES
DROP POLICY IF EXISTS "Allow all on files" ON files;

CREATE POLICY "Users can view their own files"
    ON files FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
    ON files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
    ON files FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
    ON files FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- UPDATE STORAGE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

-- Users can only upload their own files
CREATE POLICY "Users can upload their own files"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'contract-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can only view their own files
CREATE POLICY "Users can view their own files"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'contract-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can only delete their own files
CREATE POLICY "Users can delete their own files"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'contract-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- HELPER FUNCTION: Assign existing data to user
-- ============================================
-- After creating your first user account, run this function
-- to assign all existing data to that user
--
-- Usage: SELECT assign_data_to_user('your-user-id-here');
-- ============================================

CREATE OR REPLACE FUNCTION assign_data_to_user(target_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    UPDATE properties SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE tenants SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE contracts SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE settings SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE files SET user_id = target_user_id WHERE user_id IS NULL;
    
    RETURN 'Data successfully assigned to user: ' || target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Authentication migration completed successfully!' AS status;
SELECT 'Next steps:' AS info;
SELECT '1. Enable Email Auth in Supabase Dashboard > Authentication > Providers' AS step_1;
SELECT '2. Create your first user account via signup page' AS step_2;
SELECT '3. Run: SELECT assign_data_to_user(''your-user-id''); to assign existing data' AS step_3;
