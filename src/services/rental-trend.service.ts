/**
 * Service for fetching and managing rental trend data based on CBS (Central Bureau of Statistics) Israel.
 * Based on 2025/2026 market research.
 */

export interface RentalTrend {
    region: string;
    annualGrowth: number; // Percentage
    averageRent: number; // Monthly ₪
    monthOverMonth: number; // Percentage
}

export class RentalTrendService {
    // Static data points based on 2025-2026 CBS reports
    private static readonly NATIONAL_GROWTH = 6.0;
    private static readonly NEW_CONTRACT_SURGE = 4.6;
    private static readonly RENEWAL_GROWTH = 3.0;

    private static readonly REGIONAL_TRENDS: Record<string, RentalTrend> = {
        'Jerusalem': {
            region: 'Jerusalem',
            annualGrowth: 9.4,
            averageRent: 5200,
            monthOverMonth: 0.8
        },
        'Tel Aviv': {
            region: 'Tel Aviv',
            annualGrowth: -2.8, // Recent moderation after sharp peaks
            averageRent: 6800,
            monthOverMonth: -0.2
        },
        'Central': {
            region: 'Central',
            annualGrowth: -2.9,
            averageRent: 4900,
            monthOverMonth: -0.1
        },
        'Haifa': {
            region: 'Haifa',
            annualGrowth: 0.5,
            averageRent: 3800,
            monthOverMonth: 0.1
        },
        'North': {
            region: 'North',
            annualGrowth: 5.4,
            averageRent: 3500,
            monthOverMonth: 0.4
        },
        'South': {
            region: 'South',
            annualGrowth: 1.2,
            averageRent: 3600,
            monthOverMonth: 0.2
        }
    };

    /**
     * Get national rental growth performance
     */
    getNationalStats() {
        return {
            annual: RentalTrendService.NATIONAL_GROWTH,
            newContracts: RentalTrendService.NEW_CONTRACT_SURGE,
            renewals: RentalTrendService.RENEWAL_GROWTH,
            averageRent: 4879 // National average 2025
        };
    }

    /**
     * Get regional trend by city/region name
     */
    getRegionalTrend(regionOrCity: string): RentalTrend | null {
        // Simple mapping/fuzzy search can be added here
        const regionKeys = Object.keys(RentalTrendService.REGIONAL_TRENDS);
        const match = regionKeys.find(key =>
            regionOrCity.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(regionOrCity.toLowerCase())
        );

        return match ? RentalTrendService.REGIONAL_TRENDS[match] : null;
    }

    /**
     * Get all regional trends for comparison
     */
    getAllRegionalTrends(): RentalTrend[] {
        return Object.values(RentalTrendService.REGIONAL_TRENDS);
    }
}

export const rentalTrendService = new RentalTrendService();
