import { useState, useEffect } from 'react';
import { Upload, Loader2, Image as ImageIcon, Video, Trash2, ExternalLink, Plus, Folder, Check, X, Pencil as Pen } from 'lucide-react';
import type { Property, PropertyDocument, DocumentFolder } from '../../types/database';
import { propertyDocumentsService } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { CompressionService } from '../../services/compression.service';
import { format, parseISO } from 'date-fns';

import { DocumentTimeline } from './DocumentTimeline';
import { DocumentDetailsModal } from '../modals/DocumentDetailsModal';
import { DatePicker } from '../ui/DatePicker';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface MediaGalleryProps {
    property: Property;
    readOnly?: boolean;
}

export function MediaGallery({ property, readOnly }: MediaGalleryProps) {
    const { t } = useTranslation();
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [mediaItems, setMediaItems] = useState<PropertyDocument[]>([]);
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);

    // New Album Form State
    const [albumName, setAlbumName] = useState('');
    const [albumDate, setAlbumDate] = useState(new Date().toISOString().split('T')[0]);
    const [albumNote, setAlbumNote] = useState('');
    const [stagedFiles, setStagedFiles] = useState<Array<{ file: File; note: string; preview: string }>>([]);
    const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [property.id]);

    useEffect(() => {
        // Load image URLs for previews
        mediaItems.forEach(async (item) => {
            if (item.category === 'photo' && !imageUrls[item.id]) {
                try {
                    const url = await propertyDocumentsService.getDocumentUrl(item);
                    setImageUrls(prev => ({ ...prev, [item.id]: url }));
                } catch (e) {
                    console.error('Error fetching image URL:', e);
                }
            }
        });
    }, [mediaItems]);

    async function loadData() {
        setLoading(true);
        try {
            const [fetchedFolders, photos, videos] = await Promise.all([
                propertyDocumentsService.getFolders(property.id, 'photo'), // We treat "Albums" as category=photo
                propertyDocumentsService.getPropertyDocuments(property.id, { category: 'photo' }),
                propertyDocumentsService.getPropertyDocuments(property.id, { category: 'video' })
            ]);
            setFolders(fetchedFolders);
            setMediaItems([...photos, ...videos]);
        } catch (error) {
            console.error('Error fetching media:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const newFiles = Array.from(e.target.files).map(file => ({
            file,
            note: '',
            preview: URL.createObjectURL(file)
        }));

        setStagedFiles(prev => [...prev, ...newFiles]);
        e.target.value = ''; // Reset input
    };

    const removeStagedFile = (index: number) => {
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const updateStagedFileNote = (index: number, note: string) => {
        setStagedFiles(prev => prev.map((item, i) => i === index ? { ...item, note } : item));
    };

    const handleCreateAndUpload = async () => {
        setUploading(true);
        setUploadProgress({ current: 0, total: stagedFiles.length });

        try {
            if (editingFolder) {
                // Update Folder
                await propertyDocumentsService.updateFolder(editingFolder.id, {
                    name: albumName.trim() || editingFolder.name,
                    folder_date: albumDate,
                    description: albumNote
                });
            } else {
                // 1. Create Folder (Album)
                const finalAlbumName = albumName.trim() || t('newAlbum', { defaultValue: 'New Album' });

                const folder = await propertyDocumentsService.createFolder({
                    property_id: property.id,
                    category: 'photo',
                    name: finalAlbumName,
                    folder_date: albumDate || new Date().toISOString().split('T')[0],
                    description: albumNote
                });

                // 2. Upload Files
                if (stagedFiles.length > 0) {
                    for (let i = 0; i < stagedFiles.length; i++) {
                        let { file, note } = stagedFiles[i];
                        const category = file.type.startsWith('video/') ? 'video' : 'photo';

                        if (category === 'photo' && CompressionService.isImage(file)) {
                            try {
                                file = await CompressionService.compressImage(file);
                            } catch (e) {
                                console.warn('Compression failed, using original', e);
                            }
                        }

                        await propertyDocumentsService.uploadDocument(file, {
                            propertyId: property.id,
                            category,
                            folderId: folder.id,
                            title: file.name,
                            description: note,
                            documentDate: albumDate
                        });

                        setUploadProgress({ current: i + 1, total: stagedFiles.length });
                    }
                }
            }

            // Reset
            setAlbumName('');
            setAlbumDate(new Date().toISOString().split('T')[0]);
            setAlbumNote('');
            setStagedFiles([]);
            setShowUploadForm(false);
            setEditingFolder(null);
            loadData();

        } catch (error: any) {
            console.error('Operation failed:', error);
            alert(`${t('error')}: ${error.message}`);
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    const handleEditFolder = (folder: DocumentFolder) => {
        setEditingFolder(folder);
        setAlbumName(folder.name);
        setAlbumDate(folder.folder_date);
        setAlbumNote(folder.description || '');
        setStagedFiles([]);
        setShowUploadForm(true);
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

    const handleDeleteDocument = async (itemId: string) => {
        if (!confirm(t('deleteFileConfirmation'))) return;
        try {
            await propertyDocumentsService.deleteDocument(itemId);
            setMediaItems(prev => prev.filter(m => m.id !== itemId));
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const getFileUrl = async (item: PropertyDocument) => {
        try {
            const url = await propertyDocumentsService.getDocumentUrl(item);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error getting file URL:', error);
        }
    };

    // Grouping
    const itemsByFolder = mediaItems.reduce((acc, item) => {
        if (item.folder_id) {
            if (!acc[item.folder_id]) acc[item.folder_id] = [];
            acc[item.folder_id].push(item);
        }
        return acc;
    }, {} as Record<string, PropertyDocument[]>);

    const orphanedItems = mediaItems.filter(item => !item.folder_id);


    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-foreground dark:text-white">{t('photosAndVideos')}</h3>
                    <p className="text-sm text-muted-foreground">{t('mediaGalleryDesc')}</p>
                </div>
            </div>

            {/* Actions */}
            {!readOnly && !showUploadForm && (
                <button
                    onClick={() => setShowUploadForm(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 hover:bg-primary/10/50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground"
                >
                    <Plus className="w-5 h-5" />
                    {t('createNewAlbum')}
                </button>
            )}

            {/* Create Album Form */}
            {showUploadForm && (
                <div className="relative overflow-hidden bg-white/80 dark:bg-foreground/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 dark:border-gray-700/50 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    {/* Decorative Gradient Blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex items-center justify-between">
                        <div>
                            <h4 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                                {editingFolder ? t('edit') : t('newAlbum')}
                            </h4>
                            <h4 className="font-semibold text-foreground">{t('newUploads')}</h4>
                            <p className="text-xs text-muted-foreground">
                                {stagedFiles.length} {t('filesSelected')}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowUploadForm(false)} // Renamed from setShowUploadForm
                            className="rounded-full hover:bg-muted"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>

                    {/* Album Metadata */}
                    <div className="relative space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('albumName')}</label>
                                <Input // Replaced native input
                                    type="text"
                                    value={albumName}
                                    onChange={(e) => setAlbumName(e.target.value)}
                                    placeholder={t('e.g. Property Inspection 2024')}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('date')}</label>
                                <DatePicker
                                    value={albumDate ? parseISO(albumDate) : undefined}
                                    onChange={(date) => setAlbumDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">{t('note')}</label>
                            <Textarea // Replaced native textarea
                                value={albumNote}
                                onChange={(e) => setAlbumNote(e.target.value)}
                                placeholder={t('optionalAlbumNote')}
                                className="w-full resize-none"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Media Upload Section - Only for New Folders for now */}
                    {!editingFolder && (
                        <div className="relative border-t border-border/50 dark:border-gray-700/50 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h5 className="text-sm font-bold text-foreground dark:text-gray-100 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                    {t('mediaFiles')}
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
                                    accept="image/*,video/*"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl group-hover:border-primary group-hover:bg-primary/10/30 dark:group-hover:bg-blue-900/10 transition-all flex flex-col items-center justify-center text-center gap-2">
                                    <div className="p-3 bg-primary/10 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6 text-primary dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground dark:text-white">{t('clickToUploadDrag')}</p>
                                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">PNG, JPG, MP4</p>
                                    </div>
                                </div>
                            </div>

                            {stagedFiles.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-1">
                                    {stagedFiles.map((item, idx) => (
                                        <div key={idx} className="relative group aspect-square bg-white/60 dark:bg-gray-800/60 rounded-xl overflow-hidden border border-border dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                                            {item.file.type.startsWith('image/') ? (
                                                <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted dark:bg-gray-700">
                                                    <Video className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                                                <Button // Replaced native button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeStagedFile(idx)}
                                                    className="text-white hover:bg-black/30 w-6 h-6 p-0 rounded-full"
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="absolute bottom-1 left-1 right-1">
                                                <Input // Replaced native input
                                                    value={item.note}
                                                    onChange={(e) => updateStagedFileNote(idx, e.target.value)}
                                                    placeholder={t('addQuickNote')}
                                                    className="h-7 text-xs bg-white/90 dark:bg-black/70 border-0 backdrop-blur-md focus:ring-1 focus:ring-indigo-500 dark:text-white placeholder-gray-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-border dark:border-gray-700/50">
                        <Button // Replaced native button
                            variant="ghost"
                            onClick={() => setShowUploadForm(false)} // Renamed from setShowUploadForm
                        >
                            {t('cancel')}
                        </Button>
                        <Button // Replaced native button
                            onClick={handleCreateAndUpload} // Renamed from handleCreateAndUpload
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
                                    {uploadProgress ? `${t('uploading')} (${uploadProgress.current}/${uploadProgress.total})` : t('processing')}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {t('createAndUpload')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Albums & Orphaned Media */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Folders (Albums) */}
                    {folders.map(folder => {
                        const folderItems = itemsByFolder[folder.id] || [];
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
                                                    {format(parseISO(folder.folder_date), 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                            {folder.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{folder.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>{folderItems.length} {t('files')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!readOnly && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditFolder(folder)}
                                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                title={t('edit')}
                                            >
                                                <Pen className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFolder(folder.id)}
                                                className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                                                title={t('deleteAlbum')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <DocumentTimeline
                                    documents={folderItems}
                                    onDocumentClick={(doc) => {
                                        setSelectedDocument(doc);
                                        setIsDetailsModalOpen(true);
                                    }}
                                />
                            </div>
                        );
                    })}

                    {/* Orphaned Media */}
                    {orphanedItems.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('unsortedMedia')}</h4>
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 overflow-hidden">
                                <DocumentTimeline
                                    documents={orphanedItems}
                                    onDocumentClick={(doc) => {
                                        setSelectedDocument(doc);
                                        setIsDetailsModalOpen(true);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {folders.length === 0 && orphanedItems.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed border-border dark:border-gray-700 rounded-2xl">
                            <div className="w-16 h-16 bg-secondary dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="font-semibold text-foreground dark:text-white">{t('noMediaYet')}</h4>
                        </div>
                    )}
                </div>
            )}

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
