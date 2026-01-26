/**
 * TEST SCRIPT: Inbound Email Forwarding
 * Verifies that forwarding an email to log@rentmate.co.il 
 * correctly attributes it to the original sender if done by an admin.
 */

const SAMPLE_FORWARDED_TEXT = `
---------- Forwarded message ---------
From: Client Name <client@example.com>
Date: Mon, Jan 26, 2026 at 10:00 AM
Subject: Question about rent
To: Admin Name <admin@rentmate.co.il>

Hello, can you help me with the rent payment?
`;

function testForwardingLogic(text, fromEmail, isAdmin) {
    console.log(`Test: From=${fromEmail}, isAdmin=${isAdmin}`);

    let targetUserEmail = fromEmail;

    if (isAdmin && text.includes('---------- Forwarded message ---------')) {
        const forwardMatch = text.match(/From:\s*([^<\n\r]+)\s*<([^>\n\r]+)>/i);
        if (forwardMatch && forwardMatch[2]) {
            targetUserEmail = forwardMatch[2].toLowerCase().trim();
        }
    }

    console.log(`Resulting Target User: ${targetUserEmail}`);
    return targetUserEmail;
}

console.log("🚀 Testing Email Forwarding Attribution...\n");

// Scenario 1: Normal user sending to log@
testForwardingLogic("Just a regular email", "user@gmail.com", false);

// Scenario 2: Admin forwarding a client email
const result = testForwardingLogic(SAMPLE_FORWARDED_TEXT, "admin@rentmate.co.il", true);
if (result === "client@example.com") {
    console.log("✅ Success: Admin forward attributed to client@example.com");
} else {
    console.log("❌ Failure: Admin forward attribution failed");
}

// Scenario 3: Admin sending a non-forwarded email
testForwardingLogic("Hey team, check this out", "admin@rentmate.co.il", true);
