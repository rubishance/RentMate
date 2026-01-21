-- Property Documents System - Main Table
-- Migration: 20260119_create_property_documents.sql

CREATE TABLE IF NOT EXISTS property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Document Classification
    category TEXT NOT NULL CHECK (category IN (
        'photo',           -- Property photos
        'video',           -- Property videos
        'utility_water',   -- Water bills
        'utility_electric',-- Electric bills
        'utility_gas',     -- Gas bills
        'utility_municipality', -- Municipality bills (arnona)
        'utility_management',   -- Building management fees
        'maintenance',     -- Repair/maintenance records
        'invoice',         -- General invoices
        'receipt',         -- Payment receipts
        'insurance',       -- Insurance documents
        'warranty',        -- Warranty documents
        'legal',           -- Legal documents
        'other'            -- Miscellaneous
    )),
    
    -- Storage Info
    storage_bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    
    -- Metadata
    title TEXT,
    description TEXT,
    tags TEXT[],
    
    -- Date Info
    document_date DATE,  -- When the bill/invoice was issued
    period_start DATE,   -- For recurring bills (e.g., monthly utility)
    period_end DATE,
    
    -- Financial Data (for bills/invoices)
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'ILS',
    paid BOOLEAN DEFAULT false,
    payment_date DATE,
    
    -- Maintenance Specific
    vendor_name TEXT,
    issue_type TEXT,     -- e.g., "plumbing", "electrical", "painting"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_documents_property ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_category ON property_documents(category);
CREATE INDEX IF NOT EXISTS idx_property_documents_date ON property_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_property_documents_user ON property_documents(user_id);

-- RLS Policies
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their property documents"
    ON property_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their property documents"
    ON property_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their property documents"
    ON property_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their property documents"
    ON property_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE property_documents IS 'Stores metadata for all property-related documents and files';
COMMENT ON COLUMN property_documents.category IS 'Type of document: photo, video, utility bills, maintenance, etc.';
COMMENT ON COLUMN property_documents.storage_bucket IS 'Supabase storage bucket name';
COMMENT ON COLUMN property_documents.storage_path IS 'Full path to file in storage bucket';
