
/**
 * WhatsApp External Service
 * Handles direct communication with Meta's Graph API.
 * 
 * SETUP REQUIRED:
 * 1. Get a Meta Business Account
 * 2. Create a System User or Permanent Access Token
 * 3. Add the token and phone number ID to your environment or database settings
 */

const META_GRAPH_URL = 'https://graph.facebook.com/v18.0';

// PLACEHOLDERS - To be replaced with real keys or fetched from Supabase 'system_settings'
const WHATSAPP_PHONE_NUMBER_ID = 'PLACEHOLDER_PHONE_ID';
const WHATSAPP_ACCESS_TOKEN = 'PLACEHOLDER_ACCESS_TOKEN';

export const WhatsAppExternalService = {

    /**
     * Send a text message via Meta Graph API
     */
    sendTextMessage: async (toMobile: string, textBody: string) => {
        if (WHATSAPP_ACCESS_TOKEN === 'PLACEHOLDER_ACCESS_TOKEN') {
            console.warn('WhatsApp External Service: Missing Access Token. Message not sent to Meta.');
            return { error: 'Configuration Missing', success: false };
        }

        const url = `${META_GRAPH_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toMobile,
            type: 'text',
            text: { preview_url: false, body: textBody }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Meta API Error:', data);
                throw new Error(data.error?.message || 'Unknown Meta API Error');
            }

            return { success: true, messageId: data.messages?.[0]?.id };

        } catch (error) {
            console.error('WhatsApp Send Failed:', error);
            throw error;
        }
    },

    /**
     * Send a template message (Required for starting conversations outside 24h window)
     */
    sendTemplateMessage: async (toMobile: string, templateName: string, languageCode = 'he', components: any[] = []) => {
        if (WHATSAPP_ACCESS_TOKEN === 'PLACEHOLDER_ACCESS_TOKEN') return;

        const url = `${META_GRAPH_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            to: toMobile,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            }
        };

        // ... Fetch logic similar to above
        return await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(res => res.json());
    }
};
