import os
import requests
import json
import datetime
import zipfile
import shutil
from pathlib import Path

# --- Configuration Loader ---
def load_env(env_path=".env"):
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    env_vars[key] = value
    return env_vars

# --- Backup Logic ---
class RentMateBackup:
    def __init__(self, env):
        self.supabase_url = env.get("VITE_SUPABASE_URL", "").rstrip("/")
        self.anon_key = env.get("VITE_SUPABASE_ANON_KEY", "")
        self.service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self.db_password = env.get("DB_PASSWORD", "")
        
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_dir = Path(f"backups/backup_{self.timestamp}")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Use service role key if available, otherwise anon key
        self.auth_key = self.service_role_key if self.service_role_key else self.anon_key
        self.headers = {
            "apikey": self.auth_key,
            "Authorization": f"Bearer {self.auth_key}"
        }

    def backup_database_json(self):
        """Backs up public tables to JSON via PostgREST API (Backup Lite)."""
        print("--- Backing up Database (JSON) ---")
        tables = [
            "user_profiles", "properties", "contracts", 
            "property_documents", "short_links", 
            "ai_chat_usage", "ai_usage_limits"
        ]
        
        db_dir = self.backup_dir / "database"
        db_dir.mkdir(exist_ok=True)
        
        for table in tables:
            print(f"Exporting table: {table}")
            url = f"{self.supabase_url}/rest/v1/{table}?select=*"
            try:
                response = requests.get(url, headers=self.headers)
                if response.status_code == 200:
                    with open(db_dir / f"{table}.json", "w", encoding="utf-8") as f:
                        json.dump(response.json(), f, indent=2, ensure_ascii=False)
                else:
                    print(f"  [!] Failed to export {table}: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"  [!] Error exporting {table}: {e}")

    def backup_storage(self):
        """Downloads all files from specific buckets."""
        print("--- Backing up Storage Buckets ---")
        buckets = ["contracts", "property-images", "secure_documents"]
        storage_dir = self.backup_dir / "storage"
        storage_dir.mkdir(exist_ok=True)

        for bucket in buckets:
            print(f"Backing up bucket: {bucket}")
            self._download_bucket_recursive(bucket, "", storage_dir / bucket)

    def _download_bucket_recursive(self, bucket, path, local_target):
        # List files
        list_url = f"{self.supabase_url}/storage/v1/object/list/{bucket}"
        payload = {"prefix": path, "limit": 100, "offset": 0, "sort_by": {"column": "name", "order": "asc"}}
        
        try:
            response = requests.post(list_url, headers=self.headers, json=payload)
            if response.status_code != 200:
                print(f"  [!] Could not list objects in {bucket}/{path}: {response.status_code}")
                return

            items = response.json()
            for item in items:
                item_name = item['name']
                item_path = f"{path}/{item_name}".lstrip("/") if path else item_name
                
                if item.get('id') is None: # It's a folder
                    print(f"  Folder: {item_path}")
                    self._download_bucket_recursive(bucket, item_path, local_target)
                else: # It's a file
                    print(f"  File: {item_path}")
                    self._download_file(bucket, item_path, local_target / item_path)
        except Exception as e:
            print(f"  [!] Error processing {bucket}/{path}: {e}")

    def _download_file(self, bucket, storage_path, local_path):
        local_path.parent.mkdir(parents=True, exist_ok=True)
        url = f"{self.supabase_url}/storage/v1/object/authenticated/{bucket}/{storage_path}"
        
        try:
            response = requests.get(url, headers=self.headers, stream=True)
            if response.status_code == 200:
                with open(local_path, "wb") as f:
                    shutil.copyfileobj(response.raw, f)
            else:
                print(f"    [!] Failed to download: {storage_path} ({response.status_code})")
        except Exception as e:
            print(f"    [!] Error downloading {storage_path}: {e}")

    def create_archive(self):
        """Zips the backup directory."""
        archive_name = f"backups/RentMate_Backup_{self.timestamp}.zip"
        print(f"--- Creating Archive: {archive_name} ---")
        shutil.make_archive(archive_name.replace(".zip", ""), 'zip', self.backup_dir)
        print("Done!")

if __name__ == "__main__":
    config = load_env()
    backup = RentMateBackup(config)
    
    # 1. Database (JSON snapshot)
    backup.backup_database_json()
    
    # 2. Storage (Files)
    backup.backup_storage()
    
    # 3. Archive
    backup.create_archive()
    
    # 4. Cleanup temp folder
    # shutil.rmtree(backup.backup_dir)
