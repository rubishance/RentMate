# RentMate - Smart Property Management

RentMate is a modern CRM and property management platform for landlords, featuring AI-powered contract scanning, automated rent tracking, and "Autopilot" maintenance.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- Supabase Project

### 2. Environment Setup
Create a `.env` file based on `.env.example`:
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Setup
Run migrations from `supabase/migrations` to set up the schema, triggers, and RPC functions.

### 4. ⚠️ CRITICAL: Auth Configuration
To ensure secure signups and social login flow:

1. **Email Confirmation**:
   - Go to **Authentication > Providers > Email**.
   - **ENABLE** "Confirm email".

2. **Social Logins (Google & Facebook)**:
   - Go to **Authentication > Providers**.
   - **ENABLE** Google and Facebook providers.
   - Enter your `Client ID` and `Client Secret` from the Google/Facebook Developer Consoles.
   - Configure the `Redirect URL` provided by Supabase in your social provider dashboard.

> **Note**: If email confirmation is DISABLED, users will be logged in immediately after signup without verifying their email.

### 5. Start Development
```bash
npm install
npm run dev
```

## 🤖 Autopilot Setup (Cron)
To enable daily automation (Lease expiry checks, etc.), run the SQL command found in `walkthrough.md`.
