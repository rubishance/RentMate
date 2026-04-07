import pg8000.native
import ssl
import sys

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

STAGING_URI = "postgresql://postgres.tipnjnfbbnbskdlodrww:rwsMeiQ9SLDxyrFP@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Parse URI to components for pg8000
db_user = "postgres.tipnjnfbbnbskdlodrww"
db_password = "rwsMeiQ9SLDxyrFP"
db_host = "aws-1-ap-northeast-1.pooler.supabase.com"
db_port = 6543
db_database = "postgres"

def run_sql_file(filename):
    print(f"Connecting to {db_host}...")
    try:
        conn = pg8000.native.Connection(
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
            database=db_database,
            ssl_context=ssl_context,
            timeout=600  # 10 minutes timeout for massive schema
        )
        print("Connected.")
        
        with open(filename, 'r', encoding='utf-8') as f:
            sql = f.read()

        print(f"Executing {filename} ({len(sql)} bytes)...")
        # In pg8000 native, run only processes one statement if parameterized, 
        # but if we just want raw execution, maybe we just split or use raw?
        # Actually, running a giant script with native.run() might fail if it contains multiple statements.
        # Let's check how migrator_v2.py does it or use standard DB API.
        
        # We can split by semicolon or use the DB-API wrapper, since native might complain about multiple queries.
        pass
    except Exception as e:
        print(f"Connection failed: {e}")

run_sql_file("STAGING_SCHEMA_V12.sql")
