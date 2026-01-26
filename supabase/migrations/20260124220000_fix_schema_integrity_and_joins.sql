-- Migration: Fix Schema Integrity and Relationship Join Issues (Robust Version)
-- This fixes:
-- 1. Delete user failure (Foreign key violations because objects weren't cascading)
-- 2. Notification Center error (Could not find relationship between admin_notifications and user_profiles)

DO $$ 
BEGIN
    -- 1. PROPERTIES
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
        ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_user_id_fkey;
        ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_user_id_profiles_fkey;
        
        ALTER TABLE public.properties
        ADD CONSTRAINT properties_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 2. TENANTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_fkey;
        ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_user_id_profiles_fkey;
        
        ALTER TABLE public.tenants
        ADD CONSTRAINT tenants_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 3. CONTRACTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
        ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_user_id_fkey;
        ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_user_id_profiles_fkey;

        ALTER TABLE public.contracts
        ADD CONSTRAINT contracts_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 4. ADMIN_NOTIFICATIONS (Fix relationship for PostgREST joins)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
        ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_user_id_fkey;
        ALTER TABLE public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_user_id_profiles_fkey;
        
        ALTER TABLE public.admin_notifications
        ADD CONSTRAINT admin_notifications_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 5. SUPPORT_TICKETS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
        ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_profiles_fkey;
        
        ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 6. TICKET_COMMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_comments') THEN
        ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey;
        ALTER TABLE public.ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_profiles_fkey;
        
        ALTER TABLE public.ticket_comments
        ADD CONSTRAINT ticket_comments_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- 7. PROPERTY_DOCUMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_documents') THEN
        ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_user_id_fkey;
        ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_user_id_profiles_fkey;
        
        ALTER TABLE public.property_documents
        ADD CONSTRAINT property_documents_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
