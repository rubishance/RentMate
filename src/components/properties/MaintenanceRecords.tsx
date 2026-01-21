import { useState, useEffect } from 'react';
import { Upload, Loader2, Wrench, FileText, Trash2, Calendar, DollarSign, User, X, Plus, Folder, Check, PenTool, Hammer } from 'lucide-react';
import type { Property, PropertyDocument, DocumentCategory, DocumentFolder } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { BillAnalysisService } from '../../services/bill-analysis.service';
import UpgradeRequestModal from '../modals/UpgradeRequestModal';
import { Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface MaintenanceRecordsProps {
    property: Property;
    readOnly?: boolean;
}

export function MaintenanceRecords({ property, readOnly }: MaintenanceRecordsProps) {
    const { t } = useTranslation();
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
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
        title: string;
        description: string;
        amount: string;
        vendorName: string;
        issueType: string;
        documentDate: string;
        isAnalyzing?: boolean;
        aiData?: any;
    }>>([]);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [property.id]);

    async function loadData() {
        setLoading(true);
        try {
            const category = 'maintenance';
            const [fetchedFolders, fetchedDocs] = await Promise.all([
                propertyDocumentsService.getFolders(property.id, category),
                propertyDocumentsService.getPropertyDocuments(property.id, { category: category as DocumentCategory })
            ]);
            setFolders(fetchedFolders);
            setDocuments(fetchedDocs);
        } catch (error) {
            console.error('Error fetching maintenance records:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            // 1. Check AI Usage Limits
            try {
                const usage = await BillAnalysisService.checkAndLogUsage(files.length);
                if (!usage.allowed) {
                    setShowUpgradeModal(true);
                    return;
                }
            } catch (err) {
                console.error('Usage check failed', err);
            }

            const newFiles = files.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                title: file.name,
                description: '',
                amount: '',
                vendorName: '',
                issueType: '',
                documentDate: newFolderDate, // Default to folder date
                isAnalyzing: true
            }));
            setStagedFiles(prev => [...prev, ...newFiles]);

            // 2. Start AI Analysis for each
            newFiles.forEach(async (staged) => {
                try {
                    const data = await BillAnalysisService.analyzeBill(staged.file);
                    setStagedFiles(prev => prev.map(f => f.id === staged.id ? {
                        ...f,
                        isAnalyzing: false,
                        aiData: data,
                        amount: data.amount.toString(),
                        vendorName: data.vendor,
                        documentDate: data.date,
                        description: data.summary || f.description
                    } : f));
                } catch (err) {
                    console.error('AI Scan Error:', err);
                    setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, isAnalyzing: false } : f));
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
            const folderName = newFolderName.trim() || t('newMaintenanceEntry', { defaultValue: 'Maintenance' });

            // 1. Create Folder
            const folder = await propertyDocumentsService.createFolder({
                property_id: property.id,
                category: 'maintenance',
                name: folderName,
                folder_date: newFolderDate || new Date().toISOString().split('T')[0],
                description: newFolderNote
            });

            // 2. Upload Files
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
                        category: 'maintenance',
                        folderId: folder.id,
                        title: stagedFile.title || stagedFile.file.name,
                        description: stagedFile.description,
                        amount: stagedFile.amount ? parseFloat(stagedFile.amount) : undefined,
                        vendorName: stagedFile.vendorName,
                        issueType: stagedFile.issueType,
                        documentDate: stagedFile.documentDate
                    });
                });
                await Promise.all(uploadPromises);
            }

            // Reset
            setNewFolderName('');
            setNewFolderDate(new Date().toISOString().split('T')[0]);
            setNewFolderNote('');
            setStagedFiles([]);
            setShowUploadForm(false);

            loadData();
        } catch (error: any) {
            console.error('Upload failed:', error);
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

    const getIssueLabel = (type: string) => {
        const keyMap: Record<string, string> = {
            plumbing: 'issuePlumbing',
            electrical: 'issueElectrical',
            hvac: 'issueHVAC',
            painting: 'issuePainting',
            carpentry: 'issueCarpentry',
            appliance: 'issueAppliance',
            other: 'issueOther'
        };
        const key = keyMap[type];
        return key ? t(key) : type;
    };

    // Grouping
    const docsByFolder = documents.reduce((acc, doc) => {
        if (doc.folder_id) {
            if (!acc[doc.folder_id]) acc[doc.folder_id] = [];
            acc[doc.folder_id].push(doc);
        }
        return acc;
    }, {} as Record<string, PropertyDocument[]>);

    const orphanedDocs = documents.filter(d => !d.folder_id);
    const totalCost = documents.reduce((sum, record) => sum + (record.amount || 0), 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground dark:text-white">{t('maintenanceStorage')}</h3>
                    <p className="text-sm text-muted-foreground">{t('maintenanceDesc')}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-uppercase tracking-wider text-muted-foreground font-semibold mb-1">{t('totalSpent')}</p>
                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400">
                        ₪{totalCost.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Actions */}
            {!readOnly && !showUploadForm && (
                <button
                    onClick={() => setShowUploadForm(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-all group flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground"
                >
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-full group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="font-medium">{t('createMaintenanceFolder')}</span>
                </button>
            )}

            {/* Create Folder Form */}
            {showUploadForm && (
                <div className="relative overflow-hidden bg-white/80 dark:bg-foreground/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    {/* Decorative Gradient Blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex items-center justify-between">
                        <div>
                            <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400">
                                {t('newMaintenanceEntry')}
                            </h4>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                                {t('addMaintenanceRecord')}
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
                                    placeholder={t('e.g. Kitchen Renovation')}
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all backdrop-blur-sm outline-none dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('date')}</label>
                                <input
                                    type="date"
                                    value={newFolderDate}
                                    onChange={(e) => setNewFolderDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all backdrop-blur-sm outline-none dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('note')}</label>
                            <textarea
                                value={newFolderNote}
                                onChange={(e) => setNewFolderNote(e.target.value)}
                                placeholder={t('optionalFolderNote')}
                                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all backdrop-blur-sm outline-none dark:text-white resize-none"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="relative border-t border-border/50 dark:border-gray-700/50 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-bold text-foreground dark:text-gray-100 flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-orange-500" />
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
                            <div className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl group-hover:border-orange-500 group-hover:bg-orange-50/30 dark:group-hover:bg-orange-900/10 transition-all flex flex-col items-center justify-center text-center gap-2">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground dark:text-white">{t('clickToUploadDrag')}</p>
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">PDF, PNG, JPG</p>
                                </div>
                            </div>
                        </div>

                        {/* Staged Files */}
                        {stagedFiles.length > 0 && (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {stagedFiles.map((file) => (
                                    <div key={file.id} className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm backdrop-blur-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                                                    <Hammer className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.file.name}</span>
                                            </div>
                                            <button onClick={() => removeStagedFile(file.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* AI Badge */}
                                        {file.isAnalyzing ? (
                                            <div className="mb-3 flex items-center gap-2 text-xs text-orange-500 animate-pulse">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                {t('scanningBill', { defaultValue: 'Analyzing receipt...' })}
                                            </div>
                                        ) : file.aiData ? (
                                            <div className="mb-3 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
                                                <Sparkles className="w-3 h-3" />
                                                <span>{t('autoFilledByGemini', { defaultValue: 'Auto-filled by Gemini' })}</span>
                                                <span className="font-mono opacity-70">({(file.aiData.confidence * 100).toFixed(0)}% conf)</span>
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('vendor')}</label>
                                                <div className="relative">
                                                    <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        value={file.vendorName}
                                                        onChange={(e) => updateStagedFile(file.id, 'vendorName', e.target.value)}
                                                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-orange-500 transition-colors"
                                                        placeholder={t('vendor')}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('cost')}</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                    <input
                                                        type="number"
                                                        value={file.amount}
                                                        onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-orange-500 transition-colors"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('issueType')}</label>
                                                <div className="relative">
                                                    <Wrench className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                    <select
                                                        value={file.issueType}
                                                        onChange={(e) => updateStagedFile(file.id, 'issueType', e.target.value)}
                                                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-orange-500 transition-colors appearance-none"
                                                    >
                                                        <option value="">{t('selectType')}</option>
                                                        <option value="plumbing">{t('issuePlumbing')}</option>
                                                        <option value="electrical">{t('issueElectrical')}</option>
                                                        <option value="hvac">{t('issueHVAC')}</option>
                                                        <option value="painting">{t('issuePainting')}</option>
                                                        <option value="carpentry">{t('issueCarpentry')}</option>
                                                        <option value="appliance">{t('issueAppliance')}</option>
                                                        <option value="other">{t('issueOther')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground ml-1">{t('date')}</label>
                                                <input
                                                    type="date"
                                                    value={file.documentDate}
                                                    onChange={(e) => updateStagedFile(file.id, 'documentDate', e.target.value)}
                                                    className="w-full px-3 py-1.5 text-xs border border-border dark:border-gray-700 rounded-lg bg-white/50 dark:bg-foreground/50 outline-none focus:border-orange-500 transition-colors"
                                                />
                                            </div>
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
                                flex-1 px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-lg shadow-orange-500/25
                                flex items-center justify-center gap-2 transition-all
                                ${uploading
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 hover:shadow-orange-500/40 active:scale-[0.98]'
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
                                    {t('saveRecord')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Folders List */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Folders */}
                    {folders.map(folder => {
                        const folderDocs = docsByFolder[folder.id] || [];
                        const folderCost = folderDocs.reduce((sum, d) => sum + (d.amount || 0), 0);

                        return (
                            <div key={folder.id} className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-4 bg-gray-50/50 dark:bg-gray-700/30 flex items-start justify-between border-b border-border dark:border-gray-700">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400 rounded-lg mt-1">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg text-foreground dark:text-white">{folder.name}</h3>
                                                <span className="text-xs px-2 py-0.5 bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-300 rounded-full">
                                                    {format(parseISO(folder.folder_date), 'dd MMM yyyy')}
                                                </span>
                                            </div>
                                            {folder.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{folder.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>{folderDocs.length} {t('files')}</span>
                                                {folderCost > 0 && (
                                                    <span className="font-semibold text-foreground dark:text-white">₪{folderCost.toLocaleString()}</span>
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

                                {folderDocs.length > 0 && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {folderDocs.map(doc => (
                                            <div key={doc.id} className="p-3 pl-16 flex items-center justify-between hover:bg-secondary dark:hover:bg-gray-700/20 transition-colors">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Hammer className="w-4 h-4 text-orange-500" />
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{doc.title}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 ml-6 text-xs text-muted-foreground">
                                                        {doc.vendor_name && (
                                                            <span className="flex items-center gap-1">
                                                                <User className="w-3 h-3" /> {doc.vendor_name}
                                                            </span>
                                                        )}
                                                        {doc.issue_type && (
                                                            <span className="flex items-center gap-1">
                                                                <Wrench className="w-3 h-3" /> {getIssueLabel(doc.issue_type)}
                                                            </span>
                                                        )}
                                                        {doc.amount ? <span className="font-medium text-foreground dark:text-white">₪{doc.amount}</span> : null}
                                                        {doc.document_date && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> {doc.document_date}
                                                            </span>
                                                        )}
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
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 ltr:text-left rtl:text-right">{t('unsortedRecords')}</h4>
                            <div className="space-y-4">
                                {orphanedDocs.map(record => (
                                    <div
                                        key={record.id}
                                        className="bg-white dark:bg-gray-800 p-5 rounded-[2.5rem] border border-border/60 dark:border-gray-700 flex items-center justify-between group hover:shadow-md hover:border-primary/30 transition-all duration-300 cursor-pointer"
                                        onClick={() => window.open(propertyDocumentsService.getDocumentUrl(record) as any)}
                                    >
                                        <div className="flex-1 ltr:text-left rtl:text-right overflow-hidden pr-4 pl-4">
                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-200 truncate">{record.title || record.file_name}</p>
                                            <div className="flex flex-wrap gap-3 mt-1 text-sm font-medium text-gray-400 dark:text-gray-500">
                                                {record.amount && <span>₪{record.amount}</span>}
                                                {record.document_date && <span>{record.document_date}</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 p-3 bg-secondary dark:bg-gray-700/50 rounded-2xl group-hover:bg-primary/10 transition-colors">
                                            <Wrench className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {folders.length === 0 && orphanedDocs.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed border-border dark:border-gray-700 rounded-2xl">
                            <div className="w-16 h-16 bg-secondary dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wrench className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="font-semibold text-foreground dark:text-white">{t('noMaintenanceRecordsYet')}</h4>
                        </div>
                    )}
                </div>
            )}
            <UpgradeRequestModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                source="maintenance_scan_limit"
            />
        </div>
    );
}
