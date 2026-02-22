import re
import collections

def extract_lean_schema(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Split by double newline to get blocks
    blocks = re.split(r'\n\s*\n', content)
    
    tables = collections.OrderedDict()
    functions = collections.OrderedDict()
    policies = collections.OrderedDict()
    triggers = collections.OrderedDict()
    indexes = collections.OrderedDict()
    others = []

    for block in blocks:
        stripped = block.strip()
        if not stripped: continue
        
        # TABLE
        table_match = re.search(r'CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([\w\.]+)', stripped, re.I)
        if table_match:
            tables[table_match.group(1).lower()] = block
            continue
            
        # FUNCTION
        func_match = re.search(r'CREATE (?:OR REPLACE )?FUNCTION\s+([\w\.]+)', stripped, re.I)
        if func_match:
            functions[func_match.group(1).lower()] = block
            continue
            
        # POLICY
        policy_match = re.search(r'CREATE POLICY\s+"?([^"\s]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if policy_match:
            key = f"{policy_match.group(2).lower()}.{policy_match.group(1).lower()}"
            policies[key] = block
            continue
            
        # TRIGGER
        trigger_match = re.search(r'CREATE TRIGGER\s+"?([^"\s]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if trigger_match:
            key = f"{trigger_match.group(2).lower()}.{trigger_match.group(1).lower()}"
            triggers[key] = block
            continue

        # INDEX
        index_match = re.search(r'CREATE INDEX\s+(?:IF NOT EXISTS\s+)?"?([\w\.-]+)"?\s+ON\s+([\w\.]+)', stripped, re.I)
        if index_match:
            indexes[index_match.group(1).lower()] = block
            continue
            
        # If it's an ALTER or something else, just keep it for now if it doesn't look like an old version
        # (This is a heuristic, but better than nothing)
        others.append(block)

    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write("-- RENTMATE LEAN BASELINE (DEDUPLICATED)\n")
        f.write("-- This script is stripped of redundancy and historical duplicates.\n\n")
        f.write("SET check_function_bodies = false;\n\n")
        
        f.write("-- 1. TABLES\n")
        for t in tables.values(): f.write(t + "\n\n")
        
        f.write("-- 2. FUNCTIONS\n")
        for func in functions.values(): f.write(func + "\n\n")
        
        f.write("-- 3. POLICIES\n")
        for p in policies.values(): f.write(p + "\n\n")
        
        f.write("-- 4. TRIGGERS\n")
        for tr in triggers.values(): f.write(tr + "\n\n")
        
        f.write("-- 5. INDEXES\n")
        for idx in indexes.values(): f.write(idx + "\n\n")
        
        # Filter "others" to remove common small legacy fragments
        f.write("-- 6. OTHERS / ALTERATIONS\n")
        for o in others:
            # Skip historical markers
            if "============================================" in o: continue
            if "CLEAN BASELINE" in o: continue
            f.write(o + "\n\n")

    print(f"Lean schema created: {output_file}")

extract_lean_schema('STAGING_GOLDEN_SNAPSHOT.sql', 'STAGING_LEAN_V12.sql')
