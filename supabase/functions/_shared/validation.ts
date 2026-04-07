import { z } from 'https://esm.sh/zod@3.22.4';

export const ChatSupportSchema = z.object({
  message: z.string().min(1).max(2000).strip(),
  conversationId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  language: z.string().max(10).optional(),
});

export const WhatsappOutboundSchema = z.object({
  toMobile: z.string().min(8).max(20).strip(),
  textBody: z.string().max(4000).optional().strip(),
  conversationId: z.string().uuid(),
  replyToMessageId: z.string().optional(),
  media: z.object({
    type: z.enum(['image', 'document']),
    url: z.string().url(),
    filename: z.string().max(100).optional().strip()
  }).optional()
}).refine(data => data.textBody || data.media, {
  message: "Either textBody or media must be provided",
  path: ["textBody"]
});

export const ProtocolPdfSchema = z.object({
  protocolId: z.string().uuid()
});

export function validatePayload<T>(schema: z.ZodSchema<T>, payload: any) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      error: `Validation Error: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    };
  }
  return {
    success: true,
    data: result.data as T
  };
}
