import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HardDrive, AlertTriangle, Loader2 } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { propertyDocumentsService as service } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';

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

export function StorageUsageWidget() {
    const { t } = useTranslation();
    const [usage, setUsage] = useState<StorageUsage | null>(null);
    const [counts, setCounts] = useState<{ media: number; utilities: number; maintenance: number; documents: number } | null>(null);
    const [loading, setLoading] = useState(true);

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
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                    <HardDrive className={`w-5 h-5 ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">{t('storageUsage')}</CardTitle>
                </div>
                <div className="px-3 py-1 bg-muted rounded-md border border-border">
                    <span className="text-base md:text-lg font-bold text-foreground" dir="ltr">
                        {formatBytes(usage.totalBytes, 2, true)} / {usage.quotaBytes === Infinity ? t('unlimited') : formatBytes(usage.quotaBytes, 2, true)}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 animate-in slide-in-from-top-2 duration-200">
                {/* Progress Bar */}
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-6">
                    <div
                        className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-primary'
                            }`}
                        style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                    />
                </div>

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
        </Card>
    );
}
