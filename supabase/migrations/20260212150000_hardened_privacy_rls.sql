-- ============================================
-- PRIVACY HARDENING: RESTRICT ADMIN GLOBAL SELECT
-- ============================================
-- Description: Removes the permissive "Admins view all" RLS policies 
-- that grant administrators unrestricted SELECT access to core tables.
-- Administrative oversight should be performed via RPCs with SECURITY DEFINER
-- or very specific read-only policies for audit purposes.

-- 1. Contracts
DROP POLICY IF EXISTS "Admins view all contracts" ON public.contracts;
DROP POLICY IF EXISTS "Enable read access for admin" ON public.contracts;

-- 2. Properties
DROP POLICY IF EXISTS "Admins view all properties" ON public.properties;
DROP POLICY IF EXISTS "Enable read access for admin" ON public.properties;

-- 4. Payments
DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
DROP POLICY IF EXISTS "Enable read access for admin" ON public.payments;

-- 5. Property Documents
DROP POLICY IF EXISTS "Admins view all property_documents" ON public.property_documents;

-- 6. Document Folders
DROP POLICY IF EXISTS "Admins view all document_folders" ON public.document_folders;

-- 7. Short Links
DROP POLICY IF EXISTS "Admins view all short_links" ON public.short_links;

-- NOTE: Standard ownership policies (e.g., "Users can view own contracts") 
-- must still exist and be enforced. This migration only removes the 
-- "God Mode" bypasses for admins.
