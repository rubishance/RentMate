import { AnimatePresence, motion } from 'framer-motion';
import { X, FileText, Calendar, DollarSign, Download, Trash2, ExternalLink, Tag, User, MapPin, Building, Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../../hooks/useTranslation';
import type { PropertyDocument } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useState } from 'react';

interface DocumentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: PropertyDocument | null;
    onDelete?: (id: string) => void;
}

export function DocumentDetailsModal({ isOpen, onClose, document, onDelete }: DocumentDetailsModalProps) {
    const { t, lang } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!document) return null;

    const handleDelete = async () => {
        if (!confirm(t('deleteDocumentConfirmation'))) return;
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
        }
    };

    const handleDownload = async () => {
        try {
            const url = await propertyDocumentsService.getDocumentUrl(document);
            if (!url) return;

            // Create a temporary link and trigger download
            const link = window.document.createElement('a');
            link.href = url;
            link.download = document.file_name || 'document';
            link.target = '_blank';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download document');
        }
    };

    const formattedDate = document.document_date ? format(parseISO(document.document_date), 'dd/MM/yyyy') : null;
    const formattedCreated = format(new Date(document.created_at), 'dd/MM/yyyy HH:mm');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                                        {document.title || document.file_name}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto space-y-8">
                                {/* Key Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl border border-slate-100 dark:border-neutral-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {t('date')}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                            {formattedDate || t('noDate')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl border border-slate-100 dark:border-neutral-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" /> {t('amount')}
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                            {document.amount ? `₪${document.amount.toLocaleString()}` : t('noAmount')}
                                        </p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        {t('additionalMetadata')}
                                    </h3>
                                    <div className="bg-slate-50/50 dark:bg-neutral-800/30 rounded-2xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800">
                                        {/* Vendor */}
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <Building className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('vendor')}</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {document.vendor_name || '-'}
                                            </span>
                                        </div>

                                        {/* Invoice Number */}
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <Hash className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('invoiceNumber')}</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {document.invoice_number || '-'}
                                            </span>
                                        </div>

                                        {/* Period */}
                                        {(document.period_start || document.period_end) && (
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3 text-slate-400">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{t('billingPeriod')}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {document.period_start ? format(parseISO(document.period_start), 'dd/MM/yy') : ''}
                                                    {document.period_start && document.period_end ? ' - ' : ''}
                                                    {document.period_end ? format(parseISO(document.period_end), 'dd/MM/yy') : ''}
                                                </span>
                                            </div>
                                        )}

                                        {/* Category */}
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <Tag className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('category')}</span>
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 bg-brand-500/10 text-brand-500 rounded-lg uppercase tracking-wider">
                                                {t(document.category)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                {document.description && (
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            {t('note')}
                                        </h3>
                                        <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100/50 dark:border-yellow-900/20 rounded-2xl text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
                                            {document.description}
                                        </div>
                                    </div>
                                )}

                                {/* System Info */}
                                <div className="flex items-center justify-between px-1 text-[10px] font-medium text-slate-400">
                                    <span>{t('addedOn', { date: formattedCreated })}</span>
                                    <span>{document.file_size ? `${(document.file_size / 1024).toFixed(1)} KB` : ''}</span>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30 flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-4 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-2xl transition-all disabled:opacity-50"
                                    title={t('delete')}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-brand-500/20 transition-all"
                                >
                                    <Download className="w-5 h-5" />
                                    {t('downloadFile')}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="p-4 text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-2xl transition-all"
                                    title={t('openExternal')}
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
