import { supabase } from './supabase';

export interface RentalMarketData {
    id: string;
    region_name: string;
    avg_rent: number;
    growth_1y: number;
    growth_2y: number;
    growth_5y: number;
    month_over_month: number;
    room_adjustments: any;
    type_adjustments: any;
    detailed_segments?: {
        rooms: {
            '1.5_2': number;
            '2.5_3': number;
            '3.5_4': number;
            '4.5_5': number;
        };
        features: {
            has_safe_room_premium_pct: number;
            has_balcony_premium_pct: number;
            has_parking_premium_pct: number;
        };
    };
    updated_at: string;
}

export interface UserTrackedRegion {
    id: string;
    user_id: string;
    region_name: string;
    created_at: string;
}

/**
 * Helper to get the current user ID
 */
async function getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user found');
    return user.id;
}

/**
 * Fetch all available regions that have rental data.
 */
export async function fetchAllAvailableRegions(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('rental_market_data')
            .select('region_name')
            .order('region_name');

        if (error) throw error;
        return data.map(d => d.region_name);
    } catch (e) {
        console.error('Error fetching available regions:', e);
        return [];
    }
}

/**
 * Fetch regions tracked by a user.
 */
export async function fetchUserTrackedRegions(): Promise<string[]> {
    try {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('user_tracked_regions')
            .select('region_name')
            .eq('user_id', userId)
            .order('created_at');

        if (error) throw error;
        return data.map(d => d.region_name);
    } catch (e) {
        console.error('Error fetching user tracked regions:', e);
        return []; // Important to return empty so we can fallback
    }
}

/**
 * Add a tracked region for a user.
 */
export async function addUserTrackedRegion(regionName: string): Promise<boolean> {
    try {
        const userId = await getCurrentUserId();
        const { error } = await supabase
            .from('user_tracked_regions')
            .insert({ user_id: userId, region_name: regionName });

        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Error adding user tracked region:', e);
        return false;
    }
}

/**
 * Remove a tracked region for a user.
 */
export async function removeUserTrackedRegion(regionName: string): Promise<boolean> {
    try {
        const userId = await getCurrentUserId();
        const { error } = await supabase
            .from('user_tracked_regions')
            .delete()
            .eq('user_id', userId)
            .eq('region_name', regionName);

        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Error removing user tracked region:', e);
        return false;
    }
}

/**
 * Fetch detailed rental data for a specific list of regions.
 */
export async function fetchRentalDataForRegions(regions: string[]): Promise<RentalMarketData[]> {
    if (!regions.length) return [];
    
    try {
        const { data, error } = await supabase
            .from('rental_market_data')
            .select('*')
            .in('region_name', regions);

        if (error) throw error;
        
        // Ensure consistent typing for parsed JSON if necessary, though supabase SDK gives any/object
        return data as RentalMarketData[];
    } catch (e) {
        console.error('Error fetching rental data for regions:', e);
        return [];
    }
}
