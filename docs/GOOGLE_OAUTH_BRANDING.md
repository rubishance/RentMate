# Customizing Google OAuth Consent Screen

## Issue
When users sign in with Google, they see:
> "You're signing back in to qfvrekvugdjnwhnaucmz.supabase.co"

This exposes the technical Supabase URL instead of your brand name.

## Solution

### Step 1: Update Google Cloud Console

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Select your project (the one with Client ID: `386252373495-mtsignnt2es3d4t2cgrtnoq4q66or288`)

2. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Click **Edit App**

3. **Update Application Information**
   - **App name**: `RentMate` (or your preferred brand name)
   - **User support email**: Your support email
   - **App logo**: Upload your RentMate logo (120x120px minimum)
   - **Application home page**: `https://your-domain.com` (or `http://localhost:5173` for testing)
   - **Application privacy policy**: Link to your privacy policy
   - **Application terms of service**: Link to your terms
   - **Authorized domains**: Add your production domain (e.g., `rentmate.app`)

4. **Save Changes**

### Step 2: Update Supabase Settings (Optional but Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/qfvrekvugdjnwhnaucmz
   - Go to **Authentication** → **Providers** → **Google**

2. **Update Site URL**
   - Set **Site URL** to your production domain (e.g., `https://rentmate.app`)
   - This ensures redirects go to your domain, not Supabase's

3. **Add Redirect URLs**
   - Add: `https://your-domain.com/auth/callback`
   - Add: `http://localhost:5173/auth/callback` (for development)

### Step 3: Update Your Application Code

The redirect configuration in your code looks correct, but ensure it points to your domain:

\`\`\`typescript
// src/pages/Login.tsx (Line 54-63)
const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
        redirectTo: `${window.location.origin}/properties`, // ✅ Correct
        queryParams: {
            access_type: 'offline',
            prompt: 'consent',
        },
    },
});
\`\`\`

### Expected Result

After these changes, users will see:
> "Sign in to **RentMate**"

Instead of the Supabase URL.

---

## Quick Fix (Immediate)

If you need an immediate fix without waiting for Google's review:

### Option A: Use Custom Domain
1. Set up a custom domain (e.g., `auth.rentmate.app`)
2. Point it to your Supabase project
3. Update the Google OAuth authorized domains

### Option B: Update App Name Only
1. Just change the **App name** in Google Cloud Console
2. This takes effect immediately for internal/testing users
3. For production (external users), you'll need to submit for verification

---

## Verification Steps

After making changes:

1. **Clear browser cache** or use incognito mode
2. **Test Google Sign-In** again
3. **Check the consent screen** - should show "RentMate" instead of the Supabase URL

---

## Additional Recommendations

### 1. Add Branding
- Upload your logo (120x120px PNG with transparent background)
- Add brand colors in the consent screen settings

### 2. Verification (For Production)
- If your app will have external users, submit for **Google verification**
- This removes the "unverified app" warning
- Takes 1-2 weeks for approval

### 3. Custom Domain (Recommended)
- Use a custom domain like `app.rentmate.com`
- This completely hides the Supabase infrastructure
- Provides a more professional experience

---

## Current Configuration

Based on your `.env` file:
- **Supabase URL**: `https://qfvrekvugdjnwhnaucmz.supabase.co`
- **Google Client ID**: `386252373495-mtsignnt2es3d4t2cgrtnoq4q66or288`

You need to update the Google Cloud Console for this specific Client ID.

---

## Need Help?

If you need me to:
1. Generate a logo for the OAuth screen
2. Create a custom domain setup guide
3. Write privacy policy/terms templates

Just let me know!
