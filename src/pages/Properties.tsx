import { useEffect, useState } from 'react';
import { PlusIcon as Plus, HomeIcon as Home, BedIcon as BedDouble, RulerIcon as Ruler } from '../components/icons/NavIcons';
import { supabase } from '../lib/supabase';
import { AddPropertyModal } from '../components/modals/AddPropertyModal';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';
import { IndexedRentModal } from '../components/modals/IndexedRentModal';
import type { Property } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { PropertyIcon } from '../components/common/PropertyIcon';
import placeholderImage from '../assets/property-placeholder-clean.png';
import { PageHeader } from '../components/common/PageHeader';
import { GlassCard } from '../components/common/GlassCard';
import UpgradeRequestModal from '../components/modals/UpgradeRequestModal';
import { useDataCache } from '../contexts/DataCacheContext';

type ExtendedProperty = Property & {
    contracts: {
        base_rent: number;
        status: string;
        end_date: string | null;
        linkage_type: string;
        base_index_date: string | null;
        base_index_value: number | null;
        option_periods: {
            length: number;
            unit: 'months' | 'years';
        }[] | null;
    }[];
};

export function Properties() {
    const { t, lang } = useTranslation();
    const { preferences } = useUserPreferences();
    const [properties, setProperties] = useState<ExtendedProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const { get, set } = useDataCache();
    const CACHE_KEY = 'properties_list';

    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    const [indexedRentContract, setIndexedRentContract] = useState<any>(null); // Contract to show calculation for
    const [affectedItems, setAffectedItems] = useState<any[]>([]);

    const handleAdd = () => {
        setEditingProperty(null);
        setIsReadOnly(false);
        setIsAddModalOpen(true);
    };

    const handleView = (property: Property) => {
        setEditingProperty(property);
        setIsReadOnly(true);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (property: Property) => {
        setDeleteTarget(property);
        setAffectedItems([]);

        try {
            // Get Tenants
            const { data: tenants, error: tenantsError } = await supabase
                .from('tenants')
                .select('name')
                .eq('property_id', property.id);

            if (tenantsError) console.error('Error fetching tenants:', tenantsError);

            // Get Contracts with details
            const { data: contracts, error: contractsError } = await supabase
                .from('contracts')
                .select('*, tenants(name)')
                .eq('property_id', property.id);

            if (contractsError) console.error('Error fetching contracts:', contractsError);

            const items = [];

            if (tenants && tenants.length > 0) {
                items.push({
                    label: t('tenantsToBeDisconnected'),
                    count: tenants.length,
                    items: tenants.map(tenant => tenant.name || t('unnamed')),
                    type: 'info'
                });
            }

            if (contracts && contracts.length > 0) {
                const contractItems = contracts.map((c: any) => {
                    const tenantName = c.tenants?.name || t('unknown');
                    const startDate = new Date(c.start_date).toLocaleDateString();
                    const endDate = new Date(c.end_date).toLocaleDateString();
                    return `${tenantName} (${startDate} - ${endDate})`;
                });

                items.push({
                    label: lang === 'he' ? 'חוזים ימחקו (כולל היסטוריית תשלומים)' : 'Contracts to be deleted (including payment history)',
                    count: contracts.length,
                    items: contractItems,
                    type: 'critical'
                });
            }

            setAffectedItems(items);
            setIsDeleteModalOpen(true);
        } catch (err) {
            console.error('Error checking property relations:', err);
            setIsDeleteModalOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            // 1. Get all contract IDs to delete their payments
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id')
                .eq('property_id', deleteTarget.id);

            if (contracts && contracts.length > 0) {
                const contractIds = contracts.map(c => c.id);
                // Delete payments
                await supabase.from('payments').delete().in('contract_id', contractIds);
                // Delete contracts
                await supabase.from('contracts').delete().eq('property_id', deleteTarget.id);
            }

            // 2. Disconnect tenants
            await supabase
                .from('tenants')
                .update({ property_id: null })
                .eq('property_id', deleteTarget.id);

            // 3. Delete property
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;

            setProperties(prev => prev.filter(p => p.id !== deleteTarget.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting property:', error);
            alert(`${t('error')}: ${error.message || 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    async function fetchProperties() {
        const cached = get<ExtendedProperty[]>(CACHE_KEY);
        if (cached) {
            setProperties(cached);
            setLoading(false);
        }

        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*, contracts(id, base_rent, status, end_date, linkage_type, base_index_date, base_index_value, option_periods)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
            } else if (data) {
                const propertiesData = data as unknown as ExtendedProperty[];
                setProperties(propertiesData);
                set(CACHE_KEY, propertiesData);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 pt-6">
            <PageHeader
                title={lang === 'he' ? 'הנכסים שלי' : 'My Assets'}
                subtitle={lang === 'he' ? 'ניהול פורטפוליו הנכסים שלך' : 'Manage your real estate portfolio'}
                action={
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-black dark:bg-white text-white dark:text-black p-3.5 rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center"
                        aria-label={t('addProperty')}
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                }
            />

            {properties.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center py-16 border-dashed border-2 bg-white/50">
                    <div className="p-4 bg-brand-navy/5 rounded-full mb-4">
                        <Home className="w-8 h-8 text-brand-navy/40" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{t('noAssetsFound')}</h3>
                    <p className="text-muted-foreground text-sm mb-6">
                        {t('addFirstPropertyDesc')}
                    </p>
                    <button onClick={handleAdd} className="text-brand-navy font-bold hover:underline text-sm">
                        {t('createFirstAsset')}
                    </button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <GlassCard
                            key={property.id}
                            onClick={() => handleView(property)}
                            hoverEffect
                            className="cursor-pointer group flex flex-col h-full"
                        >
                            {/* Image Section */}
                            <div className="relative h-56 bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                                <img
                                    src={property.image_url || placeholderImage}
                                    alt={`${property.address}, ${property.city}`}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                                <div className={`absolute top-4 ${lang === 'he' ? 'left-4' : 'right-4'} flex gap-2`}>
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-xl shadow-lg border ${property.status === 'Occupied'
                                        ? 'bg-white/90 dark:bg-neutral-900/90 text-green-600 border-green-200/50 dark:border-green-900/40'
                                        : 'bg-white/90 dark:bg-neutral-900/90 text-orange-500 border-orange-200/50 dark:border-orange-900/40'
                                        }`}>
                                        {property.status === 'Occupied' ? t('occupied') : t('vacant')}
                                    </span>
                                </div>
                                <div className={`absolute bottom-4 ${lang === 'he' ? 'right-4' : 'left-4'}`}>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 dark:bg-neutral-900/50 backdrop-blur-xl rounded-2xl border border-white/10">
                                        <PropertyIcon type={property.property_type} className="w-4 h-4 text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                            {property.property_type ? t(property.property_type as any) : t('apartment')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4 flex-1 flex flex-col">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-brand-navy transition-colors">
                                        {[property.address, property.city].filter(Boolean).join(', ')}
                                    </h3>
                                </div>

                                {/* Specs */}
                                <div className="flex items-center gap-6 py-4 border-y border-gray-100 dark:border-neutral-800">
                                    <div className="flex items-center gap-2">
                                        <BedDouble className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-black text-black dark:text-white">{property.rooms}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('rooms')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Ruler className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-black text-black dark:text-white">{property.size_sqm}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('sqm')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 mt-auto">
                                    <div onClick={(e) => e.stopPropagation()} className="relative">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
                                            {t('monthlyRentLabel')}
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            <span
                                                onClick={() => {
                                                    const active = property.contracts?.find(c => c.status === 'active');
                                                    if (active && active.linkage_type && active.linkage_type !== 'none') {
                                                        setIndexedRentContract(active);
                                                    }
                                                }}
                                                className={`text-2xl font-black text-black dark:text-white ${property.contracts?.some(c => c.status === 'active' && c.linkage_type && c.linkage_type !== 'none')
                                                    ? 'cursor-pointer hover:underline decoration-dotted'
                                                    : ''
                                                    }`}
                                            >
                                                ₪{(property.contracts?.find(c => c.status === 'active')?.base_rent || property.rent_price || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* End Date */}
                                    {(() => {
                                        const activeContract = property.contracts?.find(c => c.status === 'active');
                                        if (!activeContract?.end_date) return null;

                                        const endDate = new Date(activeContract.end_date);
                                        let finalDate = new Date(endDate);

                                        if (activeContract.option_periods && activeContract.option_periods.length > 0) {
                                            activeContract.option_periods.forEach(period => {
                                                if (period.unit === 'years') {
                                                    finalDate.setFullYear(finalDate.getFullYear() + Number(period.length));
                                                } else {
                                                    finalDate.setMonth(finalDate.getMonth() + Number(period.length));
                                                }
                                            });
                                        }

                                        const hasOptions = finalDate.getTime() !== endDate.getTime();

                                        return (
                                            <div className="text-right">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
                                                    {lang === 'he' ? 'סיום חוזה' : 'Ends'} {hasOptions && '(+Opt)'}
                                                </span>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="text-[10px] font-black bg-gray-50 dark:bg-neutral-800 text-black dark:text-white px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm">
                                                        {endDate.toLocaleDateString()}
                                                    </span>
                                                    {hasOptions && (
                                                        <span className="text-[10px] font-black bg-black dark:bg-white text-white dark:text-black px-2.5 py-1.5 rounded-xl shadow-lg">
                                                            {finalDate.toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            <AddPropertyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchProperties}
                propertyToEdit={editingProperty}
                readOnly={isReadOnly}
                onDelete={() => editingProperty && handleDelete(editingProperty)}
            />

            <IndexedRentModal
                isOpen={!!indexedRentContract}
                onClose={() => setIndexedRentContract(null)}
                contract={indexedRentContract}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={lang === 'he' ? 'מחיקת נכס' : 'Delete Asset'}
                message={lang === 'he'
                    ? `האם את/ה בטוח/ה שברצונך למחוק את הנכס "${deleteTarget?.address}, ${deleteTarget?.city}"?`
                    : `Are you sure you want to delete "${deleteTarget?.address}, ${deleteTarget?.city}"?`}
                isDeleting={isDeleting}
                affectedItems={affectedItems}
                requireDoubleConfirm={affectedItems.length > 0}
            />

            <UpgradeRequestModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                source="properties_export"
            />
        </div>
    );
}
