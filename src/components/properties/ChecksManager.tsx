import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, Trash2, Calendar, X, Check, Image as ImageIcon } from 'lucide-react';
import type { Property, PropertyDocument, DocumentFolder } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { format, parseISO } from 'date-fns';

interface ChecksManagerProps {
    property: Property;
    readOnly?: boolean;
}

export function ChecksManager({ property, readOnly }: ChecksManagerProps) {
    const { t } = useTranslation();
    const [checksFolder, setChecksFolder] = useState<DocumentFolder | null>(null);
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);

    // Upload Form State
    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        description: string;
        documentDate: string;
        amount: string;
    }>>([]);

    const FOLDER_NAME = 'Checks'; // Fixed folder name

    useEffect(() => {
        loadData();
    }, [property.id]);

    async function loadData() {
        setLoading(true);
        try {
            // Find "Checks" folder
            const folders = await propertyDocumentsService.getFolders(property.id, 'other');
            const folder = folders.find(f => f.name === FOLDER_NAME);
            setChecksFolder(folder || null);

            if (folder) {
                const docs = await propertyDocumentsService.getPropertyDocuments(property.id, { folderId: folder.id });
                setDocuments(docs);
            } else {
                setDocuments([]);
            }
        } catch (error) {
            console.error('Error fetching checks:', error);
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

    const handleUpload = async () => {
        setUploading(true);
        try {
            // 1. Ensure Folder Exists
            let folderId = checksFolder?.id;
            if (!folderId) {
                const folder = await propertyDocumentsService.createFolder({
                    property_id: property.id,
                    category: 'other',
                    name: FOLDER_NAME,
                    folder_date: new Date().toISOString().split('T')[0],
                    description: 'Checks and Payment Proofs'
                });
                folderId = folder.id;
                setChecksFolder(folder);
            }

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
                        folderId,
                        title: stagedFile.file.name,
                        description: stagedFile.description,
                        documentDate: stagedFile.documentDate,
                        amount: stagedFile.amount ? parseFloat(stagedFile.amount) : undefined,
                        tags: ['check']
                    });
                });
                await Promise.all(uploadPromises);
            }

            // Reset
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

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm(t('deleteDocumentConfirmation'))) return;
        try {
            await propertyDocumentsService.deleteDocument(docId);
            loadData();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground dark:text-white">{t('checksStorage')}</h3>
                    <p className="text-sm text-muted-foreground">{t('checksDesc')}</p>
                </div>
                {!readOnly && !showUploadForm && (
                    <button
                        onClick={() => setShowUploadForm(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        {t('uploadChecks')}
                    </button>
                )}
            </div>

            {/* Upload Form */}
            {showUploadForm && (
                <div className="relative overflow-hidden bg-white/80 dark:bg-foreground/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold">{t('uploadChecks')}</h4>
                        <button onClick={() => setShowUploadForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="group relative mb-6">
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl group-hover:border-primary group-hover:bg-primary/10/30 dark:group-hover:bg-blue-900/10 transition-all flex flex-col items-center justify-center text-center gap-2">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <p className="text-sm font-medium">{t('clickToUploadDrag')}</p>
                        </div>
                    </div>

                    {stagedFiles.length > 0 && (
                        <div className="grid gap-3 max-h-60 overflow-y-auto">
                            {stagedFiles.map((file) => (
                                <div key={file.id} className="relative group bg-white/60 dark:bg-gray-800/60 p-3 rounded-xl border border-border dark:border-gray-700 flex gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium truncate">{file.file.name}</span>
                                            <button onClick={() => removeStagedFile(file.id)} className="text-red-500"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="date"
                                                value={file.documentDate}
                                                onChange={(e) => updateStagedFile(file.id, 'documentDate', e.target.value)}
                                                className="text-xs p-1 rounded border"
                                            />
                                            <input
                                                type="number"
                                                value={file.amount}
                                                onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                                placeholder={t('amount')}
                                                className="text-xs p-1 rounded border"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowUploadForm(false)} className="px-4 py-2 text-sm">{t('cancel')}</button>
                        <button
                            onClick={handleUpload}
                            disabled={uploading || stagedFiles.length === 0}
                            className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('upload')}
                        </button>
                    </div>
                </div>
            )}

            {/* Gallery */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-3xl border border-dashed border-border">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>{t('noChecksYet')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {documents.map((doc) => (
                        <div key={doc.id} className="group relative aspect-[3/2] bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => window.open(propertyDocumentsService.getDocumentUrl(doc) as any)}>
                            {/* Preview (Mock for PDF, Image for Image) */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                                <FileText className="w-8 h-8 text-gray-400" />
                                {/* In a real app, we'd fetch a thumbnail or check mime_type to render <img /> */}
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-sm font-bold truncate">{doc.title}</p>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-xs text-white/80">{doc.document_date ? format(parseISO(doc.document_date), 'dd/MM/yyyy') : '-'}</span>
                                    {doc.amount && <span className="text-xs font-bold text-emerald-400">₪{doc.amount}</span>}
                                </div>
                            </div>
                            {!readOnly && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                                    className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
