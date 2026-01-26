import { supabase } from '../lib/supabase';
import type { PropertyDocument, DocumentCategory, UserStorageUsage, DocumentFolder } from '../types/database';
import { CompressionService } from './compression.service';

/**
 * Service for managing property documents in Supabase Storage
 */
class PropertyDocumentsService {
    /**
     * Get bucket name - now always 'secure_documents' with folders
     */
    private getBucketForCategory(category: DocumentCategory): string {
        return 'secure_documents';
    }

    /**
     * Generate storage path for a file
     * Format: userId/propertyId/category/timestamp_filename
     */
    private generateStoragePath(userId: string, propertyId: string, category: DocumentCategory, fileName: string): string {
        const timestamp = Date.now();
        // Sanitize category to ensure it's a valid folder name
        const folder = category.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${userId}/${propertyId}/${folder}/${timestamp}_${fileName}`;
    }

    /**
     * Check if user can upload file based on quota
     */
    async canUploadFile(fileSize: number, category?: DocumentCategory): Promise<{
        allowed: boolean;
        reason?: string;
        currentUsage?: number;
        quota?: number;
    }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Call storage quota check function
        let rpcData = null;
        let rpcError = null;

        try {
            const result = await supabase.rpc('check_storage_quota', {
                p_user_id: user.id,
                p_file_size: fileSize,
                p_category: category || null
            });
            rpcData = result.data;
            rpcError = result.error;
        } catch (e: any) {
            // Function might not exist in some environments or schema cache issues
            console.warn('RPC check_storage_quota failed, falling back to client-side check', e);
            // Treat as missing function if it throws
            rpcError = { code: '42883', message: e.message || 'RPC Failed', details: '', hint: '' };
        }

        // Check for specific error codes or messages indicating the function is missing
        const isMissingFunction =
            rpcError && (
                rpcError.code === '42883' || // Postgres undefined_function
                rpcError.message?.includes('Could not find the function') || // PostgREST schema cache
                rpcError.message?.includes('schema cache')
            );

        if (rpcError && !isMissingFunction) {
            console.error('Quota check error:', rpcError);
            throw rpcError;
        } else if (isMissingFunction) {
            console.warn('Storage quota function missing or not cached. Using client-side fallback.');
            rpcError = null; // Clear error to trigger fallback
        }

        // If RPC succeeded, use its result
        if (rpcData !== null && !rpcError) {
            if (rpcData === false) {
                return {
                    allowed: false,
                    reason: 'Storage quota exceeded (server-side check)',
                    // We could fetch usage here for better UX, but let's keep it simple for now or reuse logic below
                    currentUsage: 0,
                    quota: 0
                };
            }
            return { allowed: true };
        }

        // Fallback: Client-side check (if RPC missing or failed)
        // This logic mirrors the SQL function
        const { data: usage } = await supabase
            .from('user_storage_usage')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('plan_id, subscription_plans(*)')
            .eq('id', user.id)
            .single();

        const plan = (profile as any)?.subscription_plans || {};
        const maxTotalMB = plan.max_storage_mb ?? 100;

        // 1. Check Global
        const totalBytes = usage?.total_bytes || 0;
        if (maxTotalMB !== -1 && (totalBytes + fileSize) > (maxTotalMB * 1024 * 1024)) {
            return {
                allowed: false,
                reason: 'Storage quota exceeded',
                currentUsage: totalBytes,
                quota: maxTotalMB * 1024 * 1024
            };
        }

        // 2. Check Category (Simplified Mapping)
        if (category) {
            let limitMB = -1;
            let currentCatBytes = 0;

            if (category === 'photo' || category === 'video') {
                limitMB = plan.max_media_mb ?? -1;
                currentCatBytes = usage?.media_bytes || 0;
            } else if (category.startsWith('utility_')) {
                limitMB = plan.max_utilities_mb ?? -1;
                currentCatBytes = usage?.utilities_bytes || 0;
            } else if (category === 'maintenance') {
                limitMB = plan.max_maintenance_mb ?? -1;
                currentCatBytes = usage?.maintenance_bytes || 0;
            } else {
                limitMB = plan.max_documents_mb ?? -1;
                currentCatBytes = usage?.documents_bytes || 0;
            }

            if (limitMB !== -1 && (currentCatBytes + fileSize) > (limitMB * 1024 * 1024)) {
                return {
                    allowed: false,
                    reason: `Category quota exceeded for ${category}`,
                    currentUsage: currentCatBytes,
                    quota: limitMB * 1024 * 1024
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Get user's storage usage
     */
    async getStorageUsage(): Promise<{
        totalBytes: number;
        fileCount: number;
        quotaBytes: number;
        percentUsed: number;
        breakdown: {
            media: number;
            utilities: number;
            maintenance: number;
            documents: number;
        };
    }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: usage } = await supabase
            .from('user_storage_usage')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('subscription_plans(max_storage_mb)')
            .eq('id', user.id)
            .single();

        const quotaMB = (profile as any)?.subscription_plans?.max_storage_mb || 100;
        const quotaBytes = quotaMB === -1 ? Infinity : quotaMB * 1024 * 1024;

        return {
            totalBytes: usage?.total_bytes || 0,
            fileCount: usage?.file_count || 0,
            quotaBytes,
            percentUsed: quotaBytes === Infinity
                ? 0
                : ((usage?.total_bytes || 0) / quotaBytes) * 100,
            breakdown: {
                media: usage?.media_bytes || 0,
                utilities: usage?.utilities_bytes || 0,
                maintenance: usage?.maintenance_bytes || 0,
                documents: usage?.documents_bytes || 0
            }
        };
    }

    /**
     * Get file counts per category using efficient DB aggregation
     */
    async getCategoryCounts(): Promise<{
        media: number;
        utilities: number;
        maintenance: number;
        documents: number;
    }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        try {
            const { data, error } = await supabase.rpc('get_property_document_counts', {
                p_user_id: user.id
            });

            if (error) throw error;
            return data;
        } catch (err) {
            console.warn('RPC get_property_document_counts failed, using fallback', err);

            // Legacy Fallback: client-side aggregation (for environments without the migration yet)
            const { data, error } = await supabase
                .from('property_documents')
                .select('category')
                .eq('user_id', user.id);

            if (error) throw error;

            const counts = { media: 0, utilities: 0, maintenance: 0, documents: 0 };
            data?.forEach((doc: any) => {
                if (doc.category === 'photo' || doc.category === 'video') counts.media++;
                else if (doc.category.startsWith('utility_')) counts.utilities++;
                else if (doc.category === 'maintenance') counts.maintenance++;
                else counts.documents++;
            });

            return counts;
        }
    }

    /**
     * Create a new document folder
     */
    async createFolder(folder: Omit<DocumentFolder, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentFolder> {
        const { data, error } = await supabase
            .from('document_folders')
            .insert(folder)
            .select()
            .single();

        if (error) throw error;
        return data as DocumentFolder;
    }

    /**
     * Update a folder
     */
    async updateFolder(id: string, updates: Partial<DocumentFolder>): Promise<DocumentFolder> {
        const { data, error } = await supabase
            .from('document_folders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as DocumentFolder;
    }

    /**
     * Get folders for a property and category
     */
    async getFolders(propertyId: string, category?: string): Promise<DocumentFolder[]> {
        let query = supabase
            .from('document_folders')
            .select('*')
            .eq('property_id', propertyId)
            .order('folder_date', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as DocumentFolder[];
    }

    /**
     * Delete a folder and all its contents (files + DB records)
     */
    async deleteFolder(folderId: string): Promise<void> {
        // 1. Get all documents in this folder
        const { data: docs, error: fetchError } = await supabase
            .from('property_documents')
            .select('id, storage_bucket, storage_path')
            .eq('folder_id', folderId);

        if (fetchError) throw fetchError;

        // 2. Delete files from storage
        if (docs && docs.length > 0) {
            // Group by bucket to minimize calls (usually all in secure_documents)
            const bucket = docs[0].storage_bucket;
            const paths = docs.map(d => d.storage_path);

            const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove(paths);

            if (storageError) console.error('Error deleting folder files from storage:', storageError);
        }

        // 3. Delete folder from DB (Cascade will delete property_documents rows)
        const { error: dbError } = await supabase
            .from('document_folders')
            .delete()
            .eq('id', folderId);

        if (dbError) throw dbError;
    }

    async uploadDocument(
        file: File,
        metadata: {
            propertyId: string;
            category: DocumentCategory;
            folderId?: string; // New field
            title?: string;
            description?: string;
            amount?: number;
            documentDate?: string;
            periodStart?: string;
            periodEnd?: string;
            vendorName?: string;
            invoiceNumber?: string;
            issueType?: string;
            tags?: string[];
        }
    ): Promise<PropertyDocument> {
        let fileToUpload = file;

        // Compress if image
        if (CompressionService.isImage(file)) {
            try {
                fileToUpload = await CompressionService.compressImage(file);
            } catch (err) {
                console.warn('Compression skipped due to error:', err);
            }
        } else if (file.type.startsWith('video/')) {
            try {
                await CompressionService.validateVideo(file);
            } catch (err) {
                // For now, we just warn/error, but maybe we should allow with warning?
                // The validateVideo throws error if too large.
                throw err;
            }
        }

        // Check quota before upload using the possibly compressed size
        const quotaCheck = await this.canUploadFile(fileToUpload.size, metadata.category);

        if (!quotaCheck.allowed) {
            const usedMB = ((quotaCheck.currentUsage || 0) / 1024 / 1024).toFixed(1);
            const quotaMB = ((quotaCheck.quota || 0) / 1024 / 1024).toFixed(1);
            throw new Error(
                `Upload failed: ${quotaCheck.reason}. ` +
                `You're using ${usedMB} MB of ${quotaMB} MB. Please upgrade your plan.`
            );
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const bucket = this.getBucketForCategory(metadata.category);
        const storagePath = this.generateStoragePath(user.id, metadata.propertyId, metadata.category, file.name);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { data, error: dbError } = await supabase
            .from('property_documents')
            .insert({
                user_id: user.id,
                property_id: metadata.propertyId,
                folder_id: metadata.folderId, // Insert folder_id
                category: metadata.category,
                storage_bucket: bucket,
                storage_path: storagePath,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                title: metadata.title,
                description: metadata.description,
                amount: metadata.amount,
                document_date: metadata.documentDate,
                period_start: metadata.periodStart,
                period_end: metadata.periodEnd,
                vendor_name: metadata.vendorName,
                invoice_number: metadata.invoiceNumber,
                issue_type: metadata.issueType,
                tags: metadata.tags
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return data as PropertyDocument;
    }

    /**
     * Get all documents for a property
     */
    async getPropertyDocuments(
        propertyId: string,
        filters?: {
            category?: DocumentCategory;
            folderId?: string;
            dateFrom?: string;
            dateTo?: string;
            paid?: boolean;
        }
    ): Promise<PropertyDocument[]> {
        let query = supabase
            .from('property_documents')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (filters?.folderId) {
            query = query.eq('folder_id', filters.folderId);
        } else if (filters?.category) {
            // Only filter by category if folderId is NOT present (finding orphaned docs? or simple lists)
            // Actually probably safe to filter independently.
            query = query.eq('category', filters.category);
        }

        if (filters?.dateFrom) {
            query = query.gte('document_date', filters.dateFrom);
        }

        if (filters?.dateTo) {
            query = query.lte('document_date', filters.dateTo);
        }

        if (filters?.paid !== undefined) {
            query = query.eq('paid', filters.paid);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data as PropertyDocument[];
    }

    /**
     * Get a secure signed URL for a document
     * Expiration set to 1 hour (3600 seconds)
     */
    async getDocumentUrl(document: PropertyDocument): Promise<string> {
        const { data, error } = await supabase.storage
            .from(document.storage_bucket)
            .createSignedUrl(document.storage_path, 3600);

        if (error) {
            console.error('Error creating signed URL:', error);
            // Fallback to public if it was accidentally public or if error is just temporary
            const { data: publicData } = supabase.storage
                .from(document.storage_bucket)
                .getPublicUrl(document.storage_path);
            return publicData.publicUrl;
        }

        return data.signedUrl;
    }

    /**
     * Mark bill as paid
     */
    async markAsPaid(documentId: string, paymentDate: string): Promise<void> {
        const { error } = await supabase
            .from('property_documents')
            .update({ paid: true, payment_date: paymentDate })
            .eq('id', documentId);

        if (error) throw error;
    }

    /**
     * Mark bill as unpaid
     */
    async markAsUnpaid(documentId: string): Promise<void> {
        const { error } = await supabase
            .from('property_documents')
            .update({ paid: false, payment_date: null })
            .eq('id', documentId);

        if (error) throw error;
    }

    /**
     * Delete a document
     */
    async deleteDocument(documentId: string): Promise<void> {
        // Get document info
        const { data: doc, error: fetchError } = await supabase
            .from('property_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError) throw fetchError;
        if (!doc) throw new Error('Document not found');

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from(doc.storage_bucket)
            .remove([doc.storage_path]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
            .from('property_documents')
            .delete()
            .eq('id', documentId);

        if (dbError) throw dbError;
    }

    /**
     * Get utility bill analytics
     */
    async getUtilityAnalytics(
        propertyId: string,
        utilityType: 'water' | 'electric' | 'gas' | 'municipality' | 'management'
    ): Promise<{
        averageMonthly: number;
        trend: 'up' | 'down' | 'stable';
        yearOverYear: number;
        monthlyData: Array<{ month: string; amount: number }>;
    }> {
        const category = `utility_${utilityType}` as DocumentCategory;

        const { data, error } = await supabase
            .from('property_documents')
            .select('amount, document_date')
            .eq('property_id', propertyId)
            .eq('category', category)
            .not('amount', 'is', null)
            .order('document_date', { ascending: true });

        if (error) throw error;

        const bills = data as Array<{ amount: number; document_date: string }>;

        if (bills.length === 0) {
            return {
                averageMonthly: 0,
                trend: 'stable',
                yearOverYear: 0,
                monthlyData: []
            };
        }

        const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
        const average = total / bills.length;

        // Simple trend calculation (last 3 vs previous 3)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (bills.length >= 6) {
            const recent = bills.slice(-3).reduce((sum, b) => sum + b.amount, 0) / 3;
            const previous = bills.slice(-6, -3).reduce((sum, b) => sum + b.amount, 0) / 3;
            if (recent > previous * 1.05) trend = 'up';
            else if (recent < previous * 0.95) trend = 'down';
        }

        // YoY Calculation: Compare average of last 12 months vs previous 12 months
        let yearOverYear = 0;
        const latestDate = new Date(bills[bills.length - 1].document_date);
        const oneYearAgo = new Date(latestDate);
        oneYearAgo.setFullYear(latestDate.getFullYear() - 1);
        const twoYearsAgo = new Date(latestDate);
        twoYearsAgo.setFullYear(latestDate.getFullYear() - 2);

        const last12MonthsBills = bills.filter(b => {
            const d = new Date(b.document_date);
            return d > oneYearAgo && d <= latestDate;
        });

        const prev12MonthsBills = bills.filter(b => {
            const d = new Date(b.document_date);
            return d > twoYearsAgo && d <= oneYearAgo;
        });

        if (last12MonthsBills.length > 0 && prev12MonthsBills.length > 0) {
            const avgLast12 = last12MonthsBills.reduce((sum, b) => sum + b.amount, 0) / last12MonthsBills.length;
            const avgPrev12 = prev12MonthsBills.reduce((sum, b) => sum + b.amount, 0) / prev12MonthsBills.length;
            yearOverYear = ((avgLast12 - avgPrev12) / avgPrev12) * 100;
        }

        return {
            averageMonthly: average,
            trend,
            yearOverYear,
            monthlyData: bills.map(b => ({
                month: b.document_date,
                amount: b.amount
            }))
        };
    }

    /**
     * Check if a duplicate bill exists
     */
    async checkDuplicateBill(vendorName: string, documentDate: string, invoiceNumber: string, periodStart?: string, periodEnd?: string): Promise<PropertyDocument | null> {
        if (!vendorName || !documentDate || !invoiceNumber) return null;

        let query = supabase
            .from('property_documents')
            .select('*')
            .eq('vendor_name', vendorName)
            .eq('document_date', documentDate)
            .eq('invoice_number', invoiceNumber);

        if (periodStart) query = query.eq('period_start', periodStart);
        if (periodEnd) query = query.eq('period_end', periodEnd);

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.error('Error checking duplicate bill:', error);
            return null;
        }
        return data as PropertyDocument;
    }
}

export const propertyDocumentsService = new PropertyDocumentsService();
