# RentMate: Property Documents & Storage

RentMate provides a centralized document management system for every property, ensuring all legal and financial records are organized and secure.

## 1. Property Documents Hub
The "Hub" is organized into three main categories:
- **Utility Bills (חשבונות)**: Stores gas, electricity, water, and property tax (Arnona) records. Each entry includes:
  - Amount (סכום)
  - Date (תאריך)
  - Note (הערה)
  - File Attachment (PDF/Image)
- **Maintenance Records (תחזוקה)**: Tracks repairs and vendor interactions. Each entry includes:
  - Vendor Name (שם ספק)
  - Issue Type (סוג תקלה)
  - Cost (עלות)
  - Date (תאריך)
  - Description/Note
- **Miscellaneous Documents (מסמכים נוספים)**: General storage for title deeds (Tabu), insurance policies, or neighbor agreements.

## 2. Storage Infrastructure
- **Supabase Storage**: All files are stored in a secure bucket named `secure_documents`.
- **Path Logic**: Files are organized by User ID and Property ID (`user_id/property_id/file_name`).
- **Quota Management**:
  - **Free Plan**: Limited storage (e.g., 50MB).
  - **Pro/Business**: Higher or unlimited storage limits.
- **Visual Monitor**: Users can see their storage usage via the "Storage Management" widget in the Dashboard or Admin Panel.

## 3. Privacy & Security
- **Row-Level Security (RLS)**: Only the property owner (or an admin) can access the documents.
- **Signed URLs**: Documents are served via temporary secure links to prevent unauthorized access.
- **Compression**: Images are automatically compressed using `browser-image-compression` before upload to save space and improve loading speed.
