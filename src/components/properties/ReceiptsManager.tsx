import { useState, useEffect } from 'react';
import { Upload, Loader2, FileText, Trash2, Calendar, X, Check, Image as ImageIcon } from 'lucide-react';
import type { Property, PropertyDocument } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { format, parseISO } from 'date-fns';
import { DocumentTimeline } from './DocumentTimeline';
import { DocumentDetailsModal } from '../modals/DocumentDetailsModal';
import { DatePicker } from '../ui/DatePicker';

interface ReceiptsManagerProps {
    property: Property;
    readOnly?: boolean;
}

export function ReceiptsManager({ property, readOnly }: ReceiptsManagerProps) {
    const { t } = useTranslation();
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Upload Form State
    const [stagedFiles, setStagedFiles] = useState<Array<{
        id: string;
        file: File;
        description: string;
        documentDate: string;
        amount: string;
        vendorName: string;
        issueType: string;
    }>>([]);

    useEffect(() => {
        loadData();
    }, [property.id]);

    async function loadData() {
        setLoading(true);
        try {
            const docs = await propertyDocumentsService.getPropertyDocuments(property.id, { category: 'receipt' });
            setDocuments(docs);
        } catch (error) {
            console.error('Error fetching receipts:', error);
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
                documentDate: format(new Date(), 'yyyy-MM-dd'),
                vendorName: '',
                issueType: 'transfer'
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
                        category: 'receipt',
                        title: stagedFile.file.name,
                        description: stagedFile.description,
                        documentDate: stagedFile.documentDate,
                        amount: stagedFile.amount ? parseFloat(stagedFile.amount) : undefined,
                        vendorName: stagedFile.vendorName,
                        issueType: stagedFile.issueType
                    });
                });
                await Promise.all(uploadPromises);
            }

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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground dark:text-white">{t('receipts') || 'אסמכתאות'}</h3>
                    <p className="text-sm text-muted-foreground">{t('receiptsDesc') || 'קבלות, אישורי העברה ואסמכתאות'}</p>
                </div>
                {!readOnly && !showUploadForm && (
                    <button
                        onClick={() => setShowUploadForm(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        {t('uploadReceipt') || 'העלאת אסמכתא'}
                    </button>
                )}
            </div>

            {showUploadForm && (
                <div className="relative overflow-hidden bg-white/80 dark:bg-foreground/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold">{t('uploadReceipt') || 'העלאת אסמכתא'}</h4>
                        <button onClick={() => setShowUploadForm(false)} className="p-1 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
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
                                <div key={file.id} className="relative group bg-white/60 dark:bg-gray-800/60 p-3 rounded-xl border border-border dark:border-gray-700 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium truncate flex-1">{file.file.name}</span>
                                        <button onClick={() => removeStagedFile(file.id)} className="text-destructive p-1"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <DatePicker
                                            value={file.documentDate ? parseISO(file.documentDate) : undefined}
                                            onChange={(date) => updateStagedFile(file.id, 'documentDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                            className="w-full"
                                        />
                                        <input
                                            type="number"
                                            value={file.amount}
                                            onChange={(e) => updateStagedFile(file.id, 'amount', e.target.value)}
                                            placeholder={t('amount')}
                                            className="text-sm p-2 rounded-xl border bg-background"
                                        />
                                        <input
                                            type="text"
                                            value={file.vendorName}
                                            onChange={(e) => updateStagedFile(file.id, 'vendorName', e.target.value)}
                                            placeholder={t('tenantName') || 'שם משלם'}
                                            className="text-sm p-2 rounded-xl border bg-background"
                                        />
                                        <select
                                            value={file.issueType}
                                            onChange={(e) => updateStagedFile(file.id, 'issueType', e.target.value)}
                                            className="text-sm p-2 rounded-xl border bg-background"
                                        >
                                            <option value="transfer">{t('transfer') || 'העברה בנקאית'}</option>
                                            <option value="cash">{t('cash') || 'מזומן'}</option>
                                            <option value="check">{t('check') || 'צ\'ק'}</option>
                                            <option value="credit_card">{t('credit_card') || 'כרטיס אשראי'}</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        value={file.description}
                                        onChange={(e) => updateStagedFile(file.id, 'description', e.target.value)}
                                        placeholder={t('descriptionOptional') || 'תיאור (אופציונלי)'}
                                        className="text-sm p-2 rounded-xl border bg-background w-full"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 p-4 sm:p-5 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 flex gap-3 justify-end border-t border-transparent z-20">
                        <button onClick={() => setShowUploadForm(false)} className="px-5 py-2.5 text-sm font-semibold text-muted-foreground bg-muted/80 hover:bg-muted dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 rounded-xl transition-all shadow-sm border border-border/50">{t('cancel')}</button>
                        <button
                            onClick={handleUpload}
                            disabled={uploading || stagedFiles.length === 0}
                            className={`
                                px-6 py-2.5 rounded-xl text-sm font-bold shadow-xl flex items-center gap-2 transition-all
                                ${uploading || stagedFiles.length === 0
                                    ? 'bg-primary/50 text-white cursor-not-allowed shadow-none'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.02] active:scale-95'
                                }
                            `}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('upload')}
                        </button>
                    </div>
                </div>
            )}

            <DocumentTimeline
                documents={documents}
                loading={loading}
                property={property}
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
                onUpdate={(updatedDoc) => {
                    setSelectedDocument(updatedDoc as any);
                    loadData();
                }}
            />
        </div>
    );
}
