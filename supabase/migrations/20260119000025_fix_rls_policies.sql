-- Enable RLS (Ensure it's enabled)
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view folders for their properties" ON document_folders;
DROP POLICY IF EXISTS "Users can insert folders for their properties" ON document_folders;
DROP POLICY IF EXISTS "Users can update folders for their properties" ON document_folders;
DROP POLICY IF EXISTS "Users can delete folders for their properties" ON document_folders;

-- Re-create Policies

-- 1. SELECT
CREATE POLICY "Users can view folders for their properties"
    ON document_folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- 2. INSERT
CREATE POLICY "Users can insert folders for their properties"
    ON document_folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- 3. UPDATE
CREATE POLICY "Users can update folders for their properties"
    ON document_folders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- 4. DELETE
CREATE POLICY "Users can delete folders for their properties"
    ON document_folders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- Force schema cache reload again just in case
NOTIFY pgrst, 'reload schema';
