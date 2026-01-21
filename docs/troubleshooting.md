# Troubleshooting Guide

## Login & Account
### I can't log in. What should I do?
- Check your internet connection.
- Ensure you are using the correct email and password.
- If you forgot your password, click "Forgot Password" on the login screen.
- If you are still stuck, try refreshing the page (F5 or Ctrl+R).

### How do I reset my password?
1. On the login page, click "Forgot Password?".
2. Enter your email address.
3. Check your inbox for a reset link.
4. Follow the link to set a new password.

## Application Issues
### The app is running in "Demo Mode".
If you see a "Demo Mode" warning or cannot save data, it usually means the backend connection is not configured. Please contact support (or the developer) to check the Supabase keys.

### I can't upload documents.
- Check the file size (limit is usually 5MB).
- Ensure the file type is supported (PDF, JPG, PNG).
- If the upload fails, try renaming the file to something simple (english letters only) and try again.

### Calculations seem wrong.
- Verify that you entered the correct "Base Index" for the contract start date.
- specific details: The app uses the known CPI at the time of payment. Ensure your "Payment Date" is correct.
