# Property Documents Feature - Verification Guide

## Overview
This document provides a comprehensive guide to manually verify the Property Documents feature implementation, including all new fields and upload functionality.

## Prerequisites
- Development server running (`npm run dev`)
- Valid Supabase credentials configured in `.env`
- Test user account (or ability to create one)

## Feature Summary

### Updated Components
1. **UtilityBillsManager** - Utility bills with Amount, Date, and Note fields
2. **MaintenanceRecords** - Maintenance records with Vendor, Issue Type, Cost, Date, and Description
3. **MiscDocuments** - Miscellaneous documents with Category, Date, and Note fields
4. **MediaGallery** - Photos/Videos with multi-file upload and descriptions

### Database Schema
- **Table**: `property_documents`
- **Storage**: `secure_documents` bucket (folder-based organization)
- **Service**: `PropertyDocumentsService` handles all operations

## Manual Testing Steps

### Step 1: Login/Signup
1. Navigate to `http://localhost:5173`
2. Click "Login" or "Start Free Trial"
3. **Option A - Existing User**: Sign in with your credentials
4. **Option B - New User**: 
   - Click "Don't have an account? Sign Up"
   - Enter email and password (min 6 characters)
   - Check email for confirmation link
   - Confirm account and login

### Step 2: Create Test Property
1. Navigate to "Assets" (Properties) page
2. Click the "+" button (Add Property)
3. Fill in basic details:
   - **Address**: Test Property 123
   - **City**: Tel Aviv
   - **Rooms**: 3
   - **Size**: 80 sqm
   - **Monthly Rent**: 5000
4. Click "Add Asset" to save
5. Click on the newly created property to open it

### Step 3: Access Documents Center
1. In the property modal, locate the tabs at the top
2. Click on **"Documents Center"** (3rd tab)
3. You should see 4 sub-tabs:
   - Media (Photos & Videos)
   - Utilities (Bills)
   - Maintenance (Records)
   - Documents (Misc)

### Step 4: Verify Utility Bills Fields

#### Test Upload Form
1. Click on **"Utilities"** sub-tab
2. Select a utility type (e.g., "Electric")
3. Click **"Add New Bill"** or the upload icon
4. **Verify the following fields are present**:
   - ✅ **File Upload** - Browse/Select file button
   - ✅ **Amount** - Number input (₪)
   - ✅ **Date** - Date picker
   - ✅ **Note** - Textarea for description
5. **Test Upload**:
   - Select a test PDF or image file
   - Enter Amount: 450.50
   - Select Date: Current month
   - Enter Note: "January 2026 Electric Bill"
   - Click "Add" or "Upload"
6. **Verify Result**:
   - File appears in the list below
   - Amount displays correctly
   - Note is visible (or accessible via tooltip/expand)
   - "Unpaid" status shows by default

#### Test Actions
1. **Mark as Paid**: Click the checkmark icon → Status changes to "Paid"
2. **View**: Click the eye icon → File opens in new tab
3. **Delete**: Click trash icon → Confirm deletion → File removed

### Step 5: Verify Maintenance Records Fields

#### Test Upload Form
1. Click on **"Maintenance"** sub-tab
2. Click **"Add New Record"** or upload icon
3. **Verify the following fields are present**:
   - ✅ **File Upload** - Browse/Select file button
   - ✅ **Title** - Text input
   - ✅ **Vendor Name** - Text input
   - ✅ **Issue Type** - Dropdown (Plumbing, Electrical, etc.)
   - ✅ **Cost** - Number input (₪)
   - ✅ **Date** - Date picker
   - ✅ **Description** - Textarea
4. **Test Upload**:
   - Select a test file (invoice/receipt)
   - Title: "Pipe Repair"
   - Vendor: "CleanFix Ltd"
   - Issue Type: "Plumbing"
   - Cost: 250
   - Date: Current date
   - Description: "Fixed leaking pipe in bathroom"
   - Click "Add"
5. **Verify Result**:
   - Record appears in list
   - Vendor name visible
   - Issue type badge shows correct category
   - Cost displays in summary

### Step 6: Verify Miscellaneous Documents Fields

#### Test Upload Form
1. Click on **"Documents"** sub-tab
2. Click **"Upload New Document"** or upload icon
3. **Verify the following fields are present**:
   - ✅ **File Upload** - Browse/Select file button
   - ✅ **Category** - Dropdown (Insurance, Warranty, Legal, Invoice, Receipt, Other)
   - ✅ **Date** - Date picker
   - ✅ **Note/Description** - Textarea
4. **Test Upload**:
   - Select a test PDF
   - Category: "Insurance"
   - Date: Policy start date
   - Note: "Home Insurance Policy 2026"
   - Click "Upload"
5. **Verify Result**:
   - Document appears with color-coded category badge
   - Date displays correctly
   - Description visible or accessible

### Step 7: Verify Media Gallery (Bonus)

1. Click on **"Media"** sub-tab
2. Click "Select Files" or upload area
3. **Multi-file selection**:
   - Select 2-3 images
   - Each file shows in staging area
   - Add optional notes to each
4. Click "Confirm Upload"
5. **Verify**:
   - All files upload with progress indicator
   - Thumbnails display in grid
   - Notes saved with each image

### Step 8: Verify Storage & Quotas

1. Check the **Storage Usage Widget** at top of Documents Center
2. **Verify**:
   - Shows current usage (MB/GB)
   - Shows quota limit based on plan
   - Updates after each upload

### Step 9: Test Edge Cases

#### File Size Limits
1. Try uploading a very large file (>10MB)
2. **Expected**: Error message about file size or quota

#### Missing Required Fields
1. Try uploading without selecting a file
2. **Expected**: Validation error or disabled submit button

#### Unsupported File Types
1. Try uploading an executable (.exe) or unsupported format
2. **Expected**: Error message or file type validation

## Expected Results Summary

### ✅ All Fields Present
- [x] Utility Bills: File, Amount, Date, Note
- [x] Maintenance: File, Title, Vendor, Issue Type, Cost, Date, Description
- [x] Misc Docs: File, Category, Date, Note

### ✅ Functionality Working
- [x] File uploads successfully to Supabase
- [x] Metadata saves to `property_documents` table
- [x] Files retrievable and viewable
- [x] Delete operations work
- [x] UI updates in real-time

### ✅ Data Persistence
- [x] Refresh page → Data still visible
- [x] Close modal and reopen → Data persists
- [x] Logout and login → Data accessible

## Troubleshooting

### Issue: "Demo Mode" Warning
**Cause**: Supabase credentials not configured
**Fix**: Check `.env` file has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Issue: Upload Fails Silently
**Cause**: Storage bucket not created or RLS policies missing
**Fix**: Run migration `20260119_create_property_documents.sql`

### Issue: "Quota Exceeded" Error
**Cause**: User reached storage limit for their plan
**Fix**: Upgrade plan or delete old files

### Issue: Files Upload but Don't Display
**Cause**: URL generation failing or CORS issue
**Fix**: Check `getDocumentUrl()` in `property-documents.service.ts`

## Database Verification (Optional)

### Check Uploaded Files
```sql
-- View all documents for a property
SELECT * FROM property_documents 
WHERE property_id = 'YOUR_PROPERTY_ID'
ORDER BY created_at DESC;

-- Check storage usage
SELECT * FROM user_storage_usage 
WHERE user_id = auth.uid();
```

### Check Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Navigate to `secure_documents` bucket
3. Verify folder structure: `{user_id}/{property_id}/{category}/`

## Success Criteria

✅ **All fields render correctly in each component**
✅ **File uploads complete without errors**
✅ **Metadata (notes, dates, amounts) saves and displays**
✅ **Files are viewable after upload**
✅ **Delete operations work**
✅ **Storage quota tracking functions**
✅ **UI is responsive and accessible**

## Next Steps

If all tests pass:
1. ✅ Mark feature as complete
2. 📝 Update user documentation
3. 🚀 Deploy to staging/production
4. 📧 Notify stakeholders

If issues found:
1. 🐛 Document specific failures
2. 🔍 Check browser console for errors
3. 📊 Review network tab for failed requests
4. 💬 Report to development team

---

**Last Updated**: 2026-01-20
**Version**: 1.0
**Status**: Ready for Testing
