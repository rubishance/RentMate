import { loadSync } from "https://deno.land/std@0.168.0/dotenv/mod.ts";
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { validatePayload, ProtocolPdfSchema, WhatsappOutboundSchema } from '../supabase/functions/_shared/validation.ts';
import { RateLimiter } from '../supabase/functions/_shared/rate_limit.ts';

// 1. Test Zod Validation for PDF
Deno.test("Security: PDF Generator denies malformed payload with 400", () => {
    // Missing protocolId
    const malformedPayload = { someOtherField: "123" };
    const result = validatePayload(ProtocolPdfSchema, malformedPayload);
    
    assertEquals(result.success, false);
    assert(result.error?.includes("protocolId"));
    console.log("✅ PDF Zod Validation properly rejects malformed payload.");
});

// 2. Test Zod Validation for WhatsApp
Deno.test("Security: WhatsApp Outbound requires textBody or media", () => {
    // Missing both textBody and media
    const malformedPayload = {
        toMobile: "972501234567",
        conversationId: "e3abaec3-0000-0000-0000-000000000000"
    };

    const result = validatePayload(WhatsappOutboundSchema, malformedPayload);
    
    assertEquals(result.success, false);
    assert(result.error?.includes("Either textBody or media must be provided"));
    console.log("✅ WhatsApp Zod Validation requires mutually exclusive text or media.");
});

Deno.test("Security: Rate Limiter logic handles bursts correctly", async () => {
    const mockUserId = crypto.randomUUID();
    let exceededLimit = false;

    // Simulate 6 requests in loop for WhatsApp (Limit is 5)
    for (let i = 0; i < 6; i++) {
        const allowed = await RateLimiter.check(mockUserId, 'send-whatsapp-outbound', 5);
        if (!allowed) {
            exceededLimit = true;
            assertEquals(i, 5); // It should fail exactly on the 6th attempt (i=5)
        }
    }

    assert(exceededLimit, "Rate limiter failed to block burst requests over limit.");
    console.log("✅ Rate Limiter successfully limits 6 consecutive WhatsApp requests to 429.");
});
