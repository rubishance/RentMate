-- Migration: Add invoice_number to property_documents
-- Date: 2026-01-25

ALTER TABLE property_documents 
ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Create an index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_property_documents_duplicate_check 
ON property_documents(vendor_name, document_date, invoice_number);
