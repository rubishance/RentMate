import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_surgical_v8(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Clean extraction artifacts
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Project & Vault Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)

    # 2. Line-by-Line Refinement (Safe & No DOTALL)
    lines = content.split('\n')
    refined_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            refined_lines.append(line)
            continue
            
        # Fix known "Naked Headers"
        # If it starts with "Create " or "Migration " and is purely alpha-space, comment it.
        if re.match(r'^(Create|Migration|Description|Table|Policy|Function)\b', stripped, re.I):
            # Check if it looks like a real command
            if not any(kw in stripped.upper() for kw in ('TABLE ', 'POLICY ', 'TRIGGER ', 'FUNCTION ', 'OR REPLACE ', 'INDEX ')):
                refined_lines.append(f'-- [HEADER] {line}')
                continue
            # Special check for "Create Trigger Function..." (header) vs "CREATE TRIGGER name..." (command)
            if re.match(r'^Create Trigger Function', stripped, re.I):
                refined_lines.append(f'-- [HEADER] {line}')
                continue
            if re.match(r'^Create Trigger$', stripped, re.I):
                 refined_lines.append(f'-- [HEADER] {line}')
                 continue

        # Injections (Semicolon Shielded)
        # Policy Injection
        policy_match = re.match(r'^CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', stripped, re.I)
        if policy_match:
            name = policy_match.group(1).replace('"', '')
            table = policy_match.group(2)
            refined_lines.append(f';\nDROP POLICY IF EXISTS "{name}" ON {table};')
            refined_lines.append(line)
            continue

        # Trigger Injection
        trigger_match = re.search(r'CREATE TRIGGER\s+("?[\w]+"?)\s+', stripped, re.I)
        if trigger_match:
            # We need to find the table on the same line or nearby.
            # Usually it's: CREATE TRIGGER name ... ON table
            table_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if table_match:
                name = trigger_match.group(1).replace('"', '')
                table = table_match.group(1)
                refined_lines.append(f';\nDROP TRIGGER IF EXISTS "{name}" ON {table};')
                refined_lines.append(line)
                continue

        # Standard Idempotency Wrappers
        if re.match(r'^CREATE TABLE\s+(?!IF NOT EXISTS)', stripped, re.I):
            line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.I)
        if re.match(r'^CREATE INDEX\s+(?!IF NOT EXISTS)', stripped, re.I):
            line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.I)
        if 'ADD COLUMN' in stripped.upper() and 'IF NOT EXISTS' not in stripped.upper():
            line = re.sub(r'(ADD COLUMN)\s+', r'\1 IF NOT EXISTS ', line, flags=re.I)
        if 'DROP CONSTRAINT' in stripped.upper() and 'IF EXISTS' not in stripped.upper():
            line = re.sub(r'(DROP CONSTRAINT)\s+', r'\1 IF EXISTS ', line, flags=re.I)

        refined_lines.append(line)

    content = '\n'.join(refined_lines)

    # 3. Final Deep Clean & Normalization
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Surgical V8 created: {output_file}")

build_surgical_v8('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V8.sql')
