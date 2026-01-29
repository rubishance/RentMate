import { format, parseISO } from 'date-fns';
import { FileText, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { PropertyDocument } from '../../types/database';

interface DocumentTimelineProps {
    documents: PropertyDocument[];
    onDocumentClick: (doc: PropertyDocument) => void;
    loading?: boolean;
}

export function DocumentTimeline({ documents, onDocumentClick, loading }: DocumentTimelineProps) {
    const { t, lang } = useTranslation();

    if (loading) {
        return (
            <div className="space-y-4 p-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{t('noDocumentsFound')}</h4>
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

    // Sort group keys descending
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
    });

    return (
        <div className="p-4 space-y-8 relative">
            {/* Timeline Line */}
            <div className="absolute top-0 bottom-0 left-[27px] rtl:right-[27px] w-[2px] bg-slate-100 dark:bg-neutral-800" />

            {sortedGroupKeys.map((monthKey) => (
                <div key={monthKey} className="space-y-4 relative">
                    {/* Month Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full border-4 border-white dark:border-neutral-900 bg-primary shadow-sm z-10" />
                        <h3 className="text-sm font-bold text-slate-500 dark:text-neutral-400 tracking-wider uppercase">
                            {monthKey}
                        </h3>
                    </div>

                    {/* Group Documents */}
                    <div className="space-y-3 ltr:ml-7 rtl:mr-7">
                        {groups[monthKey]
                            .sort((a, b) => {
                                const dateA = a.document_date ? parseISO(a.document_date) : new Date(a.created_at);
                                const dateB = b.document_date ? parseISO(b.document_date) : new Date(b.created_at);
                                return dateB.getTime() - dateA.getTime();
                            })
                            .map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => onDocumentClick(doc)}
                                    className="w-full flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-slate-100 dark:border-neutral-800 hover:border-primary/30 transition-all hover:shadow-md group text-start outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {/* Icon / Date Sticker */}
                                    <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-neutral-800 text-slate-400 group-hover:text-primary transition-colors">
                                        <span className="text-[10px] font-bold uppercase leading-none mb-1">
                                            {doc.document_date ? format(parseISO(doc.document_date), 'MMM') : format(new Date(doc.created_at), 'MMM')}
                                        </span>
                                        <span className="text-base font-black leading-none italic">
                                            {doc.document_date ? format(parseISO(doc.document_date), 'dd') : format(new Date(doc.created_at), 'dd')}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {doc.title || doc.file_name}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                                            {doc.vendor_name || t('noVendor')}
                                        </p>
                                    </div>

                                    {/* Amount / Action */}
                                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                                        {doc.amount ? (
                                            <div className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                                                <span className="text-xs opacity-50">₪</span>
                                                {doc.amount.toLocaleString()}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {t('noAmount')}
                                            </div>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
