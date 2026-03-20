import os
import re
from collections import defaultdict

lucide_pattern = re.compile(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react['\"]")
hero_pattern = re.compile(r"import\s+\{([^}]+)\}\s+from\s+['\"]@heroicons/react/(?:outline|solid|24/outline|24/solid)['\"]")

icons_usage = defaultdict(list)

for root, _, files in os.walk('c:/AnitiGravity Projects/RentMate/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Lucide
                    for match in lucide_pattern.finditer(content):
                        names = [n.strip().split(' as ')[0] for n in match.group(1).split(',')]
                        for name in names:
                            if name:
                                icons_usage[(name, 'lucide')].append(filepath)
                                
                    # Heroicons
                    for match in hero_pattern.finditer(content):
                        names = [n.strip().split(' as ')[0] for n in match.group(1).split(',')]
                        for name in names:
                            if name:
                                icons_usage[(name, 'heroicons')].append(filepath)
            except Exception as e:
                pass

def camel_to_kebab(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

with open('c:/AnitiGravity Projects/RentMate/tmp_icons.md', 'w', encoding='utf-8') as f:
    f.write('# אייקונים בשימוש באפליקציה\n\n')
    f.write('דוח זה מפרט את כל האייקונים שמשתמשים בהם באפליקציה, עם תצוגה מקדימה שלהם והקבצים שבהם הם מופיעים.\n\n')
    for (icon, lib), paths in sorted(icons_usage.items()):
        f.write(f'## {icon} ({lib})\n')
        
        if lib == 'lucide':
            kebab = camel_to_kebab(icon)
            f.write(f'![{icon}](https://api.iconify.design/lucide/{kebab}.svg?height=32)\n\n')
        elif lib == 'heroicons':
            kebab = camel_to_kebab(icon)
            f.write(f'*(Heroicons {icon})*\n\n')
            
        f.write('**מיקומי שימוש:**\n')
        unique_paths = sorted(list(set(paths)))
        for p in unique_paths:
            rel = os.path.relpath(p, 'c:/AnitiGravity Projects/RentMate/src').replace('\\\\', '/')
            f.write(f'- `{rel}`\n')
        f.write('\n---\n\n')
