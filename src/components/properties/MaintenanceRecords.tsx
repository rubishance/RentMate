import { useState, useEffect } from 'react';
import { Upload, Loader2, Wrench, FileText, Trash2, Calendar, DollarSign, User, X, Plus, Folder, Check, PenTool, Hammer } from 'lucide-react';
import type { Property, PropertyDocument, DocumentCategory, DocumentFolder } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { BillAnalysisService } from '../../services/bill-analysis.service';
import { Sparkles } from 'lucide-react';
import UpgradeRequestModal from '../modals/UpgradeRequestModal';
import { format, parseISO } from 'date-fns';
import { DocumentTimeline } from './DocumentTimeline';
import { DocumentDetailsModal } from '../modals/DocumentDetailsModal';
import { DatePicker } from '../ui/DatePicker';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

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
    const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
                <Button
                    variant="outline"
                    onClick={() => setShowUploadForm(true)}
                    className="w-full py-8 border-2 border-dashed border-border hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 h-auto flex flex-col gap-2 group"
                >
                    <div className="p-2 bg-orange-100/50 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="font-medium text-muted-foreground group-hover:text-foreground">{t('createMaintenanceFolder')}</span>
                </Button>
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
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowUploadForm(false)}
                            className="rounded-full hover:bg-muted"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>

                    {/* Folder Metadata */}
                    <div className="relative space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <Input
                                    label={t('subject')}
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder={t('e.g. Kitchen Renovation')}
                                    className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground ml-1">{t('date')}</label>
                                <DatePicker
                                    value={newFolderDate ? parseISO(newFolderDate) : undefined}
                                    onChange={(date) => setNewFolderDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Textarea
                                label={t('note')}
                                value={newFolderNote}
                                onChange={(e) => setNewFolderNote(e.target.value)}
                                placeholder={t('optionalFolderNote')}
                                className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm resize-none"
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeStagedFile(file.id)}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
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
                                                <Input
                                                    label={t('vendor')}
                                                    value={file.vendorName}
                                                    onChange={(e) => updateStagedFile(file.id, 'vendorName', e.target.value)}
                                                    className="bg-white/50 dark:bg-foreground/50 h-8 text-xs"
                                                    placeholder={t('vendor')}
                                                    leftIcon={<User className="w-3 h-3 text-muted-foreground" />}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Input
                                                    label={t('cost')}
                                                    type="number"
                                                    value={file.amount}
                                                    onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                    className="bg-white/50 dark:bg-foreground/50 h-8 text-xs"
                                                    placeholder="0"
                                                    leftIcon={<DollarSign className="w-3 h-3 text-muted-foreground" />}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Select
                                                    label={t('issueType')}
                                                    value={file.issueType}
                                                    onChange={(val) => updateStagedFile(file.id, 'issueType', val)}
                                                    options={[
                                                        { value: 'plumbing', label: t('issuePlumbing') },
                                                        { value: 'electrical', label: t('issueElectrical') },
                                                        { value: 'hvac', label: t('issueHVAC') },
                                                        { value: 'painting', label: t('issuePainting') },
                                                        { value: 'carpentry', label: t('issueCarpentry') },
                                                        { value: 'appliance', label: t('issueAppliance') },
                                                        { value: 'other', label: t('issueOther') }
                                                    ]}
                                                    placeholder={t('selectType')}
                                                    className="h-8 text-xs"
                                                    leftIcon={<Wrench className="w-3 h-3 text-muted-foreground" />}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground ml-1">{t('date')}</label>
                                                <DatePicker
                                                    value={file.documentDate ? parseISO(file.documentDate) : undefined}
                                                    onChange={(date) => updateStagedFile(file.id, 'documentDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border dark:border-gray-700/50">
                        <div className="flex gap-3 pt-4 border-t border-border dark:border-gray-700/50">
                            <Button
                                variant="ghost"
                                onClick={() => setShowUploadForm(false)}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                onClick={handleCreateAndUpload}
                                isLoading={uploading}
                                disabled={uploading}
                                className={`flex-1 ${!uploading && 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'}`}
                                leftIcon={!uploading ? <Check className="w-4 h-4" /> : undefined}
                            >
                                {uploading ? t('saving') : t('saveRecord')}
                            </Button>
                        </div>
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
                source="maintenance_scan_limit"
            />
        </div>
    );
}
