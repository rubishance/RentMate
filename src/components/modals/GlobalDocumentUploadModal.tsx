import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Upload, FileText, Image as ImageIcon, FileStack, Banknote, Building2, Check, Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property, DocumentCategory } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { CompressionService } from '../../services/compression.service';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { useSubscription } from '../../hooks/useSubscription';

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
    
    const [uploading, setUploading] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other');
    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        description: string;
        documentDate: string;
        amount: string;
    }>>([]);

    // Reset when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedPropertyId(initialPropertyId || (properties.length === 1 ? properties[0].id : ''));
            setSelectedCategory('other');
            setStagedFiles([]);
        }
    }, [isOpen, properties, initialPropertyId]);

    const categories = [
        { id: 'other' as DocumentCategory, label: t('documentsStorage'), icon: FileStack, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { id: 'utility_electric' as DocumentCategory, label: t('utilitiesStorage'), icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { id: 'photo' as DocumentCategory, label: t('mediaStorage'), icon: ImageIcon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'receipt' as DocumentCategory, label: t('checksStorage'), icon: Banknote, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    ];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                description: '',
                amount: '',
                documentDate: new Date().toISOString().split('T')[0]
            }));
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
            alert(lang === 'he' ? 'אנא בחר נכס' : 'Please select a property');
            return;
        }

        if (stagedFiles.length === 0) {
            alert(lang === 'he' ? 'אנא בחר לפחות קובץ אחד' : 'Please select at least one file');
            return;
        }

        setUploading(true);
        try {
            const uploadPromises = stagedFiles.map(async (stagedFile) => {
                return propertyDocumentsService.uploadDocument(stagedFile.file, {
                    propertyId: selectedPropertyId,
                    category: selectedCategory,
                    title: stagedFile.file.name,
                    description: stagedFile.description,
                    documentDate: stagedFile.documentDate,
                    amount: stagedFile.amount ? parseFloat(stagedFile.amount) : undefined
                });
            });

            await Promise.all(uploadPromises);
            onSuccess();
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`${t('error')}: ${error.message}`);
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-window rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
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
                    <div className="p-6 overflow-y-auto space-y-8 flex-1">
                        
                        {/* 1. Property Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                {lang === 'he' ? 'בחר נכס משויך' : 'Select Property'}
                            </label>
                            <select
                                value={selectedPropertyId}
                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 dark:bg-neutral-900 border border-border/50 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none font-medium text-foreground"
                            >
                                <option value="" disabled>{lang === 'he' ? '-- בחר נכס --' : '-- Select Property --'}</option>
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>{p.address}</option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Category Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground">{lang === 'he' ? 'סוג מסמך' : 'Document Type'}</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {categories.map(cat => {
                                    const Icon = cat.icon;
                                    const isActive = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all text-center",
                                                isActive 
                                                    ? "bg-primary/5 dark:bg-primary/10 border-primary shadow-sm"
                                                    : "bg-white/5 border-border/50 hover:bg-primary/5 hover:border-primary/50"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-xl", isActive ? cat.bg : "bg-muted")}>
                                                <Icon className={cn("w-5 h-5", isActive ? cat.color : "text-muted-foreground")} />
                                            </div>
                                            <span className="text-xs font-bold text-foreground tracking-tight">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. File Upload */}
                        <div className="space-y-3">
                            <div className="group relative">
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,image/*"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full py-10 border-2 border-dashed border-primary/30 rounded-3xl group-hover:bg-primary/5 dark:group-hover:bg-primary/10 transition-all flex flex-col items-center justify-center text-center gap-3 bg-white/5 dark:bg-neutral-900">
                                    <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-foreground">
                                            {lang === 'he' ? 'לחץ או גרור קבצים לכאן' : 'Click or drop files here'}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, JPG, PNG</p>
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

                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t('date')}</label>
                                                        <DatePicker
                                                            value={file.documentDate ? parseISO(file.documentDate) : undefined}
                                                            onChange={(date) => updateStagedFile(file.id, 'documentDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                            className="w-full rounded-xl"
                                                        />
                                                    </div>
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
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={file.description}
                                                        onChange={(e) => updateStagedFile(file.id, 'description', e.target.value)}
                                                        className="w-full px-4 py-2 text-sm bg-muted/30 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-primary rounded-xl transition-all outline-none"
                                                        placeholder={t('note')}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/5 bg-background/50 flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 font-semibold text-muted-foreground hover:bg-muted dark:hover:bg-neutral-800 rounded-2xl transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading || stagedFiles.length === 0 || !selectedPropertyId}
                            className={`
                                flex-1 px-6 py-3 font-black text-white rounded-2xl shadow-lg 
                                flex items-center justify-center gap-2 transition-all
                                ${uploading || stagedFiles.length === 0 || !selectedPropertyId
                                    ? 'bg-primary/50 cursor-not-allowed shadow-none'
                                    : 'bg-primary hover:bg-primary/90 hover:scale-[1.02] shadow-primary/20 hover:shadow-primary/30 active:scale-95'
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
                                    {lang === 'he' ? 'העלה מסמך' : 'Upload Document'}
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default GlobalDocumentUploadModal;
