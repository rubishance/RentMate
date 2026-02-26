import { useEffect, useState, useCallback } from 'react';
import {
    HomeIcon as Home,
    BedIcon as BedDouble,
    RulerIcon as Ruler,
    BalconyIcon,
    SafeRoomIcon,
    StorageIcon,
    CarIcon as Car,
} from '../components/icons/NavIcons';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { format } from 'date-fns';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';
import { IndexedRentModal } from '../components/modals/IndexedRentModal';
import type { Property } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';
import { PropertyIcon } from '../components/common/PropertyIcon';
import { getPropertyPlaceholder } from '../lib/property-placeholders';

import UpgradeRequestModal from '../components/modals/UpgradeRequestModal';
import { SelectPropertyModal } from '../components/modals/SelectPropertyModal';
import { useDataCache } from '../contexts/DataCacheContext';
import { useSubscription } from '../hooks/useSubscription';
import { SecureImage } from '../components/common/SecureImage';

import { Trash2, Plus } from 'lucide-react';

import { cn } from '../lib/utils';
import { useStack } from '../contexts/StackContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type ExtendedProperty = Property & {
    contracts: {
        base_rent: number;
        status: string;
        start_date: string;
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
    const { canAddProperty, refreshSubscription } = useSubscription();
    const [properties, setProperties] = useState<ExtendedProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const { get, set, clear } = useDataCache();
    const CACHE_KEY = 'properties_list';

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    const [indexedRentContract, setIndexedRentContract] = useState<ExtendedProperty['contracts'][0] | null>(null); // Contract to show calculation for
    const [affectedItems, setAffectedItems] = useState<{ label: string; count: number; items: any[]; type: 'critical' | 'warning' | 'info' }[]>([]);
    const [isSelectPropertyModalOpen, setIsSelectPropertyModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { push } = useStack();

    const fetchProperties = useCallback(async () => {
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
                .select('*, contracts(id, base_rent, status, start_date, end_date, linkage_type, base_index_date, base_index_value, option_periods)')
                .eq('user_id', user.id) // STRICTLY enforce ownership
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
            } else if (data) {
                const propertiesData = data as unknown as ExtendedProperty[];
                setProperties(propertiesData);
                set(CACHE_KEY, propertiesData, { persist: true });
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
        }
    }, [get, set, CACHE_KEY]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    const handleAdd = useCallback(() => {
        if (loading) return; // Don't act if still loading subscription/plan

        if (!canAddProperty) {
            setIsUpgradeModalOpen(true);
            return;
        }
        push('wizard', {
            onSuccess: () => {
                clear();
                fetchProperties();
                refreshSubscription();
            }
        }, { isExpanded: true, title: t('addProperty') });
    }, [loading, canAddProperty, setIsUpgradeModalOpen, push, clear, fetchProperties, refreshSubscription, t]);

    const handleQuickUpload = useCallback(() => {
        if (properties.length === 0) {
            handleAdd();
        } else if (properties.length === 1) {
            navigate(`/properties/${properties[0].id}`, { state: { action: 'upload' } });
        } else {
            setIsSelectPropertyModalOpen(true);
        }
    }, [properties, handleAdd, navigate, setIsSelectPropertyModalOpen]);

    const handleView = (property: Property) => {
        navigate(`/properties/${property.id}`);
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

            const items: { label: string; count: number; items: any[]; type: 'critical' | 'warning' | 'info' }[] = [];

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
                const contractIds = contracts.map((c: { id: string }) => c.id);
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

    // Handle Global Actions
    useEffect(() => {
        const action = location.state?.action;
        if (action === 'add') {
            handleAdd();
            // Clear state using navigate to ensure React Router knows about it
            navigate(location.pathname, { replace: true, state: {} });
        } else if (action === 'upload') {
            // Need to wait for properties to load? 
            // Actually properties might be loading.
            if (!loading && properties.length > 0) {
                handleQuickUpload();
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state?.action, loading, properties.length, handleAdd, handleQuickUpload, navigate, location.pathname]);

    if (loading) {
        return (
            <div className="pb-40 pt-16 space-y-24">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4 md:px-8">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-16 w-64 rounded-xl" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-[500px] rounded-[3rem] overflow-hidden border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                            <Skeleton className="h-72 w-full" />
                            <div className="p-10 space-y-8">
                                <Skeleton className="h-8 w-3/4" />
                                <div className="grid grid-cols-3 gap-4">
                                    <Skeleton className="h-12 w-full rounded-2xl" />
                                    <Skeleton className="h-12 w-full rounded-2xl" />
                                    <Skeleton className="h-12 w-full rounded-2xl" />
                                </div>
                                <Skeleton className="h-10 w-1/2 mt-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-40 pt-8 px-4 md:px-8 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 overflow-hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-1">
                        <Home className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {t('myPortfolio')}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight truncate lowercase">
                        {t('properties')}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleAdd}
                        variant="jewel"
                        className="h-14 w-14 rounded-2xl p-0 shrink-0"
                        title={t('addProperty')}
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {properties.length === 0 ? (
                <div className="px-4 md:px-8 flex flex-col items-center justify-center py-40 rounded-[3rem] border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 mx-4 md:mx-8">
                    <div className="w-32 h-32 bg-white dark:bg-neutral-900 rounded-[3rem] flex items-center justify-center mx-auto shadow-minimal mb-10">
                        <Home className="w-12 h-12 text-slate-200" />
                    </div>
                    <div className="text-center space-y-4">
                        <h3 className="text-3xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noAssetsFound')}</h3>
                        <p className="text-muted-foreground font-medium text-center max-w-sm px-10 leading-relaxed mx-auto">
                            {t('addFirstPropertyDesc')}
                        </p>
                    </div>
                    <Button
                        onClick={handleAdd}
                        className="mt-12 h-auto px-10 py-5 bg-foreground text-background rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium-dark hover:bg-foreground/90"
                    >
                        {t('createFirstAsset')}
                    </Button>
                </div>
            ) : (
                /* Properties Grid */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-8">
                        {properties.map((property) => {
                            const today = format(new Date(), 'yyyy-MM-dd');
                            const activeContract = property.contracts?.find(c =>
                                c.status === 'active' &&
                                c.start_date <= today &&
                                (!c.end_date || c.end_date >= today)
                            );
                            return (
                                <Card
                                    key={property.id}
                                    onClick={() => handleView(property)}
                                    className="group flex flex-col h-full rounded-[2.5rem] border-none shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer p-0 gap-0 bg-card dark:bg-card mask-clip-card"
                                    hoverEffect
                                >
                                    {/* Image Section */}
                                    <div className="relative h-64 bg-slate-100 dark:bg-neutral-800 overflow-hidden rounded-t-[2.5rem]">
                                        <SecureImage
                                            bucket="property-images"
                                            path={property.image_url}
                                            placeholder={getPropertyPlaceholder(property.property_type)}
                                            alt={`${property.address}, ${property.city}`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                        {/* Status Badge */}
                                        <div className={`absolute top-5 ${lang === 'he' ? 'left-5' : 'right-5'} flex gap-3`}>
                                            <span className={cn(
                                                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm border transition-all duration-500",
                                                activeContract
                                                    ? 'bg-emerald-500/90 text-white border-transparent'
                                                    : 'bg-white/90 text-slate-700 border-white/20'
                                            )}>
                                                {activeContract ? t('occupied') : t('vacant')}
                                            </span>
                                        </div>

                                        {/* Property Type Badge */}
                                        <div className={`absolute bottom-5 ${lang === 'he' ? 'right-5' : 'left-5'}`}>
                                            <div className="flex items-center gap-3 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                                                    {property.property_type ? t(property.property_type as string) : t('apartment')}
                                                </span>
                                                <PropertyIcon type={property.property_type} className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <CardContent className="p-8 flex-1 flex flex-col space-y-6">
                                        <div className="min-h-[3rem]">
                                            <h3 className="text-xl font-bold tracking-tight text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                {[property.address, property.city].filter(Boolean).join(', ')}
                                            </h3>
                                        </div>

                                        {/* Detailed Specs Row */}
                                        <div className="grid grid-cols-6 gap-2 py-4 border-t border-border/50">
                                            {/* Rooms */}
                                            <div className="flex flex-col items-center gap-1">
                                                <BedDouble className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-xs font-bold">{property.rooms}</span>
                                            </div>
                                            {/* SQM */}
                                            <div className="flex flex-col items-center gap-1">
                                                <Ruler className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-xs font-bold">{property.size_sqm}</span>
                                            </div>
                                            {/* Parking */}
                                            <div className="flex flex-col items-center gap-1">
                                                <Car className={cn("w-4 h-4", property.has_parking ? "text-primary" : "text-muted-foreground/30")} />
                                                <span className="text-xs font-bold">{property.has_parking ? '✓' : '-'}</span>
                                            </div>
                                            {/* Balcony */}
                                            <div className="flex flex-col items-center gap-1">
                                                <BalconyIcon className={cn("w-4 h-4", property.has_balcony ? "text-primary" : "text-muted-foreground/30")} />
                                                <span className="text-xs font-bold">{property.has_balcony ? '✓' : '-'}</span>
                                            </div>
                                            {/* Safe Room */}
                                            <div className="flex flex-col items-center gap-1">
                                                <SafeRoomIcon className={cn("w-4 h-4", property.has_safe_room ? "text-primary" : "text-muted-foreground/30")} />
                                                <span className="text-xs font-bold">{property.has_safe_room ? '✓' : '-'}</span>
                                            </div>
                                            {/* Storage */}
                                            <div className="flex flex-col items-center gap-1">
                                                <StorageIcon className={cn("w-4 h-4", property.has_storage ? "text-primary" : "text-muted-foreground/30")} />
                                                <span className="text-xs font-bold">{property.has_storage ? '✓' : '-'}</span>
                                            </div>
                                        </div>

                                        {/* Rent & Contract Section */}
                                        <div className="flex items-center justify-between pt-2 mt-auto">
                                            <div onClick={(e) => e.stopPropagation()} className="space-y-0.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">
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
                                                        "text-2xl font-black text-foreground tracking-tight",
                                                        property.contracts?.some(c => c.status === 'active' && c.linkage_type && c.linkage_type !== 'none') && "cursor-pointer text-primary hover:underline decoration-2 underline-offset-4"
                                                    )}
                                                >
                                                    ₪{(activeContract?.base_rent || 0).toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Contract Badge */}
                                            {activeContract && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">
                                                        {t('leaseEnds')}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-lg bg-secondary/50 text-xs font-bold text-foreground">
                                                        {formatDate(activeContract.end_date)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(property);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )
            }

            <IndexedRentModal
                isOpen={!!indexedRentContract}
                onClose={() => setIndexedRentContract(null)}
                contract={indexedRentContract}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('deleteAsset')}
                message={t('deleteAssetConfirm', { address: deleteTarget?.address || '', city: deleteTarget?.city || '' })}
                isDeleting={isDeleting}
                affectedItems={affectedItems}
                requireDoubleConfirm={true}
            />

            <UpgradeRequestModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                source="properties_export"
            />



            <SelectPropertyModal
                isOpen={isSelectPropertyModalOpen}
                onClose={() => setIsSelectPropertyModalOpen(false)}
                properties={properties}
                onSelect={(propertyId) => {
                    setIsSelectPropertyModalOpen(false);
                    navigate(`/properties/${propertyId}`, { state: { action: 'upload' } });
                }}
            />
        </div >
    );
}
