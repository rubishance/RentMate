import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HardDrive, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
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
        maintenance: number;
        documents: number;
    };
}

interface StorageUsageWidgetProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function StorageUsageWidget({ isExpanded: externalIsExpanded, onToggleExpand }: StorageUsageWidgetProps) {
    const { t } = useTranslation();
    const { plan } = useSubscription();
    const [usage, setUsage] = useState<StorageUsage | null>(null);
    const [counts, setCounts] = useState<{ media: number; utilities: number; maintenance: number; documents: number } | null>(null);
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

    return (
        <Card hoverEffect glass className="h-full flex flex-col group/widget overflow-hidden transition-all duration-300">
            <div 
                className="cursor-pointer group/header select-none p-4 md:p-6" 
                onClick={toggleExpand}
            >
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                            <HardDrive className={`w-5 h-5 ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-indigo-500'}`} />
                        </div>
                        <h3 className="text-xl font-black font-heading text-primary">
                            {t('storageUsage')}
                        </h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-base md:text-lg font-bold text-foreground" dir="ltr">
                            {formatBytes(usage.totalBytes, 2, true)}
                        </span>
                        <div className="text-muted-foreground/50 group-hover/header:text-foreground transition-colors p-1">
                            <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-180")} />
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-0">
                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-primary'
                                }`}
                            style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                        />
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
                            {/* Breakdown Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownMedia')}</p>
                                    <p className="text-base md:text-lg font-bold text-foreground">
                                        {counts?.media || 0} {t('items')} • {formatBytes(usage.breakdown.media, 2, true)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownUtilities')}</p>
                                    <p className="text-base md:text-lg font-bold text-foreground">
                                        {counts?.utilities || 0} {t('items')} • {formatBytes(usage.breakdown.utilities, 2, true)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownMaintenance')}</p>
                                    <p className="text-base md:text-lg font-bold text-foreground">
                                        {counts?.maintenance || 0} {t('items')} • {formatBytes(usage.breakdown.maintenance, 2, true)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownDocuments')}</p>
                                    <p className="text-base md:text-lg font-bold text-foreground">
                                        {counts?.documents || 0} {t('items')} • {formatBytes(usage.breakdown.documents, 2, true)}
                                    </p>
                                </div>
                            </div>

                            {isNearLimit && (
                                <div className={`mt-6 p-3 rounded-xl border flex items-start gap-3 ${isOverLimit
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
