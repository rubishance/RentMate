# Pre-Deployment Security Audit Report: Edge Functions (Staging)

**Target Environment:** RentMate Staging (`tipnjnfbbnbskdlodrww`)
**Scope:** `supabase/functions/*`
**Date:** April 2026
**Status:** **[ACTION REQUIRED] - Critical vulnerabilities identified.**

---

## Executive Summary

A comprehensive security audit of the Supabase Edge Functions was conducted prior to staging deployment. The audit focused on Secret Exposure, Admin Client (`service_role_key`) abuse, Input Validation, and Information Leakage. 

While environment variables are correctly managed avoiding hardcoded secrets, **Critical and High severity Authorization bypasses (IDOR)** were discovered in functions utilizing the `service_role_key`. Multiple functions fail to assert the identity of the caller against the data being manipulated.

---

## Detailed Findings & Remediation Steps

### 1. `generate-protocol-pdf`
*   **Risk Level:** 🔴 **CRITICAL**
*   **Vulnerability Type:** Unauthenticated Access / IDOR / Admin Client Abuse
*   **Description:** The function does **not** check the `Authorization` header or validate a JWT (`auth.getUser()`). It immediately initializes an Admin Client (`SUPABASE_SERVICE_ROLE_KEY`) and retrieves a `protocolId` passed directly from the unsanitized POST body. Any unauthenticated anonymous user on the internet can POST to this endpoint with a guessed or known UUID, triggering the generation of a PDF for another user's protocol and saving it into their storage.
*   **Remediation Action:**
    1. Implement JWT extraction and validation at the top of the function.
    2. Instead of using `service_role_key` to fetch the protocol, use the authenticated user's Anon Client so RLS automatically scopes the query, OR manually assert `if (property.user_id !== user.id) throw new Error(...)`.

### 2. `send-whatsapp-outbound`
*   **Risk Level:** 🟠 **HIGH**
*   **Vulnerability Type:** Insecure Direct Object Reference (IDOR)
*   **Description:** The function correctly checks that a JWT is present and belongs to *some* valid user. However, it takes `conversationId` and `toMobile` blindly from the payload and uses the `service_role_key` to inject a message instance into that `conversationId` in the database. A malicious authenticated user can provide the `conversationId` of *another* user, spoofing outbound messages under the context of someone else's property, and hijacking the conversation history.
*   **Remediation Action:**
    1. Validate that the authenticated `user.id` is the owner of the `conversationId` before invoking the WhatsApp Graph API or inserting into the DB.
    2. Query `whatsapp_conversations` as the authenticated user (via Anon key) to let RLS naturally block the action if they do not own the conversation.

### 3. `chat-support`
*   **Risk Level:** 🟡 **MEDIUM / ACCEPTABLE**
*   **Vulnerability Type:** Broad Service Client Architecture
*   **Description:** The AI chat function routes its data-fetching tools using `SUPABASE_SERVICE_ROLE_KEY`. However, the logic internally wraps queries with `.eq('user_id', userId)` where `userId` is strictly extracted from the JWT. The `debugEntity` tool securely checks `is_admin` or `role === 'admin'` before allowing arbitrary table scanning.
*   **Remediation Action:**
    *   No immediate action required. The manual mapping of `userId` mitigates the `service_role` risk. However, it is highly recommended to refactor these data-fetching tools (e.g., `searchContracts`, `listProperties`) to simply use the Anon key client hydrated with the user's JWT so RLS acts as the ultimate safety net.

### 4. `export-crm-data`
*   **Risk Level:** 🟢 **LOW / PASS**
*   **Vulnerability Type:** Information Disclosure (Mitigated)
*   **Description:** Relies on the Admin Client to bypass RLS and aggregate system-wide CRM data. However, it securely verifies `role === 'admin' || is_super_admin === true` for the calling `user.id` before executing the export. 
*   **Remediation Action:**
    *   Ensure error blocks do not return verbose stack traces. Currently, error handling is generally safe.

### 5. `analyze-bill`
*   **Risk Level:** 🟢 **LOW / PASS**
*   **Vulnerability Type:** Secret Management & Intake
*   **Description:** All API keys (`OPEN_AI_KEY`, `SUPABASE_URL`) are correctly mapped to `Deno.env.get()`. JWT validation correctly maps to the executing user before invoking the AI summarization logic.
*   **Remediation Action:**
    *   None.

---

## Universal Recommendations for Edge Functions

1.  **Enforce RLS Through Scoped Clients:** Stop using `SUPABASE_SERVICE_ROLE_KEY` unless absolutely necessary (e.g., updating user metadata, interacting with external webhooks natively). Create clients using:
    ```javascript
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    ```
    This ensures all DB calls respect Row Level Security (RLS).
2.  **Standardized Error Responses:** Centralize error responses to avoid accidentally dumping DB schema structures or API stack traces into the `catch (e) { return Response(e.message) }` blocks.

---
**Prepared By:** AntiGravity (Security Auditor)
