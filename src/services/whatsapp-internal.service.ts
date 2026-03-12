import { supabase } from '../lib/supabase';
import { WhatsAppConversation, WhatsAppMessage } from '../types/database';

export const WhatsAppInternalService = {
    /**
     * Fetch all active conversations
     */
    getConversations: async () => {
        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .select(`*`)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return []; // Replaced mock fallback with empty array to expose real error
        }
        return data;
    },

    /**
     * Load messages for a conversation
     */
    getMessages: async (conversationId: string) => {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data as WhatsAppMessage[];
    },

    /**
     * Mark conversation as read
     */
    markAsRead: async (conversationId: string) => {
        await supabase
            .from('whatsapp_conversations')
            .update({ unread_count: 0 })
            .eq('id', conversationId);
    },

    /**
     * Send a message (as Admin)
     */
    sendMessage: async (conversationId: string, content: string, replyToMessageId?: string, file?: File) => {
        // Fetch the target phone number for the conversation
        const { data: conv } = await supabase
            .from('whatsapp_conversations')
            .select('phone_number, user_id')
            .eq('id', conversationId)
            .single();

        if (!conv) throw new Error("Conversation not found");

        if (conv.user_id) {
            const { data: usage, error: usageError } = await supabase.rpc('check_and_log_whatsapp_usage', {
                p_user_id: conv.user_id,
                p_conversation_id: conversationId
            });

            if (usageError) {
                console.error('Usage check failed:', usageError);
                // We don't block if the RPC itself fails (safety fallback)
            } else if (usage && !usage.allowed) {
                const error = new Error(`WhatsApp limit reached (${usage.current_usage}/${usage.limit})`);
                (error as any).code = 'LIMIT_EXCEEDED';
                (error as any).details = usage;
                throw error;
            }
        }

        // Call the Edge Function to send the message securely
        const { data: session } = await supabase.auth.getSession();

        if (!session.session?.access_token) {
            throw new Error("User session is not strictly defined or missing access token.");
        }

        const bodyPayload: any = {
            toMobile: conv.phone_number,
            textBody: content,
            conversationId: conversationId
        };

        if (replyToMessageId) {
            bodyPayload.replyToMessageId = replyToMessageId;
        }

        if (file) {
            if (!session.session?.user?.id) throw new Error("No user id");

            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const path = `${session.session.user.id}/whatsapp-media/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('secure_documents')
                .upload(path, file);

            if (uploadError) {
                console.error("Upload error:", uploadError);
                throw new Error("Failed to upload the attached file.");
            }

            const { data: signedUrlData, error: signError } = await supabase.storage
                .from('secure_documents')
                .createSignedUrl(path, 3600);

            if (signError || !signedUrlData?.signedUrl) {
                 console.error("Sign error:", signError);
                 throw new Error("Failed to generate secure URL for file.");
            }

            bodyPayload.media = {
                 url: signedUrlData.signedUrl,
                 type: file.type.startsWith('image/') ? 'image' : 'document',
                 filename: file.name
            };
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-outbound`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
        });

        const textResponse = await response.text();
        let result = {};
        try {
            result = JSON.parse(textResponse);
        } catch {
            result = { raw: textResponse };
        }

        if (!response.ok) {
            const errPayload = result as any;
            throw new Error(errPayload.error || errPayload.message || errPayload.raw || "Failed to send message via Edge Function");
        }

        return result;
    },

    /**
     * DEV TOOL: Simulate an incoming user reply
     */
    simulateIncomingReply: async (conversationId: string, content: string) => {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .insert({
                conversation_id: conversationId,
                direction: 'inbound',
                type: 'text',
                content: { text: content },
                status: 'delivered'
            })
            .select()
            .single();

        if (error) throw error;

        // Trigger update triggers database side or manual
        await supabase
            .from('whatsapp_conversations')
            .update({
                last_message_at: new Date().toISOString(),
                unread_count: 1 // Increment simple logic (DB trigger handles real logic)
            })
            .eq('id', conversationId);

        return data;
    },

    /**
     * Create a new test conversation
     */
    createMockConversation: async (phone: string, name: string) => {
        // Check if exists
        const { data: existing } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('phone_number', phone)
            .single();

        if (existing) return existing;

        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .insert({
                phone_number: phone,
                status: 'active',
                // For now, we won't link a real user_id to avoid FK errors in mock mode
                // In production, we'd lookup the user profile here
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// --- MOCK DATA FOR OFF-LINE UI BUILDING ---
const MOCK_CONVERSATIONS: any[] = [
    {
        id: 'mock-1',
        phone_number: '+972501112222',
        unread_count: 2,
        last_message_at: new Date().toISOString(),
        status: 'active',
        user_profiles: { full_name: 'Danny Cohen (Mock)', email: 'danny@test.com' }
    },
    {
        id: 'mock-2',
        phone_number: '+972549998888',
        unread_count: 0,
        last_message_at: new Date(Date.now() - 86400000).toISOString(),
        status: 'bot_handling',
        user_profiles: { full_name: 'Sarah Levy (Mock)', email: 'sarah@test.com' }
    }
];
