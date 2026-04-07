import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If it doesn't have SafeAreaView from react-native, skip
    # (We assume SafeAreaView is imported somewhere)
    if 'SafeAreaView' not in content:
        return
    
    # Check if already imported from context
    if 'react-native-safe-area-context' in content and 'SafeAreaView' in content[content.find('react-native-safe-area-context')-50:content.find('react-native-safe-area-context')]:
        # Possibly already handled
        pass

    # Remove SafeAreaView from react-native imports
    # Pattern: \bSafeAreaView(\s*,|,*?\s*)
    
    new_content = re.sub(
        r"import\s+\{([^}]*)(?<!\w)SafeAreaView\b\s*,?([^}]*)\}\s+from\s+['\"]react-native['\"];",
        lambda m: f"import {{{m.group(1)}{m.group(2)}}} from 'react-native';" if m.group(1).strip() or m.group(2).strip() else "",
        content
    )
    
    # Clean up empty imports like "import {} from 'react-native';"
    new_content = re.sub(r"import\s*\{\s*\}\s*from\s+['\"]react-native['\"];\n?", "", new_content)
    
    # Fix dangling commas
    new_content = re.sub(r"import\s+\{\s*,\s*", "import { ", new_content)
    new_content = re.sub(r"\s*,\s*\}", " }", new_content)
    new_content = re.sub(r"\s*,\s*,\s*", ", ", new_content)
    
    # Add new import if we changed something or if SafeAreaView is still in the file but missing from imports
    if 'SafeAreaView' in new_content and 'react-native-safe-area-context' not in new_content:
        # Find where to insert - right after react-native import
        if "from 'react-native'" in new_content:
            new_content = new_content.replace(
                "from 'react-native';",
                "from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';"
            )
        else:
            new_content = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + new_content

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

def main():
    root_dir = r"c:/AnitiGravity Projects/RentMate/rentmate-mobile/src/screens"
    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx'):
                process_file(os.path.join(subdir, file))

if __name__ == '__main__':
    main()
