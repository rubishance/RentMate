import re

def make_idempotent(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add IF NOT EXISTS to ADD COLUMN
    # re.sub with a case-insensitive catch, capturing the table and the column part
    content = re.sub(r"(ALTER TABLE\s+[\w\.]+\s+ADD\s+COLUMN)\s+(?!IF NOT EXISTS)", r"\1 IF NOT EXISTS ", content, flags=re.IGNORECASE)
    
    # 2. Add IF EXISTS to DROP CONSTRAINT
    content = re.sub(r"(ALTER TABLE\s+[\w\.]+\s+DROP\s+CONSTRAINT)\s+(?!IF EXISTS)", r"\1 IF EXISTS ", content, flags=re.IGNORECASE)
    
    # 3. Guard CREATE INDEX
    content = re.sub(r"CREATE\s+INDEX\s+(?!IF NOT EXISTS)", "CREATE INDEX IF NOT EXISTS ", content, flags=re.IGNORECASE)
    
    # 4. Guard CREATE TABLE
    content = re.sub(r"CREATE\s+TABLE\s+(?!IF NOT EXISTS)", "CREATE TABLE IF NOT EXISTS ", content, flags=re.IGNORECASE)

    # 5. Fix the specific needs_painting missing guard if re.sub missed it (it shouldn't)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed idempotency in {filename}")

make_idempotent('STAGING_GOLDEN_SNAPSHOT.sql')
