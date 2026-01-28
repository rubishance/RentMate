import { useEffect, useState } from 'react';
import { PlusIcon as Plus, HomeIcon as Home, BedIcon as BedDouble, RulerIcon as Ruler } from '../components/icons/NavIcons';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';
import { IndexedRentModal } from '../components/modals/IndexedRentModal';
import type { Property } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { PropertyIcon } from '../components/common/PropertyIcon';
import placeholderApartment from '../assets/placeholder-apartment.png';
import placeholderPenthouse from '../assets/placeholder-penthouse.png';
import placeholderGarden from '../assets/placeholder-garden.png';
import placeholderHouse from '../assets/placeholder-house.png';
import placeholderGeneric from '../assets/placeholder-generic.png';

const getPlaceholder = (type?: string | null) => {
    switch (type) {
        case 'apartment': return placeholderApartment;
        case 'penthouse': return placeholderPenthouse;
        case 'garden': return placeholderGarden;
        case 'house': return placeholderHouse;
        default: return placeholderGeneric;
    }
};

import { PageHeader } from '../components/common/PageHeader';
import { GlassCard } from '../components/common/GlassCard';
import UpgradeRequestModal from '../components/modals/UpgradeRequestModal';
import { useDataCache } from '../contexts/DataCacheContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { useStack } from '../contexts/StackContext';

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
    const { get, set, clear } = useDataCache();
    const CACHE_KEY = 'properties_list';

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    const [indexedRentContract, setIndexedRentContract] = useState<any>(null); // Contract to show calculation for
    const [affectedItems, setAffectedItems] = useState<any[]>([]);

    const handleAdd = () => {
        push('wizard', {}, { isExpanded: true, title: t('addProperty') });
    };

    const { push } = useStack();

    const handleView = (property: Property) => {
        push('property_hub', {
            propertyId: property.id,
            property: property,
            onDelete: () => fetchProperties()
        }, { title: property.address });
    };

    const handleDelete = async (property: Property) => {
        setDeleteTarget(property);
        setAffectedItems([]);

        try {

            // Get Contracts with details
            const { data: contracts, error: contractsError } = await supabase
                .from('contracts')
                .select('*')
                .eq('property_id', property.id);

            if (contractsError) console.error('Error fetching contracts:', contractsError);

            const items = [];


            if (contracts && contracts.length > 0) {
                const contractItems = (contracts as any[]).map((c: any) => {
                    const tenantNames = Array.isArray(c.tenants) ? c.tenants.map((t: any) => t.name).join(', ') : t('unknown');
                    const startDate = formatDate(c.start_date);
                    const endDate = formatDate(c.end_date);
                    return `${tenantNames} (${startDate} - ${endDate})`;
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
            const targetId = deleteTarget.id;

            // 1. Get all contract IDs to delete their payments
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id')
                .eq('property_id', targetId);

            if (contracts && contracts.length > 0) {
                const contractIds = contracts.map(c => c.id);
                // Delete payments
                await supabase.from('payments').delete().in('contract_id', contractIds);
                // Delete contracts
                await supabase.from('contracts').delete().eq('property_id', targetId);
            }

            // 3. Delete property
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', targetId);

            if (error) throw error;

            // Invalidate all cache (affects dashboard, lists, etc)
            clear();

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('properties')
                .select('*, contracts(id, base_rent, status, end_date, linkage_type, base_index_date, base_index_value, option_periods)')
                .eq('user_id', user.id) // STRICTLY enforce ownership
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
        <div className="pb-40 pt-16 space-y-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800 shadow-minimal">
                        <Home className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{lang === 'he' ? 'הפורטפוליו שלי' : 'my portfolio'}</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-foreground lowercase">
                        {lang === 'he' ? 'נכסים' : 'properties'}
                    </h1>
                </div>

                <button
                    onClick={handleAdd}
                    className="h-16 px-10 bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-premium-dark flex items-center justify-center gap-4 group"
                >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    {t('addProperty')}
                </button>
            </div>

            {/* Empty State */}
            {properties.length === 0 ? (
                <div className="px-8 flex flex-col items-center justify-center py-40 rounded-[3rem] border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 mx-8">
                    <div className="w-32 h-32 bg-white dark:bg-neutral-900 rounded-[3rem] flex items-center justify-center mx-auto shadow-minimal mb-10">
                        <Home className="w-12 h-12 text-slate-200" />
                    </div>
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noAssetsFound')}</h3>
                        <p className="text-muted-foreground font-medium text-center max-w-sm px-10 leading-relaxed mx-auto">
                            {t('addFirstPropertyDesc')}
                        </p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="mt-12 px-10 py-5 bg-foreground text-background rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium-dark"
                    >
                        {t('createFirstAsset')}
                    </button>
                </div>
            ) : (
                /* Properties Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-8">
                    {properties.map((property) => {
                        const activeContract = property.contracts?.find(c => c.status === 'active');
                        return (
                            <div
                                key={property.id}
                                onClick={() => handleView(property)}
                                className="bg-white dark:bg-neutral-900 group flex flex-col h-full border border-slate-100 dark:border-neutral-800 overflow-hidden rounded-[3rem] shadow-minimal hover:shadow-premium transition-all duration-700 cursor-pointer relative"
                            >
                                {/* Image Section */}
                                <div className="relative h-72 bg-slate-50 dark:bg-neutral-800 overflow-hidden">
                                    <img
                                        src={property.image_url || getPlaceholder(property.property_type)}
                                        alt={`${property.address}, ${property.city}`}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 filter saturate-50 group-hover:saturate-100"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                    {/* Status Badge - Top Left as per reference */}
                                    <div className={`absolute top-8 ${lang === 'he' ? 'left-8' : 'right-8'} flex gap-3`}>
                                        <span className={cn(
                                            "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-3xl shadow-2xl border transition-all duration-500",
                                            property.status === 'Occupied'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        )}>
                                            {property.status === 'Occupied' ? t('occupied') : t('vacant')}
                                        </span>
                                    </div>

                                    {/* Property Type Badge - Bottom Right as per reference */}
                                    <div className={`absolute bottom-8 ${lang === 'he' ? 'right-8' : 'left-8'}`}>
                                        <div className="flex items-center gap-4 px-5 py-3 bg-white/10 backdrop-blur-3xl rounded-[2rem] border border-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">
                                                {property.property_type ? t(property.property_type as any) : t('apartment')}
                                            </span>
                                            <PropertyIcon type={property.property_type} className="w-10 h-10 rounded-xl" />
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-10 flex-1 flex flex-col space-y-8">
                                    <div className="min-h-[3.5rem]">
                                        <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase leading-tight group-hover:text-primary transition-colors truncate">
                                            {[property.address, property.city].filter(Boolean).join(', ')}
                                        </h3>
                                    </div>

                                    {/* Detailed Specs Row */}
                                    <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-50 dark:border-neutral-800/50">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                                <BedDouble className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <span className="text-sm font-black text-foreground tracking-tighter">{property.rooms}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{t('rooms')}</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                                <Ruler className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <span className="text-sm font-black text-foreground tracking-tighter">{property.size_sqm}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{t('sqm')}</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                                <Home className="w-5 h-5 text-slate-400 opacity-40" />
                                            </div>
                                            <span className="text-sm font-black text-foreground tracking-tighter">1</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{t('parking')}</span>
                                        </div>
                                    </div>

                                    {/* Rent & Contract Section */}
                                    <div className="flex items-center justify-between pt-4 mt-auto">
                                        <div onClick={(e) => e.stopPropagation()} className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 block">
                                                {t('monthlyRentLabel')}
                                            </span>
                                            <div
                                                onClick={() => {
                                                    const active = property.contracts?.find(c => c.status === 'active');
                                                    if (active && active.linkage_type && active.linkage_type !== 'none') {
                                                        setIndexedRentContract(active);
                                                    }
                                                }}
                                                className={cn(
                                                    "text-4xl font-black text-foreground tracking-tighter transition-all duration-500",
                                                    property.contracts?.some(c => c.status === 'active' && c.linkage_type && c.linkage_type !== 'none') && "cursor-pointer hover:text-primary underline decoration-2 decoration-primary/10 hover:decoration-primary underline-offset-8"
                                                )}
                                            >
                                                ₪{(activeContract?.base_rent || property.rent_price || 0).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Contract Badge */}
                                        {activeContract && (
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">
                                                    {lang === 'he' ? 'סיום חוזה' : 'lease ends'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800 text-[10px] font-black text-foreground border border-slate-100 dark:border-neutral-700 shadow-minimal group-hover:bg-white dark:group-hover:bg-neutral-700 transition-colors">
                                                        {formatDate(activeContract.end_date)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
