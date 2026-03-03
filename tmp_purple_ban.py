import re
import glob

def clean_purple(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    
    # Generic sweep for lingering purple
    content = re.sub(r'purple-(\d+)', r'primary-\1', content)
    content = re.sub(r'purple-50', r'primary-50', content)
    
    # Same for rogue generics mentioned in grep
    content = re.sub(r'from-brand-600', r'from-primary', content)
    content = re.sub(r'from-brand-500', r'from-primary', content)
    content = re.sub(r'to-brand-600', r'to-primary', content)
    content = re.sub(r'to-brand-500', r'to-primary', content)
    
    content = re.sub(r'shadow-purple-\d+/\d+', r'shadow-primary/20', content)
    content = re.sub(r'from-blue-\d+', r'from-primary', content)
    
    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

src_dir = "c:/AnitiGravity Projects/RentMate/src"
changed = 0
for filepath in glob.iglob(src_dir + '/**/*.tsx', recursive=True):
    if clean_purple(filepath):
        changed += 1

print(f"Cleaned purple from {changed} files.")
