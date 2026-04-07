import { calculateSinglePayment, calculateSeriesPayments } from './calculator.logic';

describe('Calculator Logic', () => {

    describe('calculateSinglePayment', () => {
        it('should properly link rent when target index is higher', () => {
            const result = calculateSinglePayment({
                bIndex: 100,
                cIndex: 105,
                baseRent: 5000,
                indexBaseMinimum: true
            });
            // 5% increase
            expect(result.ratioUsed).toBeCloseTo(0.05);
            expect(result.newRent).toBeCloseTo(5250);
            expect(result.diff).toBeCloseTo(250);
        });

        it('should cap the increase if linkageCeiling is provided', () => {
            const result = calculateSinglePayment({
                bIndex: 100,
                cIndex: 110, // 10% increase
                baseRent: 5000,
                ceilingPercentage: 5, // Capped at 5%
                indexBaseMinimum: true
            });
            expect(result.ratioUsed).toBeCloseTo(0.05);
            expect(result.newRent).toBeCloseTo(5250);
            expect(result.diff).toBeCloseTo(250);
        });

        it('should NOT drop below base rent if indexBaseMinimum is true but index dropped', () => {
            const result = calculateSinglePayment({
                bIndex: 100,
                cIndex: 90, // 10% drop
                baseRent: 5000,
                indexBaseMinimum: true
            });
            expect(result.ratioUsed).toBeCloseTo(0);
            expect(result.newRent).toBeCloseTo(5000);
            expect(result.diff).toBeCloseTo(0);
        });

        it('should drop below base rent if indexBaseMinimum is false and index dropped', () => {
            const result = calculateSinglePayment({
                bIndex: 100,
                cIndex: 90, // 10% drop
                baseRent: 5000,
                indexBaseMinimum: false
            });
            expect(result.ratioUsed).toBeCloseTo(-0.10);
            expect(result.newRent).toBeCloseTo(4500);
            expect(result.diff).toBeCloseTo(-500);
        });
    });

    describe('calculateSeriesPayments', () => {
        it('should correctly sum back-pay across multiple months', () => {
            const result = calculateSeriesPayments({
                baseRent: 5000,
                bIndex: 100,
                payments: [
                    { month: '01/2024', paid: 5000, targetIndex: 102 }, // ratio: 2%. Should pay 5100. Owed 100
                    { month: '02/2024', paid: 5100, targetIndex: 105 }, // ratio: 5%. Should pay 5250. Owed 150
                    { month: '03/2024', paid: 5000, targetIndex: 95 }   // ratio: drop, assuming base min. Should pay 5000. Owed 0
                ],
                indexBaseMinimum: true
            });

            expect(result.totalBackPay).toBeCloseTo(250); // 100 + 150 + 0
            expect(result.breakdown[0].owed).toBeCloseTo(100);
            expect(result.breakdown[1].owed).toBeCloseTo(150);
            expect(result.breakdown[2].owed).toBeCloseTo(0);
        });

        it('should correctly handle overpayments as negative owed (credit)', () => {
            const result = calculateSeriesPayments({
                baseRent: 5000,
                bIndex: 100,
                payments: [
                    { month: '01/2024', paid: 5200, targetIndex: 102 }, // Should pay 5100. Owed -100
                ]
            });

            expect(result.totalBackPay).toBeCloseTo(-100);
        });
    });
});
