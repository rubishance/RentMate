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
    # handle cases with "Icon" suffix as well
    if name.endswith('Icon') and len(name) > 4:
        name = name[:-4]
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

html_content = """<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<title>דוח אייקונים באפליקציה</title>
<script src="https://unpkg.com/lucide@latest"></script>
<style>
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #333;
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    background: #fafafa;
  }
  h1 {
    color: #111;
    border-bottom: 2px solid #eaeaea;
    padding-bottom: 1rem;
    margin-bottom: 2rem;
  }
  .icon-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .icon-card {
    background: white;
    border: 1px solid #eaeaea;
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    gap: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }
  .preview {
    width: 64px;
    height: 64px;
    background: #f4f4f5;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .preview svg {
    width: 32px;
    height: 32px;
    color: #111;
  }
  .info h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #111;
  }
  .lib-badge {
    display: inline-block;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    margin-bottom: 1rem;
  }
  .usage {
    margin: 0;
    padding-left: 0;
    padding-right: 1.5rem;
  }
  .usage li {
    font-size: 0.9rem;
    color: #555;
    margin-bottom: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    direction: ltr;
    text-align: left;
  }
</style>
</head>
<body>
  <h1>דוח אייקונים באפליקציה</h1>
  <div class="icon-list">
"""

for (icon, lib), paths in sorted(icons_usage.items()):
    html_content += f'<div class="icon-card">\n'
    if lib == 'lucide':
        kebab = camel_to_kebab(icon)
        html_content += f'<div class="preview"><i data-lucide="{kebab}"></i></div>\n'
    else:
        html_content += f'<div class="preview" style="font-size:12px;text-align:center;">Heroicons<br>No Preview</div>\n'
        
    html_content += f'<div class="info">\n'
    html_content += f'<h2>{icon}</h2>\n'
    html_content += f'<span class="lib-badge">{lib}</span>\n'
    html_content += f'<ul class="usage">\n'
    unique_paths = sorted(list(set(paths)))
    for p in unique_paths:
        rel = os.path.relpath(p, 'c:/AnitiGravity Projects/RentMate/src').replace('\\\\', '/')
        html_content += f'<li>{rel}</li>\n'
    html_content += f'</ul>\n'
    html_content += f'</div>\n'
    html_content += f'</div>\n'

html_content += """
  </div>
  <script>
    lucide.createIcons();
  </script>
</body>
</html>
"""

with open('c:/AnitiGravity Projects/RentMate/tmp_icons.html', 'w', encoding='utf-8') as f:
    f.write(html_content)
