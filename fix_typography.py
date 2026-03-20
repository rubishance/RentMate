import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. First upgrade existing text-sm to text-base (only if it's the full class name, not like "text-sm-something")
    content = re.sub(r'\btext-sm(?!\S)', 'text-base', content)

    # 2. Then upgrade text-xs to text-sm
    content = re.sub(r'\btext-xs(?!\S)', 'text-sm', content)

    # 3. Upgrade any explicit text-[11px] or text-[12px] or text-[13px] to text-sm
    content = re.sub(r'\btext-\[(11|12|13)px\]', 'text-sm', content)
    
    # 4. Upgrade text-[10px] to text-xs just in case
    content = re.sub(r'\btext-\[10px\]', 'text-xs', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

if __name__ == '__main__':
    src_dir = os.path.join(os.getcwd(), 'src')
    files_changed = 0
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                if process_file(os.path.join(root, file)):
                    files_changed += 1
    
    print(f"Updated typography in {files_changed} files.")
