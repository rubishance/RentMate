-- Migration: fix_waitlist_permissions
-- Description: Grants SELECT and DELETE permissions to admins for the waitlist table.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waitlist') THEN
        
        DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
        CREATE POLICY "Admins can view waitlist" 
            ON public.waitlist FOR SELECT 
            USING (public.is_admin());
            
        DROP POLICY IF EXISTS "Admins can delete waitlist" ON public.waitlist;
        CREATE POLICY "Admins can delete waitlist" 
            ON public.waitlist FOR DELETE 
            USING (public.is_admin());
            
    END IF;
END $$;
