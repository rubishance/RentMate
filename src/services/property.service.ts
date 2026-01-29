import { supabase } from '../lib/supabase';

/**
 * Service for property-related operations
 */
export class PropertyService {
    /**
     * Synchronizes a property's occupancy status based on its active contracts.
     * Checks for active contracts linked to the property and updates the property status:
     * - 'Occupied' if at least one active contract exists.
     * - 'Vacant' if no active contracts exist.
     */
    async syncOccupancyStatus(propertyId: string): Promise<'Occupied' | 'Vacant' | null> {
        try {
            // 1. Count active contracts for this property
            const { count, error: countError } = await supabase
                .from('contracts')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId)
                .eq('status', 'active');

            if (countError) throw countError;

            const hasActiveContracts = (count || 0) > 0;
            const correctStatus = hasActiveContracts ? 'Occupied' : 'Vacant';

            // 2. Get current property status to avoid redundant updates
            const { data: property, error: fetchError } = await supabase
                .from('properties')
                .select('status')
                .eq('id', propertyId)
                .single();

            if (fetchError) throw fetchError;

            if (property.status !== correctStatus) {
                console.log(`[PropertyService] Syncing property ${propertyId} status: ${property.status} -> ${correctStatus}`);
                const { error: updateError } = await supabase
                    .from('properties')
                    .update({ status: correctStatus })
                    .eq('id', propertyId);

                if (updateError) throw updateError;
                return correctStatus;
            }

            return property.status as 'Occupied' | 'Vacant';
        } catch (err) {
            console.error('[PropertyService] Failed to sync occupancy status:', err);
            return null;
        }
    }
}

export const propertyService = new PropertyService();
