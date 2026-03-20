import { useTranslation } from '../../hooks/useTranslation';
import { ArrowRightIcon as ChevronRight, ReceiptIcon as Receipt, ImageIcon as Image, WrenchIcon as Wrench, ContractsIcon as FileText, StorageIcon as Storage } from '../icons/NavIcons';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

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

    if (loading) {
        return (
            <Card className="h-full flex flex-col justify-between">
                <CardHeader>
                    <div className="h-6 w-1/3 bg-muted/50 dark:bg-neutral-800 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted/50 dark:bg-neutral-800 animate-pulse"></div>
                                <div className="h-4 w-full bg-muted/50 dark:bg-neutral-800 rounded-xl animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const categories = [
        {
            id: 'media',
            icon: Image,
            label: t('breakdownMedia'),
            count: counts.media,
            bg: 'bg-trust-50 text-trust-600 dark:bg-trust-900/20 dark:text-trust-400'
        },
        {
            id: 'utilities',
            icon: Receipt,
            label: t('breakdownUtilities'),
            count: counts.utilities,
            bg: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'
        },
        {
            id: 'maintenance',
            icon: Wrench,
            label: t('breakdownMaintenance'),
            count: counts.maintenance,
            bg: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
        },
        {
            id: 'documents',
            icon: FileText,
            label: t('breakdownDocuments'),
            count: counts.documents,
            bg: 'bg-background text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        },
    ];

    const totalFiles = Object.values(counts).reduce((a, b) => a + b, 0);

    return (
        <Card hoverEffect glass className="h-full flex flex-col justify-between group/widget">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-2">
                    <Storage className="w-4 h-4 text-muted-foreground dashed-border p-0.5 box-content rounded-lg" />
                    <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">{t('financeBills')}</CardTitle>
                </div>
                <div className="px-2.5 py-1 bg-muted rounded-lg border border-border">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {totalFiles} {t('items')}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pt-4">
                <div className="space-y-3">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="group cursor-pointer flex items-center justify-between p-2 rounded-xl hover:bg-background dark:hover:bg-white/5 transition-colors border border-transparent hover:border-border/50"
                            onClick={() => navigate(`/properties?tab=${cat.id === 'utilities' ? 'utility' : cat.id}`)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-all group-hover:scale-105 ${cat.bg}`}>
                                    <cat.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-foreground transition-colors">
                                    {cat.label}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-muted-foreground tabular-nums">{cat.count}</span>
                        </div>
                    ))}
                </div>
            </CardContent>


        </Card>
    );
}
