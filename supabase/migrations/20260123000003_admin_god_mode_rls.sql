-- Migration: admin_god_mode_rls
-- Description: Grants Admins and Super Admins view access to all core data (properties, contracts, tenants, payments).

-- 1. Ensure public.is_admin() accounts for is_super_admin if role is not set
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR is_super_admin = true)
    );
END;
$$;

-- 2. Add Admin policies to core tables

-- PROPERTIES
DROP POLICY IF EXISTS "Admins view all properties" ON public.properties;
CREATE POLICY "Admins view all properties" 
    ON public.properties FOR SELECT 
    USING (public.is_admin());

-- CONTRACTS
DROP POLICY IF EXISTS "Admins view all contracts" ON public.contracts;
CREATE POLICY "Admins view all contracts" 
    ON public.contracts FOR SELECT 
    USING (public.is_admin());

-- TENANTS
DROP POLICY IF EXISTS "Admins view all tenants" ON public.tenants;
CREATE POLICY "Admins view all tenants" 
    ON public.tenants FOR SELECT 
    USING (public.is_admin());

-- PAYMENTS
DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
CREATE POLICY "Admins view all payments" 
    ON public.payments FOR SELECT 
    USING (public.is_admin());

-- PROPERTY DOCUMENTS
DROP POLICY IF EXISTS "Admins view all property documents" ON public.property_documents;
CREATE POLICY "Admins view all property documents" 
    ON public.property_documents FOR SELECT 
    USING (public.is_admin());

-- DOCUMENT FOLDERS
DROP POLICY IF EXISTS "Admins view all document folders" ON public.document_folders;
CREATE POLICY "Admins view all document folders" 
    ON public.document_folders FOR SELECT 
    USING (public.is_admin());

-- SHORT LINKS
DROP POLICY IF EXISTS "Admins view all short links" ON public.short_links;
CREATE POLICY "Admins view all short links" 
    ON public.short_links FOR SELECT 
    USING (public.is_admin());

-- STORAGE OBJECTS (God Mode for Admins)
DROP POLICY IF EXISTS "Admins full access to secure_documents" ON storage.objects;
CREATE POLICY "Admins full access to secure_documents"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'secure_documents' 
        AND public.is_admin()
    )
    WITH CHECK (
        bucket_id = 'secure_documents' 
        AND public.is_admin()
    );

-- 3. Notify Schema Reload
NOTIFY pgrst, 'reload schema';
