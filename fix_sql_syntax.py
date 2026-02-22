import os

for filename in ['stage1_foundation.sql', 'stage2_expansion.sql', 'stage3_full_migrations.sql']:
    if not os.path.exists(filename):
        continue
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace $$$; with $$;
    content = content.replace('$$$;', '$$;')
    # Replace $$$ ; with $$;
    content = content.replace('$$$ ;', '$$;')
    # Replace $$ ; with $$;
    content = content.replace('$$ ;', '$$;')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filename}")
