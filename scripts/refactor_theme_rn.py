import os
import re
import glob

# Path to screens
SCREENS_DIR = r"c:\AnitiGravity Projects\RentMate\rentmate-mobile\src\screens"

COLOR_MAP = {
    r"'#050B14'": "colors.background",
    r"'#0A111E'": "colors.surface",
    r"'#ffffff'": "colors.text",
    r"'#8A9DB8'": "colors.textSecondary",
    r"'rgba\(255,255,255,0.05\)'": "colors.border",
    r"'rgba\(255,255,255,0.1\)'": "colors.border",
    r"'#1e293b'": "colors.border",
}

def process_file(filepath):
    print(f"Processing: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already fully dynamic or no StyleSheet.create
    if "const createStyles = (colors: any)" in content:
        return
    if "StyleSheet.create" not in content:
        return

    # 1. Add import if missing
    if "useAppTheme" not in content:
        # Find the last import
        import_matches = list(re.finditer(r"^import\s+.*?;?\s*$", content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            idx = last_import.end()
            # Calculate correct relative path for import
            rel_depth = filepath.replace(SCREENS_DIR, "").count(os.sep)
            prefix = "../" if rel_depth == 1 else "../../" if rel_depth == 2 else "../"
            actual_import = f"import {{ useAppTheme }} from '{prefix}hooks/useAppTheme';"
            content = content[:idx] + f"\n{actual_import}" + content[idx:]

    # 2. Add useAppTheme() and useMemo to the component body
    # Find component function definition (e.g., export default function xxx() {)
    comp_match = re.search(r"export\s+default\s+function\s+\w+\(.*?\)\s*\{", content)
    if comp_match:
        comp_start_idx = comp_match.end()
        # Make sure we don't double inject if styles is already defined inline
        if "const styles =" not in content[comp_start_idx:comp_start_idx+200]:
            hook_injection = "\n  const { colors } = useAppTheme();\n  const styles = React.useMemo(() => createStyles(colors), [colors]);\n"
            content = content[:comp_start_idx] + hook_injection + content[comp_start_idx:]

    # 3. Modify StyleSheet.create to createStyles
    content = content.replace("const styles = StyleSheet.create({", "const createStyles = (colors: any) => StyleSheet.create({")

    # 4. Replace hardcoded string colors inside the createStyles block with colors.X
    # We will only replace between the start of createStyles to the end of file
    styles_idx = content.find("const createStyles = (colors: any)")
    if styles_idx != -1:
        top_part = content[:styles_idx]
        bottom_part = content[styles_idx:]
        for old_color, new_color in COLOR_MAP.items():
            bottom_part = re.sub(old_color, new_color, bottom_part, flags=re.IGNORECASE)
        content = top_part + bottom_part

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    tsx_files = glob.glob(os.path.join(SCREENS_DIR, '**', '*.tsx'), recursive=True)
    for f in tsx_files:
        # Skip DashboardScreen as it's already using manual inline styling
        if 'DashboardScreen.tsx' in f:
            continue
        process_file(f)

if __name__ == "__main__":
    main()
