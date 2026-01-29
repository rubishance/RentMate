import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { Property } from '../../types/database';
import { cn } from '../../lib/utils';
import { HomeIcon, WalletIcon, FolderIcon, PhoneIcon, MapPinIcon, PlusIcon, MoreVertical, Edit2, Trash2, CheckIcon, FilePlus, FileText, Car, Archive } from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition, Portal } from '@headlessui/react';
import { PropertyDocumentsHub } from '../properties/PropertyDocumentsHub';
import { Button } from '../ui/Button';
import { SnapshotTab } from './tabs/SnapshotTab';
import { ContractsTab } from './tabs/ContractsTab';
import { WalletTab } from './tabs/WalletTab';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useDataCache } from '../../contexts/DataCacheContext';
import { AddPaymentModal } from '../modals/AddPaymentModal';
import { DollarSign } from 'lucide-react';
import { propertyService } from '../../services/property.service';

interface PropertyHubProps {
    propertyId: string;
    property: Property;
    onDelete?: () => void;
}

type TabType = 'contracts' | 'wallet' | 'files';

export function PropertyHub({ property: initialProperty, propertyId, onDelete }: PropertyHubProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const { push, pop } = useStack();
    const { set, clear } = useDataCache();
    const [activeTab, setActiveTab] = useState<TabType>('contracts');
    const [property, setProperty] = useState(initialProperty);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProperty, setEditedProperty] = useState<Property>(initialProperty);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    // Modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Self-healing synchronization: Ensure property status matches active contracts
    useState(() => {
        const sync = async () => {
            const newStatus = await propertyService.syncOccupancyStatus(propertyId);
            if (newStatus && newStatus !== property.status) {
                setProperty(prev => ({ ...prev, status: newStatus }));
                clear(); // Invalidate dashboard/list cache
            }
        };
        sync();
    });

    const tabs = [
        { id: 'contracts', label: t('contracts'), icon: FileText },
        { id: 'wallet', label: t('financials'), icon: WalletIcon },
        { id: 'files', label: t('documents'), icon: FolderIcon },
    ] as const;

    const handleAddContract = () => {
        setIsMoreMenuOpen(false);
        pop(); // Close the sheet
        navigate('/contracts/new', {
            state: {
                prefill: {
                    property_id: propertyId,
                    property_address: property.address,
                    city: property.city
                }
            }
        });
    };

    const handleEdit = () => {
        setIsMoreMenuOpen(false);
        setEditedProperty(property);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedProperty(property);
    };

    const handleSave = async () => {
        setIsDeleting(true); // Re-use isDeleting for loading state or add isSaving
        try {
            const { error } = await supabase
                .from('properties')
                .update({
                    address: editedProperty.address,
                    city: editedProperty.city,
                    rooms: editedProperty.rooms,
                    size_sqm: editedProperty.size_sqm,
                    property_type: editedProperty.property_type,
                    has_parking: editedProperty.has_parking,
                    has_storage: editedProperty.has_storage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', propertyId);

            if (error) throw error;

            setProperty(prev => ({ ...prev, ...editedProperty }));
            setIsEditing(false);
            clear(); // Sync cache
        } catch (error) {
            console.error('Error saving property:', error);
            alert('Failed to save changes');
        } finally {
            setIsDeleting(false);
        }
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

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveTab(id as TabType); // Use activeTab state to track current section for visual feedback
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
                            {/* Status Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 text-[10px] font-black uppercase tracking-widest mb-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full", property.status === 'Occupied' ? "bg-emerald-500" : "bg-amber-500")} />
                                {t(property.status.toLowerCase() as any)}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4 bg-white/80 dark:bg-black/80 p-4 rounded-2xl border border-primary/20 backdrop-blur-xl">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</label>
                                        <input
                                            type="text"
                                            className="text-xl font-black tracking-tighter text-foreground bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                            value={editedProperty.address}
                                            onChange={e => setEditedProperty(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder={t('address')}
                                        />
                                        <input
                                            type="text"
                                            className="text-sm font-medium text-muted-foreground bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                            value={editedProperty.city}
                                            onChange={e => setEditedProperty(prev => ({ ...prev, city: e.target.value }))}
                                            placeholder={t('city')}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t('rooms')}</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                className="text-lg font-black bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                                value={editedProperty.rooms ?? ''}
                                                onChange={e => setEditedProperty(prev => ({ ...prev, rooms: parseFloat(e.target.value) || 0 }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{t('sqm')}</label>
                                            <input
                                                type="number"
                                                className="text-lg font-black bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                                value={editedProperty.size_sqm ?? ''}
                                                onChange={e => setEditedProperty(prev => ({ ...prev, size_sqm: parseFloat(e.target.value) || 0 }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
                                        <h1 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                                            {property.address}
                                        </h1>
                                        {/* Snapshot Info - Inline with Address on Desktop, Below on Mobile */}
                                        <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground bg-white/50 dark:bg-neutral-900/50 px-3 py-1 rounded-lg border border-slate-100 dark:border-neutral-800 backdrop-blur-sm self-start md:self-auto md:mb-1">
                                            <div className="flex items-center gap-1.5">
                                                <span>{property.rooms}</span>
                                                <span className="text-[10px] uppercase tracking-wider opacity-70">{t('rooms')}</span>
                                            </div>
                                            <div className="w-[1px] h-3 bg-current opacity-20" />
                                            <div className="flex items-center gap-1.5">
                                                <span>{property.size_sqm}</span>
                                                <span className="text-[10px] uppercase tracking-wider opacity-70">{t('sqm')}</span>
                                            </div>
                                            {(property.has_parking || property.has_storage) && (
                                                <>
                                                    <div className="w-[1px] h-3 bg-current opacity-20" />
                                                    <div className="flex items-center gap-2">
                                                        {property.has_parking && <Car className="w-3.5 h-3.5" />}
                                                        {property.has_storage && <Archive className="w-3.5 h-3.5" />}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground font-medium">{property.city}</p>
                                </div>
                            )}
                        </div>

                        {/* More Menu */}
                        <div className="relative">
                            {isEditing ? (
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={isDeleting}
                                        className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 text-foreground hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all font-sans"
                                    >
                                        <PlusIcon className="w-5 h-5 rotate-45" />
                                    </button>
                                </div>
                            ) : (
                                <Menu as="div" className="relative inline-block text-left">
                                    <MenuButton
                                        className="p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 text-foreground hover:bg-white dark:hover:bg-neutral-800 transition-all focus:outline-none"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </MenuButton>

                                    <Portal>
                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-100"
                                            enterFrom="transform opacity-0 scale-95"
                                            enterTo="transform opacity-100 scale-100"
                                            leave="transition ease-in duration-75"
                                            leaveFrom="transform opacity-100 scale-100"
                                            leaveTo="transform opacity-0 scale-95"
                                        >
                                            <MenuItems
                                                anchor={{ to: lang === 'he' ? 'bottom start' : 'bottom end', gap: 8 }}
                                                className={cn(
                                                    "z-[100] min-w-[200px] bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-neutral-800 p-2 focus:outline-none font-sans",
                                                    "animate-in fade-in zoom-in-95 duration-100"
                                                )}>
                                                <div className="py-1">
                                                    <MenuItem>
                                                        {({ focus }) => (
                                                            <button
                                                                onClick={() => setIsAddPaymentModalOpen(true)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                                    focus ? "bg-slate-50 dark:bg-neutral-800 text-foreground" : "text-muted-foreground"
                                                                )}
                                                            >
                                                                <DollarSign className="w-4 h-4 text-brand-500" />
                                                                {lang === 'he' ? 'הוספת תשלום' : 'Add Payment'}
                                                            </button>
                                                        )}
                                                    </MenuItem>

                                                    <div className="h-[1px] bg-slate-50 dark:bg-neutral-800 my-2 mx-4" />

                                                    <MenuItem>
                                                        {({ focus }) => (
                                                            <button
                                                                onClick={handleAddContract}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                                    focus ? "bg-slate-50 dark:bg-neutral-800 text-foreground" : "text-muted-foreground"
                                                                )}
                                                            >
                                                                <FilePlus className="w-4 h-4 text-emerald-500" />
                                                                {lang === 'he' ? 'הוספת חוזה' : 'Add Contract'}
                                                            </button>
                                                        )}
                                                    </MenuItem>

                                                    <MenuItem>
                                                        {({ focus }) => (
                                                            <button
                                                                onClick={handleEdit}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                                    focus ? "bg-slate-50 dark:bg-neutral-800 text-foreground" : "text-muted-foreground"
                                                                )}
                                                            >
                                                                <Edit2 className="w-4 h-4 text-brand-500" />
                                                                {t('edit')}
                                                            </button>
                                                        )}
                                                    </MenuItem>

                                                    <MenuItem>
                                                        {({ focus }) => (
                                                            <button
                                                                onClick={handleDeleteClick}
                                                                className={cn(
                                                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                                                                    focus ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "text-red-500"
                                                                )}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                {t('delete')}
                                                            </button>
                                                        )}
                                                    </MenuItem>
                                                </div>
                                            </MenuItems>
                                        </Transition>
                                    </Portal>
                                </Menu>
                            )}
                        </div>
                    </div>


                </div>
            </div>

            {/* 2. Tabs Navigation */}
            <div className="px-6 relative z-20">
                <div className="flex gap-1 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-1.5 rounded-[2rem] border border-white/20 dark:border-white/10 shadow-minimal overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-3 rounded-[1.5rem] transition-all duration-500 whitespace-nowrap group",
                                    isActive
                                        ? "bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5"
                                )}
                            >
                                <Icon className={cn(
                                    "w-4 h-4 transition-transform duration-500",
                                    isActive ? "scale-110" : "group-hover:scale-110"
                                )} />
                                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pt-6 pb-20">
                <div className="px-6 h-full">
                    {activeTab === 'contracts' && <ContractsTab propertyId={propertyId} />}
                    {activeTab === 'wallet' && <WalletTab property={property} />}
                    {activeTab === 'files' && <PropertyDocumentsHub property={property} />}
                </div>
            </div>

            {/* 6. Modals */}
            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={lang === 'he' ? 'מחיקת נכס' : 'Delete Asset'}
                message={lang === 'he'
                    ? `האם את/ה בטוח/ה לגמרי שברצונך למחוק את הנכס "${property.address}"? כל המידע כולל חוזים ותשלומים ימחק לצמיתות.`
                    : `Are you sure you want to delete "${property.address}"? All data including contracts and payments will be permanently deleted.`}
                isDeleting={isDeleting}
            />

            <AddPaymentModal
                isOpen={isAddPaymentModalOpen}
                onClose={() => setIsAddPaymentModalOpen(false)}
                onSuccess={() => {
                    // Update cache/lists
                    clear();
                }}
                initialData={{
                    contract_id: (property as any).contracts?.find((c: any) => c.status === 'active')?.id
                }}
            />
        </div>
    );
}
