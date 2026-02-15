import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, Check, X, DollarSign, ChevronRight, Plus, Droplets, Zap, Flame, Building2, Landmark, Wifi, Tv, Sparkles } from 'lucide-react';
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
    }>>([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Correct Lucide icons mapping
    const utilities = [
        { id: 'electric' as UtilityType, label: t('utilityElectric'), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
        { id: 'municipality' as UtilityType, label: t('utilityMunicipality'), icon: Landmark, color: 'text-muted-foreground', bg: 'bg-muted dark:bg-gray-700/50' },
        { id: 'gas' as UtilityType, label: t('utilityGas'), icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        { id: 'management' as UtilityType, label: t('utilityManagement'), icon: Building2, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        { id: 'water' as UtilityType, label: t('utilityWater'), icon: Droplets, color: 'text-primary', bg: 'bg-primary/10 dark:bg-blue-900/30' },
        { id: 'internet' as UtilityType, label: t('utilityInternet'), icon: Wifi, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
        { id: 'cable' as UtilityType, label: t('utilityCable'), icon: Tv, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
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
                isAnalyzing: true // Start analyzing immediately
            }));

            setStagedFiles(prev => [...prev, ...newFiles]);

            // Process each file with AI
            newFiles.forEach(async (fileObj) => {
                try {
                    // Only analyze images for now (PDF support requires more complex handling or specific Gemini setup)
                    // But our service handles File, so let's try.
                    if (fileObj.file.type.startsWith('image/') || fileObj.file.type === 'application/pdf') {
                        const result = await BillAnalysisService.analyzeBill(fileObj.file, [{ id: property.id, address: property.address }]);

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
                                aiData: result
                            };
                        }));

                        // If high confidence, update the Folder Date too if it's the first file
                        if (result.confidence > 0.8 && newFiles.length === 1) {
                            setNewFolderDate(result.date);
                            // Also try to switch tab if it matches a known utility
                            if (utilities.some(u => u.id === result.category) && result.category !== activeUtility) {
                                setActiveUtility(result.category as UtilityType);
                            }
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

    const handleCreateAndUpload = async () => {
        setUploading(true);
        try {
            const category = `utility_${activeUtility}`;
            const folderName = newFolderName.trim() || t('newBillEntry', { defaultValue: 'New Bill' });

            const folder = await propertyDocumentsService.createFolder({
                property_id: property.id,
                category,
                name: folderName,
                folder_date: newFolderDate || format(new Date(), 'yyyy-MM-dd'),
                description: newFolderNote
            });

            if (stagedFiles.length > 0) {
                const uploadPromises = stagedFiles.map(async (stagedFile) => {
                    let fileToUpload = stagedFile.file;
                    if (CompressionService.isImage(fileToUpload)) {
                        try {
                            fileToUpload = await CompressionService.compressImage(fileToUpload);
                        } catch (e) {
                            console.warn('Compression failed, using original', e);
                        }
                    }

                    return propertyDocumentsService.uploadDocument(fileToUpload, {
                        propertyId: property.id,
                        category: category as DocumentCategory,
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
                                            <h4 className="font-bold text-slate-900 dark:text-white">{util.label}</h4>
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
                            className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-500 group"
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
                            <h3 className="font-black text-xl text-slate-900 dark:text-white">
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
                                    <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
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

                                {/* Staged Files List */}
                                {stagedFiles.length > 0 && (
                                    <div className="space-y-3">
                                        {stagedFiles.map((file) => (
                                            <div key={file.id} className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm backdrop-blur-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="p-1.5 bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400 rounded-lg">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.file.name}</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => removeStagedFile(file.id)} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0">
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                {/* AI Badge */}
                                                {file.isAnalyzing ? (
                                                    <div className="mb-3 flex items-center gap-2 text-xs text-blue-500 animate-pulse">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Scanning bill...
                                                    </div>
                                                ) : file.aiData ? (
                                                    <div className="mb-3 space-y-2">
                                                        <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
                                                            <Sparkles className="w-3 h-3" />
                                                            <span>Auto-filled by Gemini</span>
                                                            <span className="font-mono opacity-70">({(file.aiData.confidence * 100).toFixed(0)}% conf)</span>
                                                        </div>
                                                        {file.isDuplicate && (
                                                            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                                                <X className="w-3.5 h-3.5" />
                                                                <span className="font-bold">Duplicate Detected!</span>
                                                                <span>A bill with this number, vendor, and date already exists.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div className="grid grid-cols-2 gap-3 mb-3">
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
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border dark:border-gray-700/50">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowUploadForm(false)}
                                    className="text-muted-foreground dark:text-gray-300"
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    onClick={handleCreateAndUpload}
                                    disabled={uploading}
                                    isLoading={uploading}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                                >
                                    {!uploading && <Check className="w-4 h-4 mr-2" />}
                                    {t('saveBillEntry')}
                                </Button>
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
        </div>
    );
}
