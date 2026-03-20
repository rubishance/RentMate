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

print("Executing SQL to schedule fetch-cbs-monthly-rent via pg_cron...")

try:
    conn = pg8000.connect(**parse_uri(PROD_URI))
    print("✅ Connected to Production Database.")
    
    with open("supabase/schedule-cbs-update.sql", "r", encoding="utf-8") as f:
        sql = f.read()
        
    cursor = conn.cursor()
    
    # Enable extensions first
    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_net;")
    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_cron;")
    
    # Execute the scheduling payload explicitly
    # Read the query segment for scheduling
    schedule_query = """
    SELECT cron.schedule(
        'sync-monthly-cbs-data',
        '0 2 20 * *',
        $$
        SELECT
          net.http_post(
              url:='https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/fetch-cbs-monthly-rent',
              headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdnJla3Z1Z2RqbndobmF1Y216Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzNjQxNiwiZXhwIjoyMDgzMDEyNDE2fQ._Fmq-2x4zpzPkHP9btdqSUj0gbX7RmqscwvGElNbdNA"}'::jsonb
          ) AS request_id;
        $$
    );
    """
    
    # We first try to unschedule just in case it exists to avoid duplicates
    try:
        cursor.execute("SELECT cron.unschedule('sync-monthly-cbs-data');")
    except Exception as e:
        conn.rollback()
        pass 
        
    conn.commit()

    cursor.execute(schedule_query)
    conn.commit()
    
    print("✅ Successfully scheduled the fetch-cbs-monthly-rent function.")
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
