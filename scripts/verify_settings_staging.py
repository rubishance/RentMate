import pg8000
import ssl
import json

# Staging URI from migrator.py
STAGING_URI = "postgresql://postgres.tipnjnfbbnbskdlodrww:rwsMeiQ9SLDxyrFP@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

def parse_uri(uri):
    parts = uri.replace("postgresql://", "").split("@")
    user_pass = parts[0].split(":")
    host_port_db = parts[1].split("/")
    host_port = host_port_db[0].split(":")
    return {
        "user": user_pass[0], "password": user_pass[1],
        "host": host_port[0], "port": int(host_port[1]),
        "database": host_port_db[1], "ssl_context": ssl_context, "timeout": 30
    }

def verify_settings():
    print("🔍 Verifying System Settings in Staging...")
    try:
        conn = pg8000.connect(**parse_uri(STAGING_URI))
        cursor = conn.cursor()
        
        keys = [
            'global_email_support',
            'global_email_service',
            'global_email_log',
            'global_email_sales',
            'global_email_noreply',
            'global_email_guest_leads',
            'global_phone_support',
            'global_whatsapp_support'
        ]

        cursor.execute(f"SELECT key, value FROM public.system_settings WHERE key IN ({','.join(['%s']*len(keys))})", keys)
        results = cursor.fetchall()
        
        found_keys = {row[0]: row[1] for row in results}
        
        for key in keys:
            if key in found_keys:
                print(f"✅ {key}: {found_keys[key]}")
            else:
                print(f"❌ {key}: MISSING")
        
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    verify_settings()
