"""
UI Consistency Fix Script
Systematically replaces hardcoded color classes with semantic tokens
"""

import os
import re
from pathlib import Path

# Define replacement patterns
REPLACEMENTS = {
    # Background colors
    r'bg-blue-600': 'bg-primary',
    r'bg-blue-500': 'bg-primary',
    r'bg-blue-50': 'bg-primary/10',
    r'bg-blue-100': 'bg-primary/10',
    r'bg-gray-50(?!/)': 'bg-secondary',
    r'bg-gray-100(?!/)': 'bg-muted',
    r'bg-gray-900': 'bg-foreground',
    
    # Text colors
    r'text-blue-600': 'text-primary',
    r'text-blue-500': 'text-primary',
    r'text-gray-900': 'text-foreground',
    r'text-gray-500': 'text-muted-foreground',
    r'text-gray-600': 'text-muted-foreground',
    r'text-gray-400': 'text-muted-foreground',
    
    # Border colors
    r'border-gray-200': 'border-border',
    r'border-gray-100': 'border-border',
    r'border-blue-500': 'border-primary',
    
    # Hover states
    r'hover:bg-blue-700': 'hover:bg-primary/90',
    r'hover:bg-blue-600': 'hover:bg-primary/90',
    r'hover:bg-blue-50': 'hover:bg-primary/5',
    r'hover:text-blue-600': 'hover:text-primary',
    r'hover:text-blue-700': 'hover:text-primary',
    
    # Focus states
    r'focus:ring-blue-500': 'focus:ring-indigo-500',
    r'focus:border-blue-500': 'focus:border-indigo-500',
}

def process_file(filepath):
    """Process a single file and apply replacements"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = []
        
        for pattern, replacement in REPLACEMENTS.items():
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, replacement, content)
                changes_made.append(f"{pattern} -> {replacement} ({len(matches)} occurrences)")
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, changes_made
        
        return False, []
    
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, []

def main():
    """Main function to process all relevant files"""
    base_path = Path(r"c:\AnitiGravity Projects\RentMate\src")
    
    # Directories to process
    dirs_to_process = [
        base_path / "pages",
        base_path / "components",
    ]
    
    total_files = 0
    modified_files = 0
    
    for directory in dirs_to_process:
        if not directory.exists():
            continue
            
        for filepath in directory.rglob("*.tsx"):
            total_files += 1
            modified, changes = process_file(filepath)
            
            if modified:
                modified_files += 1
                print(f"\n✓ Modified: {filepath.relative_to(base_path)}")
                for change in changes[:3]:  # Show first 3 changes
                    print(f"  - {change}")
    
    print(f"\n{'='*60}")
    print(f"Summary: Modified {modified_files} out of {total_files} files")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
