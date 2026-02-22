import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_zero_tolerance(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    processed_lines = []
    
    # Pre-flight check for columns at the start
    header = """-- ============================================
-- RENTMATE BULLETPROOF GOLDEN SNAPSHOT (3.0)
-- ============================================
-- ENSURE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ENSURE CRITICAL COLUMNS
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
    processed_lines.append(header)
    
    current_table = None
    
    for line in lines:
        # Strip potential extraction prefixes like 'filename.sql:123:'
        line = re.sub(r'^[\w\.-]+\.sql:\d+:', '', line)
        
        # Replace project references
        line = line.replace(PROD_PROJECT, STAGING_PROJECT)
        
        # Fix vault/secrets to use settings fallback
        # (SELECT value FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
        line = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", line)
        
        # Guard Policies: DROP before CREATE
        # Pattern: CREATE POLICY "name" ON "table" ...
        policy_match = re.search(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', line, re.IGNORECASE)
        if policy_match:
            policy_name = policy_match.group(1)
            table_name = policy_match.group(2)
            processed_lines.append(f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\n')

        # Guard Triggers: DROP before CREATE
        # Pattern: CREATE TRIGGER "name" ... ON "table"
        trigger_match = re.search(r'CREATE TRIGGER\s+"?([\w]+)"?\s+.*?ON\s+([\w\.]+)', line, re.IGNORECASE)
        if trigger_match:
            trigger_name = trigger_match.group(1)
            table_name = trigger_match.group(2)
            processed_lines.append(f'DROP TRIGGER IF EXISTS "{trigger_name}" ON {table_name};\n')

        # Standard Idempotency Guards
        if re.search(r'CREATE TABLE\s+(?!IF NOT EXISTS)', line, re.IGNORECASE):
            line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.IGNORECASE)
            
        if re.search(r'CREATE INDEX\s+(?!IF NOT EXISTS)', line, re.IGNORECASE):
            line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.IGNORECASE)
            
        if re.search(r'ALTER TABLE\s+[\w\.]+\s+ADD\s+COLUMN\s+(?!IF NOT EXISTS)', line, re.IGNORECASE):
            line = re.sub(r'(ADD\s+COLUMN)\s+', r'\1 IF NOT EXISTS ', line, flags=re.IGNORECASE)
            
        if re.search(r'ALTER TABLE\s+[\w\.]+\s+DROP\s+CONSTRAINT\s+(?!IF EXISTS)', line, re.IGNORECASE):
            line = re.sub(r'(DROP\s+CONSTRAINT)\s+', r'\1 IF EXISTS ', line, flags=re.IGNORECASE)

        # Remove problematic Byte Order Marks inside the file
        line = line.replace('\ufeff', '')
        
        processed_lines.append(line)

    # Global Cleanup: Strip all non-ascii characters that might cause syntax errors unless they are in known text blocks
    # Actually, let's just make sure it's valid UTF-8 and strip the BOM.
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(processed_lines)
    print(f"Zero-Tolerance script created: {output_file}")

build_zero_tolerance('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_BULLETPROOF_V3.sql')
