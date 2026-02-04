/**
 * WhatsApp Service (Mock)
 * Handles logic for generating "One-Tap" WhatsApp deep links.
 */

export const WhatsAppService = {
    /**
     * Generates a WhatsApp deep link with pre-filled text.
     * @param phoneNumber Tenant's phone number (e.g. 972541234567)
     * @param message The text to send
     */
    generateLink: (phoneNumber: string, message: string) => {
        const encodedMessage = encodeURIComponent(message);
        // WhatsApp deep link format: rules apply (no spaces in phone, etc)
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    },
};
