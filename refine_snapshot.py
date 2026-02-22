import re
import os

def refine_snapshot(filename):
    if not os.path.exists(filename):
        print(f"File {filename} not found.")
        return
    
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cleaned_lines = []
    # Pattern to match 'filename.sql:123:' or just 'filename:1:' at the start of a line
    prefix_pattern = re.compile(r'^[\w\.-]+\.sql:\d+:')
    
    for line in lines:
        # Strip the prefix if it exists
        new_line = prefix_pattern.sub('', line)
        cleaned_lines.append(new_line)
    
    # Perform final deep cleaning
    content = "".join(cleaned_lines)
    
    # Strip BOM if it exists
    if content.startswith('\ufeff'):
        content = content[1:]
    
    # Standardize line endings and strip whitespace at the very top
    content = content.lstrip()
    
    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print(f"Refined and cleaned {filename}")

refine_snapshot('STAGING_GOLDEN_SNAPSHOT.sql')
