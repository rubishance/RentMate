require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  console.error("Missing Supabase URL in .env");
  process.exit(1);
}

const functionUrl = `${supabaseUrl}/functions/v1/handle-whatsapp-inbound`;

const fakePayload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1234567890",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "972559419550", // RentMate Number
              "phone_number_id": "12345678910"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Reuven Test User"
                },
                "wa_id": "972503602000" // User's personal number
              }
            ],
            "messages": [
              {
                "from": "972503602000",
                "id": "wamid.HBgMOTcyNTAzNjAyMDAwFQIAEhgUM0EwQjk5Rjk5NzlEQzRFMEY5NDgA",
                "timestamp": Math.floor(Date.now() / 1000).toString(),
                "text": {
                  "body": "This is a test message from diagnostic script."
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

async function testWebhook() {
  console.log(`Sending fake Meta Webhook payload to: ${functionUrl}`);
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(fakePayload)
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
  } catch (error) {
    console.error("Failed to send request:", error);
  }
}

testWebhook();
