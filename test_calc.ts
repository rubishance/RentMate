import { calculateStandard } from './src/services/calculator.service';

async function runTests() {
    console.log('--- TEST 1: Standard Linkage (No advanced options) ---');
    // Rent goes up based on ratio: 110 / 100 = 1.1 (+10%)
    const res1 = await calculateStandard({
        baseRent: 5000,
        linkageType: 'cpi',
        baseDate: '2023-01-01',
        targetDate: '2024-01-01',
        linkageSubType: 'known',
        partialLinkage: 100,
        isIndexBaseMinimum: false,
        manualBaseIndex: 100.0,
        manualTargetIndex: 110.0
    });
    console.log(JSON.stringify(res1, null, 2));

    console.log('\n--- TEST 2: Partial Linkage (50%) ---');
    // 10% index increase -> 50% partial = 5% increase
    const res2 = await calculateStandard({
        baseRent: 5000,
        linkageType: 'cpi',
        baseDate: '2023-01-01',
        targetDate: '2024-01-01',
        linkageSubType: 'known',
        partialLinkage: 50,
        isIndexBaseMinimum: false,
        manualBaseIndex: 100.0,
        manualTargetIndex: 110.0
    });
    console.log(JSON.stringify(res2, null, 2));

    console.log('\n--- TEST 3: Index Base Minimum (Protects against drop) ---');
    // 5% index DROP -> Rent should not change
    const res3 = await calculateStandard({
        baseRent: 5000,
        linkageType: 'cpi',
        baseDate: '2023-01-01',
        targetDate: '2024-01-01',
        linkageSubType: 'known',
        partialLinkage: 100,
        isIndexBaseMinimum: true,
        manualBaseIndex: 105.0,
        manualTargetIndex: 100.0
    });
    console.log(JSON.stringify(res3, null, 2));

    console.log('\n--- TEST 4: Max Annual Increase (Ceiling of 1%) ---');
    // 1 YEAR difference. Ceiling = 1%. Index went up 10%. Rent should only go up 1%. 5000 -> 5050
    const res4 = await calculateStandard({
        baseRent: 5000,
        linkageType: 'cpi',
        baseDate: '2023-01-01',
        targetDate: '2024-01-01', 
        linkageSubType: 'known',
        partialLinkage: 100,
        isIndexBaseMinimum: false,
        linkageCeiling: 1.0,
        manualBaseIndex: 100.0,
        manualTargetIndex: 110.0
    });
    console.log(JSON.stringify(res4, null, 2));

    console.log('\n--- TEST 5: Prorated Ceiling (Ceiling of 6% over 6 months) ---');
    // 0.5 YEAR difference. Annual Ceiling = 6%. Prorated Ceiling = 3%. Index went up 10%. Rent should increase by 3%. 5000 -> 5150
    const res5 = await calculateStandard({
        baseRent: 5000,
        linkageType: 'cpi',
        baseDate: '2023-01-01',
        targetDate: '2023-07-01', 
        linkageSubType: 'known',
        partialLinkage: 100,
        isIndexBaseMinimum: false,
        linkageCeiling: 6.0,
        manualBaseIndex: 100.0,
        manualTargetIndex: 110.0
    });
    console.log(JSON.stringify(res5, null, 2));
}

runTests().catch(console.error);
