import { format, parseISO } from 'date-fns';
import { FileText, Calendar, DollarSign, ChevronRight, Building2, Tag } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { PropertyDocument, Property } from '../../types/database';
import { getUtilityTypeConfig } from '../../constants/utilityTypes';

interface DocumentTimelineProps {
    documents: PropertyDocument[];
    onDocumentClick: (doc: PropertyDocument) => void;
    loading?: boolean;
    property?: Property;
    sortOrder?: 'asc' | 'desc';
}

export function DocumentTimeline({ documents, onDocumentClick, loading, property, sortOrder = 'desc' }: DocumentTimelineProps) {
    const { t, lang } = useTranslation();

    const getCategoryLabel = (category: string) => {
        if (!category) return '';
        const lowerCat = category.toLowerCase();
        
        if (lowerCat.startsWith('utility_') || ['utility', 'utility_bill', 'utilities'].includes(lowerCat)) {
            return t('utilitiesStorage') || (lang === 'he' ? 'חשבונות' : 'Utilities');
        }

        switch (lowerCat) {
            case 'receipt':
            case 'receipts': return lang === 'he' ? 'אסמכתאות' : 'Receipts';
            case 'media':
            case 'photo':
            case 'video': return t('mediaStorage') || (lang === 'he' ? 'מדיה' : 'Media');
            case 'other':
            case 'documents':
            case 'document': return t('documentsStorage') || (lang === 'he' ? 'מסמכים' : 'Documents');
            case 'checks':
            case 'check': return t('checksStorage') || (lang === 'he' ? 'צ\'קים' : 'Checks');
            case 'maintenance': return t('maintenance') || (lang === 'he' ? 'תחזוקה' : 'Maintenance');
            default: return t(category) || category;
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted/50 dark:bg-neutral-800 animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted/50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-semibold text-foreground">{t('noDocumentsFound')}</h4>
                <p className="text-sm text-slate-500 mt-1">{t('startByAddingAbove')}</p>
            </div>
        );
    }

    // Group documents by month/year
    const groups = documents.reduce((acc, doc) => {
        const date = doc.document_date ? parseISO(doc.document_date) : new Date(doc.created_at);
        const monthKey = format(date, 'MMMM yyyy');
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(doc);
        return acc;
    }, {} as Record<string, PropertyDocument[]>);

    // Sort group keys
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    return (
        <div className="space-y-4 sm:space-y-6 w-full relative pb-4">

            {sortedGroupKeys.map((monthKey) => (
                <div key={monthKey} className="space-y-3 sm:space-y-4 relative">
                    {/* Group Documents */}
                    <div className="space-y-3">
                        {(() => {
                            const sortedDocs = groups[monthKey].sort((a, b) => {
                                const dateA = a.document_date ? parseISO(a.document_date) : new Date(a.created_at);
                                const dateB = b.document_date ? parseISO(b.document_date) : new Date(b.created_at);
                                return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
                            });

                            const displayDocs: any[] = [];
                            const mediaGroups = new Map<string, any>();

                            // Group media by folder_id or date to count photos/videos
                            sortedDocs.forEach((doc) => {
                                const lowerCat = doc.category?.toLowerCase() || '';
                                const isMedia = lowerCat === 'photo' || lowerCat === 'video' || lowerCat === 'media';
                                const hasBatchFolder = !!doc.folder_id && !isMedia;
                                
                                if (isMedia || hasBatchFolder) {
                                    const key = hasBatchFolder ? (doc.folder_id as string) : (doc.folder_id || (doc.document_date ? doc.document_date : doc.created_at.split('T')[0]));
                                    if (!mediaGroups.has(key)) {
                                        const group = { ...doc, isMediaGroup: true, photoCount: 0, videoCount: 0, groupedDocs: [] };
                                        mediaGroups.set(key, group);
                                        displayDocs.push(group);
                                    }
                                    const groupText = mediaGroups.get(key);
                                    if (lowerCat === 'video') groupText.videoCount++;
                                    else if (isMedia) groupText.photoCount++;
                                    groupText.groupedDocs.push(doc);
                                } else {
                                    displayDocs.push(doc);
                                }
                            });

                            return displayDocs.map((doc) => {
                                const address = (doc as any).properties?.address || property?.address || '';
                                const mainCategoryLabel = getCategoryLabel(doc.category) || '';
                                const isReceipt = doc.category === 'receipt' || doc.category === 'receipts';
                                const isUtility = doc.category?.startsWith('utility_') || doc.category === 'utilities';
                                const isDocument = mainCategoryLabel === 'מסמכים' || mainCategoryLabel === 'Documents';

                                return (
                                    <div
                                        key={doc.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onDocumentClick(doc)}
                                        className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-[20px] shadow-sm border border-slate-100 dark:border-white/5 p-3 flex sm:p-4 items-center justify-between w-full transition-all group overflow-hidden relative hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:shadow-md cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 grid grid-cols-[80px_1fr_80px] sm:grid-cols-[110px_1fr_110px] gap-1.5 sm:gap-4"
                                    >
                                        {/* Right Column: Date & Asset */}
                                        <div className="flex flex-col items-start min-w-0 overflow-hidden text-start pr-0.5 sm:pr-0">
                                            <span className="text-[13px] sm:text-lg tracking-tight font-bold text-indigo-950 dark:text-indigo-100 leading-tight w-full truncate block" title={doc.document_date ? format(parseISO(doc.document_date), 'dd/MM/yy') : format(new Date(doc.created_at), 'dd/MM/yy')}>
                                                {doc.document_date ? format(parseISO(doc.document_date), 'dd/MM/yy') : format(new Date(doc.created_at), 'dd/MM/yy')}
                                            </span>
                                            {address && (
                                                <div className="w-full flex items-center justify-start gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 text-[13px] sm:text-lg font-bold text-slate-500 dark:text-slate-400 tracking-tight overflow-hidden leading-tight">
                                                    <Building2 className="w-[13px] h-[13px] sm:w-[18px] sm:h-[18px] shrink-0" />
                                                    <span className="truncate flex-1 block pt-[1px]" title={address}>{address}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Center Column: Title & Type Details */}
                                        <div className="flex flex-col items-center justify-center min-w-0 overflow-hidden px-1">
                                            <h4 className="text-[15px] sm:text-lg font-extrabold text-foreground truncate w-full text-center tracking-tight block" title={mainCategoryLabel}>
                                                {mainCategoryLabel}
                                            </h4>
                                            
                                            <div className="flex flex-col items-center w-full min-w-0 mt-0.5 gap-0.5">
                                                {doc.isMediaGroup ? (
                                                    <span className="text-[15px] sm:text-lg font-medium text-muted-foreground truncate w-full text-center tracking-tight block" title={doc.title && !/\.(jpe?g|png|mp4|mov|webp|heic)$/i.test(doc.title) ? doc.title : undefined}>
                                                        {(doc.title && !/\.(jpe?g|png|mp4|mov|webp|heic)$/i.test(doc.title)) ? doc.title : 
                                                            (doc.category === 'photo' || doc.category === 'video' || doc.category === 'media') 
                                                                ? `${doc.photoCount} ${lang === 'he' ? 'תמונות' : 'Photos'}, ${doc.videoCount} ${lang === 'he' ? 'וידאו' : 'Videos'}`
                                                                : `${doc.groupedDocs?.length || 0} ${lang === 'he' ? 'קבצים' : 'Files'}`}
                                                    </span>
                                                ) : isReceipt ? (
                                                    // For Receipts: payment method without a pill, enlarged to match main title
                                                    <span className="text-[15px] sm:text-lg font-medium text-muted-foreground truncate w-full text-center tracking-tight block" title={(() => {
                                                        if (doc.issue_type) {
                                                            const translated = t(doc.issue_type as any);
                                                            return translated !== doc.issue_type && translated ? translated : doc.issue_type;
                                                        }
                                                        if (doc.description) {
                                                            const match = doc.description.match(/אמצעי תשלום:\s*([^\s|]+(?:\s+[^\s|]+)*)/);
                                                            if (match && match[1]) return match[1].trim();
                                                        }
                                                        return doc.title || doc.file_name;
                                                    })()}>
                                                        {(() => {
                                                            if (doc.issue_type) {
                                                                const translated = t(doc.issue_type as any);
                                                                return translated !== doc.issue_type && translated ? translated : doc.issue_type;
                                                            }
                                                            if (doc.description) {
                                                                const match = doc.description.match(/אמצעי תשלום:\s*([^\s|]+(?:\s+[^\s|]+)*)/);
                                                                if (match && match[1]) return match[1].trim();
                                                            }
                                                            return doc.title || doc.file_name;
                                                        })()}
                                                    </span>
                                                ) : isUtility ? (
                                                    // For Utilities: type of bill
                                                    <span className="text-[15px] sm:text-lg font-medium text-muted-foreground truncate w-full text-center tracking-tight block">
                                                        {(() => {
                                                            const rawType = doc.category?.replace('utility_', '');
                                                            const config = rawType ? getUtilityTypeConfig(rawType) : undefined;
                                                            if (config) {
                                                                return lang === 'he' ? config.fallbackHe : config.fallbackEn;
                                                            }
                                                            return t(doc.category as any) || doc.category;
                                                        })()}
                                                    </span>
                                                ) : isDocument ? (
                                                    // For Documents: explicit title user inputted
                                                    <span className="text-[15px] sm:text-lg font-medium text-muted-foreground truncate w-full text-center tracking-tight block" title={doc.title || doc.file_name}>
                                                        {doc.title || doc.file_name}
                                                    </span>
                                                ) : (
                                                    // Default Subtitle
                                                    <span className="text-[15px] sm:text-lg font-medium text-muted-foreground truncate w-full text-center tracking-tight block" title={doc.title || doc.file_name}>
                                                        {doc.title || doc.file_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Left Column: Vendor & Amount */}
                                        <div className="flex flex-col items-end min-w-0 overflow-hidden text-end pl-0.5 sm:pl-0">
                                            <span className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-100 leading-tight w-full text-end truncate block min-h-[16px]" title={doc.vendor_name || ''}>
                                                {doc.vendor_name || (!doc.isMediaGroup && !isReceipt && !isUtility ? '-' : ' ')}
                                            </span>
                                            {doc.amount != null ? (
                                                <div className="flex items-center gap-0.5 text-[11px] sm:text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate w-full justify-end">
                                                    <span className="text-[9px] sm:text-xs opacity-70">₪</span>
                                                    <span className="truncate block max-w-full" title={doc.amount.toLocaleString()}>{doc.amount.toLocaleString()}</span>
                                                </div>
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform mt-1 sm:mt-2 shrink-0 block" />
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            ))}
        </div>
    );
}
