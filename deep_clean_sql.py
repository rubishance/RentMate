import os

def clean_file(filename):
    if not os.path.exists(filename):
        return
    
    with open(filename, 'rb') as f:
        content = f.read()
    
    # Check for BOM
    if content.startswith(b'\xef\xbb\xbf'):
        print(f"BOM found in {filename}, stripping...")
        content = content[3:]
    
    # Also look for hidden BOMs inside the file (sometimes happens during merges)
    content = content.replace(b'\xef\xbb\xbf', b'')
    
    # Convert to string and strip any other weirdness
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        # Fallback to latin-1 if utf-8 fails, but it shouldn't
        text = content.decode('latin-1')
    
    # Standardize line endings and strip whitespace at very beginning
    text = text.lstrip()
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Cleaned {filename}")

for f in ['stage1_foundation.sql', 'stage2_expansion.sql', 'stage3_full_migrations.sql']:
    clean_file(f)
