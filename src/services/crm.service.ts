import { supabase } from '../lib/supabase';

export type CRMInteractionType = 'note' | 'call' | 'email' | 'support_ticket' | 'chat';

export interface CRMInteraction {
    id: number;
    user_id: string;
    admin_id: string | null;
    type: CRMInteractionType;
    title: string | null;
    content: string | null;
    status: string;
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

    async updateInteraction(id: number, updates: Partial<CRMInteraction>) {
        const { data, error } = await supabase
            .from('crm_interactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as CRMInteraction;
    },

    async deleteInteraction(id: number) {
        const { error } = await supabase
            .from('crm_interactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getClientSummary(userId: string) {
        // Get user profile, invoices, and interactions in one flow or separate calls
        const [profile, invoices, interactions] = await Promise.all([
            supabase.from('user_profiles').select('*').eq('id', userId).single(),
            supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            this.getInteractions(userId)
        ]);

        if (profile.error) throw profile.error;
        if (invoices.error) throw invoices.error;

        return {
            profile: profile.data,
            invoices: invoices.data,
            interactions
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
    }
};
