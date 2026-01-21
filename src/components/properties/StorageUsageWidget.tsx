import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HardDrive, AlertTriangle, Loader2 } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { propertyDocumentsService as service } from '../../services/property-documents.service';
import { useTranslation } from '../../hooks/useTranslation';

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
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetchUsage();
    }, []);

    async function fetchUsage() {
        try {
            const data = await service.getStorageUsage();
            setUsage(data);
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-secondary dark:hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <HardDrive className={`w-5 h-5 ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-primary'}`} />
                    <h3 className="font-bold text-foreground dark:text-white">{t('storageUsage')}</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                        {formatBytes(usage.totalBytes)} / {usage.quotaBytes === Infinity ? t('unlimited') : formatBytes(usage.quotaBytes)}
                    </span>
                    <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </button>

            {isExpanded && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-muted dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                        <div
                            className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-primary'
                                }`}
                            style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
                        />
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownMedia')}</p>
                            <p className="text-sm font-semibold text-foreground dark:text-white">{formatBytes(usage.breakdown.media)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownUtilities')}</p>
                            <p className="text-sm font-semibold text-foreground dark:text-white">{formatBytes(usage.breakdown.utilities)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownMaintenance')}</p>
                            <p className="text-sm font-semibold text-foreground dark:text-white">{formatBytes(usage.breakdown.maintenance)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('breakdownDocuments')}</p>
                            <p className="text-sm font-semibold text-foreground dark:text-white">{formatBytes(usage.breakdown.documents)}</p>
                        </div>
                    </div>

                    {isNearLimit && (
                        <div className={`mt-6 p-3 rounded-xl border flex items-start gap-3 ${isOverLimit
                            ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                            : 'bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'
                            }`}>
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                                <p className="font-bold">
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
                </div>
            )}
        </div>
    );
}
