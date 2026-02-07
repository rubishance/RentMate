import { supabase } from '../lib/supabase';
import { WhatsAppConversation, WhatsAppMessage } from '../types/database';

export const WhatsAppInternalService = {
    /**
     * Fetch all active conversations
     */
    getConversations: async () => {
        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .select(`
                *,
                user_profiles!whatsapp_conversations_user_id_fkey (
                    full_name,
                    email
                )
            `)
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            // Fallback for dev/offline mode (Mock Data)
            return MOCK_CONVERSATIONS;
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
     * Send a message (as Admin)
     */
    sendMessage: async (conversationId: string, content: string) => {
        // 0. Check and Log Usage
        // Fetch the user_id for this conversation to attribute usage
        const { data: conv } = await supabase
            .from('whatsapp_conversations')
            .select('user_id')
            .eq('id', conversationId)
            .single();

        if (conv?.user_id) {
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

        // 1. Insert message
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .insert({
                conversation_id: conversationId,
                direction: 'outbound',
                type: 'text',
                content: { text: content },
                status: 'read' // Auto-read for admin messages
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Update conversation timestamp
        await supabase
            .from('whatsapp_conversations')
            .update({
                last_message_at: new Date().toISOString(),
                status: 'active'
            })
            .eq('id', conversationId);

        return data;
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
