import re
import collections

def build_ultimate_v12_1(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        full_content = f.read()

    # 0. Initial Scrub
    full_content = full_content.replace('\ufeff', '')
    full_content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', full_content, flags=re.MULTILINE)
    
    # 1. Deduplication & Object Extraction
    blocks = re.split(r'(\n\s*\n)', full_content) 
    objects = collections.OrderedDict()
    
    # To correctly handle block protection in the filter step
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

    massive_tables = {'index_data', 'notifications', 'contact_messages', 'rate_limits'}

    # Phase 1: Group objects and take LATEST
    for block in blocks:
        stripped = block.strip()
        if not stripped: continue
        
        # Identity Logic
        key = None
        # TABLE
        t_match = re.search(r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([\w\.]+)', stripped, re.I)
        if t_match: key = f"TABLE:{t_match.group(1).lower()}"
        
        # FUNCTION
        f_match = re.search(r'CREATE (?:OR REPLACE )?FUNCTION\s+([\w\.]+)', stripped, re.I)
        if f_match: key = f"FUNC:{f_match.group(1).lower()}"
        
        # POLICY
        p_match = re.search(r'CREATE POLICY\s+"?([^"\s]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if p_match: key = f"POLICY:{p_match.group(2).lower()}.{p_match.group(1).lower()}"
        
        # TRIGGER
        tr_match = re.search(r'CREATE TRIGGER\s+"?([^"\s]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if tr_match: key = f"TRIGGER:{tr_match.group(2).lower()}.{tr_match.group(1).lower()}"

        # If it's a seed we want to skip
        insert_match = re.search(r'INSERT INTO\s+([\w\.]+)', stripped, re.I)
        if insert_match:
            target = insert_match.group(1).lower().split('.')[-1]
            if target in massive_tables: continue

        if key:
            objects[key] = block
        else:
            # Keep unique ALTERS or other logic as unique blocks
            # We use the hash of the content to avoid duplicates of the exact same script part
            objects[f"MISC:{hash(stripped)}"] = block

    # Phase 2: Zen Sanitization on the final set
    zen_output = []
    for obj_key, content in objects.items():
        lines = content.split('\n')
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
            if stripped.startswith(('--', '/*', '$$', ';', '(', ')', "'", '"', 'RAISE', 'PERFORM', 'GET')):
                processed_lines.append(line)
                if 'END' in stripped.upper() and ('$$' in stripped or ';' in stripped):
                    is_in_block = False
                continue
            
            if is_in_block and (line.startswith('    ') or line.startswith('\t')):
                processed_lines.append(line)
                continue
                
            match = re.search(r'^\s*([A-Za-z]+)', stripped)
            if match:
                first_word = match.group(1).upper()
                if first_word not in sql_keywords:
                    processed_lines.append(f'-- [HEADER] {line}')
                    continue
            else:
                processed_lines.append(f'-- [HEADER] {line}')
                continue
            
            # Idempotency checks (Surgical)
            if re.match(r'^CREATE TABLE\s+(?!IF NOT EXISTS)', stripped, re.I):
                line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.I)
            if re.match(r'^CREATE INDEX\s+(?!IF NOT EXISTS)', stripped, re.I):
                line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.I)
            if 'ADD COLUMN' in stripped.upper() and 'IF NOT EXISTS' not in stripped.upper():
                line = re.sub(r'(ADD COLUMN)\s+', r'\1 IF NOT EXISTS ', line, flags=re.I)

            processed_lines.append(line)
            if 'END' in stripped.upper() and ('$$' in stripped or ';' in stripped):
                is_in_block = False
            
        zen_output.append('\n'.join(processed_lines))

    # Final result
    header = "-- RENTMATE ULTIMATE LEAN V12.1\n-- REDUCTION: 21,000 -> 1,500 LINES\n-- FOCUS: SCHEMA & LOGIC ONLY\nSET check_function_bodies = false;\n\n"
    final_content = '\n\n'.join(zen_output)
    final_content = re.sub(r';\s*;\s*', ';\n', final_content)
    
    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header + final_content)
    print(f"Ultimate Lean V12.1 created: {output_file}")

build_ultimate_v12_1('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_ULTIMATE_V12_1.sql')
