import { supabase } from '../lib/supabase';

export interface UserScoreBreakdown {
    totalScore: number;
    details: {
        properties: number;
        contracts: number;
        maintenance: number;
        intent: number;
    };
}

class UserScoringService {
    private readonly SCORING_WEIGHTS = {
        PROPERTY: 10,
        CONTRACT: 30, // High value
        MAINTENANCE: 15,
        INTENT_CLICK: 10,
        PRICING_VIEW: 5
    };

    private readonly UPSELL_THRESHOLD = 50;
    private readonly STORAGE_KEY = 'rentmate_user_score_cache';

    /**
     * Calculates the user's engagement score based on their portfolio depth and intent signals.
     */
    async calculateScore(userId: string): Promise<UserScoreBreakdown> {
        try {
            // 1. Fetch Counts (Depth)
            const stats = await this.fetchUserStats(userId);

            // 2. Fetch Intent Signals (Local only for now to save DB calls, or could be DB logged)
            const intentScore = this.getLocalIntentScore();

            // 3. Calculate Weighted Score
            const details = {
                properties: stats.properties * this.SCORING_WEIGHTS.PROPERTY,
                contracts: stats.contracts * this.SCORING_WEIGHTS.CONTRACT,
                maintenance: stats.maintenance * this.SCORING_WEIGHTS.MAINTENANCE,
                intent: intentScore
            };

            const totalScore = Object.values(details).reduce((a, b) => a + b, 0);

            return { totalScore, details };
        } catch (error) {
            console.error('Error calculating user score:', error);
            return { totalScore: 0, details: { properties: 0, contracts: 0, maintenance: 0, intent: 0 } };
        }
    }

    /**
     * Checks if the user qualifies for the "Pro Manager" upsell.
     */
    async shouldShowUpsell(userId: string, currentPlan: string): Promise<boolean> {
        // Only target Free/Solo users
        if (currentPlan && currentPlan.toLowerCase().includes('mate') || currentPlan.toLowerCase().includes('master')) {
            return false;
        }

        const score = await this.calculateScore(userId);
        return score.totalScore >= this.UPSELL_THRESHOLD;
    }

    /**
     * Logs an intent signal (e.g. user clicked a locked feature).
     */
    trackIntent(action: 'LOCKED_CLICK' | 'PRICING_VIEW') {
        const current = this.getLocalIntentScore();
        const points = action === 'LOCKED_CLICK' ? this.SCORING_WEIGHTS.INTENT_CLICK : this.SCORING_WEIGHTS.PRICING_VIEW;

        // Simple cap to prevent gamification loop
        if (current > 50) return;

        localStorage.setItem(this.STORAGE_KEY, (current + points).toString());
    }

    private getLocalIntentScore(): number {
        return parseInt(localStorage.getItem(this.STORAGE_KEY) || '0', 10);
    }

    private async fetchUserStats(userId: string) {
        const { count: properties } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

        const { count: contracts } = await supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active');

        // Approximate maintenance by checking documents with category 'maintenance'
        const { count: maintenance } = await supabase
            .from('property_documents')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('category', 'maintenance');

        return {
            properties: properties || 0,
            contracts: contracts || 0,
            maintenance: maintenance || 0
        };
    }
}

export const userScoringService = new UserScoringService();
