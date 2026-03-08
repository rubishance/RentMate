import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, Check, X, DollarSign, ChevronRight, Plus, Droplets, Zap, Flame, Building2, Landmark, Wifi, Tv, Sparkles, Home as HomeIcon, Eye } from 'lucide-react';
import type { Property, PropertyDocument, DocumentCategory } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../../hooks/useTranslation';
import { useCallback } from 'react';
import { cn } from '../../lib/utils';
import { CompressionService } from '../../services/compression.service';
import { BillAnalysisService, ExtractedBillData } from '../../services/bill-analysis.service';

import UpgradeRequestModal from '../modals/UpgradeRequestModal';
import { useSubscription } from '../../hooks/useSubscription';
import { useDataCache } from '../../contexts/DataCacheContext';
import { DocumentTimeline } from './DocumentTimeline';
import { DocumentDetailsModal } from '../modals/DocumentDetailsModal';
import { DatePicker } from '../ui/DatePicker';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface UtilityBillsManagerProps {
    property: Property;
    readOnly?: boolean;
}

type UtilityType = 'water' | 'electric' | 'gas' | 'municipality' | 'management' | 'internet' | 'cable';



export function UtilityBillsManager({ property, readOnly }: UtilityBillsManagerProps) {
    const { t } = useTranslation();
    const { hasFeature } = useSubscription();
    const { get } = useDataCache();
    const allProperties = get<Property[]>('properties_list') || [property];
    const [activeUtility, setActiveUtility] = useState<UtilityType>('electric');
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [view, setView] = useState<'types' | 'bills'>('types');

    // New Folder / Upload Form State
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDate, setNewFolderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newFolderNote, setNewFolderNote] = useState('');
    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        amount: string;
        date: string;
        note: string;
        vendorName: string;
        invoiceNumber: string;
        periodStart: string;
        periodEnd: string;
        isAnalyzing?: boolean;
        isDuplicate?: boolean;
        duplicateDoc?: PropertyDocument;
        aiData?: ExtractedBillData;
        targetPropertyId?: string;
        targetCategory?: UtilityType;
    }>>([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Correct Lucide icons mapping
    const utilities = [
        { id: 'electric' as UtilityType, label: t('utilityElectric'), icon: Zap, color: 'text-yellow-500', bg: 'bg-warning/10' },
        { id: 'municipality' as UtilityType, label: t('utilityMunicipality'), icon: Landmark, color: 'text-muted-foreground', bg: 'bg-muted dark:bg-gray-700/50' },
        { id: 'gas' as UtilityType, label: t('utilityGas'), icon: Flame, color: 'text-orange-500', bg: 'bg-warning/10' },
        { id: 'management' as UtilityType, label: t('utilityManagement'), icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
        { id: 'water' as UtilityType, label: t('utilityWater'), icon: Droplets, color: 'text-primary', bg: 'bg-primary/10 dark:bg-blue-900/30' },
        { id: 'internet' as UtilityType, label: t('utilityInternet'), icon: Wifi, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
        { id: 'tv' as UtilityType, label: t('utilityCable', { defaultValue: 'TV / Cable' }), icon: Tv, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
        { id: 'mortgage' as UtilityType, label: t('utilityMortgage', { defaultValue: 'Mortgage' }), icon: HomeIcon, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        { id: 'other' as UtilityType, label: t('utilityOther', { defaultValue: 'Other' }), icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800/30' },
    ];



    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const category = `utility_${activeUtility}` as DocumentCategory;

            const [fetchedDocs] = await Promise.all([
                propertyDocumentsService.getPropertyDocuments(property.id, { category })
            ]);

            setDocuments(fetchedDocs);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [property.id, activeUtility]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            // 1. Check AI Usage Limits before starting
            try {
                // Check if user has AI Bills feature
                if (!hasFeature('ai_bills')) {
                    setShowUpgradeModal(true);
                    return;
                }

                const usage = await BillAnalysisService.checkAndLogUsage(files.length);
                if (!usage.allowed) {
                    setShowUpgradeModal(true);
                    return;
                }
            } catch (err) {
                console.error('Usage check failed', err);
                // Continue anyway if auth/network error? 
                // For now, let's be strict.
            }

            const newFiles = files.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                amount: '',
                date: newFolderDate,
                note: '',
                vendorName: '',
                invoiceNumber: '',
                periodStart: '',
                periodEnd: '',
                targetCategory: activeUtility,
                isAnalyzing: true // Start analyzing immediately
            }));

            setStagedFiles(prev => [...prev, ...newFiles]);

            // Process each file with AI
            newFiles.forEach(async (fileObj) => {
                try {
                    // Only analyze images for now (PDF support requires more complex handling or specific Gemini setup)
                    // But our service handles File, so let's try.
                    if (fileObj.file.type.startsWith('image/') || fileObj.file.type === 'application/pdf') {
                        const result = await BillAnalysisService.analyzeBill(fileObj.file, allProperties.map(p => ({ id: p.id, address: p.address || '' })));

                        // Check for duplicate
                        const duplicate = await propertyDocumentsService.checkDuplicateBill(
                            result.vendor,
                            result.date,
                            result.invoiceNumber || '',
                            result.billingPeriodStart,
                            result.billingPeriodEnd
                        );

                        setStagedFiles(prev => prev.map(f => {
                            if (f.id !== fileObj.id) return f;

                            return {
                                ...f,
                                amount: result.amount.toString(),
                                date: result.date,
                                note: result.summary || '',
                                vendorName: result.vendor || '',
                                invoiceNumber: result.invoiceNumber || '',
                                periodStart: result.billingPeriodStart || '',
                                periodEnd: result.billingPeriodEnd || '',
                                isAnalyzing: false,
                                isDuplicate: !!duplicate,
                                duplicateDoc: duplicate as PropertyDocument,
                                aiData: result,
                                targetPropertyId: allProperties.length === 1 ? allProperties[0].id : (result.propertyId || ''),
                                targetCategory: result.category as UtilityType || activeUtility
                            };
                        }));

                        // If high confidence, update the Folder Date too if it's the first file (fallback to checking category if applicable)
                        setNewFolderDate(result.date);
                        // Also try to switch tab if it matches a known utility
                        if (utilities.some(u => u.id === result.category) && result.category !== activeUtility) {
                            setActiveUtility(result.category as UtilityType);
                        }
                    } else {
                        setStagedFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, isAnalyzing: false } : f));
                    }
                } catch (err) {
                    console.error('AI Scan Error', err);
                    setStagedFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, isAnalyzing: false } : f));
                }
            });
        }
    };

    const updateStagedFile = (id: string, field: string, value: string) => {
        setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const removeStagedFile = (id: string) => {
        setStagedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleApproveBill = async () => {
        if (stagedFiles.length === 0) return;
        setUploading(true);
        const currentFile = stagedFiles[0];
        const category = `utility_${activeUtility}`;

        try {
            const pId = currentFile.targetPropertyId || property.id;
            const catId = currentFile.targetCategory ? `utility_${currentFile.targetCategory}` : category;
            const folderName = newFolderName.trim() || t('newBillEntry', { defaultValue: 'New Bill' });

            const folder = await propertyDocumentsService.createFolder({
                property_id: pId,
                category: catId as DocumentCategory,
                name: folderName,
                folder_date: newFolderDate || format(new Date(), 'yyyy-MM-dd'),
                description: newFolderNote
            });

            let fileToUpload = currentFile.file;
            if (CompressionService.isImage(fileToUpload)) {
                try {
                    fileToUpload = await CompressionService.compressImage(fileToUpload);
                } catch (e) {
                    console.warn('Compression failed, using original', e);
                }
            }

            await propertyDocumentsService.uploadDocument(fileToUpload, {
                propertyId: pId,
                category: catId as DocumentCategory,
                folderId: folder.id,
                amount: currentFile.amount ? parseFloat(currentFile.amount) : undefined,
                documentDate: currentFile.date,
                title: currentFile.file.name,
                description: currentFile.note,
                vendorName: currentFile.vendorName,
                invoiceNumber: currentFile.invoiceNumber,
                periodStart: currentFile.periodStart,
                periodEnd: currentFile.periodEnd
            });

            // Remove the processed file
            setStagedFiles(prev => prev.slice(1));

            // If it was the last file, close the form and reset folder details
            if (stagedFiles.length === 1) {
                setNewFolderName('');
                setNewFolderDate(format(new Date(), 'yyyy-MM-dd'));
                setNewFolderNote('');
                setShowUploadForm(false);
            }
        } catch (error) {
            console.error('Failed to upload billed entry:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleCreateAndUpload = async () => {
        setUploading(true);
        try {
            const category = `utility_${activeUtility}`;
            const folderName = newFolderName.trim() || t('newBillEntry', { defaultValue: 'New Bill' });

            if (stagedFiles.length > 0) {
                // Group staging files by targetPropertyId AND targetCategory to create folders internally
                const filesByGroup = stagedFiles.reduce((acc, file) => {
                    const pId = file.targetPropertyId || property.id;
                    const catId = file.targetCategory ? `utility_${file.targetCategory}` : category;
                    const groupKey = `${pId}_${catId}`;

                    if (!acc[groupKey]) acc[groupKey] = { pId, catId, files: [] };
                    acc[groupKey].files.push(file);
                    return acc;
                }, {} as Record<string, { pId: string, catId: string, files: typeof stagedFiles }>);

                const uploadPromises = Object.values(filesByGroup).map(async ({ pId, catId, files }) => {
                    const folder = await propertyDocumentsService.createFolder({
                        property_id: pId,
                        category: catId as DocumentCategory,
                        name: folderName,
                        folder_date: newFolderDate || format(new Date(), 'yyyy-MM-dd'),
                        description: newFolderNote
                    });

                    return Promise.all(files.map(async (stagedFile) => {
                        let fileToUpload = stagedFile.file;
                        if (CompressionService.isImage(fileToUpload)) {
                            try {
                                fileToUpload = await CompressionService.compressImage(fileToUpload);
                            } catch (e) {
                                console.warn('Compression failed, using original', e);
                            }
                        }

                        return propertyDocumentsService.uploadDocument(fileToUpload, {
                            propertyId: pId,
                            category: catId as DocumentCategory,
                            folderId: folder.id,
                            amount: stagedFile.amount ? parseFloat(stagedFile.amount) : undefined,
                            documentDate: stagedFile.date,
                            title: stagedFile.file.name,
                            description: stagedFile.note,
                            vendorName: stagedFile.vendorName,
                            invoiceNumber: stagedFile.invoiceNumber,
                            periodStart: stagedFile.periodStart,
                            periodEnd: stagedFile.periodEnd
                        });
                    }));
                });
                await Promise.all(uploadPromises);
            }

            setNewFolderName('');
            setNewFolderDate(format(new Date(), 'yyyy-MM-dd'));
            setNewFolderNote('');
            setStagedFiles([]);
            setShowUploadForm(false);

            loadData();
        } catch (error: unknown) {
            console.error('Operation failed:', error);
            alert(`${t('error')}: ${(error as Error).message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSelectUtility = (type: UtilityType) => {
        setActiveUtility(type);
        setView('bills');
    };



    return (
        <div className="p-6 space-y-6">
            {view === 'types' ? (
                <div className="space-y-4">
                    <h3 className="font-bold text-foreground dark:text-white px-2 mb-4">{t('utilitiesStorage')}</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {utilities.map(util => {
                            const Icon = util.icon;
                            // Count bills for this type (might need actual data from DB, but for UI we can show indicators)
                            return (
                                <button
                                    key={util.id}
                                    onClick={() => handleSelectUtility(util.id)}
                                    className="flex items-center justify-between p-5 bg-white dark:bg-neutral-800 border border-slate-100 dark:border-neutral-800 rounded-2xl hover:border-primary/30 transition-all hover:shadow-md group text-start outline-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl group-hover:scale-110 transition-transform", util.bg, util.color)}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{util.label}</h4>
                                            <p className="text-xs text-slate-500">{t('clickToViewBills') || 'Click to view bills'}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Back Button and Header */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setView('types')}
                            className="p-2 hover:bg-muted/50 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-500 group"
                        >
                            <ChevronRight className="w-6 h-6 rotate-180" />
                        </button>
                        <div className="flex items-center gap-3">
                            {utilities.find(u => u.id === activeUtility)?.icon && (
                                <div className={cn("p-2 rounded-lg", utilities.find(u => u.id === activeUtility)?.bg, utilities.find(u => u.id === activeUtility)?.color)}>
                                    {(() => {
                                        const Icon = utilities.find(u => u.id === activeUtility)!.icon;
                                        return <Icon className="w-5 h-5" />;
                                    })()}
                                </div>
                            )}
                            <h3 className="font-black text-xl text-foreground">
                                {utilities.find(u => u.id === activeUtility)?.label}
                            </h3>
                        </div>
                    </div>


                    {/* Actions */}

                    {!readOnly && !showUploadForm && (
                        <Button
                            variant="outline"
                            onClick={() => setShowUploadForm(true)}
                            className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 hover:bg-primary/10/50 dark:hover:bg-blue-900/20 transition-all group flex h-auto flex-col items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground"
                        >
                            <div className="p-2 bg-primary/10 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-primary dark:text-blue-400" />
                            </div>
                            <span className="font-medium">{t('createBillFolder')}</span>
                        </Button>
                    )}

                    {/* Create Folder Form */}
                    {showUploadForm && (
                        <div className="relative overflow-hidden bg-white/80 dark:bg-foreground/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                            {/* Decorative Gradient Blob */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative flex items-center justify-between">
                                <div>
                                    <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-600 dark:from-primary dark:to-cyan-400">
                                        {t('newBillEntry')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                                        {t('uploadBillTitle', { type: utilities.find(u => u.id === activeUtility)?.label || '' })}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowUploadForm(false)}
                                    className="rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>

                            {/* Folder Metadata */}
                            <div className="relative space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('subject')}</label>
                                        <Input
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            placeholder={t('eg_january_bill')}
                                            className="bg-white/50 dark:bg-gray-800/50 border-border/60 dark:border-gray-700/60"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('date')}</label>
                                        <DatePicker
                                            value={newFolderDate ? parseISO(newFolderDate) : undefined}
                                            onChange={(date) => setNewFolderDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('note')}</label>
                                    <Textarea
                                        value={newFolderNote}
                                        onChange={(e) => setNewFolderNote(e.target.value)}
                                        placeholder={t('optionalFolderNote')}
                                        className="bg-white/50 dark:bg-gray-800/50 border-border/60 dark:border-gray-700/60 resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* File Upload Section */}
                            <div className="relative border-t border-border/50 dark:border-gray-700/50 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-sm font-bold text-foreground dark:text-gray-100 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        {t('documents')}
                                    </h5>
                                    <span className="text-xs text-muted-foreground bg-muted dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        {stagedFiles.length} {t('files')}
                                    </span>
                                </div>

                                {/* Drop Zone / Input */}
                                <div className="group relative mb-6">
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,image/*"
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl group-hover:border-primary group-hover:bg-primary/10/30 dark:group-hover:bg-blue-900/10 transition-all flex flex-col items-center justify-center text-center gap-2">
                                        <div className="p-3 bg-primary/10 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6 text-primary dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground dark:text-white">{t('clickToUploadDrag')}</p>
                                            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">PDF, PNG, JPG</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Staged Files Step-by-Step Approval */}
                                {stagedFiles.length > 0 && (
                                    <div className="space-y-3">
                                        {(() => {
                                            const file = stagedFiles[0];
                                            return (
                                                <div key={file.id} className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm backdrop-blur-sm transition-all relative">

                                                    {stagedFiles.length > 1 && (
                                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
                                                            {t('bill', { defaultValue: 'Bill' })} 1 / {stagedFiles.length}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-start mb-3 mt-2">
                                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                            <div className="p-1.5 bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400 rounded-lg shrink-0">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.file.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {(file.file.type.startsWith('image/') || file.file.type === 'application/pdf') && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 gap-1 border-primary/20 text-primary hover:bg-primary/10"
                                                                    onClick={() => setPreviewImage(file.file.type.startsWith('image/') ? URL.createObjectURL(file.file) : null)}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">{t('viewBillImage', { defaultValue: 'View Image' })}</span>
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="sm" onClick={() => removeStagedFile(file.id)} className="text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0" title={t('skipOrDelete', { defaultValue: 'Skip' })}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* AI Badge */}
                                                    {file.isAnalyzing ? (
                                                        <div className="mb-3 flex items-center gap-2 text-xs text-primary animate-pulse">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Scanning bill...
                                                        </div>
                                                    ) : file.aiData ? (
                                                        <div className="mb-3 space-y-2">
                                                            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
                                                                <Sparkles className="w-3 h-3" />
                                                                <span>Auto-filled by Gemini</span>
                                                            </div>
                                                            {file.isDuplicate && (
                                                                <div className="flex items-center gap-2 text-xs text-destructive bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                                                    <X className="w-3.5 h-3.5" />
                                                                    <span className="font-bold">Duplicate Detected!</span>
                                                                    <span>A bill with this number, vendor, and date already exists.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null}

                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        <div className="col-span-1 space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">Asset Match</label>
                                                            <select
                                                                value={file.targetPropertyId || ''}
                                                                onChange={(e) => updateStagedFile(file.id, 'targetPropertyId', e.target.value)}
                                                                className={cn("w-full h-8 px-2 text-xs rounded-md border", !file.targetPropertyId ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "bg-white/50 dark:bg-foreground/50 border-input")}
                                                            >
                                                                <option value="" disabled>Select Asset...</option>
                                                                {allProperties.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.address}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">Bill Type</label>
                                                            <select
                                                                value={file.targetCategory || activeUtility}
                                                                onChange={(e) => updateStagedFile(file.id, 'targetCategory', e.target.value)}
                                                                className={cn("w-full h-8 px-2 text-xs rounded-md border bg-white/50 dark:bg-foreground/50 border-input")}
                                                            >
                                                                {utilities.map(u => (
                                                                    <option key={u.id} value={u.id}>{u.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2 space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('vendorName')}</label>
                                                            <Input
                                                                value={file.vendorName}
                                                                onChange={(e) => updateStagedFile(file.id, 'vendorName', e.target.value)}
                                                                placeholder={t('eg_electric_corp')}
                                                                className="h-8 text-xs bg-white/50 dark:bg-foreground/50"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">Invoice Number</label>
                                                            <Input
                                                                value={file.invoiceNumber}
                                                                onChange={(e) => updateStagedFile(file.id, 'invoiceNumber', e.target.value)}
                                                                placeholder="e.g. 12345678"
                                                                className="h-8 text-xs bg-white/50 dark:bg-foreground/50"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('amount')}</label>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    value={file.amount}
                                                                    onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                                    placeholder="0.00"
                                                                    leftIcon={<DollarSign className="w-3 h-3 text-muted-foreground" />}
                                                                    className="h-8 text-xs bg-white/50 dark:bg-foreground/50"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('date')}</label>
                                                            <DatePicker
                                                                value={file.date ? parseISO(file.date) : undefined}
                                                                onChange={(date) => updateStagedFile(file.id, 'date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('periodStart')}</label>
                                                            <DatePicker
                                                                value={file.periodStart ? parseISO(file.periodStart) : undefined}
                                                                onChange={(date) => updateStagedFile(file.id, 'periodStart', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('periodEnd')}</label>
                                                            <DatePicker
                                                                value={file.periodEnd ? parseISO(file.periodEnd) : undefined}
                                                                onChange={(date) => updateStagedFile(file.id, 'periodEnd', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('note')}</label>

                                                        <Input
                                                            value={file.note}
                                                            onChange={(e) => updateStagedFile(file.id, 'note', e.target.value)}
                                                            placeholder={t('optionalFolderNote')}
                                                            className="h-8 text-xs bg-white/50 dark:bg-foreground/50"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border dark:border-gray-700/50">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setStagedFiles([]);
                                        setShowUploadForm(false);
                                    }}
                                    className="text-muted-foreground dark:text-gray-300"
                                >
                                    {t('cancel')}
                                </Button>
                                {stagedFiles.length > 0 && (
                                    <Button
                                        onClick={handleApproveBill}
                                        disabled={uploading}
                                        isLoading={uploading}
                                        className="flex-1 bg-gradient-to-r from-primary to-cyan-600 hover:from-primary hover:to-cyan-700 text-white shadow-lg"
                                    >
                                        {!uploading && <Check className="w-4 h-4 mr-2" />}
                                        {stagedFiles.length > 1
                                            ? t('approveAndNext', { defaultValue: 'Approve & Next' })
                                            : t('approveAndFinish', { defaultValue: 'Approve & Save' })
                                        }
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Timeline View */}
                    <DocumentTimeline
                        documents={documents}
                        loading={loading}
                        onDocumentClick={(doc) => {
                            setSelectedDocument(doc);
                            setIsDetailsModalOpen(true);
                        }}
                    />

                    <DocumentDetailsModal
                        isOpen={isDetailsModalOpen}
                        onClose={() => {
                            setIsDetailsModalOpen(false);
                            setSelectedDocument(null);
                        }}
                        document={selectedDocument}
                        onDelete={() => loadData()}
                    />

                    <UpgradeRequestModal
                        isOpen={showUpgradeModal}
                        onClose={() => setShowUpgradeModal(false)}
                        source="bill_scan_limit"
                    />
                </div>
            )}

            {previewImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 sm:p-8">
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[101]"
                        title={t('close')}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Bill Preview"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                </div>
            )}
        </div>
    );
}
