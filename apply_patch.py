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

PATCH_SQL = """
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_plan_id TEXT := 'free_forever';
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role, subscription_status, subscription_plan)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user',
        'active',
        default_plan_id
    ) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;
"""

def apply():
    print("🩹 Applying trigger patch to Staging...")
    try:
        conn = pg8000.connect(**STAGING_CONFIG)
        cur = conn.cursor()
        cur.execute(PATCH_SQL)
        conn.commit()
        print("✅ Patch applied successfully.")
        conn.close()
    except Exception as e:
        print(f"❌ Patch failed: {e}")

if __name__ == "__main__":
    apply()
