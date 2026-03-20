import os
import re
from pathlib import Path

def process_file(filepath):
    try:
        content = filepath.read_text('utf-8')
        original = content
        
        changes = []
        
        # 1. Target: {isRtl ? 'he' : 'en'} <Icon ... />
        # Example: {isRtl ? 'היערכות לדיירים חדשים' : 'Prep for New Tenants'} <UserPlus className="w-5 h-5 text-indigo-500" />
        
        # Match group 1: {expression}
        text_pattern = r'(\{[^}]+\})'
        
        # Match group 2: Whitespace
        ws_pattern = r'(\s*)'
        
        # Match group 3: <IconComponent ... />
        icon_pattern = r'(<[A-Z][a-zA-Z0-9]*\s+(?:className="[^"]*"|w-\d+|h-\d+|color="[^"]*")[^>]*/>)'
        
        # Full Pattern: Text + WS + Icon
        full_pattern = text_pattern + ws_pattern + icon_pattern
        
        def replacer(match):
            text_block = match.group(1)
            ws = match.group(2)
            icon = match.group(3)
            # Swap them
            changes.append(f"Swapped Text Node and Icon: {icon}")
            return f"{icon}{ws}{text_block}"
            
        new_content = re.sub(full_pattern, replacer, content)
        
        if new_content != original:
            filepath.write_text(new_content, 'utf-8')
            return True, changes
        return False, []
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, []

def main():
    base_path = Path(r"c:\AnitiGravity Projects\RentMate\src")
    dirs_to_process = [
        base_path / "components",
        base_path / "pages",
    ]
    
    modified_files = 0
    
    for directory in dirs_to_process:
        if not directory.exists():
            continue
        for filepath in directory.rglob("*.tsx"):
            modified, changes = process_file(filepath)
            if modified:
                modified_files += 1
                print(f"✓ Modified: {filepath.relative_to(base_path)}")
                for change in set(changes):
                    print(f"  - {change}")
                    
    print(f"\nSummary: Modified {modified_files} files for icon consistency.")

if __name__ == "__main__":
    main()
