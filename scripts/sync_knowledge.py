import os
import re
import shutil
from datetime import datetime

# Configuration
SOURCE_DIR = "docs/notebooklm_sources"
BACKUP_DIR = "docs/notebooklm_sources/archive"
G_DRIVE_PATH = r"G:\האחסון שלי\RentMate"
VERSION_PATTERN = r"_v(\d+\.\d+\.\d+)\.md$"

def get_current_files():
    """Returns a list of all versioned markdown files in the source directory."""
    files = []
    for f in os.listdir(SOURCE_DIR):
        if re.search(VERSION_PATTERN, f):
            files.append(f)
    return files

def bump_version(version_str):
    """Increments the patch version (x.y.Z -> x.y.Z+1)."""
    major, minor, patch = map(int, version_str.split('.'))
    return f"{major}.{minor}.{patch + 1}"

def sync_knowledge(force_bump=False):
    """
    Orchestrates the versioning and cleanup of knowledge base files.
    - Backups old versions to /archive
    - Renames files to their new versions
    - Updates the README index
    """
    print(f"🚀 Starting RentMate Knowledge Sync at {datetime.now().strftime('%H:%M:%S')}")
    
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"📁 Created archive directory: {BACKUP_DIR}")

    files = get_current_files()
    if not files:
        print("❌ No versioned files found. Check your docs/notebooklm_sources folder.")
        return

    # Determine current version from the first file
    match = re.search(VERSION_PATTERN, files[0])
    current_version = match.group(1)
    new_version = bump_version(current_version)
    
    print(f"📈 Version detected: {current_version} -> Target: {new_version}")

    updated_files = []
    
    for f in files:
        # Move current to archive
        old_path = os.path.join(SOURCE_DIR, f)
        archive_path = os.path.join(BACKUP_DIR, f)
        
        # In a real scenario, we'd only bump if content changed. 
        # For this script, we assume the user/AI just finished making edits.
        
        new_filename = f.replace(f"_v{current_version}", f"_v{new_version}")
        new_path = os.path.join(SOURCE_DIR, new_filename)
        
        # Archiving current...
        shutil.copy2(old_path, archive_path)
        
        # Renaming...
        os.rename(old_path, new_path)
        updated_files.append(new_filename)
        print(f"✅ Updated: {new_filename}")

    # Update README_UPLOAD_GUIDE
    readme_path = os.path.join(SOURCE_DIR, "README_UPLOAD_GUIDE.md")
    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as rf:
            content = rf.read()
        
        content = content.replace(f"v{current_version}", f"v{new_version}")
        content = content.replace(f"(Version {current_version})", f"(Version {new_version})")
        
        with open(readme_path, 'w', encoding='utf-8') as wf:
            wf.write(content)
        print(f"📄 Updated README Guide to v{new_version}")

    # --- GOOGLE DRIVE SYNC ---
    if os.path.exists(G_DRIVE_PATH):
        print(f"\n📡 Syncing to Google Drive: {G_DRIVE_PATH}")
        # Clean old versioned files in G Drive to avoid clutter
        for g_file in os.listdir(G_DRIVE_PATH):
            if re.search(VERSION_PATTERN, g_file) or g_file == "README_UPLOAD_GUIDE.md":
                try:
                    os.remove(os.path.join(G_DRIVE_PATH, g_file))
                except: pass
        
        # Copy new files
        for f_to_copy in updated_files:
            shutil.copy2(os.path.join(SOURCE_DIR, f_to_copy), os.path.join(G_DRIVE_PATH, f_to_copy))
        shutil.copy2(readme_path, os.path.join(G_DRIVE_PATH, "README_UPLOAD_GUIDE.md"))
        print(f"📤 Uploaded {len(updated_files)} files to Google Drive.")
    else:
        print(f"\n⚠️ Google Drive path not found: {G_DRIVE_PATH}")
        print("Skipping cloud sync.")

    print("\n" + "="*40)
    print("✨ SYNC COMPLETE")
    print(f"New Version: {new_version}")
    print("READY FOR NOTEBOOKLM UPLOAD")
    print("="*40)

if __name__ == "__main__":
    sync_knowledge()
