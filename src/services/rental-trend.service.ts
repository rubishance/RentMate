import { supabase } from '../lib/supabase';
import type { RentalMarketData } from '../types/database';

/**
 * Service for fetching and managing rental trend data based on CBS (Central Bureau of Statistics) Israel.
 * Enhanced version supporting database fetching and persistent preferences.
 */

export interface RentalTrend {
    region: string;
    annualGrowth: number; // Percentage
    averageRent: number; // Monthly ₪
    monthOverMonth: number; // Percentage
    historical: {
        '1Y': number;
        '2Y': number;
        '5Y': number;
    };
    roomAdjustments: Record<number, number>; // Multiplier for 2, 3, 4, 5 rooms relative to base (3 rooms)
    typeAdjustments: Record<string, number>; // Multiplier for Apartment, Penthouse, House
}

export class RentalTrendService {
    private static readonly NATIONAL_STATS = {
        annual: 6.0,
        newContracts: 4.6,
        renewals: 3.0,
        averageRent: 4879,
        safetyPremium: 20 // 20% premium for Mamah
    };

    // Static fallback data (Initial major cities)
    private static readonly FALLBACK_DATA: Record<string, RentalTrend> = {
        'Jerusalem': {
            region: 'Jerusalem',
            annualGrowth: 9.4,
            averageRent: 5200,
            monthOverMonth: 0.8,
            historical: { '1Y': 9.4, '2Y': 18.2, '5Y': 32.5 },
            roomAdjustments: { 2: 0.8, 3: 1.0, 4: 1.25, 5: 1.5 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.4, 'house': 1.8 }
        },
        'Tel Aviv': {
            region: 'Tel Aviv',
            annualGrowth: -2.8,
            averageRent: 6800,
            monthOverMonth: -0.2,
            historical: { '1Y': -2.8, '2Y': 12.5, '5Y': 45.0 },
            roomAdjustments: { 2: 0.85, 3: 1.0, 4: 1.3, 5: 1.6 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.6, 'house': 2.2 }
        },
        'Haifa': {
            region: 'Haifa',
            annualGrowth: 0.5,
            averageRent: 3800,
            monthOverMonth: 0.1,
            historical: { '1Y': 0.5, '2Y': 6.2, '5Y': 15.0 },
            roomAdjustments: { 2: 0.7, 3: 1.0, 4: 1.25, 5: 1.55 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.3, 'house': 1.6 }
        },
        'Rishon LeZion': {
            region: 'Rishon LeZion',
            annualGrowth: -1.5,
            averageRent: 5400,
            monthOverMonth: -0.1,
            historical: { '1Y': -1.5, '2Y': 9.2, '5Y': 24.5 },
            roomAdjustments: { 2: 0.8, 3: 1.0, 4: 1.3, 5: 1.6 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.4, 'house': 1.9 }
        }
    };

    private dbData: Record<string, RentalTrend> = {};
    private isInitialized = false;

    /**
     * Initialize data from Supabase
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            const { data, error } = await supabase
                .from('rental_market_data')
                .select('*');

            if (error) throw error;

            if (data) {
                const mappedData: Record<string, RentalTrend> = {};
                (data as RentalMarketData[]).forEach(item => {
                    mappedData[item.region_name] = {
                        region: item.region_name,
                        annualGrowth: item.growth_1y,
                        averageRent: item.avg_rent,
                        monthOverMonth: item.month_over_month,
                        historical: {
                            '1Y': item.growth_1y,
                            '2Y': item.growth_2y,
                            '5Y': item.growth_5y,
                        },
                        roomAdjustments: item.room_adjustments,
                        typeAdjustments: item.type_adjustments
                    };
                });
                this.dbData = mappedData;
                this.isInitialized = true;
            }
        } catch (error) {
            console.error('Error fetching rental market data:', error);
            // Fallback to static data if DB fails
            this.dbData = RentalTrendService.FALLBACK_DATA;
        }
    }

    private get currentData(): Record<string, RentalTrend> {
        return Object.keys(this.dbData).length > 0 ? this.dbData : RentalTrendService.FALLBACK_DATA;
    }

    getNationalStats() {
        return RentalTrendService.NATIONAL_STATS;
    }

    getAllRegions(): string[] {
        return Object.keys(this.currentData);
    }

    /**
     * Get calculated trend based on filters
     */
    getFilteredTrend(filters: {
        regions: string[],
        rooms?: number,
        propertyType?: string,
        duration?: '1Y' | '2Y' | '5Y',
        hasMamah?: boolean
    }) {
        const duration = filters.duration || '1Y';
        const dataSet = this.currentData;
        const selectedRegions = filters.regions.length > 0 ? filters.regions : this.getAllRegions();

        let totalGrowth = 0;
        let totalRent = 0;
        let count = 0;

        selectedRegions.forEach(reg => {
            const data = dataSet[reg];
            if (data) {
                let rent = data.averageRent;

                // Adjustment for rooms
                const roomIndex = filters.rooms || 3;
                if (data.roomAdjustments[roomIndex]) {
                    rent *= data.roomAdjustments[roomIndex];
                }

                // Adjustment for type
                const pType = filters.propertyType || 'apartment';
                if (data.typeAdjustments[pType]) {
                    rent *= data.typeAdjustments[pType];
                }

                // Adjustment for Mamah (Safety Premium)
                if (filters.hasMamah) {
                    rent *= (1 + (RentalTrendService.NATIONAL_STATS.safetyPremium / 100));
                }

                totalGrowth += data.historical[duration];
                totalRent += rent;
                count++;
            }
        });

        return {
            avgGrowth: count > 0 ? totalGrowth / count : 0,
            avgRent: count > 0 ? totalRent / count : 0,
            sampleSize: count
        };
    }

    getRegionalTrend(regionOrCity: string): RentalTrend | null {
        const dataSet = this.currentData;
        const regionKeys = Object.keys(dataSet);
        const match = regionKeys.find(key =>
            regionOrCity.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(regionOrCity.toLowerCase())
        );

        return match ? dataSet[match] : null;
    }
}

export const rentalTrendService = new RentalTrendService();
