import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Property } from '../../types/database';
import { cn } from '../../lib/utils';
import { HomeIcon, UsersIcon, WalletIcon, FolderIcon, PhoneIcon, MapPinIcon, PlusIcon } from 'lucide-react';
import { PropertyDocumentsHub } from '../properties/PropertyDocumentsHub';
import { Button } from '../ui/Button';
import { SnapshotTab } from './tabs/SnapshotTab';
import { PeopleTab } from './tabs/PeopleTab';
import { WalletTab } from './tabs/WalletTab';
import { useStack } from '../../contexts/StackContext';

interface PropertyHubProps {
    propertyId: string;
    property: Property;
}

type TabType = 'snapshot' | 'people' | 'wallet' | 'files';

export function PropertyHub({ property }: PropertyHubProps) {
    const { t } = useTranslation();
    const { push } = useStack();
    const [activeTab, setActiveTab] = useState<TabType>('snapshot');

    const tabs = [
        { id: 'snapshot', label: t('snapshot'), icon: HomeIcon },
        { id: 'people', label: t('tenants'), icon: UsersIcon },
        { id: 'wallet', label: t('financials'), icon: WalletIcon },
        { id: 'files', label: t('documents'), icon: FolderIcon },
    ] as const;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black">
            {/* 1. Header & Cover */}
            <div className="relative shrink-0">
                <div className="h-48 bg-slate-200 dark:bg-neutral-800 relative overflow-hidden">
                    {property.image_url ? (
                        <img
                            src={property.image_url}
                            alt={property.address}
                            className="w-full h-full object-cover opacity-80"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-black via-transparent to-transparent" />
                </div>

                <div className="px-6 -mt-12 relative z-10 space-y-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 text-[10px] font-black uppercase tracking-widest mb-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", property.status === 'Occupied' ? "bg-emerald-500" : "bg-amber-500")} />
                            {property.status}
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                            {property.address}
                        </h1>
                        <p className="text-muted-foreground font-medium">{property.city}</p>
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <Button variant="outline" size="sm" className="rounded-full h-9 gap-2 text-xs font-bold uppercase tracking-wide">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            {t('contact')}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full h-9 gap-2 text-xs font-bold uppercase tracking-wide">
                            <MapPinIcon className="w-3.5 h-3.5" />
                            {t('navigate')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full h-9 gap-2 text-xs font-bold uppercase tracking-wide"
                            onClick={() => push('maintenance_chat', { ticketId: 'new', propertyAddress: property.address }, { title: 'New Request' })}
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            {t('logIssue')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Sticky Tab Bar */}
            <div className="sticky top-0 z-20 bg-slate-50/80 dark:bg-black/80 backdrop-blur-xl border-b border-border px-6 mt-6">
                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={cn(
                                    "flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 relative",
                                    isActive
                                        ? "text-foreground border-foreground"
                                        : "text-muted-foreground border-transparent hover:text-foreground/80"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "opacity-50")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Content Area */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 min-h-0">
                {activeTab === 'snapshot' && <SnapshotTab property={property} />}
                {activeTab === 'people' && <PeopleTab property={property} />}
                {activeTab === 'wallet' && <WalletTab property={property} />}
                {activeTab === 'files' && (
                    <div className="h-full">
                        <PropertyDocumentsHub property={property} />
                    </div>
                )}
            </div>
        </div>
    );
}
