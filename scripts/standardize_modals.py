import os
import re
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace p-4 with p-6 and p-5 with p-6
    # But only inside className strings!
    
    # We will use a regex to find className="..."
    # and replace p-4, p-5 with p-6, space-y-2 with space-y-4
    
    def replacer(match):
        inner = match.group(0)
        inner = re.sub(r'\bp-4\b', 'p-6', inner)
        inner = re.sub(r'\bp-5\b', 'p-6', inner)
        inner = re.sub(r'\bspace-y-2\b', 'space-y-4', inner)
        inner = re.sub(r'\bpb-4\b', 'pb-6', inner)
        inner = re.sub(r'\bpb-5\b', 'pb-6', inner)
        inner = re.sub(r'\bpt-4\b', 'pt-6', inner)
        inner = re.sub(r'\bpx-4\b', 'px-6', inner)
        inner = re.sub(r'\bpy-4\b', 'py-6', inner)
        return inner

    content = re.sub(r'className=(["\'])(.*?)\1', replacer, content)
    content = re.sub(r'className=\{`([^`]*?)`\}', replacer, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    modals_dir = r"c:\AnitiGravity Projects\RentMate\src\components\modals"
    for filepath in glob.glob(os.path.join(modals_dir, "*.tsx")):
        process_file(filepath)
    
    wizards = [
        r"c:\AnitiGravity Projects\RentMate\src\components\stack\AddContractWizard.tsx",
        r"c:\AnitiGravity Projects\RentMate\src\components\stack\AddPropertyWizard.tsx"
    ]
    for w in wizards:
        if os.path.exists(w):
            process_file(w)

if __name__ == '__main__':
    main()
