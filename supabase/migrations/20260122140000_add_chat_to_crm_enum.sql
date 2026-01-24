-- Migration: Add 'chat' to crm_interaction_type enum
DO $$ 
BEGIN
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'chat';
EXCEPTION
    WHEN others THEN
        -- If the type doesn't exist yet (though it should), this will fail silently
        RAISE NOTICE 'Skipping type update: crm_interaction_type might not exist or already has chat value.';
END $$;
