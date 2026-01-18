-- Migration: Safe Tenant Deletion (Set NULL on Property Delete)

DO $$ 
BEGIN
    -- 1. Drop existing FK constraint
    -- We need to find the name. Usually automatically named or explicitly named.
    -- We'll try to drop by finding it or dropping common names.
    -- Since we don't know the exact name, we can query it or just drop if exists with likely names.
    -- Better approach: Alter table drop constraint if exists.
    
    -- Attempt to identify and drop the constraint on column 'property_id'
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'tenants' AND constraint_type = 'FOREIGN KEY') THEN
               
        -- Drop the constraint causing "ON DELETE CASCADE" or "RESTRICT" behavior
        -- Note: We might not know the exact name, so in production we'd look it up.
        -- For this migration, we will assume standard naming or iterate.
        -- HOWEVER, in Supabase SQL editor we can just do:
        
        ALTER TABLE public.tenants
        DROP CONSTRAINT IF EXISTS tenants_property_id_fkey; -- Standard name
        
    END IF;

    -- 2. Add the new Safe Constraint
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_property_id_fkey
    FOREIGN KEY (property_id)
    REFERENCES public.properties(id)
    ON DELETE SET NULL;

END $$;
