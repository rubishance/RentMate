import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_ultimate_clean_v5(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Clean extraction artifacts
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Fix the specific dangling payments policy that has been haunting us
    # It missing a USING clause and a semicolon.
    bad_policy = r'CREATE POLICY "Users can manage their own payments" ON public\.payments\s+-- USING'
    content = re.sub(bad_policy, '-- [DISABLED BROKEN POLICY]\n-- CREATE POLICY "Users can manage their own payments" ON public.payments -- USING', content)

    # 2. Project & Vault Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)

    # 3. Guard Policies (Precision Injection with Semicolon)
    def policy_fixer(match):
        name = match.group(1)
        table = match.group(2)
        # Prepending a semicolon ensures we break out of any previous unclosed statement
        return f';\nDROP POLICY IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    content = re.sub(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', policy_fixer, content, flags=re.IGNORECASE)

    # 4. Guard Triggers (Precision Injection with Semicolon)
    def trigger_fixer(match):
        name = match.group(1).replace('"', '')
        table = match.group(2)
        return f';\nDROP TRIGGER IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    content = re.sub(r'CREATE TRIGGER\s+("?[\w]+"?)\s+.*?ON\s+([\w\.]+)', trigger_fixer, content, flags=re.IGNORECASE | re.DOTALL)

    # 5. Global Idempotency
    content = re.sub(r'CREATE TABLE\s+(?!IF NOT EXISTS)', 'CREATE TABLE IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'CREATE INDEX\s+(?!IF NOT EXISTS)', 'CREATE INDEX IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'(ALTER TABLE\s+[\w\.]+\s+ADD\s+COLUMN)\s+(?!IF NOT EXISTS)', r'\1 IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'(ALTER TABLE\s+[\w\.]+\s+DROP\s+CONSTRAINT)\s+(?!IF EXISTS)', r'\1 IF EXISTS ', content, flags=re.IGNORECASE)

    # 6. Deep Binary Scrub & Line Ending Normalization
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Ultimate Precision V5 script created: {output_file}")

build_ultimate_clean_v5('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V5.sql')
