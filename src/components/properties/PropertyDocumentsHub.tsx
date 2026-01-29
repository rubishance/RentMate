import { useState } from 'react';
import { FileText, Image as ImageIcon, Wrench, FileStack, Banknote } from 'lucide-react';
import type { Property } from '../../types/database';
import { MediaGallery } from './MediaGallery';
import { UtilityBillsManager } from './UtilityBillsManager';
import { MaintenanceRecords } from './MaintenanceRecords';
import { MiscDocuments } from './MiscDocuments';
import { ChecksManager } from './ChecksManager';
import { StorageUsageWidget } from './StorageUsageWidget';
import { useTranslation } from '../../hooks/useTranslation';

interface PropertyDocumentsHubProps {
    property: Property;
    readOnly?: boolean;
}

type TabType = 'media' | 'utilities' | 'maintenance' | 'documents' | 'checks';

export function PropertyDocumentsHub({ property, readOnly }: PropertyDocumentsHubProps) {
    const { t } = useTranslation();
    const [activeView, setActiveView] = useState<TabType | null>(null);

    const categories = [
        { id: 'media' as TabType, label: t('mediaStorage'), icon: ImageIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', count: '12' },
        { id: 'utilities' as TabType, label: t('utilitiesStorage'), icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', count: '3' },
        { id: 'maintenance' as TabType, label: t('maintenanceStorage'), icon: Wrench, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', count: '5' },
        { id: 'documents' as TabType, label: t('documentsStorage'), icon: FileStack, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', count: '8' },
        { id: 'checks' as TabType, label: t('checksStorage'), icon: Banknote, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', count: '0' },
    ];

    if (activeView) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 p-4 border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800">
                    <button
                        onClick={() => setActiveView(null)}
                        className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← {t('back')}
                    </button>
                    <div className="h-4 w-[1px] bg-border mx-2" />
                    <span className="font-bold">{categories.find(c => c.id === activeView)?.label}</span>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-foreground/50">
                    {activeView === 'media' && <MediaGallery property={property} readOnly={readOnly} />}
                    {activeView === 'utilities' && <UtilityBillsManager property={property} readOnly={readOnly} />}
                    {activeView === 'maintenance' && <MaintenanceRecords property={property} readOnly={readOnly} />}
                    {activeView === 'documents' && <MiscDocuments property={property} readOnly={readOnly} />}
                    {activeView === 'checks' && <ChecksManager property={property} readOnly={readOnly} />}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                    <button
                        key={cat.id}
                        onClick={() => setActiveView(cat.id)}
                        className="flex flex-col items-start p-5 rounded-3xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-lg transition-all text-left gap-4 group"
                    >
                        <div className={`p-3 rounded-2xl ${cat.bg} group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className={`w-6 h-6 ${cat.color}`} />
                        </div>
                        <div>
                            <div className="font-black text-lg tracking-tight text-foreground">{cat.label}</div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider opacity-60">
                                {t('viewDetails') || 'View Details'}
                            </div>
                        </div>
                    </button>
                );
            })}
            {/* Storage Usage Widget as a full-width card at bottom if needed, or keep separate */}
            {!readOnly && (
                <div className="col-span-2 lg:col-span-3 mt-4">
                    <StorageUsageWidget />
                </div>
            )}
        </div>
    );
}
