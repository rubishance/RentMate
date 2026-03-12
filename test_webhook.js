const body = {
    object: "whatsapp_business_account",
    entry: [{
        id: "123",
        changes: [{
            value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "16505551111", phone_number_id: "123456123" },
                contacts: [{ profile: { name: "test user name" }, wa_id: "16315551181" }],
                messages: [{ from: "16315551181", id: "ABGGFlA5Fpa", timestamp: "1504902988", type: "text", text: { body: "this is a test webhook message from script" } }]
            }
        }]
    }]
};

fetch('https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/handle-whatsapp-inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
})
    .then(async res => {
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
    })
    .catch(console.error);
