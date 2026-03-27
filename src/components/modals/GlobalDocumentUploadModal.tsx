import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Upload, FileText, Image as ImageIcon, FileStack, Banknote, Building2, Check, Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property, DocumentCategory, Payment } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { CompressionService } from '../../services/compression.service';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import { DOCUMENT_CATEGORIES } from '../../constants/documentCategories';
import { UTILITY_TYPES } from '../../constants/utilityTypes';
import { useToast } from '../../hooks/useToast';
import imageCompression from 'browser-image-compression';
interface GlobalDocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
    initialPropertyId?: string;
    onSuccess: () => void;
}

export function GlobalDocumentUploadModal({ isOpen, onClose, properties, initialPropertyId, onSuccess }: GlobalDocumentUploadModalProps) {
    const { t, lang } = useTranslation();
    const { plan } = useSubscription();
    const { error: toastError, warning: toastWarning } = useToast();
    
    const [uploading, setUploading] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('documents' as DocumentCategory);
    
    const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
    const [paymentToApprove, setPaymentToApprove] = useState<Payment | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        description: string;
        documentDate: string;
        amount: string;
        checkNumber?: string;
        bankName?: string;
        branchNumber?: string;
    }>>([]);

    const [sharedFields, setSharedFields] = useState({
        billType: '',
        provider: '',
        billingPeriod: '', // Keep for backward compatibility during this object if needed, but we will add the new ones
        periodStart: '',
        periodEnd: '',
        title: '',
        globalDate: new Date().toISOString().split('T')[0],
        globalDescription: '',
        globalAmount: '',
        linkedPaymentId: '',
        paymentMethod: '',
        bank: '',
        branch: '',
        account: '',
        checkNumber: ''
    });

    // Reset when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedPropertyId(initialPropertyId || (properties.length === 1 ? properties[0].id : ''));
            setSelectedCategory('documents' as DocumentCategory);
            setStagedFiles([]);
            setPendingPayments([]);
            setSharedFields({
                billType: '',
                provider: '',
                billingPeriod: '',
                periodStart: '',
                periodEnd: '',
                title: '',
                globalDate: new Date().toISOString().split('T')[0],
                globalDescription: '',
                globalAmount: '',
                linkedPaymentId: '',
                paymentMethod: '',
                bank: '',
                branch: '',
                account: '',
                checkNumber: ''
            });
        }
    }, [isOpen, properties, initialPropertyId]);

    React.useEffect(() => {
        if (!selectedPropertyId || !isOpen) {
            setPendingPayments([]);
            return;
        }
        
        const fetchPendingPayments = async () => {
            try {
                const { data: contracts } = await supabase.from('contracts').select('id').eq('property_id', selectedPropertyId);
                const contractIds = contracts?.map(c => c.id) || [];
                if (contractIds.length > 0) {
                    const { data } = await supabase
                        .from('payments')
                        .select('*, contracts(*)')
                        .in('contract_id', contractIds)
                        .or('receipt_url.is.null,receipt_url.eq.""')
                        .order('due_date', { ascending: true });
                    if (data) setPendingPayments(data as any);
                } else {
                    setPendingPayments([]);
                }
            } catch (err) {
                console.error("Error fetching pending payments:", err);
            }
        };
        fetchPendingPayments();
    }, [selectedPropertyId, isOpen]);

    const categories = DOCUMENT_CATEGORIES
        .filter(cat => cat.allowManualUpload)
        .map(cat => ({
            id: (cat.id === 'receipts' ? 'receipt' : cat.id) as DocumentCategory,
            label: t(cat.labelKey) || (lang === 'he' ? cat.fallbackHe : cat.fallbackEn)
        }));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => {
                let initialDate = new Date().toISOString().split('T')[0];
                if (selectedCategory === 'media' && file.lastModified) {
                    try {
                        initialDate = new Date(file.lastModified).toISOString().split('T')[0];
                    } catch (err) {
                        console.error('Failed to parse file lastModified date', err);
                    }
                }

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    description: '',
                    amount: '',
                    documentDate: initialDate
                };
            });
            setStagedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const updateStagedFile = (id: string, field: string, value: string) => {
        setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const removeStagedFile = (id: string) => {
        setStagedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleUploadClick = async () => {
        if (!selectedPropertyId) {
            toastWarning(lang === 'he' ? 'אנא בחר נכס' : 'Please select a property');
            return;
        }

        if (stagedFiles.length === 0) {
            toastWarning(lang === 'he' ? 'אנא בחר לפחות קובץ אחד' : 'Please select at least one file');
            return;
        }

        // Pre-validate file sizes to prevent INT overflow in Postgres
        for (const staged of stagedFiles) {
            if (staged.file.size > 2147483000) { // ~2GB
                toastError(lang === 'he' ? 'הקובץ גדול מדי. הגודל המקסימלי הוא 2GB' : 'File is too large. Maximum size is 2GB');
                return;
            }
        }

        if (selectedCategory === 'receipt' && sharedFields.linkedPaymentId) {
            const payment = pendingPayments.find(p => p.id === sharedFields.linkedPaymentId);
            if (payment) {
                setUploading(true);
                try {
                    let file = stagedFiles[0].file;
                    
                    // Compress image if applicable
                    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
                        try {
                            const compressedBlob = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                            file = new File([compressedBlob], file.name, { type: compressedBlob.type, lastModified: Date.now() });
                        } catch (err) {
                            console.error('Image compression failed:', err);
                        }
                    }

                    const fileExt = file.name.split('.').pop() || 'jpg';
                    const fileName = `${Math.random().toString(36).substr(2, 9)}_${Date.now()}.${fileExt}`;
                    const filePath = `receipts/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('property-images')
                        .upload(filePath, file);
                        
                    if (uploadError) throw uploadError;

                    setPaymentToApprove({ 
                        ...payment, 
                        receipt_url: filePath,
                        payment_method: sharedFields.paymentMethod || payment.payment_method,
                        amount: sharedFields.globalAmount ? parseFloat(sharedFields.globalAmount) : payment.amount,
                        paid_date: sharedFields.globalDate || payment.due_date,
                        details: {
                            ...(payment.details || {}),
                            bank: sharedFields.bank || payment.details?.bank,
                            branch: sharedFields.branch || payment.details?.branch,
                            account: sharedFields.account || payment.details?.account,
                            checkNumber: sharedFields.checkNumber || payment.details?.checkNumber,
                        }
                    } as any);
                    setIsPaymentModalOpen(true);
                } catch (err: any) {
                    console.error('Failed to link payment receipt:', err);
                    toastError(t('error'), err.message || 'Error attaching receipt');
                } finally {
                    setUploading(false);
                }
                return; // Prevent standard document upload
            }
        }

        setUploading(true);
        try {
            let batchFolderId: string | undefined = undefined;
            if (selectedCategory === 'media') {
                try {
                    const finalDate = sharedFields.globalDate || new Date().toISOString().split('T')[0];
                    const folder = await propertyDocumentsService.createFolder({
                        property_id: selectedPropertyId,
                        category: 'photo',
                        name: sharedFields.title || `Media Upload ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
                        folder_date: finalDate,
                        description: sharedFields.globalDescription || ''
                    });
                    batchFolderId = folder.id;
                } catch (err) {
                    console.warn('Failed to create media folder, proceeding without folderId', err);
                }
            } else if (['utilities', 'documents', 'receipt'].includes(selectedCategory) && stagedFiles.length > 1) {
                batchFolderId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }
            
            const uploadPromises = stagedFiles.map(async (stagedFile) => {
                const isShared = ['utilities', 'documents', 'receipt'].includes(selectedCategory);
                
                // For shared categories, use shared fields. Otherwise use per-file fields.
                const finalAmount = isShared ? sharedFields.globalAmount : stagedFile.amount;
                const finalDate = isShared ? sharedFields.globalDate : stagedFile.documentDate;
                const baseDesc = stagedFile.description;
                const finalTitle = isShared && sharedFields.title ? sharedFields.title : stagedFile.file.name;

                // Format metadata into description for robust saving of non-native DB fields
                let metaDataString = '';
                if (selectedCategory === 'receipt') {
                    const parts = [];
                    if (['transfer', 'checks'].includes(sharedFields.paymentMethod)) {
                        if (sharedFields.bank) parts.push(`בנק: ${sharedFields.bank}`);
                        if (sharedFields.branch) parts.push(`סניף: ${sharedFields.branch}`);
                        if (sharedFields.paymentMethod === 'transfer' && sharedFields.account) parts.push(`חשבון: ${sharedFields.account}`);
                        if (sharedFields.paymentMethod === 'checks' && sharedFields.checkNumber) parts.push(`מס' צ'ק: ${sharedFields.checkNumber}`);
                    }
                    metaDataString = parts.length > 0 ? parts.join(' | ') + '\n\n' : '';
                } else if (selectedCategory === 'checks') {
                    const parts = [];
                    if (stagedFile.bankName) parts.push(`בנק: ${stagedFile.bankName}`);
                    if (stagedFile.branchNumber) parts.push(`סניף: ${stagedFile.branchNumber}`);
                    if (stagedFile.checkNumber) parts.push(`מס' צ'ק: ${stagedFile.checkNumber}`);
                    metaDataString = parts.length > 0 ? parts.join(' | ') + '\n\n' : '';
                }

                const finalDescCombined = metaDataString + (baseDesc || '');

                let fileToUpload = stagedFile.file;
                
                // Compress image if applicable
                if (fileToUpload.type.startsWith('image/') && fileToUpload.type !== 'image/svg+xml' && fileToUpload.type !== 'image/gif') {
                    try {
                        const compressedBlob = await imageCompression(fileToUpload, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                        fileToUpload = new File([compressedBlob], fileToUpload.name, { type: compressedBlob.type, lastModified: Date.now() });
                    } catch (err) {
                        console.error('Image compression failed:', err);
                    }
                }

                let finalCategory = selectedCategory as string;
                if (selectedCategory === 'utilities') {
                    finalCategory = sharedFields.billType 
                        ? (sharedFields.billType.startsWith('utility_') ? sharedFields.billType : `utility_${sharedFields.billType}`) 
                        : 'utility_other';
                } else if (selectedCategory === 'documents') {
                    finalCategory = 'other';
                } else if (selectedCategory === 'media') {
                    finalCategory = fileToUpload.type.startsWith('video/') ? 'video' : 'photo';
                } else if (selectedCategory === 'receipt' || selectedCategory === 'receipts' as any) {
                    finalCategory = 'receipt';
                }

                return propertyDocumentsService.uploadDocument(fileToUpload, {
                    propertyId: selectedPropertyId,
                    category: finalCategory as DocumentCategory,
                    folderId: batchFolderId,
                    title: finalTitle,
                    description: finalDescCombined.trim(),
                    documentDate: finalDate,
                    amount: finalAmount ? parseFloat(finalAmount) : undefined,
                    periodStart: sharedFields.periodStart || undefined,
                    periodEnd: sharedFields.periodEnd || undefined,
                    issueType: selectedCategory === 'receipt' ? sharedFields.paymentMethod : undefined,
                    vendorName: selectedCategory === 'utilities' ? sharedFields.provider : undefined,
                    invoiceNumber: selectedCategory === 'checks' ? stagedFile.checkNumber : undefined,
                });
            });

            await Promise.all(uploadPromises);
            onSuccess();
        } catch (error: any) {
            console.error('Upload failed:', error);
            let msg = error.message;
            if (msg?.includes('integer out of range')) {
                msg = lang === 'he' ? 'הקובץ גדול מדי' : 'File is too large';
            } else if (msg?.includes('mime type') && msg?.includes('not supported')) {
                msg = lang === 'he' ? 'סוג קובץ זה אינו נתמך להעלאה' : 'This file type is not supported';
            }
            toastError(t('error'), msg);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 pb-24 md:pb-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-window rounded-2xl shadow-2xl w-full max-w-2xl max-h-[75vh] md:max-h-[85vh] overflow-hidden flex flex-col relative"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-background/50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                <Upload className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">
                                {lang === 'he' ? 'העלאת מסמך חדש' : 'Upload New Document'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted/50 rounded-full transition-colors text-slate-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 pb-40 overflow-y-auto space-y-5 flex-1 relative custom-scrollbar">
                        
                        {/* 1 & 2. Top Level Selections */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Property Selection */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
                                    {lang === 'he' ? 'בחר נכס משויך' : 'Select Property'}
                                </label>
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-background dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none font-medium text-foreground"
                                >
                                    <option value="" disabled>{lang === 'he' ? '-- בחר נכס --' : '-- Select Property --'}</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.address}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500 dark:text-neutral-400" />
                                    {lang === 'he' ? 'סוג מסמך' : 'Document Type'}
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                                    className="w-full px-3 py-2.5 bg-background dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none font-medium text-foreground"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Shared Fields (For Utilities, Documents, Receipts) */}
                        {['utilities', 'documents', 'receipt'].includes(selectedCategory) && (
                            <div className="space-y-3 bg-white/5 dark:bg-neutral-900 p-4 rounded-xl border border-border/50 shadow-sm mt-4">
                                <h4 className="text-sm font-bold text-foreground">
                                    {selectedCategory === 'utilities' ? (lang === 'he' ? 'פרטי החשבון (יחול על כל הקבצים)' : 'Utility Details') :
                                     selectedCategory === 'receipt' ? (lang === 'he' ? 'פרטי אסמכתא' : 'Receipt Details') :
                                     (lang === 'he' ? 'פרטי המסמכים (יחול על הכל)' : 'Document Details')}
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedCategory === 'utilities' && (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'סוג חשבון' : 'Bill Type'}</label>
                                                <select value={sharedFields.billType} onChange={e => setSharedFields(s => ({ ...s, billType: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl">
                                                    <option value="">{lang === 'he' ? '-- בחר --' : '-- Select --'}</option>
                                                    {UTILITY_TYPES.map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {t(u.labelKey) !== u.labelKey && t(u.labelKey) ? t(u.labelKey) : (lang === 'he' ? u.fallbackHe : u.fallbackEn)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'תאריך חשבונית' : 'Invoice Date'}</label>
                                                <DatePicker
                                                    value={sharedFields.globalDate ? parseISO(sharedFields.globalDate) : undefined}
                                                    onChange={(date) => setSharedFields(s => ({ ...s, globalDate: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                                    className="w-full rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'ספק (אופציונלי)' : 'Provider'}</label>
                                                <input type="text" value={sharedFields.provider} onChange={e => setSharedFields(s => ({ ...s, provider: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'סכום' : 'Amount'} (₪)</label>
                                                <input type="number" value={sharedFields.globalAmount} onChange={e => setSharedFields(s => ({ ...s, globalAmount: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'תקופת חיוב' : 'Billing Period'}</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="date" 
                                                        title={lang === 'he' ? 'תאריך התחלה' : 'Start Date'} 
                                                        value={sharedFields.periodStart} 
                                                        onChange={e => setSharedFields(s => ({ ...s, periodStart: e.target.value }))} 
                                                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl text-sm" 
                                                    />
                                                    <span className="text-slate-400">-</span>
                                                    <input 
                                                        type="date" 
                                                        title={lang === 'he' ? 'תאריך סיום' : 'End Date'} 
                                                        value={sharedFields.periodEnd} 
                                                        onChange={e => setSharedFields(s => ({ ...s, periodEnd: e.target.value }))} 
                                                        className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl text-sm" 
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedCategory === 'documents' && (
                                        <div className="col-span-2">
                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'כותרת (אופציונלי)' : 'Title'}</label>
                                            <input type="text" placeholder={lang === 'he' ? 'ברירת מחדל: שם הקובץ' : 'Default: File name'} value={sharedFields.title} onChange={e => setSharedFields(s => ({ ...s, title: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                        </div>
                                    )}

                                    {selectedCategory === 'receipt' && (
                                        <>
                                            <div className="col-span-2">
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'שיוך לתשלום ממתין (אופציונלי)' : 'Link to Pending Payment'}</label>
                                                <select 
                                                    value={sharedFields.linkedPaymentId} 
                                                    onChange={e => {
                                                        const paymentId = e.target.value;
                                                        const payment = pendingPayments.find(p => p.id === paymentId);
                                                        if (payment) {
                                                            setSharedFields(s => ({
                                                                ...s,
                                                                linkedPaymentId: paymentId,
                                                                globalAmount: (payment.paid_amount || payment.amount)?.toString() || '',
                                                                globalDate: payment.paid_date || payment.due_date || s.globalDate,
                                                                paymentMethod: payment.payment_method || '',
                                                                bank: payment.details?.bank || '',
                                                                branch: payment.details?.branch || '',
                                                                account: payment.details?.account || '',
                                                                checkNumber: payment.details?.checkNumber || '',
                                                            }));
                                                        } else {
                                                            setSharedFields(s => ({ ...s, linkedPaymentId: paymentId }));
                                                        }
                                                    }} 
                                                    className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl"
                                                >
                                                    <option value="">{lang === 'he' ? '-- ללא שיוך --' : '-- No Link --'}</option>
                                                    {pendingPayments.map(p => {
                                                        const statusText = p.status === 'paid' ? (lang === 'he' ? 'שולם' : 'Paid') :
                                                                         p.status === 'overdue' ? (lang === 'he' ? 'באיחור' : 'Overdue') :
                                                                         (lang === 'he' ? 'ממתין' : 'Pending');
                                                        return (
                                                            <option key={p.id} value={p.id}>
                                                                {new Date(p.due_date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })} - ₪{p.amount.toLocaleString()} ({statusText})
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('amount')} (₪)</label>
                                                <input type="number" value={sharedFields.globalAmount} onChange={e => setSharedFields(s => ({ ...s, globalAmount: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'אמצעי תשלום' : 'Payment Method'}</label>
                                                <select value={sharedFields.paymentMethod} onChange={e => setSharedFields(s => ({ ...s, paymentMethod: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl">
                                                    <option value="">{lang === 'he' ? '-- בחר --' : '-- Select --'}</option>
                                                    <option value="transfer">{t('transfer') || (lang === 'he' ? 'העברה בנקאית' : 'Bank Transfer')}</option>
                                                    <option value="checks">{t('checks') || (lang === 'he' ? 'צ\'ק' : 'Check')}</option>
                                                    <option value="cash">{t('cash') || (lang === 'he' ? 'מזומן' : 'Cash')}</option>
                                                    <option value="bit">{t('bit') || 'Bit'}</option>
                                                    <option value="paybox">{t('paybox') || 'Paybox'}</option>
                                                    <option value="other">{t('other') || (lang === 'he' ? 'אחר' : 'Other')}</option>
                                                </select>
                                            </div>

                                            {(sharedFields.paymentMethod === 'transfer' || sharedFields.paymentMethod === 'checks') && (
                                                <div className="col-span-2 my-2">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'בנק' : 'Bank'}</label>
                                                            <input type="text" value={sharedFields.bank} onChange={e => setSharedFields(s => ({ ...s, bank: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'סניף' : 'Branch'}</label>
                                                            <input type="text" value={sharedFields.branch} onChange={e => setSharedFields(s => ({ ...s, branch: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                                        </div>
                                                        {sharedFields.paymentMethod === 'transfer' ? (
                                                            <div className="col-span-2">
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'חשבון' : 'Account'}</label>
                                                                <input type="text" value={sharedFields.account} onChange={e => setSharedFields(s => ({ ...s, account: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                                            </div>
                                                        ) : (
                                                            <div className="col-span-2">
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'מספר צ\'ק' : 'Check Number'}</label>
                                                                <input type="text" value={sharedFields.checkNumber} onChange={e => setSharedFields(s => ({ ...s, checkNumber: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/50 rounded-xl" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Universal Shared Fields */}
                                    {selectedCategory !== 'utilities' && (
                                        <div className="col-span-2">
                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('date') !== 'date' ? t('date') : (lang === 'he' ? 'תאריך' : 'Date')}</label>
                                            <DatePicker
                                                value={sharedFields.globalDate ? parseISO(sharedFields.globalDate) : undefined}
                                                onChange={(date) => setSharedFields(s => ({ ...s, globalDate: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                                className="w-full rounded-xl"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. File Upload */}
                        <div className="space-y-3">
                            <div className="group relative">
                                <input
                                    type="file"
                                    multiple
                                    accept={selectedCategory === 'media' ? "image/*,video/*" : ".pdf,.doc,.docx,image/*"}
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full py-6 border-2 border-dashed border-primary/30 rounded-2xl group-hover:bg-primary/5 dark:group-hover:bg-primary/10 transition-all flex flex-col items-center justify-center text-center gap-2 bg-white/5 dark:bg-neutral-900">
                                    <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            {lang === 'he' ? 'לחץ או גרור קבצים לכאן' : 'Click or drop files here'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {selectedCategory === 'media' ? 'MP4, MOV, JPG, PNG, WEBP' : 'PDF, DOCX, JPG, PNG'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Staged Files Preview */}
                            {stagedFiles.length > 0 && (
                                <div className="space-y-3 mt-6">
                                    <h4 className="text-sm font-bold text-foreground">{lang === 'he' ? 'קבצים שנבחרו' : 'Selected Files'}</h4>
                                    <div className="grid gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        {stagedFiles.map((file) => (
                                            <div key={file.id} className="relative group bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-border/50 shadow-sm">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-primary/5 rounded-xl border border-primary/10 text-primary">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground truncate max-w-[200px]" title={file.file.name}>
                                                            {file.file.name}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => removeStagedFile(file.id)}
                                                        className="p-1.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Individual Fields strictly for non-shared categories */}
                                                {!['utilities', 'documents', 'receipt'].includes(selectedCategory) && (
                                                    selectedCategory === 'checks' ? (
                                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                                            <div className="col-span-2">
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'תאריך פירעון' : 'Due Date'}</label>
                                                                <DatePicker value={file.documentDate ? parseISO(file.documentDate) : undefined} onChange={(date) => updateStagedFile(file.id, 'documentDate', date ? format(date, 'yyyy-MM-dd') : '')} className="w-full rounded-xl" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'בנק' : 'Bank'}</label>
                                                                <input type="text" value={file.bankName || ''} onChange={(e) => updateStagedFile(file.id, 'bankName', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'סניף' : 'Branch'}</label>
                                                                <input type="text" value={file.branchNumber || ''} onChange={(e) => updateStagedFile(file.id, 'branchNumber', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{lang === 'he' ? 'מספר צ\'ק' : 'Check Number'}</label>
                                                                <input type="text" value={file.checkNumber || ''} onChange={(e) => updateStagedFile(file.id, 'checkNumber', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('amount')} (₪)</label>
                                                                <input type="number" value={file.amount} onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                <div className={selectedCategory === 'media' ? "col-span-2" : ""}>
                                                                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                                                                        {selectedCategory === 'media' ? (lang === 'he' ? 'תאריך צילום' : 'Date Taken') : t('date')}
                                                                    </label>
                                                                    <DatePicker
                                                                        value={file.documentDate ? parseISO(file.documentDate) : undefined}
                                                                        onChange={(date) => updateStagedFile(file.id, 'documentDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                        className="w-full rounded-xl"
                                                                    />
                                                                </div>
                                                                {selectedCategory !== 'media' && (
                                                                    <div>
                                                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('amount')} (₪)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={file.amount}
                                                                            onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                                                            placeholder="0.00"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )
                                                )}

                                                {/* Individual Description for ALL files */}
                                                <div className="mt-3">
                                                    <input
                                                        type="text"
                                                        value={file.description}
                                                        onChange={(e) => updateStagedFile(file.id, 'description', e.target.value)}
                                                        className="w-full px-4 py-2 text-sm bg-muted/30 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-primary rounded-xl transition-all outline-none"
                                                        placeholder={lang === 'he' ? 'הוסף הערה או תיאור לקובץ זה...' : 'Add note or description for this file...'}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions - Floating */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-window via-window/95 to-transparent pt-12 flex gap-4 pointer-events-none z-10 border-t border-transparent">
                        <button
                            onClick={onClose}
                            className="pointer-events-auto px-6 py-3 font-semibold text-muted-foreground bg-muted/90 backdrop-blur hover:bg-muted dark:bg-neutral-800/90 dark:hover:bg-neutral-700/90 rounded-2xl transition-all shadow-sm border border-border/50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading || stagedFiles.length === 0 || !selectedPropertyId}
                            className={`
                                pointer-events-auto flex-1 px-6 py-3 font-black text-white rounded-2xl shadow-xl 
                                flex items-center justify-center gap-2 transition-all backdrop-blur-sm
                                ${uploading || stagedFiles.length === 0 || !selectedPropertyId
                                    ? 'bg-primary/50 cursor-not-allowed shadow-none'
                                    : 'bg-primary hover:bg-primary/95 hover:scale-[1.02] hover:shadow-primary/30 active:scale-95'
                                }
                            `}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('processing')}
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    {lang === 'he' ? 'שמור מסמך' : 'Save Document'}
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Payment Details Modal (Triggered when linking receipt) */}
            {isPaymentModalOpen && paymentToApprove && (
                <div className="fixed z-[200]">
                    <PaymentDetailsModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        payment={paymentToApprove}
                        onSuccess={() => {
                            setIsPaymentModalOpen(false);
                            onClose(); // Close the global upload modal
                            if (onSuccess) onSuccess(); // Refresh lists
                        }}
                        initialEditMode={true}
                        initialStatus="paid"
                    />
                </div>
            )}
        </AnimatePresence>
    );
}

export default GlobalDocumentUploadModal;
