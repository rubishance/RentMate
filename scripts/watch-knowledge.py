import os
import time
import subprocess
import sys

# Paths to watch
WATCH_PATHS = [
    r"c:\AnitiGravity Projects\RentMate\src\pages",
    r"c:\AnitiGravity Projects\RentMate\src\components",
    r"c:\AnitiGravity Projects\RentMate\supabase\migrations"
]

SYNC_SCRIPT = r"c:\AnitiGravity Projects\RentMate\scripts\sync-knowledge.py"

def get_last_mtime():
    """Returns the maximum modification time across all watched paths."""
    max_mtime = 0
    for path in WATCH_PATHS:
        for root, dirs, files in os.walk(path):
            if ".git" in root: continue
            for file in files:
                if file.endswith((".tsx", ".ts", ".sql", ".md")):
                    fpath = os.path.join(root, file)
                    try:
                        mtime = os.path.getmtime(fpath)
                        if mtime > max_mtime:
                            max_mtime = mtime
                    except OSError:
                        pass
    return max_mtime

def run_sync():
    print(f"[{time.strftime('%H:%M:%S')}] 🔄 Changes detected! Syncing knowledge...")
    try:
        # Run using current python interpreter
        subprocess.run([sys.executable, SYNC_SCRIPT], check=True)
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Sync complete.")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ❌ Sync failed: {e}")

if __name__ == "__main__":
    print("👀 Renty Knowledge Watchdog started...")
    print(f"Watching: {', '.join([os.path.basename(p) for p in WATCH_PATHS])}")
    
    last_seen_mtime = get_last_mtime()
    
    try:
        while True:
            time.sleep(2) # Check every 2 seconds
            current_mtime = get_last_mtime()
            
            if current_mtime > last_seen_mtime:
                run_sync()
                last_seen_mtime = current_mtime
                
    except KeyboardInterrupt:
        print("\n👋 Watchdog stopped.")
