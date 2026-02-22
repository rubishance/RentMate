import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

# Keywords that are allowed to start a valid SQL line
SQL_KEYWORDS = {
    'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'END', 
    'DO', 'SELECT', 'VALUES', 'GRANT', 'REVOKE', 'WITH', 'SET', 'SHOW', 
    'COMMENT', 'SAVEPOINT', 'RELEASE', 'ROLLBACK', 'COMMIT', 'LOCK', 
    'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE', 'REINDEX', 'CLUSTER', 
    'COPY', 'MOVE', 'FETCH', 'CHECKPOINT', 'PREPARE', 'EXECUTE', 'DEALLOCATE',
    'DECLARE', 'PERFORM', 'RAISE', 'RETURN', 'IF', 'FOR', 'LOOP', 'WHILE', 
    'EXCEPTION', 'RETURNS', 'LANGUAGE', 'SECURITY', 'AS', 'SET', 'GRANT', 'USING'
}

def precision_scrub(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Initial Clean
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Project & Vault Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)

    # 2. Line-by-Line Refinement
    lines = content.split('\n')
    scrubbed_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            scrubbed_lines.append(line)
            continue
        
        # Already a comment or block delimiter
        if stripped.startswith('--') or stripped.startswith('/*') or stripped.startswith('$$') or stripped.endswith('$$'):
            scrubbed_lines.append(line)
            continue
            
        # Continuation characters (Common in SQL)
        if stripped[0] in ('(', ')', ';', "'", '"', '[', '{', '*', ',', '.', '=', '+', '-', '/', '<', '>', ':', '|'):
            scrubbed_lines.append(line)
            continue
            
        # Keyword Check
        words = stripped.split()
        if words and words[0].upper().replace(';', '') in SQL_KEYWORDS:
            # But wait! "Create Trigger Function for Profile Changes" starts with "Create"
            # If it's more than 4 words and has no SQL special characters (like ( ) ; =), it's likely a header.
            if len(words) > 4 and not any(c in stripped for c in '();=,'):
                 scrubbed_lines.append(f'-- [HEADER] {line}')
                 continue
            
            scrubbed_lines.append(line)
            continue
        
        # If it starts with a word but it's not a keyword, probably garbage
        if re.match(r'^\w+', stripped):
            scrubbed_lines.append(f'-- [GARBAGE] {line}')
            continue
            
        scrubbed_lines.append(line)

    content = '\n'.join(scrubbed_lines)

    # 3. Guard Policies & Triggers
    # Using more careful name extraction to avoid 'Function' name bug
    def policy_fixer(match):
        name = match.group(1).replace('"', '')
        table = match.group(2)
        return f';\nDROP POLICY IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    content = re.sub(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', policy_fixer, content, flags=re.IGNORECASE)

    def trigger_fixer(match):
        name = match.group(1).replace('"', '')
        table = match.group(2)
        return f';\nDROP TRIGGER IF EXISTS "{name}" ON {table};\n{match.group(0)}'
    
    # Non-greedy match for trigger name vs table
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
    print(f"Precision Scrub V7 created: {output_file}")

precision_scrub('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V7.sql')
