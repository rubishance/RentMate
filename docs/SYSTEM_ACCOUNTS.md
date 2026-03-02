# RentMate System Services & Accounts Directory

This document serves as the master record of all third-party services, APIs, and hosting providers used to build, deploy, and maintain the RentMate application. 

**CRITICAL POLICY**: Always reference this document before executing manual deployments, database migrations, or token rotations to ensure you are operating within the correct environment.

---

## 1. Hosting & Deployment
### Netlify
* **Purpose:** Frontend hosting, CI/CD pipeline, Edge Functions, and Custom Domain routing (`rentmate.co.il`).
* **Primary Account Email:** `rubi@rentmate.co.il`
* **Project Name:** `whimsical-begonia-185f4c`
* **Important Note:** Do *not* use `rubi@mixum-re.co.il` or `rubishance@gmail.com` for Netlify CLI deploy commands targeting the production RentMate domain. Doing so will result in permission errors or silent deploy failures.

## 2. Backend & Database
### Supabase
* **Purpose:** PostgreSQL database, User Authentication, Storage Buckets (documents, media), and Deno Edge Functions.
* **Likely Accounts:** `rubi@rentmate.co.il` or `rubishance@gmail.com`
* **Key Env Variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## 3. Version Control & Source Code
### GitHub
* **Purpose:** Git repository hosting, source code management, and webhook triggers for Netlify deployments.
* **Repository:** `rubishance/RentMate`
* **Commit/Account Email:** `rubishance@gmail.com`

## 4. Artificial Intelligence
### OpenAI
* **Purpose:** Powers the interactive AI Chat Assistant and performs complex analysis on maintenance tickets and tenant inquiries.
* **Key Env Variables:** `OPENAI_API_KEY`

### Google Gemini
* **Purpose:** Advanced specialized document parsing, including intelligent utility bill scanning and extraction.
* **Key Env Variables:** `GEMINI_API_KEY`

## 5. Communications & CRM
### Resend
* **Purpose:** Transactional email delivery (Welcome emails to waitlist, tenant notifications, password resets, contact form submissions).
* **Key Env Variables:** `RESEND_API_KEY`

### Meta (WhatsApp Business API)
* **Purpose:** Automated inbound/outbound WhatsApp bot for tenant and owner support interactions.
* **Primary Account Email:** `rubi@rentmate.co.il` (Attached to RentMate Meta Business Portfolio)
* **Key Env Variables:** `WHATSAPP_VERIFY_TOKEN`, permanent access tokens in DB settings.

## 6. Third-Party Integrations
### Google Cloud (OAuth)
* **Purpose:** Enables "Sign in with Google" functionality and allows secure data exports to Google Drive/Docs.
* **Key Env Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
