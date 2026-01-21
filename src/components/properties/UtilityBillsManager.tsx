import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, Check, X, Calendar, DollarSign, Folder, Trash2, ChevronDown, ChevronRight, Plus, Droplets, Zap, Flame, Building2, Landmark, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Property, PropertyDocument, DocumentCategory, DocumentFolder } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { BillAnalysisService, ExtractedBillData } from '../../services/bill-analysis.service';
import { Sparkles } from 'lucide-react';
import UpgradeRequestModal from '../modals/UpgradeRequestModal';

interface UtilityBillsManagerProps {
    property: Property;
    readOnly?: boolean;
}

type UtilityType = 'water' | 'electric' | 'gas' | 'municipality' | 'management';

interface AnalyticsData {
    averageMonthly: number;
    trend: 'up' | 'down' | 'stable';
    yearOverYear: number;
    monthlyData: Array<{ month: string; amount: number }>;
}

export function UtilityBillsManager({ property, readOnly }: UtilityBillsManagerProps) {
    const { t } = useTranslation();
    const [activeUtility, setActiveUtility] = useState<UtilityType>('electric');
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);

    // New Folder / Upload Form State
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDate, setNewFolderDate] = useState(new Date().toISOString().split('T')[0]);
    const [newFolderNote, setNewFolderNote] = useState('');
    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        amount: string;
        date: string;
        note: string;
        vendorName: string;
        periodStart: string;
        periodEnd: string;
        isAnalyzing?: boolean;
        aiData?: ExtractedBillData;
    }>>([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Correct Lucide icons mapping
    const utilities = [
        { id: 'electric' as UtilityType, label: t('utilityElectric'), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
        { id: 'municipality' as UtilityType, label: t('utilityMunicipality'), icon: Landmark, color: 'text-muted-foreground', bg: 'bg-muted dark:bg-gray-700/50' },
        { id: 'gas' as UtilityType, label: t('utilityGas'), icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        { id: 'management' as UtilityType, label: t('utilityManagement'), icon: Building2, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        { id: 'water' as UtilityType, label: t('utilityWater'), icon: Droplets, color: 'text-primary', bg: 'bg-primary/10 dark:bg-blue-900/30' },
    ];

    useEffect(() => {
        loadData();
    }, [property.id, activeUtility]);

    async function loadData() {
        setLoading(true);
        try {
            const category = `utility_${activeUtility}` as DocumentCategory;

            const [fetchedFolders, fetchedDocs, fetchedAnalytics] = await Promise.all([
                propertyDocumentsService.getFolders(property.id, category),
                propertyDocumentsService.getPropertyDocuments(property.id, { category }),
                propertyDocumentsService.getUtilityAnalytics(property.id, activeUtility)
            ]);

            setFolders(fetchedFolders);
            setDocuments(fetchedDocs);
            setAnalytics(fetchedAnalytics);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }


    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            // 1. Check AI Usage Limits before starting
            try {
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
                        const result = await BillAnalysisService.analyzeBill(fileObj.file);

                        setStagedFiles(prev => prev.map(f => {
                            if (f.id !== fileObj.id) return f;

                            // Auto-switch tab if confidence is high and mismatched
                            if (result.confidence > 0.8 && result.category !== 'other' && result.category !== activeUtility) {
                                // Optional: Notification or subtle tab switch? 
                                // For now, just note it. switching tabs might lose state of other files.
                            }

                            return {
                                ...f,
                                amount: result.amount.toString(),
                                date: result.date,
                                note: result.summary || '',
                                vendorName: result.vendor || '',
                                periodStart: result.billingPeriodStart || '',
                                periodEnd: result.billingPeriodEnd || '',
                                isAnalyzing: false,
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
                folder_date: newFolderDate || new Date().toISOString().split('T')[0],
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
                        periodStart: stagedFile.periodStart,
                        periodEnd: stagedFile.periodEnd
                    });
                });
                await Promise.all(uploadPromises);
            }

            setNewFolderName('');
            setNewFolderDate(new Date().toISOString().split('T')[0]);
            setNewFolderNote('');
            setStagedFiles([]);
            setShowUploadForm(false);

            loadData();
        } catch (error: any) {
            console.error('Operation failed:', error);
            alert(`${t('error')}: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm(t('deleteFolderConfirmation'))) return;
        try {
            await propertyDocumentsService.deleteFolder(folderId);
            loadData();
        } catch (error) {
            console.error('Error deleting folder:', error);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm(t('deleteDocumentConfirmation'))) return;
        try {
            await propertyDocumentsService.deleteDocument(docId);
            loadData();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const docsByFolder = documents.reduce((acc, doc) => {
        if (doc.folder_id) {
            if (!acc[doc.folder_id]) acc[doc.folder_id] = [];
            acc[doc.folder_id].push(doc);
        }
        return acc;
    }, {} as Record<string, PropertyDocument[]>);

    const orphanedDocs = documents.filter(d => !d.folder_id);


    const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-red-500" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-green-500" />;
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Utility Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {utilities.map(util => {
                    const isActive = activeUtility === util.id;
                    const Icon = util.icon;
                    // Map IDs to specific active colors
                    const activeColors: Record<string, string> = {
                        electric: 'bg-yellow-500 shadow-yellow-500/30',
                        municipality: 'bg-indigo-600 shadow-indigo-600/30',
                        gas: 'bg-orange-500 shadow-orange-500/30',
                        management: 'bg-purple-600 shadow-purple-600/30',
                        water: 'bg-blue-500 shadow-blue-500/30'
                    };

                    return (
                        <button
                            key={util.id}
                            onClick={() => setActiveUtility(util.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${isActive
                                ? `${activeColors[util.id] || 'bg-primary'} text-white shadow-lg scale-105`
                                : 'bg-white dark:bg-gray-800 text-muted-foreground dark:text-gray-400 border border-border dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : util.color}`} />
                            {util.label}
                        </button>
                    );
                })}
            </div>


            {/* Analytics Overview Card */}
            {!loading && analytics && (analytics.averageMonthly > 0 || analytics.monthlyData.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('averageMonthly')}</p>
                            <p className="text-2xl font-bold text-foreground dark:text-white mt-1">₪{Math.round(analytics.averageMonthly).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-primary/10 dark:bg-blue-900/20 rounded-full text-primary dark:text-blue-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('trend')}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-bold text-foreground dark:text-white capitalize">
                                    {analytics.trend === 'up' ? t('increasing') : analytics.trend === 'down' ? t('decreasing') : t('stable')}
                                </p>
                                {renderTrendIcon(analytics.trend)}
                            </div>
                        </div>
                        <div className={`p-3 rounded-full ${analytics.trend === 'up' ? 'bg-red-50 text-red-500' : analytics.trend === 'down' ? 'bg-green-50 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">YoY Change</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-2xl font-bold ${analytics.yearOverYear > 0 ? 'text-red-500' : analytics.yearOverYear < 0 ? 'text-green-500' : 'text-foreground'}`}>
                                    {analytics.yearOverYear > 0 ? '+' : ''}{analytics.yearOverYear.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-600 dark:text-purple-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Actions ... (rest of the file) */}

            {!readOnly && !showUploadForm && (
                <button
                    onClick={() => setShowUploadForm(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 hover:bg-primary/10/50 dark:hover:bg-blue-900/20 transition-all group flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground"
                >
                    <div className="p-2 bg-primary/10 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-primary dark:text-blue-400" />
                    </div>
                    <span className="font-medium">{t('createBillFolder')}</span>
                </button>
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
                                {t('uploadBillTitle', { type: utilities.find(u => u.id === activeUtility)?.label })}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowUploadForm(false)}
                            className="p-2 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors backdrop-blur-sm"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Folder Metadata */}
                    <div className="relative space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('subject')}</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder={t('eg_january_bill')}
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-primary transition-all backdrop-blur-sm outline-none dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('date')}</label>
                                <input
                                    type="date"
                                    value={newFolderDate}
                                    onChange={(e) => setNewFolderDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-primary transition-all backdrop-blur-sm outline-none dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('note')}</label>
                            <textarea
                                value={newFolderNote}
                                onChange={(e) => setNewFolderNote(e.target.value)}
                                placeholder={t('optionalFolderNote')}
                                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-primary transition-all backdrop-blur-sm outline-none dark:text-white resize-none"
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
                                            <button onClick={() => removeStagedFile(file.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* AI Badge */}
                                        {file.isAnalyzing ? (
                                            <div className="mb-3 flex items-center gap-2 text-xs text-blue-500 animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Scanning bill...
                                            </div>
                                        ) : file.aiData ? (
                                            <div className="mb-3 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
                                                <Sparkles className="w-3 h-3" />
                                                <span>Auto-filled by Gemini</span>
                                                <span className="font-mono opacity-70">({(file.aiData.confidence * 100).toFixed(0)}% conf)</span>
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('vendorName')}</label>
                                                <input
                                                    type="text"
                                                    value={file.vendorName}
                                                    onChange={(e) => updateStagedFile(file.id, 'vendorName', e.target.value)}
                                                    placeholder={t('eg_electric_corp')}
                                                    className="w-full px-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('amount')}</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                    <input
                                                        type="number"
                                                        value={file.amount}
                                                        onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-primary transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('date')}</label>
                                                <input
                                                    type="date"
                                                    value={file.date}
                                                    onChange={(e) => updateStagedFile(file.id, 'date', e.target.value)}
                                                    className="w-full px-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('periodStart')}</label>
                                                <input
                                                    type="date"
                                                    value={file.periodStart}
                                                    onChange={(e) => updateStagedFile(file.id, 'periodStart', e.target.value)}
                                                    className="w-full px-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('periodEnd')}</label>
                                                <input
                                                    type="date"
                                                    value={file.periodEnd}
                                                    onChange={(e) => updateStagedFile(file.id, 'periodEnd', e.target.value)}
                                                    className="w-full px-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('note')}</label>
                                            <input
                                                type="text"
                                                value={file.note}
                                                onChange={(e) => updateStagedFile(file.id, 'note', e.target.value)}
                                                placeholder={t('optionalFolderNote')}
                                                className="w-full px-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border dark:border-gray-700/50">
                        <button
                            onClick={() => setShowUploadForm(false)}
                            className="px-6 py-2.5 text-sm font-medium text-muted-foreground dark:text-gray-300 hover:bg-muted dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleCreateAndUpload}
                            disabled={uploading}
                            className={`
                                flex-1 px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-lg shadow-blue-500/25
                                flex items-center justify-center gap-2 transition-all
                                ${uploading
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:shadow-blue-500/40 active:scale-[0.98]'
                                }
                            `}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {t('saveBillEntry')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Folder List */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Render Folders */}
                    {folders.length > 0 && folders.map(folder => {
                        const folderDocs = docsByFolder[folder.id] || [];
                        const totalAmount = folderDocs.reduce((sum, d) => sum + (d.amount || 0), 0);
                        const UtilityIcon = utilities.find(u => u.id === activeUtility)?.icon || FileText;

                        return (
                            <div key={folder.id} className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Folder Header */}
                                <div className="p-4 bg-gray-50/50 dark:bg-gray-700/30 flex items-start justify-between border-b border-border dark:border-gray-700">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400 rounded-lg mt-1">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg text-foreground dark:text-white">{folder.name}</h3>
                                                <span className="text-xs px-2 py-0.5 bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-300 rounded-full">
                                                    {format(parseISO(folder.folder_date), 'MMM yyyy')}
                                                </span>
                                            </div>
                                            {folder.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{folder.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>{folderDocs.length} {t('files')}</span>
                                                {totalAmount > 0 && (
                                                    <span className="font-semibold text-foreground dark:text-white">₪{totalAmount.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {!readOnly && (
                                        <button
                                            onClick={() => handleDeleteFolder(folder.id)}
                                            className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                                            title={t('deleteFolder')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Folder Contents */}
                                {folderDocs.length > 0 && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {folderDocs.map(doc => (
                                            <div key={doc.id} className="p-3 pl-16 flex items-center justify-between hover:bg-secondary dark:hover:bg-gray-700/20 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-muted dark:bg-gray-800 rounded text-muted-foreground">
                                                        <UtilityIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{doc.title || doc.file_name}</p>
                                                        {doc.amount ? (
                                                            <p className="text-xs text-muted-foreground">₪{doc.amount}</p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => window.open(propertyDocumentsService.getDocumentUrl(doc) as any)}
                                                        className="px-3 py-1 text-xs font-medium text-primary hover:text-primary bg-primary/10 hover:bg-primary/10 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    >
                                                        {t('view')}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {orphanedDocs.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 ltr:text-left rtl:text-right">{t('unsortedFiles')}</h4>
                            <div className="space-y-3">
                                {orphanedDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="bg-white dark:bg-gray-800 p-5 rounded-[2.5rem] border border-border/60 dark:border-gray-700 flex items-center justify-between group hover:shadow-md hover:border-primary/30 transition-all duration-300 cursor-pointer"
                                        onClick={() => window.open(propertyDocumentsService.getDocumentUrl(doc) as any)}
                                    >
                                        <div className="flex-1 ltr:text-left rtl:text-right overflow-hidden pr-4 pl-4">
                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-200 truncate">{doc.title || doc.file_name}</p>
                                            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-0.5">{doc.document_date}</p>
                                        </div>
                                        <div className="shrink-0 p-3 bg-secondary dark:bg-gray-700/50 rounded-2xl group-hover:bg-primary/10 transition-colors">
                                            <FileText className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {folders.length === 0 && orphanedDocs.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed border-border dark:border-gray-700 rounded-2xl">
                            <div className="w-16 h-16 bg-secondary dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="font-semibold text-foreground dark:text-white">{t('noBillsYet', { type: utilities.find(u => u.id === activeUtility)?.label || '' })}</h4>
                        </div>
                    )}
                </div>
            )}
            <UpgradeRequestModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                source="bill_scan_limit"
            />
        </div>
    );
}
