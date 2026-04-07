import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HardDrive, AlertTriangle, Loader2, ChevronDown, Image as ImageIcon, Receipt, FileText, FileStack, Banknote, Folder, ClipboardCheck, UserPlus } from 'lucide-react';
import { formatBytes, cn } from '../../lib/utils';
import { propertyDocumentsService as service } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { useSubscription } from '../../hooks/useSubscription';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

interface StorageUsage {
    totalBytes: number;
    quotaBytes: number;
    percentUsed: number;
    breakdown: {
        media: number;
        utilities: number;
        checks: number;
        documents: number;
        receipts: number;
        protocols: number;
        tenantForm: number;
    };
}

interface StorageUsageWidgetProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function StorageUsageWidget({ isExpanded: externalIsExpanded, onToggleExpand }: StorageUsageWidgetProps) {
    const { t, lang } = useTranslation();
    const { plan } = useSubscription();
    const [usage, setUsage] = useState<StorageUsage | null>(null);
    const [counts, setCounts] = useState<{ media: number; utilities: number; checks: number; documents: number; receipts: number; protocols: number; tenantForm: number; } | null>(null);
    const [loading, setLoading] = useState(true);
    const [localIsExpanded, setLocalIsExpanded] = useState(false);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    useEffect(() => {
        fetchUsage();
    }, []);

    async function fetchUsage() {
        try {
            const [data, countsData] = await Promise.all([
                service.getStorageUsage(),
                service.getCategoryCounts()
            ]);
            setUsage(data);
            setCounts(countsData);
        } catch (error) {
            console.error('Error fetching storage usage:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
        );
    }

    if (!usage) return null;

    const isNearLimit = usage.percentUsed > 80;
    const isOverLimit = usage.percentUsed >= 100;

    const getPct = (bytes: number) => {
        return usage.quotaBytes > 0 ? (bytes / usage.quotaBytes) * 100 : 0;
    };

    const percentMedia = getPct(usage.breakdown.media);
    const percentUtilities = getPct(usage.breakdown.utilities);
    const percentChecks = getPct(usage.breakdown.checks);
    const percentDocuments = getPct(usage.breakdown.documents);
    const percentReceipts = getPct(usage.breakdown.receipts);
    const percentProtocols = getPct(usage.breakdown.protocols);
    const percentTenantForm = getPct(usage.breakdown.tenantForm);

    return (
        <Card hoverEffect glass className="h-full flex flex-col group/widget overflow-hidden transition-all duration-300">
            <div 
                className="cursor-pointer group/header select-none pb-0" 
                onClick={toggleExpand}
            >
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex flex-row items-center justify-between w-full">
                    <Folder className="w-6 h-6 text-blue-500 fill-blue-500" />
                    <span className="text-[17px] font-medium text-foreground mx-auto flex items-center gap-2">
                        {lang === 'he' ? 'אחסון בשימוש:' : t('storageUsage') + ':'}
                        <span dir="ltr" className="font-medium text-[17px]">{formatBytes(usage.totalBytes, 2, true)}</span>
                    </span>
                    <ChevronDown className={cn("w-5 h-5 text-blue-500 transition-transform duration-300", isExpanded && "rotate-180")} />
                </div>

                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                    {/* Segmented Progress Bar */}
                    <div className="w-full h-2 md:h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full flex overflow-hidden gap-0.5">
                        {percentMedia > 0 && <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${percentMedia}%` }} title={t('breakdownMedia')} />}
                        {percentUtilities > 0 && <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${percentUtilities}%` }} title={t('breakdownUtilities')} />}
                        {percentChecks > 0 && <div className="h-full bg-teal-400 transition-all duration-500" style={{ width: `${percentChecks}%` }} title="Checks" />}
                        {percentProtocols > 0 && <div className="h-full bg-indigo-400 transition-all duration-500" style={{ width: `${percentProtocols}%` }} title="Protocols" />}
                        {percentTenantForm > 0 && <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${percentTenantForm}%` }} title="Tenant Forms" />}
                        {percentDocuments > 0 && <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${percentDocuments}%` }} title={t('breakdownDocuments')} />}
                        {percentReceipts > 0 && <div className="h-full bg-rose-300 transition-all duration-500" style={{ width: `${percentReceipts}%` }} title="Receipts" />}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <CardContent className="flex-1 pt-0">
                            {/* Breakdown List */}
                            <div className="flex flex-col w-full">
                                {[
                                    { label: t('breakdownMedia') || 'Media', count: counts?.media || 0, bytes: usage.breakdown.media, icon: ImageIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                    { label: t('breakdownUtilities') || 'Utilities', count: counts?.utilities || 0, bytes: usage.breakdown.utilities, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                    { label: lang === 'he' ? "צ'קים" : 'Checks', count: counts?.checks || 0, bytes: usage.breakdown.checks, icon: Banknote, color: 'text-teal-400', bg: 'bg-teal-400/10' },
                                    { label: lang === 'he' ? 'פרוטוקולים' : 'Protocols', count: counts?.protocols || 0, bytes: usage.breakdown.protocols, icon: ClipboardCheck, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                                    { label: lang === 'he' ? 'טופסי הרשמה' : 'Tenant Forms', count: counts?.tenantForm || 0, bytes: usage.breakdown.tenantForm, icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                                    { label: t('breakdownDocuments') || 'Documents', count: counts?.documents || 0, bytes: usage.breakdown.documents, icon: FileStack, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                                    { label: lang === 'he' ? 'אסמכתאות' : 'Receipts', count: counts?.receipts || 0, bytes: usage.breakdown.receipts, icon: Receipt, color: 'text-rose-400', bg: 'bg-rose-400/10' },
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center justify-between py-[6px] border-b border-border/60 dark:border-white/10 last:border-0 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn("p-[6px] rounded-lg shrink-0", item.bg, item.color)}>
                                                <item.icon className="w-4 h-4" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div className="text-[17px] font-bold text-foreground leading-none m-0 p-0">{item.label}</div>
                                                <div className="text-[15px] font-medium text-muted-foreground leading-none m-0 p-0 mt-0.5">{item.count} {lang === 'he' ? 'פריטים' : 'items'}</div>
                                            </div>
                                        </div>
                                        <div className="text-[14px] font-black tracking-tight text-foreground whitespace-nowrap" dir="ltr">
                                            {item.bytes > 0 ? formatBytes(item.bytes, 2, true) : '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {isNearLimit && (
                                <div className={`mt-6 p-2 sm:p-4 rounded-xl border flex items-start gap-2 sm:gap-4 ${isOverLimit
                                    ? 'bg-red-500/10 border-red-500/20 text-red-100'
                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-100'
                                    }`}>
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm space-y-1">
                                        <p className="font-bold text-base">
                                            {isOverLimit ? t('storageQuotaExceeded') : t('storageLow')}
                                        </p>
                                        <p className="opacity-90">
                                            {isOverLimit
                                                ? t('storageQuotaExceededDesc')
                                                : t('storageLowDesc', { percent: usage.percentUsed.toFixed(0) })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
