import re
import collections

def build_lean_v12(input_file, schema_file, seed_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Initial Clean
    content = content.replace('\ufeff', '')
    content = re.sub(r'^[\w\.-]+\.sql:\d+:', '', content, flags=re.MULTILINE)

    # Split by blocks
    blocks = re.split(r'\n\s*\n', content)
    
    # Store objects to keep only the latest
    tables = collections.OrderedDict()
    functions = collections.OrderedDict()
    policies = collections.OrderedDict()
    triggers = collections.OrderedDict()
    indexes = collections.OrderedDict()
    
    # Seeds to keep (minimal)
    seeds = []
    
    # Skip list for massive data tables
    massive_tables = {'index_data', 'notifications', 'contact_messages', 'rate_limits'}

    for block in blocks:
        stripped = block.strip()
        if not stripped: continue
        
        # Identify Object
        table_match = re.search(r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([\w\.]+)', stripped, re.I)
        if table_match:
            tables[table_match.group(1).lower()] = block
            continue
            
        func_match = re.search(r'CREATE (?:OR REPLACE )?FUNCTION\s+([\w\.]+)', stripped, re.I)
        if func_match:
            functions[func_match.group(1).lower()] = block
            continue
            
        policy_match = re.search(r'CREATE POLICY\s+"?([^"\s]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if policy_match:
            key = f"{policy_match.group(2).lower()}.{policy_match.group(1).lower()}"
            policies[key] = block
            continue
            
        trigger_match = re.search(r'CREATE TRIGGER\s+"?([^"\s]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if trigger_match:
            key = f"{trigger_match.group(2).lower()}.{trigger_match.group(1).lower()}"
            triggers[key] = block
            continue

        index_match = re.search(r'CREATE INDEX\s+(?:IF NOT EXISTS\s+)?"?([\w\.-]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if index_match:
            indexes[index_match.group(1).lower()] = block
            continue

        # SEED DATA (Heuristic: INSERT INTO)
        insert_match = re.search(r'INSERT INTO\s+([\w\.]+)', stripped, re.I)
        if insert_match:
            target_table = insert_match.group(1).lower().split('.')[-1]
            if target_table in massive_tables:
                # Truncate to first 5 rows of data if possible, or just skip
                # For safety and "Leanness", we skip indices and history
                continue
            seeds.append(block)
            continue

    # 1. Output Schema File
    with open(schema_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write("-- RENTMATE LEAN SCHEMA V12.0\n")
        f.write("-- PURE STRUCTURE - ZERO BLOAT\nSET check_function_bodies = false;\n\n")
        
        for t in tables.values(): f.write(t + "\n\n")
        for func in functions.values(): f.write(func + "\n\n")
        for p in policies.values(): f.write(p + "\n\n")
        for tr in triggers.values(): f.write(tr + "\n\n")
        for idx in indexes.values(): f.write(idx + "\n\n")

    # 2. Output Seed File
    with open(seed_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write("-- RENTMATE MINIMAL SEED V12.0\n")
        f.write("-- REQUIRED DATA ONLY\n\n")
        for s in seeds: f.write(s + "\n\n")

    print(f"Lean V12 Created: {schema_file} and {seed_file}")

build_lean_v12('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_SCHEMA_V12.sql', 'STAGING_SEED_V12.sql')
