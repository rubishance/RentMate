import os
import re
from pathlib import Path

REPLACEMENTS = {
    r'\bpx-5\b': 'px-4 sm:px-6',
    r'\bpy-5\b': 'py-4 sm:py-6',
    r'\bp-5\b': 'p-4 sm:p-6',
    r'\bgap-5\b': 'gap-4 sm:gap-6',
    r'\bmb-5\b': 'mb-4 sm:mb-6',
    r'\bmt-5\b': 'mt-4 sm:mt-6',
    r'\bpl-5\b': 'pl-4 sm:pl-6',
    r'\bpr-5\b': 'pr-4 sm:pr-6',
    r'\bpt-5\b': 'pt-4 sm:pt-6',
    r'\bpb-5\b': 'pb-4 sm:pb-6',
    r'\bpx-3\b': 'px-2 sm:px-4',
    r'\bpy-3\b': 'py-2 sm:py-4',
    r'\bp-3\b': 'p-2 sm:p-4',
    r'\bgap-3\b': 'gap-2 sm:gap-4',
    r'\bmb-3\b': 'mb-2 sm:mb-4',
    r'\bmt-3\b': 'mt-2 sm:mt-4',
    r'\bpx-1.5\b': 'px-2',
    r'\bpy-1.5\b': 'py-2',
    r'\bgap-1.5\b': 'gap-2',
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        orig = content
        changes = []
        for pat, repl in REPLACEMENTS.items():
            matches = re.findall(pat, content)
            if matches:
                 content = re.sub(pat, repl, content)
                 changes.append(f"{pat} => {repl} ({len(matches)}x)")
        
        if orig != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, changes
    except Exception as e:
        return False, []
    return False, []

if __name__ == "__main__":
    base = Path(r"c:\AnitiGravity Projects\RentMate\src")
    paths = [
        base / "pages",
        base / "components",
        base / "layout"
    ]
    
    modified = 0
    for p in paths:
        if p.exists() and p.is_dir():
            for f in p.rglob("*.tsx"):
                mod, ch = process_file(f)
                if mod:
                    print(f"Modified {f.name}: {ch}")
                    modified += 1
    print(f"Total modified globally: {modified}")
