import os
import pg8000
import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

PROD_URI = "postgresql://postgres.qfvrekvugdjnwhnaucmz:OCEoovF3w3uY2R0w@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

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

def apply_migration():
    print("🚀 Applying tenant_leasing_features migration...")
    try:
        conn = pg8000.connect(**parse_uri(PROD_URI))
        print("✅ Connected to database.")
        
        with open("supabase/migrations/20260313224150_tenant_leasing_features.sql", "r", encoding="utf8") as f:
            sql = f.read()
            
        cur = conn.cursor()
        for statement in sql.split(';'):
            stmt = statement.strip()
            if stmt:
                print(f"Executing: {stmt[:50]}...")
                cur.execute(stmt)
                
        conn.commit()
        print("✅ Migration applied successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    apply_migration()
