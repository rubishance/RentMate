import { config } from 'dotenv';
config();

import { calculateReconciliation } from './src/services/calculator.service';

async function test() {
    try {
        const res = await calculateReconciliation({
            baseRent: 5000,
            linkageType: 'cpi',
            contractStartDate: '2023-01',
            periodStart: '2023-01',
            periodEnd: '2023-12',
            actualPaidPerMonth: 5000,
            partialLinkage: 100,
            linkageSubType: 'known',
            updateFrequency: 'monthly',
            isIndexBaseMinimum: true
        });
        console.log("Success:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Caught error:", e);
    }
}

test().catch(console.error);
