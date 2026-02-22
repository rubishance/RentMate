import pg8000
import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

STAGING_CONFIG = {
    "user": "postgres.tipnjnfbbnbskdlodrww",
    "password": "rwsMeiQ9SLDxyrFP",
    "host": "aws-1-ap-northeast-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "ssl_context": ssl_context,
    "timeout": 30
}

BUCKETS = [
    ('contract-files', True),
    ('assets', True),
    ('feedback-screenshots', False),
    ('secure_documents', False),
    ('contracts', False),
    ('property-images', False)
]

def setup():
    print("🪣 Setting up Storage Buckets on Staging...")
    try:
        conn = pg8000.connect(**STAGING_CONFIG)
        cur = conn.cursor()
        for b_id, is_public in BUCKETS:
            # Note: storage.buckets might not exist if storage isn't initialized, 
            # but usually it's there on new Supabase projects.
            cur.execute(f"INSERT INTO storage.buckets (id, name, public) VALUES ('{b_id}', '{b_id}', {is_public}) ON CONFLICT (id) DO NOTHING")
        conn.commit()
        print("✅ Storage Buckets synced.")
        conn.close()
    except Exception as e:
        print(f"❌ Bucket setup failed: {e}")

if __name__ == "__main__":
    setup()
