import re
import os

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def build_zen_v11_2(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    content = content.replace('\ufeff', '').replace(PROD_PROJECT, STAGING_PROJECT)
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)
    
    sections = re.split(r'(\n\s*\n)', content) 
    refined_sections = []
    
    # Expanded SQL Whitelist (Including data types and block keywords)
    sql_keywords = {
        'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'END', 
        'DO', 'SELECT', 'VALUES', 'GRANT', 'REVOKE', 'WITH', 'SET', 'SHOW', 'IF',
        'COMMENT', 'SAVEPOINT', 'RELEASE', 'ROLLBACK', 'COMMIT', 'LOCK', 'DECLARE',
        'EXPLAIN', 'ANALYZE', 'VACUUM', 'TRUNCATE', 'REINDEX', 'CLUSTER', 'PERFORM',
        'COPY', 'MOVE', 'FETCH', 'CHECKPOINT', 'PREPARE', 'EXECUTE', 'DEALLOCATE',
        'RAISE', 'RETURNS', 'LANGUAGE', 'SECURITY', 'AS', 'USING', 'TEXT', 'INT', 
        'INTEGER', 'UUID', 'BOOLEAN', 'TIMESTAMP', 'TIMESTAMPTZ', 'NUMERIC', 'DECIMAL',
        'JSONB', 'JSON', 'DATE', 'VOID', 'RECORD', 'GET', 'DIAGNOSTICS', 'LOOP', 'FOR'
    }

    for section in sections:
        lines = section.split('\n')
        processed_lines = []
        is_in_block = False
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                processed_lines.append(line)
                continue
                
            if re.search(r'\b(BEGIN|DO \$\$|DECLARE)\b', stripped, re.I):
                is_in_block = True
            
            # Allow common SQL symbols as starters
            if stripped.startswith(('--', '/*', '$$', ';', '(', ')', "'", '"', '$$', 'RAISE', 'PERFORM', 'GET')):
                processed_lines.append(line)
                if 'END' in stripped.upper() and ('$$' in stripped or ';' in stripped):
                    is_in_block = False
                continue
            
            # Heuristic: If it looks like a variable declaration (name type;) or a logic line (indented)
            if is_in_block and (line.startswith('    ') or line.startswith('\t')):
                processed_lines.append(line)
                continue
            
            # Keyword Validation
            match = re.search(r'^\s*([A-Za-z]+)', stripped)
            if match:
                first_word = match.group(1).upper()
                if first_word not in sql_keywords:
                    # Catch the "for" error specifically
                    if "for" in stripped and "Trigger" in stripped:
                         processed_lines.append(f'-- [HEADER] {line}')
                    else:
                         # Double check: if it has a semicolon and looks like a command, let it pass
                         if stripped.endswith(';') and len(stripped.split()) < 5:
                             processed_lines.append(line)
                         else:
                             processed_lines.append(f'-- [HEADER] {line}')
                    continue
            else:
                processed_lines.append(f'-- [HEADER] {line}')
                continue
                
            # Injections
            policy_match = re.match(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)', stripped, re.I)
            if policy_match:
                name, table = policy_match.groups()
                processed_lines.append(f';\nDROP POLICY IF EXISTS "{name}" ON {table};')
            
            trigger_match = re.match(r'CREATE TRIGGER\s+("?[\w]+"?)', stripped, re.I)
            if trigger_match:
                name = trigger_match.group(1).replace('"', '')
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
            if 'END' in stripped.upper() and ('$$' in stripped or ';' in stripped):
                is_in_block = False
            
        refined_sections.append('\n'.join(processed_lines))

    content = ''.join(refined_sections)
    content = content.replace('\r\n', '\n')
    content = re.sub(r';\s*;\s*', ';\n', content)
    
    header = "-- RENTMATE GOLDEN SNAPSHOT V11.2 (LITERAL BLOCK PARSED)\n-- PURPOSE: TOTAL FUNCTIONAL CORRECTNESS\nSET check_function_bodies = false;\n\n"
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header + content)
    print(f"Zen V11.2 created: {output_file}")

build_zen_v11_2('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V11_2.sql')
