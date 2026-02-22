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
        "-- VERSION 10.0 - ULTIMATE STRUCTURAL AUDIT",
        "-- TIMESTAMP: 2026-02-22",
        "-- PURPOSE: ELIMINATE NAKED HEADERS & ENSURE IDEMPOTENCY",
        "",
        "SET check_function_bodies = false;",
        "SET statement_timeout = 0;",
        "SET client_encoding = 'UTF8';",
        "SET standard_conforming_strings = on;",
        "SET client_min_messages = warning;",
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
            
        # A. Header Scrub (Improved)
        # If it starts with a letter and is long, it's probably a header.
        # UNLESS it starts with a SQL keyword.
        sql_keywords = {
            'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'END', 
            'DO', 'SELECT', 'VALUES', 'GRANT', 'REVOKE', 'WITH', 'SET', 'SHOW', 
            'COMMENT', 'SAVEPOINT', 'RELEASE', 'ROLLBACK', 'COMMIT', 'LOCK', 
            'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE', 'REINDEX', 'CLUSTER', 
            'COPY', 'MOVE', 'FETCH', 'CHECKPOINT', 'PREPARE', 'EXECUTE', 'DEALLOCATE',
            'DECLARE', 'PERFORM', 'RAISE', 'RETURN', 'IF', 'FOR', 'LOOP', 'WHILE', 
            'EXCEPTION', 'RETURNS', 'LANGUAGE', 'SECURITY', 'AS', 'SET', 'GRANT', 'USING'
        }
        
        first_word = stripped.split()[0].upper().replace(';', '')
        if first_word not in sql_keywords:
            if not stripped.startswith('--') and not stripped.startswith('/*') and not stripped.startswith('$$'):
                refined_lines.append(f'-- [AUDIT FIX] {line}')
                continue

        # B. Trigger Detection (Stateful)
        trigger_start = re.search(r'CREATE TRIGGER\s+("?[\w]+"?)', stripped, re.I)
        if trigger_start:
            pending_trigger_name = trigger_start.group(1).replace('"', '')
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                refined_lines.append(f';\nDROP TRIGGER IF EXISTS "{pending_trigger_name}" ON {table};')
                pending_trigger_name = None
        elif pending_trigger_name:
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                refined_lines.append(f';\nDROP TRIGGER IF EXISTS "{pending_trigger_name}" ON {table};')
                pending_trigger_name = None

        # C. Policy Detection (Stateful)
        policy_start = re.search(r'CREATE POLICY\s+"([^"]+)"', stripped, re.I)
        if policy_start:
            pending_policy_name = policy_start.group(1)
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                refined_lines.append(f';\nDROP POLICY IF EXISTS "{pending_policy_name}" ON {table};')
                pending_policy_name = None
        elif pending_policy_name:
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                refined_lines.append(f';\nDROP POLICY IF EXISTS "{pending_policy_name}" ON {table};')
                pending_policy_name = None

        # D. Standard Idempotency Wrappers
        if re.match(r'^CREATE TABLE\s+(?!IF NOT EXISTS)', stripped, re.I):
            line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.I)
        if re.match(r'^CREATE INDEX\s+(?!IF NOT EXISTS)', stripped, re.I):
            line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.I)
        if 'ADD COLUMN' in stripped.upper() and 'IF NOT EXISTS' not in stripped.upper():
            line = re.sub(r'(ADD COLUMN)\s+', r'\1 IF NOT EXISTS ', line, flags=re.I)

        refined_lines.append(line)

    content = '\n'.join(refined_lines)
    
    # 3. Final Binary Scrub & Normalization
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Final V10 created: {output_file}")

build_ultimate_v10('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V10.sql')
