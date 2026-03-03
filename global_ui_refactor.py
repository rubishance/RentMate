import os
import re

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    replacements = [
        # Explicit Light/Dark Backgrounds
        (r'bg-white dark:bg-slate-950', 'bg-background'),
        (r'bg-white dark:bg-slate-900', 'bg-card'),
        (r'bg-white dark:bg-slate-800', 'bg-card'),
        (r'bg-white/50 dark:bg-slate-900/50', 'bg-background/50'),
        (r'bg-white/80 dark:bg-slate-900/80', 'bg-card/80'),
        (r'bg-slate-50 dark:bg-slate-950', 'bg-background'),
        (r'bg-slate-50 dark:bg-slate-900', 'bg-background'),
        (r'bg-slate-50 dark:bg-slate-800', 'bg-muted/30'),
        (r'bg-slate-100 dark:bg-slate-900', 'bg-muted/50'),
        (r'bg-slate-100 dark:bg-slate-800', 'bg-muted'),
        (r'bg-slate-200 dark:bg-slate-800', 'bg-muted'),
        (r'bg-slate-100', 'bg-muted/50'),
        (r'bg-slate-50', 'bg-background'),
        
        # Explicit Light/Dark Texts
        (r'text-slate-900 dark:text-white', 'text-foreground'),
        (r'text-slate-900 dark:text-slate-50', 'text-foreground'),
        (r'text-slate-800 dark:text-slate-100', 'text-foreground'),
        (r'text-slate-800 dark:text-slate-200', 'text-foreground/90'),
        (r'text-slate-700 dark:text-slate-200', 'text-foreground/90'),
        (r'text-slate-700 dark:text-slate-300', 'text-foreground/80'),
        (r'text-slate-600 dark:text-slate-300', 'text-muted-foreground'),
        (r'text-slate-600 dark:text-slate-400', 'text-muted-foreground'),
        (r'text-slate-500 dark:text-slate-400', 'text-muted-foreground'),
        (r'text-slate-500 dark:text-slate-500', 'text-muted-foreground'),
        (r'text-slate-400 dark:text-slate-500', 'text-muted-foreground/80'),

        # Explicit Light/Dark Borders & Dividers
        (r'border-slate-200 dark:border-slate-800', 'border-border'),
        (r'border-slate-200 dark:border-slate-700', 'border-border'),
        (r'border-slate-300 dark:border-slate-700', 'border-border'),
        (r'border-slate-100 dark:border-slate-800', 'border-border/50'),
        (r'divide-slate-200 dark:divide-slate-800', 'divide-border'),
        (r'divide-slate-200 dark:divide-slate-700', 'divide-border'),
        (r'ring-slate-200 dark:ring-slate-800', 'ring-border'),
        (r'ring-slate-200 dark:ring-slate-700', 'ring-border'),

        # Hover states
        (r'hover:bg-slate-50 dark:hover:bg-slate-800', 'hover:bg-accent hover:text-accent-foreground'),
        (r'hover:bg-slate-100 dark:hover:bg-slate-800', 'hover:bg-accent hover:text-accent-foreground'),
        (r'hover:bg-slate-100 dark:hover:bg-slate-900', 'hover:bg-accent hover:text-accent-foreground'),
        (r'hover:text-slate-900 dark:hover:text-white', 'hover:text-foreground'),

        # The Purple Ban
        (r'text-purple-600 dark:text-purple-400', 'text-primary'),
        (r'text-purple-700 dark:text-purple-300', 'text-primary'),
        (r'text-purple-500', 'text-primary'),
        (r'text-purple-600', 'text-primary'),
        (r'bg-purple-100 dark:bg-purple-900/30', 'bg-primary/10'),
        (r'bg-purple-100 dark:bg-purple-900/20', 'bg-primary/10'),
        (r'bg-purple-50 dark:bg-purple-900/20', 'bg-primary/5'),
        (r'bg-purple-100 text-purple-600', 'bg-primary/10 text-primary'),
        (r'bg-purple-500', 'bg-primary'),
        (r'bg-purple-600', 'bg-primary'),
        (r'hover:bg-purple-50', 'hover:bg-primary/5'),
        (r'border-purple-200 dark:border-purple-800', 'border-primary/20'),
        (r'ring-purple-500', 'ring-primary'),
        
        # Fixing generic blues to semantic primary
        (r'text-blue-600 dark:text-blue-400', 'text-primary'),
        (r'text-blue-500', 'text-primary'),
        (r'bg-blue-100 dark:bg-blue-900/30', 'bg-primary/10'),
        (r'bg-blue-50 text-blue-600', 'bg-primary/10 text-primary'),
        (r'bg-blue-50 dark:bg-blue-900/20', 'bg-primary/5'),
        (r'bg-blue-600', 'bg-primary'),
        (r'hover:bg-blue-700', 'hover:bg-primary/90'),
        (r'ring-blue-500', 'ring-primary'),
        (r'border-blue-200 dark:border-blue-800', 'border-primary/20'),
        (r'border-blue-500', 'border-primary'),

        # Fixing generic greens to semantic secondary
        (r'text-green-600 dark:text-green-400', 'text-secondary'),
        (r'text-green-500', 'text-secondary'),
        (r'bg-green-100 dark:bg-green-900/30', 'bg-secondary/10'),
        (r'bg-green-50 text-green-600', 'bg-secondary/10 text-secondary'),
        (r'bg-green-600', 'bg-secondary'),
        (r'text-emerald-600 dark:text-emerald-400', 'text-secondary'),
        (r'bg-emerald-100 dark:bg-emerald-900/30', 'bg-secondary/10'),

        # Fixing generic reds to semantic destructive
        (r'text-red-600 dark:text-red-400', 'text-destructive'),
        (r'text-red-500', 'text-destructive'),
        (r'bg-red-100 dark:bg-red-900/30', 'bg-destructive/10'),
        (r'bg-red-50 text-red-600', 'bg-destructive/10 text-destructive'),
        (r'bg-red-600', 'bg-destructive'),
        
        # Fixing generic yellows/oranges to semantic warning
        (r'text-yellow-600 dark:text-yellow-400', 'text-warning'),
        (r'text-orange-600 dark:text-orange-400', 'text-warning'),
        (r'bg-yellow-100 dark:bg-yellow-900/30', 'bg-warning/10'),
        (r'bg-orange-100 dark:bg-orange-900/30', 'bg-warning/10'),
        (r'bg-yellow-50 text-yellow-600', 'bg-warning/10 text-warning'),

    ]

    for old, new in replacements:
        content = content.replace(old, new)

    # Clean up accidental duplication that might arise
    content = content.replace('text-foreground text-foreground', 'text-foreground')
    content = content.replace('bg-background bg-background', 'bg-background')
    content = content.replace('bg-card bg-card', 'bg-card')
    
    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

if __name__ == "__main__":
    import glob
    src_dir = "c:/AnitiGravity Projects/RentMate/src"
    
    changed_files = 0
    # Process all tsx and ts files
    for filepath in glob.iglob(src_dir + '/**/*.tsx', recursive=True):
        if process_file(filepath):
            changed_files += 1
            print(f"Updated: {filepath}")
            
    # Do exactly same for ts files if needed, but UI is mostly in tsx
    for filepath in glob.iglob(src_dir + '/**/*.ts', recursive=True):
        if process_file(filepath):
            changed_files += 1
            print(f"Updated: {filepath}")

    print(f"\nTotal files refactored: {changed_files}")
