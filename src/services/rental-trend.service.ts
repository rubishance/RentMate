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
        '3Y': number;
        '4Y': number;
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

    // Static fallback data (Based on CBS Israel Table 4/1 & Housing Services Index 2024)
    private static readonly FALLBACK_DATA: Record<string, RentalTrend> = {
        'Jerusalem': {
            region: 'Jerusalem',
            annualGrowth: 3.2,
            averageRent: 4839, // CBS Q1 2024 avg for 3-3.5 rooms
            monthOverMonth: 0.3,
            historical: { '1Y': 3.2, '2Y': 8.5, '3Y': 14.1, '4Y': 18.2, '5Y': 22.5 },
            roomAdjustments: { 2: 0.82, 3: 1.0, 4: 1.28, 5: 1.55 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.4, 'house': 1.8 }
        },
        'Tel Aviv': {
            region: 'Tel Aviv',
            annualGrowth: 1.8,
            averageRent: 6954, // CBS Q1 2024 avg for 3-3.5 rooms
            monthOverMonth: 0.1,
            historical: { '1Y': 1.8, '2Y': 7.1, '3Y': 13.5, '4Y': 17.8, '5Y': 21.0 },
            roomAdjustments: { 2: 0.81, 3: 1.0, 4: 1.32, 5: 1.65 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.6, 'house': 2.2 }
        },
        'Haifa': {
            region: 'Haifa',
            annualGrowth: 4.1,
            averageRent: 3349, // CBS Q1 2024 avg for 3-3.5 rooms
            monthOverMonth: 0.4,
            historical: { '1Y': 4.1, '2Y': 9.2, '3Y': 15.0, '4Y': 19.5, '5Y': 24.2 },
            roomAdjustments: { 2: 0.75, 3: 1.0, 4: 1.24, 5: 1.48 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.3, 'house': 1.6 }
        },
        'Rishon LeZion': {
            region: 'Rishon LeZion',
            annualGrowth: 3.5,
            averageRent: 4682, // CBS Q1 2024 avg for 3-3.5 rooms
            monthOverMonth: 0.3,
            historical: { '1Y': 3.5, '2Y': 8.8, '3Y': 14.5, '4Y': 18.9, '5Y': 23.1 },
            roomAdjustments: { 2: 0.8, 3: 1.0, 4: 1.27, 5: 1.52 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.4, 'house': 1.9 }
        },
        'Petah Tikva': {
            region: 'Petah Tikva',
            annualGrowth: 3.4,
            averageRent: 4510,
            monthOverMonth: 0.3,
            historical: { '1Y': 3.4, '2Y': 8.6, '3Y': 14.2, '4Y': 18.5, '5Y': 22.8 },
            roomAdjustments: { 2: 0.79, 3: 1.0, 4: 1.25, 5: 1.5 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.35, 'house': 1.8 }
        },
        'Ashdod': {
            region: 'Ashdod',
            annualGrowth: 3.9,
            averageRent: 3950,
            monthOverMonth: 0.4,
            historical: { '1Y': 3.9, '2Y': 9.0, '3Y': 14.8, '4Y': 19.1, '5Y': 23.5 },
            roomAdjustments: { 2: 0.78, 3: 1.0, 4: 1.22, 5: 1.45 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.3, 'house': 1.7 }
        },
        'Beer Sheva': {
            region: 'Beer Sheva',
            annualGrowth: 4.5,
            averageRent: 2980,
            monthOverMonth: 0.5,
            historical: { '1Y': 4.5, '2Y': 9.8, '3Y': 15.5, '4Y': 20.2, '5Y': 25.1 },
            roomAdjustments: { 2: 0.76, 3: 1.0, 4: 1.2, 5: 1.4 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.25, 'house': 1.5 }
        },
        'Netanya': {
            region: 'Netanya',
            annualGrowth: 4.0,
            averageRent: 4200,
            monthOverMonth: 0.3,
            historical: { '1Y': 4.0, '2Y': 8.5, '3Y': 14.1, '4Y': 18.2, '5Y': 23.0 },
            roomAdjustments: { 2: 0.77, 3: 1.0, 4: 1.25, 5: 1.48 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.35, 'house': 1.7 }
        },
        'Bnei Brak': {
            region: 'Bnei Brak',
            annualGrowth: 3.8,
            averageRent: 4800,
            monthOverMonth: 0.2,
            historical: { '1Y': 3.8, '2Y': 8.0, '3Y': 13.5, '4Y': 17.5, '5Y': 22.0 },
            roomAdjustments: { 2: 0.8, 3: 1.0, 4: 1.3, 5: 1.5 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.2, 'house': 1.4 }
        },
        'Ramat Gan': {
            region: 'Ramat Gan',
            annualGrowth: 4.1,
            averageRent: 5228,
            monthOverMonth: 0.4,
            historical: { '1Y': 4.1, '2Y': 8.7, '3Y': 14.3, '4Y': 18.6, '5Y': 23.5 },
            roomAdjustments: { 2: 0.82, 3: 1.0, 4: 1.28, 5: 1.55 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.45, 'house': 1.8 }
        },
        'Holon': {
            region: 'Holon',
            annualGrowth: 3.5,
            averageRent: 4350,
            monthOverMonth: 0.3,
            historical: { '1Y': 3.5, '2Y': 7.8, '3Y': 13.0, '4Y': 17.0, '5Y': 21.5 },
            roomAdjustments: { 2: 0.8, 3: 1.0, 4: 1.25, 5: 1.48 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.35, 'house': 1.7 }
        },
        'Ashkelon': {
            region: 'Ashkelon',
            annualGrowth: 4.8,
            averageRent: 3300,
            monthOverMonth: 0.5,
            historical: { '1Y': 4.8, '2Y': 10.2, '3Y': 16.0, '4Y': 21.0, '5Y': 26.5 },
            roomAdjustments: { 2: 0.75, 3: 1.0, 4: 1.2, 5: 1.45 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.25, 'house': 1.5 }
        },
        'Rehovot': {
            region: 'Rehovot',
            annualGrowth: 3.6,
            averageRent: 4450,
            monthOverMonth: 0.3,
            historical: { '1Y': 3.6, '2Y': 8.2, '3Y': 13.8, '4Y': 18.0, '5Y': 22.5 },
            roomAdjustments: { 2: 0.78, 3: 1.0, 4: 1.26, 5: 1.5 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.35, 'house': 1.75 }
        },
        'Bat Yam': {
            region: 'Bat Yam',
            annualGrowth: 4.2,
            averageRent: 4100,
            monthOverMonth: 0.4,
            historical: { '1Y': 4.2, '2Y': 8.9, '3Y': 14.5, '4Y': 19.0, '5Y': 23.8 },
            roomAdjustments: { 2: 0.79, 3: 1.0, 4: 1.24, 5: 1.46 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.3, 'house': 1.6 }
        },
        'Beit Shemesh': {
            region: 'Beit Shemesh',
            annualGrowth: 7.4,
            averageRent: 3628,
            monthOverMonth: 0.6,
            historical: { '1Y': 7.4, '2Y': 14.5, '3Y': 21.5, '4Y': 28.0, '5Y': 34.5 },
            roomAdjustments: { 2: 0.75, 3: 1.0, 4: 1.2, 5: 1.4 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.2, 'house': 1.55 }
        },
        'Kfar Saba': {
            region: 'Kfar Saba',
            annualGrowth: 4.5,
            averageRent: 4950,
            monthOverMonth: 0.4,
            historical: { '1Y': 4.5, '2Y': 9.5, '3Y': 15.2, '4Y': 19.8, '5Y': 24.5 },
            roomAdjustments: { 2: 0.81, 3: 1.0, 4: 1.27, 5: 1.55 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.4, 'house': 1.8 }
        },
        'Herzliya': {
            region: 'Herzliya',
            annualGrowth: 3.1,
            averageRent: 5399,
            monthOverMonth: 0.2,
            historical: { '1Y': 3.1, '2Y': 7.5, '3Y': 12.5, '4Y': 16.8, '5Y': 20.5 },
            roomAdjustments: { 2: 0.83, 3: 1.0, 4: 1.3, 5: 1.6 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.5, 'house': 2.0 }
        },
        'Hadera': {
            region: 'Hadera',
            annualGrowth: 4.3,
            averageRent: 3500,
            monthOverMonth: 0.4,
            historical: { '1Y': 4.3, '2Y': 9.1, '3Y': 14.8, '4Y': 19.2, '5Y': 23.9 },
            roomAdjustments: { 2: 0.76, 3: 1.0, 4: 1.22, 5: 1.43 },
            typeAdjustments: { 'apartment': 1.0, 'penthouse': 1.25, 'house': 1.6 }
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
                            '3Y': item.growth_2y + (item.growth_5y - item.growth_2y) * 0.33,
                            '4Y': item.growth_2y + (item.growth_5y - item.growth_2y) * 0.66,
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
        duration?: '1Y' | '2Y' | '3Y' | '4Y' | '5Y',
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
