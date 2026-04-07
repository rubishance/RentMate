// _shared/crypto.ts
// Handles Application-Level Encryption natively using Deno Web Crypto API

async function getEncryptionKey(): Promise<CryptoKey> {
    const rawKeyStr = Deno.env.get('ENCRYPTION_KEY');
    if (!rawKeyStr) {
        throw new Error("ENCRYPTION_KEY is missing from environment secrets.");
    }
    
    // Ensure the key is exactly 32 bytes for AES-256
    let keyBytes: Uint8Array;
    if (rawKeyStr.length === 32) {
        keyBytes = new TextEncoder().encode(rawKeyStr);
    } else {
        // Fallback: hash the string to get a 32-byte key if it's not exactly 32 chars
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKeyStr));
        keyBytes = new Uint8Array(hash);
    }

    return await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

// Converts a Uint8Array to a Base64 string natively
function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Converts a Base64 string to a Uint8Array natively
function base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encrypts a plaintext string and returns a Base64 payload containing IV and Ciphertext
 */
export async function encryptField(plainText: string | null | undefined): Promise<string | null> {
    if (!plainText) return plainText as string | null;

    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV for AES-GCM
    const encodedText = new TextEncoder().encode(plainText);

    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedText
    );

    const ivBase64 = bufferToBase64(iv.buffer);
    const cipherBase64 = bufferToBase64(cipherBuffer);

    // Format: "enc:v1:IV_BASE64:CIPHER_BASE64"
    return `enc:v1:${ivBase64}:${cipherBase64}`;
}

/**
 * Decrypts an encrypted payload. If the string is not encrypted, returns it safely.
 */
export async function decryptField(encryptedPayload: string | null | undefined): Promise<string | null> {
    if (!encryptedPayload) return encryptedPayload as string | null;
    
    // Pass-through if not an encrypted format
    if (!encryptedPayload.startsWith('enc:v1:')) {
        return encryptedPayload;
    }

    const parts = encryptedPayload.split(':');
    if (parts.length !== 4) {
        throw new Error("Invalid encryption payload format");
    }

    const ivStr = parts[2];
    const cipherStr = parts[3];

    const iv = base64ToBuffer(ivStr);
    const ciphertext = base64ToBuffer(cipherStr);
    const key = await getEncryptionKey();

    try {
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.error("Decryption failed:", error);
        return "[Decryption Failed]";
    }
}
