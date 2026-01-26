# RentMate: Property Documents & Logistics (v1.1.2)

RentMate provides a centralized document management system with an integrated "Property Documents Hub" for legal and operational records.

## 1. The Documents Hub
Record tracking is organized into three professional categories:

### Utility Bills (חשבונות)
Tracks gas, electricity, water, and property tax (**Arnona**) records.
- Records include: Amount (₪), Issued Date, Note, and File Attachment.
- **Tip**: Landlords should transfer the Arnona bill to the tenant's name immediately upon signing; this prevents debt accumulation on the landlord's ID.

### Maintenance Records (תחזוקה)
Manages interactions with vendors (plumbers, electricians, etc.).
- Records include: Vendor Name, Issue Type (e.g., "Boiler Repair"), Cost, and Date.

### Miscellaneous (מסמכים נוספים)
Storage for title deeds (**Tabu**), insurance policies, neighbor agreements, and appraisal reports.

---

## 2. Operational Checklists

### Tenant Handover (Entrance)
- [ ] **Meter Readings**: Take photos of Water, Electricity, and Gas meters.
- [ ] **Inventory**: List all appliances (Fridges, AC units) and their condition.
- [ ] **Keys**: Document the number of sets handed over.

### Winter Preparedness (October/November)
- [ ] **Boiler (Dud Shemesh)**: Inspect heating elements and clean solar panels.
- [ ] **Sealing**: Check window seals and clear roof gutters to prevent flooding.

---

## 3. Storage & Security
- **Cloud Infrastructure**: Files are stored in secure Supabase buckets.
- **Privacy (RLS)**: Only the owner or an authorized administrator can view documents.
- **Image Optimization**: The app automatically compresses high-resolution photos before upload to ensure fast loading while preserving legibility.
