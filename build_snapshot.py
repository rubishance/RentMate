import re

def create_golden_snapshot(baseline_file, output_file):
    with open(baseline_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Strip the massive data blocks (usually at the end)
    # Pattern: INSERT INTO index_data or housing_data
    content = re.sub(r"INSERT INTO index_data.*?\n\n", "-- [Index Data Stripped]\n", content, flags=re.DOTALL)
    content = re.sub(r"INSERT INTO housing_data.*?\n\n", "-- [Housing Data Stripped]\n", content, flags=re.DOTALL)
    
    # 2. Fix the Vault error globally
    # Replace any attempt to select from vault.secrets with a placeholder
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)
    
    # 3. Handle public.user_profiles column existence
    # We already have CREATE TABLE IF NOT EXISTS, but we should make sure first_name/last_name are in the BASE definition.
    # I will inject the ALTER statements at the start of the public schema block.
    
    # 4. Strip any hardcoded production project IDs
    PROD_PROJECT = "qfvrekvugdjnwhnaucmz"
    STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)

    # 5. Add a "Clean Start" header
    header = """-- ============================================
-- RENTMATE GOLDEN SNAPSHOT (CLEAN BASELINE)
-- ============================================
-- This script sets up the final target structure of the database.
-- It skips migration history and focuses on the CURRENT state.

-- PRE-FLIGHT: ENSURE CRITICAL COLUMNS EXIST BEFORE ANY INSERTS
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS plan_id TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(header + content)
    print(f"Golden Snapshot created at {output_file}")

create_golden_snapshot('staging_schema.sql', 'STAGING_GOLDEN_SNAPSHOT.sql')
