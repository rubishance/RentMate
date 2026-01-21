import { useTranslation } from '../../hooks/useTranslation';
import { ArrowRightIcon as ChevronRight, DatabaseIcon as HardDrive, ImageIcon as Image, ReceiptIcon as Receipt, WrenchIcon as Wrench, ContractsIcon as FileText } from '../icons/NavIcons';
import { useNavigate } from 'react-router-dom';

interface CategoryCounts {
    media: number;
    utilities: number;
    maintenance: number;
    documents: number;
}

interface StorageStatsWidgetProps {
    counts: CategoryCounts;
    loading?: boolean;
}

export function StorageStatsWidget({ counts, loading }: StorageStatsWidgetProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Calculate total for simplified progress (mocking max for visual balance if unknown)
    const maxItems = 50; // Arbitrary "visual max" for progress bars since quota is bytes, not count

    if (loading) {
        return (
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex flex-col justify-between">
                <div className="h-6 w-1/3 bg-gray-100 dark:bg-neutral-800 rounded mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-neutral-800"></div>
                            <div className="h-4 w-full bg-gray-50 dark:bg-neutral-800 rounded-lg"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const categories = [
        {
            id: 'media',
            icon: Image,
            label: t('breakdownMedia'),
            count: counts.media,
            color: 'bg-blue-500',
            bg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
        },
        {
            id: 'utilities',
            icon: Receipt,
            label: t('breakdownUtilities'),
            count: counts.utilities,
            color: 'bg-cyan-500',
            bg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400'
        },
        {
            id: 'maintenance',
            icon: Wrench,
            label: t('breakdownMaintenance'),
            count: counts.maintenance,
            color: 'bg-orange-500',
            bg: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
        },
        {
            id: 'documents',
            icon: FileText,
            label: t('breakdownDocuments'),
            count: counts.documents,
            color: 'bg-emerald-500',
            bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        },
    ];

    const totalFiles = Object.values(counts).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    {t('storageUsage')}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-gray-50 dark:bg-neutral-800 rounded-lg text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-neutral-700">
                    {totalFiles} {t('items')}
                </span>
            </div>

            <div className="space-y-6 flex-1">
                {categories.map((cat) => (
                    <div key={cat.id} className="group cursor-pointer" onClick={() => navigate(`/properties?tab=${cat.id === 'utilities' ? 'utility' : cat.id}`)}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-all group-hover:scale-110 ${cat.bg}`}>
                                    <cat.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-black dark:text-white transition-colors">
                                    {cat.label}
                                </span>
                            </div>
                            <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase">{cat.count}</span>
                        </div>
                        {/* Mini Progress Bar */}
                        <div className="h-1.5 w-full bg-gray-50 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${cat.color} opacity-80 shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                                style={{ width: `${Math.min(100, (cat.count / Math.max(10, totalFiles)) * 100)}%` }} // Relative to total for visual
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => navigate('/settings')}
                className="mt-8 w-full py-3 flex items-center justify-center text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-all border-t border-gray-50 dark:border-neutral-800"
                aria-label={t('manageStorage')}
            >
                {t('manageStorage')} <ChevronRight className="w-3 h-3 ml-1" />
            </button>
        </div>
    );
}
