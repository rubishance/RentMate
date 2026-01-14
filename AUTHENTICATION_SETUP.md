# Supabase Authentication Setup Guide

This guide will help you set up authentication for your RentMate application.

## Step 1: Run the Database Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `supabase-auth-migration.sql` from your project
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to execute the migration

This will:
- Add `user_id` columns to all tables
- Create Row Level Security (RLS) policies
- Set up proper indexes for performance

## Step 2: Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Email** in the list
3. Make sure it's **enabled**
4. Configure email settings:
   - **Enable email confirmations**: ON (recommended for production)
   - **Secure email change**: ON
   - **Double confirm email changes**: ON

## Step 3: Configure Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Customize the following templates with your branding:
   - **Confirm signup**: Email sent when users sign up
   - **Reset password**: Email sent for password resets
   - **Magic Link**: Email sent for passwordless login (optional)

3. Update the redirect URLs to match your domain:
   - For local development: `http://localhost:3000` or your local URL
   - For production: `https://yourdomain.com`

## Step 4: Test the Authentication Flow

1. Open `signup.html` in your browser
2. Create a new account with your email
3. Check your email for the confirmation link (if email confirmation is enabled)
4. Click the confirmation link
5. Go to `login.html` and log in with your credentials
6. You should be redirected to the dashboard

## Step 5: Assign Existing Data to Your User Account

If you have existing data in your database, you need to assign it to your user account:

1. Log in to your new account
2. Get your user ID from the Supabase dashboard:
   - Go to **Authentication** → **Users**
   - Find your user and copy the **ID** (UUID)

3. Go to **SQL Editor** and run:
   ```sql
   SELECT assign_data_to_user('your-user-id-here');
   ```
   Replace `'your-user-id-here'` with your actual user ID

## Step 6: Update Your Config

Make sure your `js/config.js` file has the correct Supabase credentials:

```javascript
const CONFIG = {
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-public-key',
    // ... other config
};
```

## Troubleshooting

### "Email not confirmed" error
- Check your email for the confirmation link
- If you didn't receive it, go to Supabase Dashboard → Authentication → Users
- Find your user and click the "..." menu → "Send confirmation email"

### Can't see my data after logging in
- Make sure you ran the `assign_data_to_user()` function with your user ID
- Check that RLS policies are enabled (they should be after running the migration)

### "Not authenticated" errors
- Clear your browser cache and cookies
- Try logging out and logging back in
- Check browser console for any JavaScript errors

## Security Notes

- **Never share your Supabase service role key** - only use the anon/public key in your frontend
- The RLS policies ensure users can only access their own data
- Passwords are automatically hashed by Supabase
- Sessions are managed securely with JWT tokens

## Next Steps

Once authentication is working:
1. Customize the email templates with your branding
2. Set up a custom domain for your application
3. Configure password strength requirements in Supabase settings
4. Consider enabling Multi-Factor Authentication (MFA) for extra security
