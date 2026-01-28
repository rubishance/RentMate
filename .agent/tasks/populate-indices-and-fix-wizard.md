# Task: Populate Indices and Enhance Contract Wizard

The objective is to ensure all supported contract indices (CPI, Housing, Construction, USD, EUR) have historical data and bases in the database, and to improve the "Add Contract" wizard with intelligent date defaults.

## Status
- **CPI Data**: 1999–2026 available.
- **Other Indices**: Missing (Housing, Construction, USD, EUR).
- **Index Bases**: CPI bases exist (implied by previous work), others missing.
- **Wizard Logic**: Needs default end date (1 year - 1 day) and auto-update on start date change.

## Action Plan
- [ ] **Phase 1: Update Index Data Services**
    - [ ] Update `fetch-index-data` Edge Function to fetch Housing (40010) and Construction (200010) from CBS.
    - [ ] Seed historical data for Housing, Construction, USD, and EUR.
    - [ ] Populate `index_bases` for Construction and Housing to support chained calculations.
- [ ] **Phase 2: Wizard Enhancements**
    - [ ] Update `AddContract.tsx` logic to set `endDate = startDate + 1 year - 1 day`.
    - [ ] Implement `useEffect` or change handler to sync `endDate` when `startDate` is modified.
- [ ] **Phase 3: Verification**
    - [ ] Verify data in `index_data` table.
    - [ ] Test the Index Calculator with new types.
    - [ ] Test the "Add Contract" wizard date logic.

## Technical Details
- **Housing Price Index (40010)**: From CBS API.
- **Construction Inputs Index (200010)**: From CBS API.
- **Wizard Logic**: Use `date-fns` for robust date math.
