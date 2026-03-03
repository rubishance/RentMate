---
name: rentmate-product-knowledge
description: Domain knowledge, business logic, feature rules, and brand guidelines specific to the RentMate application.
---

# RentMate Product Knowledge

This skill provides essential context about RentMate's business logic, core features, brand assets, and platform-specific requirements. **Always apply these principles when making structural, UI, or logical changes to the system.**

## 1. Core Domain Entities & Logic

*   **Owners:** The primary persona using the platform to manage properties, contracts, and tenants. Support is provided to owners via the WhatsApp Business API.
*   **Contracts:** Agreements linking properties and tenants.
    *   *Payments:* Financial tracking is granular. Per-contract breakdowns of expected and pending payments are displayed only when multiple contracts are associated with a user/asset.
    *   *Option Periods:* Contracts can have multiple option periods. Notice restrictions and reminder days are configured **per-option period** entirely. (Do not use the deprecated generic `option_notice_days` field).
*   **CRM & Communications:** Automated communications (like Welcome Emails) are bilingual (Hebrew & English) and executed via Supabase Edge Functions with Resend. All outbound communications must be logged to the `crm_interactions` table.

## 2. Branding & Assets

*   **Mascot:** **Renty** is the official mascot. He is used across onboarding, waiting lists, marketing posts (Facebook/Instagram), and system updates. Ensure brand consistency through his upbeat, helpful tone.
*   **Primary Tagline:** "ניהול נכסים וחוזים מתקדם עם כלי A.I." (Advanced property and contract management with A.I. tools).
*   **Responsive UI Assets:** Major landing/marketing pages (like the Coming Soon page) use tailored images—distinct variations are served for mobile versus PC to ensure the best display. Scroll animations (Framer Motion) should be used thoughtfully to create a premium feel.

## 3. Localization & Legal (Crucial)

*   **RTL & Bilingual Support:** RentMate is proudly bilingual.
    *   Hebrew is the primary language and requires **RTL (Right-to-Left)** layout conventions. Always utilize logical CSS properties (e.g., `start` and `end` instead of `left` and `right`) to ensure flawless flipping between Hebrew and English layouts.
    *   Auth keys (e.g., `auth_sign_in`) are strictly managed and duplicated between EN/HE translation dictionaries.
*   **Mandatory Legal Disclaimer:** For compliance in Hebrew text, all legal and landing pages (ToS, Privacy Policy, Coming Soon) MUST include the Israeli gender inclusivity disclaimer indicating that the masculine form is used for convenience only and refers to both genders.
*   **Widget Rules:** The general user chatbot must be strictly disabled/hidden on specific immersive and legal pages (e.g., Terms of Service, Privacy Policy) to minimize distraction.
