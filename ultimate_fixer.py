import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_ultimate_clean(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Strip all BOMs and hidden chars immediately
    content = content.replace('\ufeff', '')
    # Strip line prefixes if any
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Project Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)

    # 2. Vault Sync
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)

    # 3. Guard Policies (Multi-line aware)
    # Pattern: CREATE POLICY "Name" ON Table ...
    # Use re.DOTALL to match across lines
    def policy_fixer(match):
        name = match.group(1)
        table = match.group(2)
        return f'DROP POLICY IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    content = re.sub(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', policy_fixer, content, flags=re.IGNORECASE | re.MULTILINE)

    # 4. Guard Triggers (Multi-line aware)
    # Pattern: CREATE TRIGGER name ... ON table
    def trigger_fixer(match):
        name = match.group(1).replace('"', '')
        table = match.group(2)
        return f'DROP TRIGGER IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    # Needs to capture trigger name and table name which might be far apart
    # Simplified: CREATE TRIGGER "name" [anything] ON [table]
    content = re.sub(r'CREATE TRIGGER\s+("?[\w]+"?)\s+.*?ON\s+([\w\.]+)', trigger_fixer, content, flags=re.IGNORECASE | re.DOTALL)

    # 5. Standard Guards
    content = re.sub(r'CREATE TABLE\s+(?!IF NOT EXISTS)', 'CREATE TABLE IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'CREATE INDEX\s+(?!IF NOT EXISTS)', 'CREATE INDEX IF NOT EXISTS ', content, flags=re.IGNORECASE)
    
    # Column additives
    content = re.sub(r'(ALTER TABLE\s+[\w\.]+\s+ADD\s+COLUMN)\s+(?!IF NOT EXISTS)', r'\1 IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'(ALTER TABLE\s+[\w\.]+\s+DROP\s+CONSTRAINT)\s+(?!IF EXISTS)', r'\1 IF EXISTS ', content, flags=re.IGNORECASE)

    # 6. Final Binary Scrub
    # Write as pure UTF-8 without BOM, no \r
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Ultimate Bulletproof script created: {output_file}")

build_ultimate_clean('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V4.sql')
