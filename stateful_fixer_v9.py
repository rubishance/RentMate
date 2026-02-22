import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_precision_v9(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 0. Initial Clean
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    # 1. Project & Vault Sync
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", 
                      "COALESCE(current_setting('app.settings.service_role_key', true), 'DUMMY_KEY')", content)

    # 2. Stateful Line-by-Line Refinement
    lines = content.split('\n')
    refined_lines = []
    
    pending_trigger_name = None
    pending_policy_name = None
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            refined_lines.append(line)
            continue
            
        # A. Header Scrub (Improved)
        if re.match(r'^(Create|Migration|Description|Table|Policy|Function)\b', stripped, re.I):
            # If it's more than 3 words and has no SQL "glue" ((),;=), it's a header
            if len(stripped.split()) > 3 and not any(c in stripped for c in '();=,'):
                refined_lines.append(f'-- [HEADER] {line}')
                continue

        # B. Trigger Detection (Stateful)
        # Check for start of trigger
        trigger_start = re.search(r'CREATE TRIGGER\s+("?[\w]+"?)', stripped, re.I)
        if trigger_start:
            pending_trigger_name = trigger_start.group(1).replace('"', '')
            # If "ON" is on the same line, resolve now
            on_match = re.search(r'ON\s+([\w\.]+)', stripped, re.I)
            if on_match:
                table = on_match.group(1)
                refined_lines.append(f';\nDROP TRIGGER IF EXISTS "{pending_trigger_name}" ON {table};')
                pending_trigger_name = None
            else:
                # Resolve in following lines
                pass
        elif pending_trigger_name:
            # Look for "ON Table" in this line
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
        if 'DROP CONSTRAINT' in stripped.upper() and 'IF EXISTS' not in stripped.upper():
            line = re.sub(r'(DROP CONSTRAINT)\s+', r'\1 IF EXISTS ', line, flags=re.I)

        refined_lines.append(line)

    content = '\n'.join(refined_lines)

    # 3. Normalization
    content = content.replace('\r\n', '\n')
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Surgical V9 created: {output_file}")

build_precision_v9('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V9.sql')
