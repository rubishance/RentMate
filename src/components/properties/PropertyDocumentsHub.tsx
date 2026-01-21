import { useState } from 'react';
import { FileText, Image as ImageIcon, Wrench, FileStack } from 'lucide-react';
import type { Property } from '../../types/database';
import { MediaGallery } from './MediaGallery';
import { UtilityBillsManager } from './UtilityBillsManager';
import { MaintenanceRecords } from './MaintenanceRecords';
import { MiscDocuments } from './MiscDocuments';
import { StorageUsageWidget } from './StorageUsageWidget';
import { useTranslation } from '../../hooks/useTranslation';

interface PropertyDocumentsHubProps {
    property: Property;
    readOnly?: boolean;
}

type TabType = 'media' | 'utilities' | 'maintenance' | 'documents';

export function PropertyDocumentsHub({ property, readOnly }: PropertyDocumentsHubProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('media');

    const tabs = [
        { id: 'media' as TabType, label: t('mediaStorage'), icon: ImageIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
        { id: 'utilities' as TabType, label: t('utilitiesStorage'), icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
        { id: 'maintenance' as TabType, label: t('maintenanceStorage'), icon: Wrench, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/10' },
        { id: 'documents' as TabType, label: t('documentsStorage'), icon: FileStack, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 group px-2 py-4 text-xs font-bold transition-all relative ${isActive
                                ? 'text-primary dark:text-blue-400'
                                : 'text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? `${tab.bg} scale-110 shadow-sm` : 'bg-transparent group-hover:bg-muted'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-muted-foreground'}`} />
                            </div>
                            <span className="hidden sm:inline mt-1 font-semibold">{tab.label}</span>
                            {isActive && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary dark:bg-blue-400 rounded-t-full shadow-[0_-2px_6px_rgba(59,130,246,0.2)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Storage Usage Info */}
            {!readOnly && (
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700">
                    <StorageUsageWidget />
                </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-foreground/50">
                {activeTab === 'media' && <MediaGallery property={property} readOnly={readOnly} />}
                {activeTab === 'utilities' && <UtilityBillsManager property={property} readOnly={readOnly} />}
                {activeTab === 'maintenance' && <MaintenanceRecords property={property} readOnly={readOnly} />}
                {activeTab === 'documents' && <MiscDocuments property={property} readOnly={readOnly} />}
            </div>
        </div>
    );
}
