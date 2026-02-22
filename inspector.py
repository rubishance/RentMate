import pg8000
import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

PROD_CONFIG = {
    "user": "postgres.qfvrekvugdjnwhnaucmz",
    "password": "OCEoovF3w3uY2R0w",
    "host": "aws-1-ap-south-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "ssl_context": ssl_context,
    "timeout": 30
}

def inspect(table_name):
    print(f"🔍 Inspecting {table_name}...")
    try:
        conn = pg8000.connect(**PROD_CONFIG)
        cur = conn.cursor()
        
        # Get PK
        cur.execute(f"""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = '{table_name}'::regclass
            AND i.indisprimary
        """)
        pks = cur.fetchall()
        print(f"   Primary Keys: {[p[0] for p in pks]}")
        
        # Get Columns
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema || '.' || table_name = '{table_name}'")
        cols = cur.fetchall()
        print(f"   Columns: {cols}")
        
        conn.close()
    except Exception as e:
        print(f"❌ Inspection failed: {e}")

if __name__ == "__main__":
    inspect("public.system_settings")
    inspect("public.notification_rules")
