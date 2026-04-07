import os
import shutil
import sys

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_core_dir = os.path.join(root_dir, 'src', 'shared-core')
    dest_core_dir = os.path.join(root_dir, 'supabase', 'functions', '_shared', 'core')

    if not os.path.exists(src_core_dir):
        print(f"Error: Source directory {src_core_dir} not found.")
        sys.exit(1)

    print(f"Syncing {src_core_dir} -> {dest_core_dir}")
    
    # Remove existing destination core directory
    if os.path.exists(dest_core_dir):
        shutil.rmtree(dest_core_dir)
        
    # Copy source to destination
    shutil.copytree(src_core_dir, dest_core_dir)
    print("Sync complete. Supabase Edge Functions now have the latest core business logic.")

if __name__ == '__main__':
    main()
