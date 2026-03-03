import re

file_path = "c:/AnitiGravity Projects/RentMate/src/pages/ComingSoon.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    # Backgrounds and Gradients
    (r'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900', 'bg-gradient-to-br from-background to-muted/20'),
    (r'from-slate-900 to-slate-700 dark:from-white dark:to-slate-300', 'from-foreground to-muted-foreground'),
    (r'bg-white/50 dark:bg-slate-900/50', 'bg-background/50'),
    (r'bg-white dark:bg-slate-800', 'bg-card'),
    (r'bg-white/80 dark:bg-slate-900/80', 'bg-card/80'),
    (r'bg-slate-50/50 dark:bg-slate-800/50', 'bg-background/50'),
    (r'bg-slate-100 dark:bg-slate-900', 'bg-muted/30'),
    (r'bg-white/70 dark:bg-slate-900/70', 'bg-card/70'),
    (r'dark:bg-slate-950/50', 'bg-background/50'),
    
    # Texts
    (r'text-slate-900 dark:text-white', 'text-foreground'),
    (r'text-slate-700 dark:text-slate-300', 'text-foreground'),
    (r'text-slate-600 dark:text-slate-400', 'text-muted-foreground'),
    (r'text-slate-500 dark:text-slate-400', 'text-muted-foreground'),
    (r'text-slate-400 dark:text-slate-500', 'text-muted-foreground/80'),
    (r'text-slate-500', 'text-muted-foreground'),
    (r'text-slate-600', 'text-muted-foreground'),
    (r'text-slate-700', 'text-muted-foreground'),
    (r'text-slate-400', 'text-muted-foreground'),

    # Borders and Rings
    (r'border-slate-200 dark:border-slate-700', 'border-border'),
    (r'border-slate-100 dark:border-slate-700', 'border-border'),
    (r'border border-white dark:border-slate-800', 'border border-border'),
    (r'ring-1 ring-slate-900/5 dark:ring-white/10', 'ring-1 ring-border/50'),
    (r'border-slate-300', 'border-border'),
    (r'dark:border-slate-600', ''),
    (r'border-slate-200/50 dark:border-slate-800/50', 'border-border/50'),
    (r'border-slate-200 dark:border-slate-800', 'border-border'),
    (r'border border-slate-200/50 dark:border-slate-700/50', 'border border-border/50'),

    # Hovers
    (r'hover:bg-slate-100 dark:hover:bg-slate-800', 'hover:bg-accent hover:text-accent-foreground'),
    (r'group-hover:text-slate-900 dark:group-hover:text-white', 'group-hover:text-foreground'),
    (r'focus:bg-white dark:focus:bg-slate-800', 'focus:bg-background'),
    (r'hover:bg-slate-200/50 dark:hover:bg-slate-800/50', 'hover:bg-accent hover:text-foreground'),
    (r'hover:bg-slate-200 dark:hover:bg-slate-800', 'hover:bg-accent'),
    
    # Specific elements fixes
    (r'bg-blue-100 dark:bg-blue-900/30', 'bg-primary/10'),
    (r'border-blue-200 dark:border-blue-800/50', 'border-primary/20'),
    (r'text-blue-600 dark:text-blue-400', 'text-primary'),
    (r'bg-green-100 text-green-600', 'bg-secondary/20 text-secondary'),
    (r'bg-red-50 text-red-600', 'bg-destructive/10 text-destructive'),
    (r'bg-blue-50 text-blue-600', 'bg-primary/10 text-primary'),
    (r'text-primary-600 dark:text-primary-400 hover:text-primary-500', 'text-primary hover:text-primary/80'),
    (r'decoration-primary-600/30 hover:decoration-primary-500', 'decoration-primary/30 hover:decoration-primary/80'),
    (r'bg-gradient-to-r from-primary-600 to-primary-500', 'bg-gradient-to-r from-primary to-primary/80'),
    (r'shadow-primary-500/30', 'shadow-primary/30'),
    (r'hover:shadow-primary-500/50', 'hover:shadow-primary/50'),
    (r'border border-primary-400/20', 'border border-primary/20'),
    (r'focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2', 'focus:ring-primary ring-offset-background focus:ring-2'),
    (r'text-primary-600', 'text-primary'),
    (r'text-primary-500', 'text-primary'),
    (r'bg-primary-500', 'bg-primary'),
    (r'bg-slate-100', 'bg-background'), # For the checkbox
    (r'dark:bg-slate-700', ''), # For the checkbox cleaning

    # Social icons fixes
    (r'hover:text-pink-600', 'hover:text-foreground'),
    (r'hover:text-blue-600', 'hover:text-foreground'),

    # Purple ban
    (r'bg-purple-600', 'bg-white/20'),

    # Feature List
    (r'group-hover:bg-primary-50 group-hover:border-primary-200 group-hover:text-primary-600 dark:group-hover:bg-primary-900/40 group-hover:shadow-md group-hover:shadow-primary-500/10', 'group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary'),

    # Focus Within
    (r'group-focus-within:text-primary-500', 'group-focus-within:text-primary'),
    (r'focus:border-primary-500 focus:ring-primary-500', 'focus:border-primary focus:ring-primary'),
    
    # Graphic blob backgrounds
    (r'from-primary-100/50 via-slate-100/10 to-transparent dark:from-primary-900/10 dark:via-slate-900/10 dark:to-transparent', 'from-primary/10 via-background/10 to-transparent'),
    (r'bg-blue-500/10 dark:bg-blue-600/5', 'bg-primary/10'),
    (r'bg-teal-500/10 dark:bg-teal-600/5', 'bg-secondary/10')
]

for old, new in replacements:
    content = content.replace(old, new)
    
# Clean up duplicate classes like ' hover:text-foreground hover:text-foreground'
content = content.replace('hover:text-foreground hover:text-foreground', 'hover:text-foreground')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacements done.")
