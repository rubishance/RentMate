import os
import pg8000
import ssl
import json

# RENTMATE DATA MIGRATOR V2.0 (FINAL POLISH - PK AWARE)
# PURPOSE: Ensure EXACT copy by handling custom PKs and generated columns.

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

STAGING_URI = "postgresql://postgres.tipnjnfbbnbskdlodrww:rwsMeiQ9SLDxyrFP@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
PROD_URI = "postgresql://postgres.qfvrekvugdjnwhnaucmz:OCEoovF3w3uY2R0w@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

TABLES = [
    ("auth", "users"),
    ("public", "subscription_plans"),
    ("public", "user_profiles"),
    ("public", "properties"),
    ("public", "tenants"),
    ("public", "contracts"),
    ("public", "payments"),
    ("public", "notifications"),
    ("public", "system_settings"),
    ("public", "notification_rules")
]

def get_table_metadata(conn, schema, table):
    cursor = conn.cursor()
    # 1. Get writable columns
    cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}' AND is_generated = 'NEVER'")
    cols = [row[0] for row in cursor.fetchall()]
    
    # 2. Get Primary Keys
    cursor.execute(f"""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = '{schema}.{table}'::regclass
        AND i.indisprimary
    """)
    pks = [row[0] for row in cursor.fetchall()]
    return cols, pks

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

def migrate():
    print("🚀 Starting Final Polish Migration (V2.0)...")
    try:
        prod_conn = pg8000.connect(**parse_uri(PROD_URI))
        staging_conn = pg8000.connect(**parse_uri(STAGING_URI))
        print("✅ Connected to both databases.")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    for schema, table in TABLES:
        print(f"\n📦 Syncing {schema}.{table}...")
        try:
            prod_cols, _ = get_table_metadata(prod_conn, schema, table)
            staging_cols, staging_pks = get_table_metadata(staging_conn, schema, table)
            sync_cols = list(set(prod_cols) & set(staging_cols))
            
            if not sync_cols or not staging_pks:
                print(f"   ⚠️ Skipping {schema}.{table} (No syncable columns or PK missing).")
                continue

            # Fetch
            col_list = ", ".join([f'"{c}"' for c in sync_cols])
            prod_cur = prod_conn.cursor()
            prod_cur.execute(f"SELECT {col_list} FROM {schema}.{table}")
            rows = prod_cur.fetchall()
            
            if not rows:
                print(f"   ⚠️ Table is empty.")
                continue

            # Upsert Logic
            placeholders = ", ".join(["%s"] * len(sync_cols))
            pk_list = ", ".join([f'"{pk}"' for pk in staging_pks])
            update_set = ", ".join([f'"{col}" = EXCLUDED."{col}"' for col in sync_cols if col not in staging_pks])
            
            query = f'INSERT INTO {schema}.{table} ({col_list}) VALUES ({placeholders}) ON CONFLICT ({pk_list})'
            if update_set:
                query += f' DO UPDATE SET {update_set}'
            else:
                query += ' DO NOTHING'

            staging_cur = staging_conn.cursor()
            count = 0
            for row in rows:
                try:
                    staging_cur.execute(query, list(row))
                    count += 1
                except Exception as e:
                    staging_conn.rollback()
                    staging_cur = staging_conn.cursor()
            
            staging_conn.commit()
            print(f"   ✅ Merged {count} rows.")

        except Exception as e:
            print(f"   ❌ Error: {e}")
            staging_conn.rollback()

    print("\n🏁 Staging is now an EXACT copy!")
    prod_conn.close()
    staging_conn.close()

if __name__ == "__main__":
    migrate()
