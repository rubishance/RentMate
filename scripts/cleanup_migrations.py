import os
import hashlib

migrations_dir = r'c:\AnitiGravity Projects\RentMate\supabase\migrations'

def get_hash(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

files = os.listdir(migrations_dir)
files.sort()

# Group by "name" (the part after the first underscore)
grouped = {}
for f in files:
    if not f.endswith('.sql'):
        continue
    
    parts = f.split('_', 1)
    if len(parts) < 2:
        # Files without underscores (like CONSOLIDATED_PHASE1.sql)
        name = f
    else:
        name = parts[1]
    
    if name not in grouped:
        grouped[name] = []
    grouped[name].append(f)

to_delete = []

for name, versions in grouped.items():
    if len(versions) > 1:
        print(f"Conflicts for {name}:")
        # Find the one with the longest prefix (usually the full timestamp)
        with_timestamp = [v for v in versions if len(v.split('_')[0]) > 8]
        without_timestamp = [v for v in versions if len(v.split('_')[0]) == 8]
        
        if with_timestamp and without_timestamp:
            for v_no in without_timestamp:
                # Check if length/content matches at least one with timestamp
                hash_no = get_hash(os.path.join(migrations_dir, v_no))
                for v_with in with_timestamp:
                    hash_with = get_hash(os.path.join(migrations_dir, v_with))
                    if hash_no == hash_with:
                        print(f"  Exact duplicate found: {v_no} == {v_with}. Marking {v_no} for deletion.")
                        to_delete.append(v_no)
                        break
                    else:
                        # Sometimes they are slightly different due to formatting, but if they have the same name and date...
                        # Use caution.
                        print(f"  Content mismatch: {v_no} vs {v_with}")

if to_delete:
    print("\nFiles to delete:")
    for f in to_delete:
        print(f"  {f}")
    
    # Uncomment to actually delete
    for f in to_delete:
        try:
            os.remove(os.path.join(migrations_dir, f))
            print(f"Deleted {f}")
        except Exception as e:
            print(f"Error deleting {f}: {e}")
else:
    print("No exact duplicates found with the expected naming pattern.")
