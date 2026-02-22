import re
import os

def surgical_scrub(filename):
    if not os.path.exists(filename):
        return
    
    # Read as binary to be absolutely sure we catch everything
    with open(filename, 'rb') as f:
        content = f.read()
    
    # 1. Strip all UTF-8 BOMs (ef bb bf)
    content = content.replace(b'\xef\xbb\xbf', b'')
    
    # 2. Strip UTF-16 BOMs just in case
    content = content.replace(b'\xff\xfe', b'')
    content = content.replace(b'\xfe\xff', b'')
    
    # 3. Strip any weird control characters (but keep newlines/tabs)
    # We'll do this by decoding to string first
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
        
    # Global replacement of the zero-width non-breaking space / BOM character
    text = text.replace('\ufeff', '')
    
    # Strip line non-printing garbage
    # Standardize line endings
    text = text.replace('\r\n', '\n')
    
    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f"Surgically scrubbed {filename}")

surgical_scrub('STAGING_GOLDEN_SNAPSHOT.sql')
