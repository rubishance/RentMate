---
name: supabase-expert
description: Supabase specific patterns, Row Level Security (RLS), Edge Functions, Authentication, and Realtime subscriptions.
---

# Supabase Expert Guidelines

This skill defines the mandatory practices when working with Supabase (`@supabase/supabase-js`) in the RentMate ecosystem.

## 1. Row Level Security (RLS)
*   **Mandatory:** ALL tables must have RLS enabled.
*   **Policies:** Write explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
*   **Context:** Use `auth.uid()` to ensure users (Owners or Tenants) can only access their specific data. Do not bypass RLS from the client.

## 2. Supabase Edge Functions
*   **Runtime:** Deployed via Deno. 
*   **Third-party Services:** Use edge functions to isolate secure logic like Resend (Welcome Emails), Stripe Webhooks, or WhatsApp Business interactions.
*   **Logging:** All interaction and system events originating from edge functions should be saved to the database (e.g., `crm_interactions`).
*   **CORS:** Always explicitly handle CORS headers (`Access-Control-Allow-Origin`) in Edge Functions invoked from the web client.

## 3. Authentication & Realtime
*   **Auth Flow:** Handled via standard Supabase Auth methods. Implement robust localized error handling (Hebrew/English translation keys).
*   **Realtime Subscriptions:** Limit channel subscriptions to necessary payload shapes/events (`INSERT`, `UPDATE`) to optimize websocket traffic. Consistently clean up internal state and subscriptions on component unmount.
