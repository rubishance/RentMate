import { AnimatePresence, motion } from 'framer-motion';
import { X, FileText, Calendar, DollarSign, Download, Trash2, ExternalLink, Tag, User, MapPin, Building, Hash, CreditCard, Pencil, Save, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../../hooks/useTranslation';
import type { PropertyDocument } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useState, useEffect } from 'react';
import { getUtilityTypeConfig } from '../../constants/utilityTypes';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { createPortal } from 'react-dom';

interface ExtendedPropertyDocument extends PropertyDocument {
    isMediaGroup?: boolean;
    groupedDocs?: PropertyDocument[];
}

interface DocumentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: ExtendedPropertyDocument | null;
    onDelete?: (id: string) => void;
    onUpdate?: (doc: PropertyDocument) => void;
}

export function DocumentDetailsModal({ isOpen, onClose, document, onDelete, onUpdate }: DocumentDetailsModalProps) {
    const { t, lang } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<PropertyDocument>>({});
    const [virtualFields, setVirtualFields] = useState<Record<string, string>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Reset editing state and extract legacy metadata when modal opens/closes or document changes
    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            setVirtualFields({});
        } else if (document && !isEditing) {
            let extractedVendor = document.vendor_name;
            let extractedInvoice = document.invoice_number;
            let desc = document.description || '';
            const vFields: Record<string, string> = {};

            // Parse legacy utility metadata
            if (desc.includes('סוג חשבון:') || desc.includes('ספק:')) {
                const parts = desc.split('\n\n');
                const metaLine = parts[0];
                const metaParts = metaLine.split(' | ');
                metaParts.forEach(p => {
                    const [k, v] = p.split(': ');
                    if (k?.trim() === 'סוג חשבון' && v) vFields['billType'] = v.trim();
                    if (k?.trim() === 'ספק' && v && !extractedVendor) extractedVendor = v.trim(); // Map to real field
                });
                desc = parts.slice(1).join('\n\n');
            }
            // Parse legacy receipt/checks metadata
            else if (desc.includes('בנק:') || desc.includes("מס' צ'ק:") || desc.includes("אמצעי תשלום:")) {
                const parts = desc.split('\n\n');
                const metaLine = parts[0];
                const metaParts = metaLine.split(' | ');
                metaParts.forEach(p => {
                    const [k, v] = p.split(': ');
                    if (k?.trim() === 'בנק' && v) vFields['bank'] = v.trim();
                    if (k?.trim() === 'סניף' && v) vFields['branch'] = v.trim();
                    if (k?.trim() === 'חשבון' && v) vFields['account'] = v.trim();
                    if (k?.trim() === "מס' צ'ק" && v && !extractedInvoice) extractedInvoice = v.trim(); // Map to real field
                    if (k?.trim() === 'אמצעי תשלום' && v) vFields['paymentMethod'] = v.trim();
                });
                desc = parts.slice(1).join('\n\n');
            }

            setFormData({
                ...document,
                vendor_name: extractedVendor,
                invoice_number: extractedInvoice,
                description: desc
            });
            setVirtualFields(vFields);
        }
    }, [isOpen, document, isEditing]);

    if (!document) return null;

    const executeDelete = async () => {
        setIsDeleting(true);
        try {
            await propertyDocumentsService.deleteDocument(document.id);
            if (onDelete) onDelete(document.id);
            onClose();
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        if (!document) return;
        setIsSaving(true);
        try {
            const updated = await propertyDocumentsService.updateDocument(document.id, formData);
            if (onUpdate) onUpdate({...document, ...formData} as PropertyDocument);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating document:', error);
            alert('Failed to update document');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadSingle = async (docToDownload: PropertyDocument) => {
        try {
            const url = await propertyDocumentsService.getDocumentUrl(docToDownload);
            if (!url) return;

            // Create a temporary link and trigger download
            const link = window.document.createElement('a');
            link.href = url;
            link.download = docToDownload.file_name || 'document';
            link.target = '_blank';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download document');
        }
    };

    const handleDownload = async () => {
        if (!document) return;
        
        if (document.isMediaGroup && document.groupedDocs) {
            for (let i = 0; i < document.groupedDocs.length; i++) {
                await handleDownloadSingle(document.groupedDocs[i]);
                await new Promise(resolve => setTimeout(resolve, 300)); // Delay to prevent browser blocking multiple downloads
            }
        } else {
            await handleDownloadSingle(document as PropertyDocument);
        }
    };

    const formattedDate = document.document_date ? format(parseISO(document.document_date), 'dd/MM/yyyy') : null;
    const formattedCreated = format(new Date(document.created_at), 'dd/MM/yyyy HH:mm');
    const isFinancial = ['receipt', 'receipts', 'check', 'checks', 'utilities'].includes(document.category as string) || !!document.category?.startsWith('utility_');

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-window rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh] z-10 mt-auto sm:mt-0 pb-6 sm:pb-0"
                        >
                            {/* Header */}
                            {isEditing ? (
                                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-neutral-800 bg-window">
                                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 pr-4 w-full">
                                        <div className="p-2 sm:p-6 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.title || formData.file_name || ''}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="text-xl font-bold bg-transparent border-b-2 border-brand-500 focus:outline-none w-full pb-1 text-foreground"
                                            placeholder={lang === 'he' ? 'כותרת המסמך' : 'Document Title'}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-muted/50 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-400"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative shrink-0 px-6 pt-6 pb-8 bg-primary text-primary-foreground shadow-lg flex flex-col w-full z-10 border-b border-white/10">
                                    <div className="flex items-start justify-between w-full mb-4">
                                        <div className="inline-flex items-center gap-2 px-2 sm:px-6 py-1 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 text-xs font-black uppercase tracking-widest shadow-lg">
                                            <FileText className="w-3.5 h-3.5 text-white" />
                                            <span className="text-white">
                                                {document.category === 'media' ? (lang === 'he' ? 'מדיה' : 'Media') : (
                                                    document.category?.startsWith('utility_') ? 
                                                        (lang === 'he' ? getUtilityTypeConfig(document.category.replace('utility_', ''))?.fallbackHe : getUtilityTypeConfig(document.category.replace('utility_', ''))?.fallbackEn) || document.category 
                                                        : (t(document.category as any) !== document.category ? t(document.category as any) : document.category)
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 shadow-sm"
                                                title={lang === 'he' ? 'עריכה' : 'Edit'}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={onClose}
                                                className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 shadow-sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.title ?? document.title ?? document.file_name ?? ''}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder={lang === 'he' ? 'שם מסמך' : 'Document Title'}
                                                className="w-full text-2xl sm:text-3xl font-black tracking-tighter bg-white/20 text-white placeholder:text-white/50 border border-white/30 rounded-lg px-2 sm:px-6 py-1 focus:ring-2 focus:ring-white/50 focus:outline-none"
                                            />
                                        ) : (
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white leading-tight break-words line-clamp-2">
                                                {document.title || document.file_name}
                                            </h2>
                                        )}
                                        {document.document_date && (
                                            <div className="flex items-center gap-2 text-white/80 font-medium text-sm mt-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>{format(parseISO(document.document_date), 'dd/MM/yyyy')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-6 overflow-y-auto space-y-8 bg-background dark:bg-black w-full flex-1">
                                {/* Key Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-6 bg-background dark:bg-neutral-800/50 rounded-2xl border border-slate-100 dark:border-neutral-800 ${!(isFinancial || document.amount != null) ? 'col-span-2' : ''}`}>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {document.category === 'media' ? (lang === 'he' ? 'תאריך צילום' : 'Date Taken') : (t('date') || (lang === 'he' ? 'תאריך' : 'Date'))}
                                        </p>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={formData.document_date ? formData.document_date.split('T')[0] : ''}
                                                onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                                                className="w-full text-sm font-black bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 sm:px-6 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            />
                                        ) : (
                                            <p className="text-sm font-black text-foreground">
                                                {formattedDate || t('noDate') || (lang === 'he' ? 'לא הוזן יום' : 'No Date')}
                                            </p>
                                        )}
                                    </div>
                                    {(isFinancial || document.amount != null) && (
                                        <div className="p-6 bg-background dark:bg-neutral-800/50 rounded-2xl border border-slate-100 dark:border-neutral-800">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" /> {t('amount') || (lang === 'he' ? 'סכום' : 'Amount')}
                                            </p>
                                            {isEditing ? (
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₪</span>
                                                    <input
                                                        type="number"
                                                        value={formData.amount || ''}
                                                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || undefined })}
                                                        className="w-full text-sm font-black bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg pl-8 pr-3 py-2 text-left focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm font-black text-foreground">
                                                    {document.amount != null ? `₪${document.amount.toLocaleString()}` : t('noAmount') || (lang === 'he' ? 'לא הוזן סכום' : 'No Amount')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Details Grid */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                                        {t('additionalMetadata') !== 'additionalMetadata' ? t('additionalMetadata') : (lang === 'he' ? 'פרטים נוספים' : 'Additional Info')}
                                    </h3>
                                    <div className="bg-background/50 dark:bg-neutral-800/30 rounded-2xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800">
                                        
                                        {/* Vendor / Tenant */}
                                        {((isEditing && isFinancial) || (!isEditing && document.vendor_name) || (isEditing && document.vendor_name)) && (
                                            <div className="flex items-center justify-between p-6">
                                                <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                    <Building className="w-4 h-4" />
                                                    <span className="text-sm font-medium">
                                                        {['receipt', 'receipts', 'check', 'checks'].includes(document.category as string) ? 
                                                            (t('tenant') !== 'tenant' ? t('tenant') : (lang === 'he' ? 'שוכר' : 'Tenant')) : 
                                                            (t('vendor') !== 'vendor' ? t('vendor') : (lang === 'he' ? 'איש מקצוע/ספק' : 'Vendor'))}
                                                    </span>
                                                </div>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={formData.vendor_name || ''}
                                                        onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                                        className="w-1/2 text-sm font-bold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 sm:px-6 py-2 focus:ring-2 focus:ring-brand-500"
                                                        placeholder={lang === 'he' ? 'הזן שם' : 'Enter name'}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-bold text-foreground">
                                                        {document.vendor_name}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Invoice Number */}
                                        {((isEditing && isFinancial) || (!isEditing && document.invoice_number) || (isEditing && document.invoice_number)) && (
                                            <div className="flex items-center justify-between p-6">
                                                <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                    <Hash className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{t('invoiceNumber') !== 'invoiceNumber' ? t('invoiceNumber') : (lang === 'he' ? 'מספר סימוכין' : 'Invoice Number')}</span>
                                                </div>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={formData.invoice_number || ''}
                                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                                        className="w-1/2 text-sm font-bold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 sm:px-6 py-2 focus:ring-2 focus:ring-brand-500"
                                                        placeholder={lang === 'he' ? 'הזן מספר סימוכין' : 'Enter invoice #'}
                                                    />
                                                ) : (
                                                    <span className="text-sm font-bold text-foreground">
                                                        {document.invoice_number}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Virtual Fields (Bank, Branch, Account) */}
                                        {(virtualFields.bank || virtualFields.branch || virtualFields.account) && (
                                            <>
                                                {virtualFields.bank && (
                                                    <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-neutral-800">
                                                        <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                            <Building className="w-4 h-4" />
                                                            <span className="text-sm font-medium">{lang === 'he' ? 'בנק' : 'Bank'}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">{virtualFields.bank}</span>
                                                    </div>
                                                )}
                                                {virtualFields.branch && (
                                                    <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-neutral-800">
                                                        <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                            <MapPin className="w-4 h-4" />
                                                            <span className="text-sm font-medium">{lang === 'he' ? 'סניף' : 'Branch'}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">{virtualFields.branch}</span>
                                                    </div>
                                                )}
                                                {virtualFields.account && (
                                                    <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-neutral-800">
                                                        <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                            <Hash className="w-4 h-4" />
                                                            <span className="text-sm font-medium">{lang === 'he' ? 'חשבון' : 'Account'}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">{virtualFields.account}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Payment Method (Issue Type) */}
                                        {document.issue_type && (
                                            <div className="flex items-center justify-between p-6">
                                                <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                    <CreditCard className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{lang === 'he' ? 'אמצעי תשלום' : 'Payment Method'}</span>
                                                </div>
                                                <span className="text-sm font-bold text-foreground">
                                                    {t(document.issue_type) !== document.issue_type ? t(document.issue_type) : document.issue_type}
                                                </span>
                                            </div>
                                        )}

                                        {/* Period */}
                                        {((isEditing && isFinancial) || (!isEditing && (document.period_start || document.period_end)) || (isEditing && (document.period_start || document.period_end))) && (
                                            <div className="flex items-center justify-between p-6">
                                                <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{t('billingPeriod') !== 'billingPeriod' ? t('billingPeriod') : (lang === 'he' ? 'תקופת חיוב' : 'Billing Period')}</span>
                                                </div>
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="date"
                                                            value={formData.period_start ? formData.period_start.split('T')[0] : ''}
                                                            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                                                            className="w-28 text-xs font-bold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 py-2 focus:ring-2 focus:ring-brand-500"
                                                        />
                                                        <span className="text-slate-400">-</span>
                                                        <input
                                                            type="date"
                                                            value={formData.period_end ? formData.period_end.split('T')[0] : ''}
                                                            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                                                            className="w-28 text-xs font-bold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 py-2 focus:ring-2 focus:ring-brand-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-bold text-foreground">
                                                        {document.period_start ? format(parseISO(document.period_start), 'dd/MM/yy') : ''}
                                                        {document.period_start && document.period_end ? ' - ' : ''}
                                                        {document.period_end ? format(parseISO(document.period_end), 'dd/MM/yy') : ''}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Category */}
                                        <div className="flex items-center justify-between p-6">
                                            <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                <Tag className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('category') !== 'category' ? t('category') : (lang === 'he' ? 'קטגוריה' : 'Category')}</span>
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 bg-brand-500/10 text-brand-500 rounded-xl uppercase tracking-wider">
                                                {(document.category as string) === 'receipt' || (document.category as string) === 'receipts' ? (lang === 'he' ? 'אסמכתאות' : 'Receipts') :
                                                 (document.category as string) === 'media' || (document.category as string) === 'photo' || (document.category as string) === 'video' ? (lang === 'he' ? 'מדיה' : 'Media') :
                                                 (document.category as string) === 'other' || (document.category as string) === 'document' || (document.category as string) === 'contract' ? (lang === 'he' ? 'מסמכים' : 'Documents') :
                                                 (document.category as string) === 'checks' || (document.category as string) === 'check' ? (lang === 'he' ? "צ'קים" : 'Checks') :
                                                 document.category?.startsWith('utility') ? (lang === 'he' ? 'חשבונות' : 'Utilities') :
                                                 (t(document.category) !== document.category ? t(document.category) : document.category)}
                                            </span>
                                        </div>

                                        {/* Sub-Category (Utilities) */}
                                        {document.category?.startsWith('utility_') && (
                                            <div className="flex items-center justify-between p-6">
                                                <div className="flex items-center gap-2 sm:gap-4 text-slate-400">
                                                    <Tag className="w-4 h-4 opacity-70" />
                                                    <span className="text-sm font-medium">{lang === 'he' ? 'סוג חשבון' : 'Utility Type'}</span>
                                                </div>
                                                <span className="text-sm font-bold text-foreground">
                                                    {(lang === 'he' ? getUtilityTypeConfig(document.category.replace('utility_', ''))?.fallbackHe : getUtilityTypeConfig(document.category.replace('utility_', ''))?.fallbackEn) || document.category.replace('utility_', '')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                                            {document.category === 'media' ? (lang === 'he' ? 'תיאור' : 'Description') : (t('note') !== 'note' ? t('note') : (lang === 'he' ? 'הערות' : 'Note'))}
                                        </h3>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full text-sm leading-relaxed bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl px-6 py-2 sm:py-6 focus:ring-2 focus:ring-brand-500 resize-none transition-shadow"
                                            placeholder={lang === 'he' ? 'הוסף תיאור או הערה...' : 'Add description or note...'}
                                        />
                                    </div>
                                ) : document.description ? (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                                            {document.category === 'media' ? (lang === 'he' ? 'תיאור' : 'Description') : (t('note') !== 'note' ? t('note') : (lang === 'he' ? 'הערות' : 'Note'))}
                                        </h3>
                                        <div className="p-6 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100/50 dark:border-yellow-900/20 rounded-2xl text-sm leading-relaxed text-slate-700 dark:text-neutral-300 whitespace-pre-line">
                                            {document.description}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Files List for Media Groups */}
                                {document.isMediaGroup && document.groupedDocs && document.groupedDocs.length > 1 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                                            {lang === 'he' ? 'קבצים מצורפים' : 'Attached Files'}
                                        </h3>
                                        <div className="bg-background/50 dark:bg-neutral-800/30 rounded-2xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800 max-h-48 overflow-y-auto min-w-0">
                                            {document.groupedDocs.map((file, index) => (
                                                <div key={file.id} className="flex items-center justify-between p-2 sm:p-6 sm:p-6 gap-2">
                                                    <div className="flex flex-col min-w-0 pr-2 overflow-hidden flex-1">
                                                        <span className="text-sm font-bold text-foreground truncate block" title={file.file_name || ''}>
                                                            {file.file_name || `${lang === 'he' ? 'קובץ' : 'File'} ${index + 1}`}
                                                        </span>
                                                        <span className="text-xs text-slate-500 mt-0.5" dir="ltr">
                                                            {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center shrink-0">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadSingle(file); }}
                                                            className="p-2 sm:p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors shrink-0"
                                                            title={t('downloadFile') !== 'downloadFile' ? t('downloadFile') : (lang === 'he' ? 'הורד' : 'Download')}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* System Info */}
                                <div className="flex items-center justify-between px-1 text-xs font-medium text-slate-400">
                                    <span>{t('addedOn') !== 'addedOn' ? t('addedOn').replace('{{date}}', formattedCreated) : (lang === 'he' ? `הועלה ב-${formattedCreated}` : `Added on ${formattedCreated}`)}</span>
                                    <span>{document.isMediaGroup ? (lang === 'he' ? `${document.groupedDocs?.length} פריטים` : `${document.groupedDocs?.length} Items`) : (document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : '')}</span>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            {isEditing ? (
                                <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-background/50 dark:bg-neutral-800/30 flex gap-2 sm:gap-4 shrink-0">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        disabled={isSaving}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-6.5 bg-slate-100/80 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-[0.98] text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        {lang === 'he' ? 'בטל' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 sm:py-6.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <span className="animate-pulse">{lang === 'he' ? 'שומר...' : 'Saving...'}</span> : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                {lang === 'he' ? 'שמור שינויים' : 'Save Changes'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-background/50 dark:bg-neutral-800/30 flex gap-2 sm:gap-4">
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isDeleting}
                                        className="p-6 text-destructive bg-red-500/10 hover:bg-red-500/20 rounded-2xl transition-all disabled:opacity-50"
                                        title={t('delete') !== 'delete' ? t('delete') : (lang === 'he' ? 'מחק' : 'Delete')}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="flex-1 flex items-center justify-center gap-2 py-6 bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20 transition-all"
                                    >
                                        <Download className="w-5 h-5" />
                                        {t('downloadFile') !== 'downloadFile' ? t('downloadFile') : (lang === 'he' ? 'הורד קובץ' : 'Download File')}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={executeDelete}
                title={lang === 'he' ? 'מחיקת מסמך' : 'Delete Document'}
                message={lang === 'he' ? 'האם אתה בטוח שברצונך למחוק מסמך זה? פעולה זו אינה הפיכה.' : 'Are you sure you want to delete this document? This action cannot be undone.'}
                isDeleting={isDeleting}
            />
        </AnimatePresence>,
        window.document.body
    );
}
