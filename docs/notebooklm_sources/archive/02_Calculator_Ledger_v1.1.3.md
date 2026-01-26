# RentMate: Advanced Calculator & Ledger (v1.1.2)

The RentMate Advanced Calculator is a professional-grade tool designed for the Israeli rental market, handling complex index linkages and cumulative debt tracking.

## 1. Calculation Methods

### Fixed Rent
Simple monthly rent payment without any linkage to external indexes.

### CPI Linkage (מדד המחירים לצרכן - Madad)
The system automates rent adjustments based on the Israeli Consumer Price Index (CPI), published by the CBS on the **15th of every month**.
- **Known Index (המדד הידוע)**: Uses the index published 15 days before rent is due. Most common for residential leases.
- **Begin Index (המדד בגין)**: Compares the payment month index to the original contract month. Common for commercial leases.

### The Mathematical Formula
**[New Rent] = [Base Rent] × ([Current Index] / [Base Index])**
*Note: The system handles all decimal precision and rounding to the nearest Shekel automatically.*

---

## 2. Ledger & Accounting Logic

### Running Ledger (כרטסת)
Unlike simple spreadsheets, RentMate uses a continuous ledger system that tracks:
- **Expected Obligations**: What the tenant should have paid (including index updates).
- **Actual Payments**: What was actually received.
- **Running Balance (יתרה)**: The live difference. This identifies if a tenant has "overpaid" or is in a "debt" state.

### Negative Linkage Protocol
By default, if the index drops, rent can technically decrease. However, most Israeli contracts include a floor:
- **"No Drop" Clause**: RentMate supports a toggle to ensure that **"In no event shall the rent be less than the Base Rent."**

---

## 3. Transparency & Sharing

### Monthly Detail (פירוט התחשבנות)
A detailed table showing the exact math for every month of the contract. This can be shared with tenants to resolve disputes.

### Manual Overrides
A critical professional tool. If a contract has a unique legal clause (e.g., a capped increase), the landlord can **manually override** any specific month's index value or rent amount without breaking the rest of the ledger.

### Data Export
Fully generated PDF ledger reports include official headers, property details, and a professional breakdown for tax or legal purposes.
