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

import { cn } from '../../lib/utils';

interface PropertyDocumentsHubProps {
    property: Property;
    readOnly?: boolean;
}

type TabType = 'media' | 'utilities' | 'maintenance' | 'documents' | 'checks';

export function PropertyDocumentsHub({ property, readOnly }: PropertyDocumentsHubProps) {
    const { t } = useTranslation();
    const categories = [
        { id: 'media' as TabType, label: t('mediaStorage'), icon: ImageIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { id: 'utilities' as TabType, label: t('utilitiesStorage'), icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { id: 'maintenance' as TabType, label: t('maintenanceStorage'), icon: Wrench, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20' },
        { id: 'documents' as TabType, label: t('documentsStorage'), icon: FileStack, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { id: 'checks' as TabType, label: t('checksStorage'), icon: Banknote, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    ];
    const [activeTab, setActiveTab] = useState<TabType>('media');

    return (
        <div className="flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-neutral-800/50 rounded-2xl border border-slate-200/50 dark:border-neutral-700/50 mb-6 overflow-x-auto no-scrollbar">
                {categories.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap",
                                isActive
                                    ? "bg-white dark:bg-neutral-900 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-white/50 dark:hover:bg-neutral-900/50"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? tab.color : "text-muted-foreground")} />
                            <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-neutral-900/30 rounded-3xl border border-slate-200/40 dark:border-neutral-800/40 p-1">
                {activeTab === 'media' && <MediaGallery property={property} readOnly={readOnly} />}
                {activeTab === 'utilities' && <UtilityBillsManager property={property} readOnly={readOnly} />}
                {activeTab === 'maintenance' && <MaintenanceRecords property={property} readOnly={readOnly} />}
                {activeTab === 'documents' && <MiscDocuments property={property} readOnly={readOnly} />}
                {activeTab === 'checks' && <ChecksManager property={property} readOnly={readOnly} />}
            </div>

            {!readOnly && (
                <div className="mt-8 border-t border-slate-100 dark:border-neutral-800 pt-8">
                    <StorageUsageWidget />
                </div>
            )}
        </div>
    );
}
