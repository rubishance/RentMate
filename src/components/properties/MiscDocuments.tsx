import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, Trash2, Calendar, Tag, X, Plus, Folder, Check, User } from 'lucide-react';
import type { Property, PropertyDocument, DocumentCategory, DocumentFolder } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { format, parseISO } from 'date-fns';
import { DocumentTimeline } from './DocumentTimeline';
import { DocumentDetailsModal } from '../modals/DocumentDetailsModal';
import { DatePicker } from '../ui/DatePicker';

interface MiscDocumentsProps {
    property: Property;
    readOnly?: boolean;
}

export function MiscDocuments({ property, readOnly }: MiscDocumentsProps) {
    const { t } = useTranslation();
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // New Folder / Upload Form State
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDate, setNewFolderDate] = useState(new Date().toISOString().split('T')[0]);
    const [newFolderNote, setNewFolderNote] = useState('');
    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        description: string;
        documentDate: string;
        amount: string;
    }>>([]);

    useEffect(() => {
        loadData();
    }, [property.id]);

    async function loadData() {
        setLoading(true);
        try {
            const miscCategories: DocumentCategory[] = ['insurance', 'warranty', 'legal', 'invoice', 'receipt', 'other'];

            const [fetchedFolders, results] = await Promise.all([
                propertyDocumentsService.getFolders(property.id, 'other'),
                Promise.all(miscCategories.map(cat =>
                    propertyDocumentsService.getPropertyDocuments(property.id, { category: cat })
                ))
            ]);

            setFolders(fetchedFolders);
            setDocuments(results.flat());
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                description: '',
                amount: '',
                documentDate: newFolderDate // Default to folder date
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

    const handleCreateAndUpload = async () => {
        setUploading(true);
        try {
            // 1. Create Folder
            const folderName = newFolderName.trim() || t('newDocumentsFolder', { defaultValue: 'New Folder' });

            const folder = await propertyDocumentsService.createFolder({
                property_id: property.id,
                category: 'other',
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
                        category: 'other',
                        folderId: folder.id,
                        title: stagedFile.file.name,
                        description: stagedFile.description,
                        documentDate: stagedFile.documentDate,
                        amount: stagedFile.amount ? parseFloat(stagedFile.amount) : undefined
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

    const getCategoryLabel = (cat: DocumentCategory) => {
        const keyMap: Record<string, string> = {
            insurance: 'catInsurance',
            warranty: 'catWarranty',
            legal: 'catLegal',
            invoice: 'catInvoice',
            receipt: 'catReceipt',
            other: 'catOther'
        };
        const key = keyMap[cat];
        return key ? t(key) : cat;
    };

    const getCategoryColor = (cat: DocumentCategory) => {
        const colors: Record<string, string> = {
            insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            warranty: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            legal: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            invoice: 'bg-primary/10 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            receipt: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            other: 'bg-muted text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        };
        return colors[cat] || colors.other;
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
    const totalValue = documents.reduce((sum, doc) => sum + (doc.amount || 0), 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground dark:text-white">{t('documentsStorage')}</h3>
                    <p className="text-sm text-muted-foreground">{t('documentsDesc')}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('totalSpent')}</p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">₪{totalValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('documentsCount', { count: documents.length })}
                    </p>
                </div>
            </div>

            {/* Actions */}
            {!readOnly && !showUploadForm && (
                <button
                    onClick={() => setShowUploadForm(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 hover:bg-primary/10/50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground"
                >
                    <Plus className="w-5 h-5" />
                    {t('createDocumentFolder')}
                </button>
            )}

            {/* Create Folder Form */}
            {/* Create Folder Form (Premium UI) */}
            {showUploadForm && (
                <div className="relative overflow-hidden bg-white/80 dark:bg-foreground/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    {/* Decorative Gradient Blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex items-center justify-between">
                        <div>
                            <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                                {t('newDocumentEntry')}
                            </h4>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                                {t('createFolderDesc')}
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
                                    placeholder={t('e.g. Tenancy Agreement 2024')}
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-border/60 dark:border-gray-700/60 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-primary transition-all backdrop-blur-sm outline-none dark:text-white"
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
                                accept=".pdf,.doc,.docx,image/*"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl group-hover:border-primary group-hover:bg-primary/10/30 dark:group-hover:bg-blue-900/10 transition-all flex flex-col items-center justify-center text-center gap-2">
                                <div className="p-3 bg-primary/10 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-primary dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground dark:text-white">{t('clickToUploadDrag')}</p>
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">PDF, DOCX, JPG, PNG</p>
                                </div>
                            </div>
                        </div>

                        {/* Staged Files */}
                        {stagedFiles.length > 0 && (
                            <div className="grid gap-3 max-h-80 overflow-y-auto pr-1">
                                {stagedFiles.map((file) => (
                                    <div key={file.id} className="relative group bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-border dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 shadow-sm">
                                                    <FileText className="w-5 h-5 text-indigo-500" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[180px]" title={file.file.name}>
                                                    {file.file.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeStagedFile(file.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('date')}</label>
                                                <DatePicker
                                                    value={file.documentDate ? parseISO(file.documentDate) : undefined}
                                                    onChange={(date) => updateStagedFile(file.id, 'documentDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('amount')} (₪)</label>
                                                <input
                                                    type="number"
                                                    value={file.amount}
                                                    onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-foreground border border-border dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={file.description}
                                                onChange={(e) => updateStagedFile(file.id, 'description', e.target.value)}
                                                className="w-full px-3 py-2 text-xs bg-secondary dark:bg-foreground border border-transparent focus:bg-white focus:border-blue-200 rounded-lg transition-all outline-none"
                                                placeholder={t('addQuickNote')}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                    {/* Actions */}
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
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/40 active:scale-[0.98]'
                                }
                            `}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('processing')}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {t('createAndUpload')}
                                </>
                            )}
                        </button>
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
        </div>
    );
}
