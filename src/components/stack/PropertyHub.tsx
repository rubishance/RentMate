import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Property } from '../../types/database';
import { cn } from '../../lib/utils';
import { HomeIcon, UsersIcon, WalletIcon, FolderIcon, PhoneIcon, MapPinIcon, PlusIcon, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { PropertyDocumentsHub } from '../properties/PropertyDocumentsHub';
import { Button } from '../ui/Button';
import { SnapshotTab } from './tabs/SnapshotTab';
import { PeopleTab } from './tabs/PeopleTab';
import { WalletTab } from './tabs/WalletTab';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useDataCache } from '../../contexts/DataCacheContext';

interface PropertyHubProps {
    propertyId: string;
    property: Property;
    onDelete?: () => void;
}

type TabType = 'snapshot' | 'people' | 'wallet' | 'files';

export function PropertyHub({ property: initialProperty, propertyId, onDelete }: PropertyHubProps) {
    const { t, lang } = useTranslation();
    const { push, pop } = useStack();
    const { set, clear } = useDataCache();
    const [activeTab, setActiveTab] = useState<TabType>('snapshot');
    const [property, setProperty] = useState(initialProperty);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const tabs = [
        { id: 'snapshot', label: t('snapshot'), icon: HomeIcon },
        { id: 'people', label: t('tenants'), icon: UsersIcon },
        { id: 'wallet', label: t('financials'), icon: WalletIcon },
        { id: 'files', label: t('documents'), icon: FolderIcon },
    ] as const;

    const handleEdit = () => {
        setIsMoreMenuOpen(false);
        push('wizard', { initialData: property, mode: 'edit' }, { title: t('editProperty'), isExpanded: true });
    };

    const handleDeleteClick = () => {
        setIsMoreMenuOpen(false);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            // 1. Delete payments and contracts related to this property
            const { data: contracts } = await supabase.from('contracts').select('id').eq('property_id', propertyId);
            if (contracts && contracts.length > 0) {
                const contractIds = contracts.map(c => c.id);
                await supabase.from('payments').delete().in('contract_id', contractIds);
                await supabase.from('contracts').delete().eq('property_id', propertyId);
            }

            // 2. Delete property
            const { error } = await supabase.from('properties').delete().eq('id', propertyId);
            if (error) throw error;

            // 3. Invalidate all cache
            clear();

            onDelete?.(); // Trigger refresh in parent
            pop(); // Close the hub
        } catch (error) {
            console.error('Error deleting property:', error);
            alert('Failed to delete property');
        } finally {
            setIsDeleting(false);
        }
    };

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
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 text-[10px] font-black uppercase tracking-widest mb-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", property.status === 'Occupied' ? "bg-emerald-500" : "bg-amber-500")} />
                                {property.status}
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                                {property.address}
                            </h1>
                            <p className="text-muted-foreground font-medium">{property.city}</p>
                        </div>

                        {/* More Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                                className="p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 text-foreground hover:bg-white dark:hover:bg-neutral-800 transition-all focus:outline-none"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            <AnimatePresence>
                                {isMoreMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className={cn(
                                                "absolute bottom-full mb-4 z-50 min-w-[160px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-neutral-800 p-2",
                                                lang === 'he' ? "left-0" : "right-0"
                                            )}
                                        >
                                            <button
                                                onClick={handleEdit}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 text-sm font-bold text-foreground transition-all"
                                            >
                                                <Edit2 className="w-4 h-4 text-brand-500" />
                                                {t('edit')}
                                            </button>
                                            <button
                                                onClick={handleDeleteClick}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-bold text-red-600 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {t('delete')}
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
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
                                    "flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 relative shrink-0",
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

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={lang === 'he' ? 'מחיקת נכס' : 'Delete Asset'}
                message={lang === 'he'
                    ? `האם את/ה בטוח/ה שברצונך למחוק את הנכס "${property.address}"?`
                    : `Are you sure you want to delete "${property.address}"?`}
                isDeleting={isDeleting}
            />
        </div>
    );
}
