import { rentalTrendService } from '../rental-trend.service';
import { userPreferencesService } from '../user-preferences.service';

describe('Analytics & Preferences Logic', () => {
    beforeAll(async () => {
        await rentalTrendService.initialize();
    });

    describe('RentalTrendService', () => {
        it('should return default rent when room count is 3', () => {
            const trend = rentalTrendService.getRegionalTrend('Tel Aviv');
            expect(trend).toBeDefined();
            if (trend) {
                const multiplier = trend.roomAdjustments[3];
                expect(multiplier).toBe(1);
            }
        });

        it('should apply multiplier for different room counts', () => {
            const trend = rentalTrendService.getRegionalTrend('Jerusalem');
            expect(trend).toBeDefined();
            if (trend) {
                // 3 rooms is 1.0, 4 rooms should be different (usually higher)
                expect(trend.roomAdjustments[4]).toBeGreaterThan(1);
                expect(trend.roomAdjustments[2]).toBeLessThan(1);
            }
        });
    });

    describe('UserPreferences Migration', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('should migrate string[] pinned_cities to object[]', () => {
            const oldPrefs = {
                language: 'he',
                pinned_cities: ['Jerusalem', 'Tel Aviv']
            };
            localStorage.setItem('userPreferences', JSON.stringify(oldPrefs));

            const migrated = userPreferencesService.getUserPreferences();
            expect(migrated.pinned_cities).toHaveLength(2);
            expect(migrated.pinned_cities[0]).toEqual({ city: 'Jerusalem', rooms: 3 });
            expect(migrated.pinned_cities[1]).toEqual({ city: 'Tel Aviv', rooms: 3 });
        });

        it('should not affect already migrated object[]', () => {
            const newPrefs = {
                language: 'he',
                pinned_cities: [{ city: 'Haifa', rooms: 4 }]
            };
            localStorage.setItem('userPreferences', JSON.stringify(newPrefs));

            const prefs = userPreferencesService.getUserPreferences();
            expect(prefs.pinned_cities).toHaveLength(1);
            expect(prefs.pinned_cities[0]).toEqual({ city: 'Haifa', rooms: 4 });
        });
    });
});
