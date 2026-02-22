import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_ultimate_v10(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Clean extraction artifacts
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Project Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)

    # 2. Stateful Line-by-Line Refinement
    lines = content.split('\n')
    refined_lines = [
        "-- VERSION 10.1 - THE NUCLEAR SCRUB",
        "-- TIMESTAMP: 2026-02-22",
        "-- PURPOSE: ELIMINATE EVERY SINGLE NAKED HEADER & INVALID INJECTION",
        "",
        "SET check_function_bodies = false;",
        "SET row_security = off;",
        ""
    ]
    
    pending_trigger_name = None
    pending_policy_name = None
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            refined_lines.append(line)
            continue
            
        # FORCE COMMENT: Any line that is not a comment and doesn't start with a valid SQL command is a comment.
        sql_keywords = {
            'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'END', 
            'DO', 'SELECT', 'VALUES', 'GRANT', 'REVOKE', 'WITH', 'SET', 'SHOW', 
            'COMMENT', 'SAVEPOINT', 'RELEASE', 'ROLLBACK', 'COMMIT', 'LOCK', 
            'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE', 'REINDEX', 'CLUSTER', 
            'COPY', 'MOVE', 'FETCH', 'CHECKPOINT', 'PREPARE', 'EXECUTE', 'DEALLOCATE',
            'DECLARE', 'PERFORM', 'RAISE', 'RETURNS', 'LANGUAGE', 'SECURITY', 'AS', 'USING'
        }
        
        words = stripped.split()
        first_word = words[0].upper().replace(';', '').replace('(', '')
        
        # VALIDATION: Is this a legitimate SQL line?
        is_legit_sql = first_word in sql_keywords or stripped.startswith('--') or stripped.startswith('/*') or stripped.startswith('$$') or stripped.endswith('$$') or stripped.startswith('(') or stripped.startswith(')') or stripped.startswith("'") or stripped.startswith('"')
        
        if not is_legit_sql:
            refined_lines.append(f'-- [FORCE COMMENT] {line}')
            continue

        # B. Trigger Detection (Surgical)
        trigger_start = re.search(r'CREATE TRIGGER\s+("?[\w]+"?)', stripped, re.I)
        if trigger_start:
            name = trigger_start.group(1).replace('"', '')
            # If "ON" is on the same line, resolve now
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                # Filter out garbage names like "Function" or "for"
                if name.lower() not in ('function', 'for', 'migration', 'create'):
                    refined_lines.append(f';\nDROP TRIGGER IF EXISTS "{name}" ON {table};')
            
        # C. Policy Detection (Surgical)
        policy_start = re.search(r'CREATE POLICY\s+"([^"]+)"', stripped, re.I)
        if policy_start:
            name = policy_start.group(1)
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                refined_lines.append(f';\nDROP POLICY IF EXISTS "{name}" ON {table};')

        # D. Standard Idempotency
        if re.match(r'^CREATE TABLE\s+(?!IF NOT EXISTS)', stripped, re.I):
            line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.I)
        if re.match(r'^CREATE INDEX\s+(?!IF NOT EXISTS)', stripped, re.I):
            line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.I)
        if 'ADD COLUMN' in stripped.upper() and 'IF NOT EXISTS' not in stripped.upper():
            line = re.sub(r'(ADD COLUMN)\s+', r'\1 IF NOT EXISTS ', line, flags=re.I)

        refined_lines.append(line)

    content = '\n'.join(refined_lines)
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Final V10.1 created: {output_file}")

build_ultimate_v10('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V10_1.sql')
