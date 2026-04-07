// smoke_test_pii.ts
import { AnalyticsLogger } from '../supabase/functions/_shared/logger.ts';
import { getCorsHeaders, validateOrigin } from '../supabase/functions/_shared/cors.ts';

async function runTests() {
    console.log("=== PHASE 1: CORS validation ===");
    const mockedReq1 = new Request('https://api.rentmate.co.il', {
        headers: new Headers({ 'Origin': 'https://rentmate.co.il' })
    });
    console.log("Origin rentmate.co.il allowed?", validateOrigin(mockedReq1));

    const mockedReq2 = new Request('https://api.rentmate.co.il', {
        headers: new Headers({ 'Origin': 'https://malicious-site.com' })
    });
    console.log("Origin malicious-site.com allowed?", validateOrigin(mockedReq2));

    console.log("\n=== PHASE 2: PII Masking ===");
    // Force Deno env for local run
    const logger = new AnalyticsLogger("TestResource");
    
    const fakeMetadata = {
        tenant_name: "John Doe",
        email: "john@example.com",
        phone: "+972501234567",
        id_number: "300400500",
        password: "supersecretpassword",
        bank_account: {
           bank_name: "Leumi",
           iban: "IL1920392309203"
        },
        address: "123 Main St, TLV"
    };

    console.log("Original Data:", fakeMetadata);

    // Using the logger info directly
    console.log("\nCalling logger.info().... Check the console output directly to see if it is redacted.");
    logger.info("Testing User PII Masking", fakeMetadata);

    console.log("\n✅ Test Complete.");
}

runTests();
