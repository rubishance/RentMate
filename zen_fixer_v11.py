import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_zen_v11(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Initial Scrub
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    
    # 1. Block-Aware Processing
    # We want to identify and protect DO $$ and FUNCTION blocks
    # while commenting out headers and injecting guards.
    
    sections = re.split(r'(\n\s*\n)', content) # Split by double newline to find "logical blocks"
    refined_sections = []
    
    sql_keywords = {
        'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'END', 
        'DO', 'SELECT', 'VALUES', 'GRANT', 'REVOKE', 'WITH', 'SET', 'SHOW', 
        'COMMENT', 'SAVEPOINT', 'RELEASE', 'ROLLBACK', 'COMMIT', 'LOCK', 
        'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE', 'REINDEX', 'CLUSTER', 
        'COPY', 'MOVE', 'FETCH', 'CHECKPOINT', 'PREPARE', 'EXECUTE', 'DEALLOCATE',
        'DECLARE', 'PERFORM', 'RAISE', 'RETURNS', 'LANGUAGE', 'SECURITY', 'AS', 'USING'
    }

    for section in sections:
        lines = section.split('\n')
        processed_lines = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                processed_lines.append(line)
                continue
                
            # If it's a comment or special marker, keep it
            if stripped.startswith('--') or stripped.startswith('/*') or stripped.startswith('$$') or stripped.startswith(';') or stripped.startswith('('):
                processed_lines.append(line)
                continue
            
            # Check if it's a valid SQL start
            first_word = stripped.split()[0].upper().replace(';', '').replace('(', '')
            if first_word not in sql_keywords:
                processed_lines.append(f'-- [HEADER] {line}')
                continue
                
            # Injections (Surgical)
            # Policy
            policy_match = re.match(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', stripped, re.I)
            if policy_match:
                name, table = policy_match.groups()
                processed_lines.append(f';\nDROP POLICY IF EXISTS "{name}" ON {table};')
            
            # Trigger
            trigger_match = re.match(r'CREATE TRIGGER\s+("?[\w]+"?)', stripped, re.I)
            if trigger_match:
                name = trigger_match.group(1).replace('"', '')
                # Find "ON" in the same section
                on_match = re.search(r'ON\s+([\w\.]+)', section, re.I)
                if on_match:
                    table = on_match.group(1)
                    processed_lines.append(f';\nDROP TRIGGER IF EXISTS "{name}" ON {table};')

            # Idempotency
            if re.match(r'^CREATE TABLE\s+(?!IF NOT EXISTS)', stripped, re.I):
                line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.I)
            if re.match(r'^CREATE INDEX\s+(?!IF NOT EXISTS)', stripped, re.I):
                line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.I)
            if 'ADD COLUMN' in stripped.upper() and 'IF NOT EXISTS' not in stripped.upper():
                line = re.sub(r'(ADD COLUMN)\s+', r'\1 IF NOT EXISTS ', line, flags=re.I)

            processed_lines.append(line)
            
        refined_sections.append('\n'.join(processed_lines))

    content = ''.join(refined_sections)
    
    # Final cleanup
    content = content.replace('\r\n', '\n')
    # Guard against accidental multiple semicolons
    content = re.sub(r';\s*;\s*', ';\n', content)
    
    # Headers
    header = "-- RENTMATE GOLDEN SNAPSHOT V11.0 (ZEN BLOCK PARSED)\n-- PURPOSE: TOTAL STRUCTURAL INTEGRITY\nSET check_function_bodies = false;\n\n"
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header + content)
    print(f"Zen V11 created: {output_file}")

build_zen_v11('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V11.sql')
