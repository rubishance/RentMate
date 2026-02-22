import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

# Valid SQL start keywords (expanded)
SQL_KEYWORDS = (
    'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'END', 
    'DO', 'SELECT', 'VALUES', 'GRANT', 'REVOKE', 'WITH', 'SET', 'SHOW', 
    'COMMENT', 'SAVEPOINT', 'RELEASE', 'ROLLBACK', 'COMMIT', 'LOCK', 
    'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE', 'REINDEX', 'CLUSTER', 
    'COPY', 'MOVE', 'FETCH', 'CHECKPOINT', 'PREPARE', 'EXECUTE', 'DEALLOCATE',
    'DECLARE', 'PERFORM', 'RAISE', 'RETURN', 'IF', 'FOR', 'LOOP', 'WHILE', 'EXCEPTION'
)

def total_scrub(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Initial Clean
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Project & Vault Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)

    # 2. Line-by-Line Comment Scrub
    # Any line that doesn't look like SQL and isn't a comment gets commented out
    lines = content.split('\n')
    scrubbed_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            scrubbed_lines.append(line)
            continue
        
        # If it's already a comment, leave it
        if stripped.startswith('--') or stripped.startswith('/*') or stripped.startswith('$$') or stripped.endswith('$$'):
            scrubbed_lines.append(line)
            continue
            
        # Check if first word is a SQL keyword
        first_word = re.match(r'^(\w+)', stripped)
        if first_word:
            if first_word.group(1).upper() in SQL_KEYWORDS:
                scrubbed_lines.append(line)
                continue
        
        # If it doesn't match and it's not some obvious SQL continuation, comment it
        # Obvious continuations usually start with special chars or are mid-block
        if stripped[0] in ('(', ')', ';', "'", '"', '[', '{', '*', ',', '.', '=', '+', '-', '/', '<', '>', ':', '|'):
            scrubbed_lines.append(line)
            continue
            
        # If we got here, it's probably garbage or a naked header
        scrubbed_lines.append(f'-- [SCRUBBED GARBAGE] {line}')

    content = '\n'.join(scrubbed_lines)

    # 3. Guard Policies & Triggers (Precision Injection with Semicolon)
    # We do this AFTER the scrub to ensure the injected guards are clean
    
    def policy_fixer(match):
        name = match.group(1)
        table = match.group(2)
        return f';\nDROP POLICY IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    content = re.sub(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', policy_fixer, content, flags=re.IGNORECASE)

    def trigger_fixer(match):
        name = match.group(1).replace('"', '')
        table = match.group(2)
        return f';\nDROP TRIGGER IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    # Note: Using non-greedy match for trigger name vs table to avoid gobbling
    content = re.sub(r'CREATE TRIGGER\s+("?[\w]+"?)\s+.*?ON\s+([\w\.]+)', trigger_fixer, content, flags=re.IGNORECASE | re.DOTALL)

    # 4. Standard Idempotency
    content = re.sub(r'CREATE TABLE\s+(?!IF NOT EXISTS)', 'CREATE TABLE IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'CREATE INDEX\s+(?!IF NOT EXISTS)', 'CREATE INDEX IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'(ALTER TABLE\s+[\w\.]+\s+ADD\s+COLUMN)\s+(?!IF NOT EXISTS)', r'\1 IF NOT EXISTS ', content, flags=re.IGNORECASE)
    content = re.sub(r'(ALTER TABLE\s+[\w\.]+\s+DROP\s+CONSTRAINT)\s+(?!IF EXISTS)', r'\1 IF EXISTS ', content, flags=re.IGNORECASE)

    # 5. Global Binary Scrub & Normalization
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Total Scrub V6 created: {output_file}")

total_scrub('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V6.sql')
