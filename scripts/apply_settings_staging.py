import pg8000
import ssl

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

def apply_settings():
    print("🚀 Applying System Settings to Staging...")
    try:
        conn = pg8000.connect(**parse_uri(STAGING_URI))
        cursor = conn.cursor()
        
        settings = [
            ('global_email_support', '"support@rentmate.co.il"', 'Primary customer support and accessibility contact address'),
            ('global_email_service', '"service@rentmate.co.il"', 'Alternative service address for ticketing'),
            ('global_email_log', '"log@rentmate.co.il"', 'Technical log storage and administrative email forwarding'),
            ('global_email_sales', '"sales@rentmate.co.il"', 'Lead generation and sales inquiry address'),
            ('global_email_noreply', '"noreply@rentmate.co.il"', 'Outgoing system address for automated reports and alerts'),
            ('global_email_guest_leads', '"guest-leads@rentmate.co.il"', 'Internal tracking email for interactions from potential leads'),
            ('global_phone_support', '"+972-50-360-2000"', 'Official support phone number'),
            ('global_whatsapp_support', '"972503602000"', 'Official WhatsApp contact number (international format)')
        ]

        for key, value, desc in settings:
            query = f"INSERT INTO public.system_settings (key, value, description) VALUES (%s, %s::jsonb, %s) ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, value = EXCLUDED.value"
            cursor.execute(query, (key, value, desc))
            print(f"✅ Upserted {key}")
        
        conn.commit()
        print("🏁 Done!")
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    apply_settings()
