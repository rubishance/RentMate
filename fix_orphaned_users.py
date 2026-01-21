"""
Quick fix script for orphaned users in Supabase
Reads the SQL migration files and provides instructions
"""

import os

def main():
    print("=" * 60)
    print("RENTMATE - FIX ORPHANED USERS")
    print("=" * 60)
    print()
    
    # Check if migration files exist
    migrations_dir = os.path.join(os.path.dirname(__file__), 'supabase', 'migrations')
    fix_file = os.path.join(migrations_dir, 'fix_orphaned_users.sql')
    trigger_file = os.path.join(migrations_dir, '20260121_improved_signup_trigger.sql')
    
    if not os.path.exists(fix_file):
        print("❌ Migration file not found:", fix_file)
        return
    
    if not os.path.exists(trigger_file):
        print("❌ Migration file not found:", trigger_file)
        return
    
    print("✅ Migration files found!")
    print()
    print("📋 INSTRUCTIONS:")
    print()
    print("1. Go to Supabase SQL Editor:")
    print("   https://supabase.com/dashboard/project/qfvrekvugdjnwhnaucmz/sql/new")
    print()
    print("2. Run FIRST migration (fix existing orphaned users):")
    print(f"   File: {fix_file}")
    print()
    
    with open(fix_file, 'r', encoding='utf-8') as f:
        sql1 = f.read()
    
    print("=" * 60)
    print("SQL TO RUN (Step 1):")
    print("=" * 60)
    print(sql1)
    print()
    
    print("3. Run SECOND migration (improve signup trigger):")
    print(f"   File: {trigger_file}")
    print()
    
    with open(trigger_file, 'r', encoding='utf-8') as f:
        sql2 = f.read()
    
    print("=" * 60)
    print("SQL TO RUN (Step 2):")
    print("=" * 60)
    print(sql2)
    print()
    
    print("=" * 60)
    print("4. After running both migrations, try signing in with:")
    print("   Email: info@rentmate.co.il")
    print("   Password: [your password]")
    print()
    print("   If you forgot the password, use 'Forgot Password' link")
    print("=" * 60)

if __name__ == "__main__":
    main()
