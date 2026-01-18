const testCases = [
    { rent: 5000, base: 100, current: 101 },        // 1. 1% Increase
    { rent: 5000, base: 100, current: 99 },         // 2. 1% Decrease
    { rent: 5000, base: 100, current: 100 },        // 3. No Change
    { rent: 20000, base: 120.5, current: 121.2 },   // 4. Large Rent, Decimal Index
    { rent: 1000, base: 100, current: 110 },        // 5. Small Rent, 10% Increase
    { rent: 5000, base: 100.5, current: 102.3 },    // 6. Typical Decimal Indices
    { rent: 5000, base: 100, current: 200 },        // 7. 100% Hyperinflation
    { rent: 5000, base: 0, current: 100 },          // 8. Zero Base Index (Edge Case)
    { rent: 1000, base: 100, current: 100.4 },      // 9. Rounding Down (1004.0)
    { rent: 1000, base: 100, current: 100.5 },      // 10. Rounding Up (1005.0)
    { rent: 7350, base: 108.2, current: 110.4 },    // 11. Realistic random case
    { rent: 4200, base: 121.5, current: 121.5 },    // 12. No change decimal
];

function appCalculate(rent, base, current) {
    if (base === 0) return rent;
    return Math.round((rent / base) * current);
}

function myCalculate(rent, base, current) {
    if (base === 0) return rent;
    return (rent / base) * current;
}

console.log("| ID | Rent | Base Index | Current Index | App (Rounded) | Mine (Precise) | Diff | Match |");
console.log("|---|---|---|---|---|---|---|---|");

testCases.forEach((tc, index) => {
    const appRes = appCalculate(tc.rent, tc.base, tc.current);
    const myRes = myCalculate(tc.rent, tc.base, tc.current);
    const diff = Math.abs(appRes - myRes);
    // Logic: App results are valid if they are the nearest integer to the precise calculation.
    // So the difference should be <= 0.5.
    const valid = diff <= 0.50001;

    console.log(`| ${index + 1} | ${tc.rent} | ${tc.base} | ${tc.current} | ${appRes} | ${myRes.toFixed(4)} | ${diff.toFixed(4)} | ${valid ? '✅' : '❌'} |`);
});
