-- Create document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., 'utility_electric', 'maintenance', 'media', 'other'
    name TEXT NOT NULL, -- The user-friendly subject/title
    folder_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Policies for document_folders
CREATE POLICY "Users can view folders for their properties"
    ON document_folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert folders for their properties"
    ON document_folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update folders for their properties"
    ON document_folders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete folders for their properties"
    ON document_folders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = document_folders.property_id
            AND p.user_id = auth.uid()
        )
    );

-- Add folder_id to property_documents
ALTER TABLE property_documents
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_property_category ON document_folders(property_id, category);
CREATE INDEX IF NOT EXISTS idx_property_documents_folder ON property_documents(folder_id);
