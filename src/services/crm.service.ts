import { supabase } from '../lib/supabase';

export type CRMInteractionType = 'note' | 'call' | 'email' | 'support_ticket' | 'chat' | 'human_chat' | 'whatsapp' | 'error_report';

export interface CRMInteraction {
    id: number | string;
    user_id: string;
    admin_id: string | null;
    type: CRMInteractionType;
    title: string | null;
    content: string | null;
    status: string;
    metadata?: {
        external_link?: string;
        phone_number?: string;
        category?: string;
        [key: string]: any;
    };
    created_at: string;
}

export const crmService = {
    async getInteractions(userId: string) {
        const { data, error } = await supabase
            .from('crm_interactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as CRMInteraction[];
    },

    async addInteraction(interaction: Omit<CRMInteraction, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('crm_interactions')
            .insert([interaction])
            .select()
            .single();

        if (error) throw error;
        return data as CRMInteraction;
    },

    async updateInteraction(id: number | string, updates: Partial<CRMInteraction>) {
        const { data, error } = await supabase
            .from('crm_interactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as CRMInteraction;
    },

    async deleteInteraction(id: number | string) {
        const { error } = await supabase
            .from('crm_interactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getClientSummary(userId: string) {
        // Get user profile, invoices, interactions, AI conversations, support tickets, human chats, AND WhatsApp
        const [profile, invoices, interactions, aiConversations, supportTickets, humanConversations, whatsappConversations] = await Promise.all([
            supabase.from('user_profiles').select('*').eq('id', userId).single(),
            supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            this.getInteractions(userId),
            supabase.from('ai_conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
            supabase.from('support_tickets').select('*, ticket_analysis(*)').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('human_conversations').select('*, human_messages(*)').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('whatsapp_conversations').select('*, whatsapp_messages(*)').eq('user_id', userId).order('last_message_at', { ascending: false }),
            supabase.from('error_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        ]);

        if (profile.error) throw profile.error;
        if (invoices.error) throw invoices.error;

        // Transform WhatsApp Conversations into CRM format
        const whatsappInteractions: CRMInteraction[] = (whatsappConversations.data || []).map(conv => ({
            id: conv.id,
            user_id: conv.user_id,
            admin_id: null,
            type: 'whatsapp',
            title: `WhatsApp Chat (${conv.phone_number})`,
            content: `WhatsApp conversation with ${conv.whatsapp_messages?.length || 0} messages.`,
            status: conv.status,
            metadata: {
                messages: conv.whatsapp_messages?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
                phone_number: conv.phone_number,
                conversation_id: conv.id,
                unread_count: conv.unread_count
            },
            created_at: conv.created_at // or last_message_at
        }));

        // Transform AI conversations into a CRM-compatible format
        const botInteractions: CRMInteraction[] = (aiConversations.data || []).map(conv => ({
            id: conv.id,
            user_id: conv.user_id,
            admin_id: null,
            type: 'chat',
            title: conv.title || 'AI Chat Session',
            content: `AI Conversation with ${conv.messages?.length || 0} messages.`,
            status: 'closed',
            metadata: {
                messages: conv.messages,
                total_cost: conv.total_cost_usd,
                conversation_id: conv.id
            },
            created_at: conv.created_at
        }));

        // Transform Human Conversations into CRM format
        const humanChatInteractions: CRMInteraction[] = (humanConversations.data || []).map(conv => ({
            id: conv.id,
            user_id: conv.user_id,
            admin_id: conv.admin_id,
            type: 'human_chat',
            title: 'Live Support Session',
            content: `Human support session with ${conv.human_messages?.length || 0} messages. Status: ${conv.status}`,
            status: conv.status,
            metadata: {
                messages: conv.human_messages?.map((m: any) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.created_at
                })),
                conversation_id: conv.id
            },
            created_at: conv.created_at
        }));

        // Transform Support Tickets into CRM format
        const ticketInteractions: CRMInteraction[] = (supportTickets.data || []).map(ticket => ({
            id: ticket.id,
            user_id: ticket.user_id,
            admin_id: ticket.assigned_to,
            type: 'support_ticket',
            title: ticket.title,
            content: ticket.description,
            status: ticket.status,
            metadata: {
                priority: ticket.priority,
                category: ticket.category,
                resolution_notes: ticket.resolution_notes,
                ticket_id: ticket.id,
                ai_analysis: ticket.ticket_analysis?.[0] || null,
                auto_reply_draft: ticket.auto_reply_draft
            },
            created_at: ticket.created_at
        }));

        // Transform Error Logs into CRM format
        const errorInteractions: CRMInteraction[] = (arguments[7]?.data || []).map((err: any) => ({
            id: err.id,
            user_id: err.user_id,
            admin_id: null,
            type: 'error_report',
            title: 'System Error Reported',
            content: err.message,
            status: err.is_resolved ? 'resolved' : 'open',
            metadata: {
                error_id: err.id,
                stack: err.stack,
                route: err.route,
                environment: err.environment,
                metadata: err.metadata
            },
            created_at: err.created_at
        }));

        // Merge and sort all interactions (Manual + Bot + Tickets + Human Chats + WhatsApp)
        const unifiedInteractions = [
            ...interactions,
            ...botInteractions,
            ...humanChatInteractions,
            ...ticketInteractions,
            ...whatsappInteractions,
            ...errorInteractions
        ].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return {
            profile: profile.data,
            invoices: invoices.data,
            interactions: unifiedInteractions
        };
    },

    async exportToGoogleSheets(targetUserId: string, clientName: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-crm-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ targetUserId, clientName }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Export failed');
        return result.webViewLink as string;
    },

    // --- Human Chat Methods ---

    async getActiveHumanChat(userId: string) {
        const { data, error } = await supabase
            .from('human_conversations')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
        return data; // Returns null if no active chat
    },

    async startHumanChat(userId: string, adminId: string) {
        // 1. Check if active exists
        const existing = await this.getActiveHumanChat(userId);
        if (existing) return existing;

        // 2. Create new
        const { data, error } = await supabase
            .from('human_conversations')
            .insert({
                user_id: userId,
                admin_id: adminId,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async closeHumanChat(conversationId: string) {
        const { error } = await supabase
            .from('human_conversations')
            .update({ status: 'closed' })
            .eq('id', conversationId);

        if (error) throw error;
    },

    async sendHumanMessage(conversationId: string, senderId: string, content: string, role: 'admin' | 'user') {
        const { data, error } = await supabase
            .from('human_messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                role,
                content
            })
            .select()
            .single();

        if (error) throw error;

        // Update conversation last_message_at
        await supabase
            .from('human_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);

        return data;
    },

    async getHumanMessages(conversationId: string) {
        const { data, error } = await supabase
            .from('human_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    // --- Admin Dashboard Methods ---

    async getAllActiveHumanChats() {
        const { data, error } = await supabase
            .from('human_conversations')
            .select(`
                *,
                user:user_profiles (
                    id,
                    full_name,
                    email
                )
            `)
            .eq('status', 'active')
            .order('last_message_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateClientPlan(userId: string, planId: string, planName: string) {
        const { error } = await supabase
            .from('user_profiles')
            .update({
                plan_id: planId
            })
            .eq('id', userId);

        if (error) throw error;
    },

    async reassignInteraction(id: string | number, type: string, targetEmail: string) {
        // 1. Resolve Target User
        const { data: targetUser, error: userError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', targetEmail.trim().toLowerCase())
            .single();

        if (userError || !targetUser) throw new Error(`Target user not found with email: ${targetEmail}`);

        // 2. Identify Table based on Type
        let table = 'crm_interactions';
        if (type === 'support_ticket') table = 'support_tickets';
        if (type === 'chat' || type === 'ai_chat') table = 'ai_conversations';
        if (type === 'human_chat') table = 'human_conversations';
        if (type === 'whatsapp') table = 'whatsapp_conversations';

        // 3. Update the Record
        const { error: updateError } = await supabase
            .from(table)
            .update({ user_id: targetUser.id })
            .eq('id', id);

        if (updateError) throw updateError;
        return targetUser.id;
    },

    async getSubscriptionPlans() {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('price_monthly', { ascending: true });

        if (error) throw error;
        return data;
    }
};
