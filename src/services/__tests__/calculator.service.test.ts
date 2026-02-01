import { describe, it, expect, vi } from 'vitest';
import {
    calculateProratedCeiling,
    calculateEffectiveChange,
    calculateStandard
} from '../calculator.service';

// Mocking dependencies
vi.mock('../index-data.service', () => ({
    getIndexValue: vi.fn(),
    getIndexRange: vi.fn(),
    getMonthsBetween: vi.fn(),
}));

vi.mock('../chaining-factor.service', () => ({
    ChainingFactorService: {
        getChainingFactor: vi.fn(),
        applyChaining: vi.fn((val: number) => val), // Default no-op chaining
    },
}));

describe('Calculator Service Logic', () => {

    describe('calculateProratedCeiling', () => {
        it('calculates 5% annual ceiling correctly for 1 year', () => {
            const ceiling = calculateProratedCeiling(5, '2024-01', '2025-01');
            // 366 days in 2024 / 365.25 ≈ 1.002
            expect(ceiling).toBeGreaterThan(0.049);
            expect(ceiling).toBeLessThan(0.051);
        });

        it('calculates 5% annual ceiling correctly for 6 months', () => {
            const ceiling = calculateProratedCeiling(5, '2024-01', '2024-07');
            expect(ceiling).toBeCloseTo(0.025, 3);
        });
    });

    describe('calculateEffectiveChange', () => {
        it('applies partial linkage correctly', () => {
            const change = calculateEffectiveChange({
                linkageCoefficient: 10,
                partialLinkage: 80,
                isIndexBaseMinimum: false
            });
            expect(change).toBeCloseTo(0.08, 5); // 10% * 80% = 8%
        });

        it('respects index floor (base minimum)', () => {
            const change = calculateEffectiveChange({
                linkageCoefficient: -5,
                partialLinkage: 100,
                isIndexBaseMinimum: true
            });
            expect(change).toBe(0);
        });

        it('does not respect index floor if disabled', () => {
            const change = calculateEffectiveChange({
                linkageCoefficient: -5,
                partialLinkage: 100,
                isIndexBaseMinimum: false
            });
            expect(change).toBeCloseTo(-0.05, 5);
        });

        it('applies prorated ceiling', () => {
            const change = calculateEffectiveChange({
                linkageCoefficient: 10,
                partialLinkage: 100,
                isIndexBaseMinimum: false,
                proratedCeiling: 0.03 // 3%
            });
            expect(change).toBeCloseTo(0.03, 5);
        });
    });

    describe('calculateStandard', () => {
        it('calculates standard rent increase correctly', async () => {
            const { getIndexValue } = await import('../index-data.service');
            vi.mocked(getIndexValue).mockResolvedValue(100); // Base

            // We'll use manualTargetIndex to bypass async fetching in this test case
            const result = await calculateStandard({
                baseRent: 5000,
                linkageType: 'cpi',
                baseDate: '2024-01',
                targetDate: '2024-06',
                manualBaseIndex: 100,
                manualTargetIndex: 105, // 5% increase
                partialLinkage: 100,
                linkageSubType: 'respect_of'
            });

            expect(result?.newRent).toBe(5250);
            expect(result?.percentageChange).toBeCloseTo(5, 5);
        });
    });
});
