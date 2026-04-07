# RentMate Security Policy

## Security Contact Information
For any security-related inquiries or vulnerability reports, please contact the development team through our official channels.

---

## Recent Security Audits (2026)

### Edge Function Pre-Deployment Audit & Remediation (April 2026)

During a comprehensive security audit of the `supabase/functions` directory before deploying to the Staging environment (`tipnjnfbbnbskdlodrww`), two critical authorization vulnerabilities were identified and successfully remediated.

**Vulnerability 1: Unauthenticated IDOR in `generate-protocol-pdf`**
*   **Discovery**: The function `generate-protocol-pdf` accepted a `protocolId` directly from an unauthenticated POST payload. Utilizing the `SUPABASE_SERVICE_ROLE_KEY`, it generated a PDF and stored it under the property owner's bucket. This allowed any anonymous user on the internet to sequentially guess UUIDs and force PDF generation for private protocols.
*   **Risk**: **CRITICAL** (Unauthenticated Access + External Storage Manipulation)
*   **Resolution**: 
    1. Added strict JWT extraction via `req.headers.get('Authorization')`.
    2. Enforced authentication explicitly via `supabase.auth.getUser()`.
    3. Verified data ownership after retrieving the protocol using the service role (`property.user_id !== user.id`), safely returning a `403 Forbidden` response for unauthorized attempts.

**Vulnerability 2: Authorized IDOR in `send-whatsapp-outbound`**
*   **Discovery**: While the function confirmed a valid user JWT existed, it did not tie the provided `conversationId` to the executing `user.id`. The function then utilized the `service_role_key` to append outbound message history into the global `whatsapp_conversations` table. This introduced a logic bypass where User A could append records to User B's conversation and spoof outbound traffic.
*   **Risk**: **HIGH** (Insecure Direct Object Reference)
*   **Resolution**:
    1. Instantiated a secondary Supabase Auth Client utilizing the Anon Key *and* the caller's JWT: `{ global: { headers: { Authorization: authHeader } } }`.
    2. Queried the `whatsapp_conversations` table using this scoped client prior to invoking the WhatsApp Graph API. RLS successfully blocked the query if the user did not own the conversation, allowing the function to cleanly exit with `403 Forbidden`.

## Automated Protection

All RentMate functions are continuously monitored for:
1. Secret exposure (Hardcoded keys are strictly forbidden; `Deno.env.get` mandatory).
2. Proper application of RLS and Auth scoping when processing mutations.
3. Separation between Service Role operations (systematic metadata updates) and Anon Role operations (user-scoped actions).
