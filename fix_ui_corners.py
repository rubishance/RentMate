import os
import re

def fix_corners(directory):
    patterns = [
        (re.compile(r'rounded-\[2\.5rem\]'), 'rounded-2xl'),
        (re.compile(r'rounded-\[2rem\]'), 'rounded-2xl'),
        (re.compile(r'rounded-\[3rem\]'), 'rounded-2xl'),
        (re.compile(r'rounded-3xl'), 'rounded-2xl')
    ]
    
    modified_files = 0
    total_replacements = 0

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content
                file_modified = False
                
                for pattern, replacement in patterns:
                    new_content, count = pattern.subn(replacement, new_content)
                    if count > 0:
                        file_modified = True
                        total_replacements += count

                if file_modified:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {file_path}")
                    modified_files += 1

    print(f"\\nDone! Modified {modified_files} files, {total_replacements} total replacements.")

if __name__ == '__main__':
    fix_corners('./src')
