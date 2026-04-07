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
import { format, addMonths, addYears } from 'date-fns';

import { IndexedRentModal } from '../components/modals/IndexedRentModal';
import type { Property } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';
import { PropertyIcon } from '../components/common/PropertyIcon';
import { getPropertyPlaceholder } from '../lib/property-placeholders';
import { getPropertyStateConfig } from '../constants/statusConfig';

import UpgradeRequestModal from '../components/modals/UpgradeRequestModal';
import { SelectPropertyModal } from '../components/modals/SelectPropertyModal';
import { useDataCache } from '../contexts/DataCacheContext';
import { useSubscription } from '../hooks/useSubscription';
import { SecureImage } from '../components/common/SecureImage';
import { EmptyState } from '../components/common/EmptyState';

import { Plus, Wallet, Folder, FileText } from 'lucide-react';

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

const calculateLatestDate = (endDate: string | null, options: {length: number, unit: 'months' | 'years'}[] | null) => {
    if (!endDate) return null;
    let latest = new Date(endDate);
    if (options && options.length > 0) {
        options.forEach(opt => {
            if (opt.unit === 'years') latest = addYears(latest, opt.length);
            else if (opt.unit === 'months') latest = addMonths(latest, opt.length);
        });
    }
    return format(latest, 'yyyy-MM-dd');
};

export function Properties() {
    const { t, lang } = useTranslation();
    const { canAddProperty, refreshSubscription } = useSubscription();
    const [properties, setProperties] = useState<ExtendedProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const { get, set, clear } = useDataCache();
    const CACHE_KEY = 'properties_list';

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const [indexedRentContract, setIndexedRentContract] = useState<ExtendedProperty['contracts'][0] | null>(null); // Contract to show calculation for
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
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
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
            <div className="pt-16 space-y-24">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-0">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-16 w-64 rounded-xl" />
                    </div>
                </div>
                <div className="flex overflow-hidden gap-4 sm:gap-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-[88vw] sm:w-[400px] shrink-0 h-[500px] rounded-2xl overflow-hidden border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                            <Skeleton className="h-72 w-full" />
                            <div className="p-8 space-y-8">
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
        <div className="pb-4 pt-2 md:pt-8 px-4 sm:px-6 space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300 w-full max-w-[100vw] overflow-x-hidden">
            {/* Header Action Button - FIXED so it never moves */}
            <div className={cn(
                "fixed z-[60]",
                lang === 'he' ? 'left-5' : 'right-5',
                "top-[88px] md:top-[144px]"
            )}>
                <Button
                    onClick={handleAdd}
                    className="h-14 w-14 rounded-2xl p-0 shrink-0 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                    title={t('addProperty')}
                >
                    <Plus className="w-6 h-6" />
                </Button>
            </div>
            {/* Layout placeholder */}
            <div className="flex flex-row items-end justify-end gap-4 px-0 w-full">
                <div className="h-14 w-14 shrink-0 opacity-0 pointer-events-none" />
            </div>

            {/* Empty State */}
            {properties.length === 0 ? (
                <EmptyState
                    icon={Home}
                    title={t('noAssetsFound')}
                    description={t('addFirstPropertyDesc')}
                    actionLabel={t('createFirstAsset')}
                    onAction={handleAdd}
                    className="mt-4 sm:mt-12"
                />
            ) : (
                /* Properties Grid */
                <>
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 pb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {properties.map((property) => {
                            const today = format(new Date(), 'yyyy-MM-dd');
                            const activeContract = property.contracts?.find(c => c.status === 'active');
                            return (
                                <div key={property.id} className="w-[88vw] sm:w-[400px] shrink-0 snap-start flex">
                                    <Card
                                        onClick={() => handleView(property)}
                                        className="group flex flex-col w-full border-none shadow-low hover:shadow-high transition-all duration-500 cursor-pointer p-0 gap-0 bg-card dark:bg-card mask-clip-card"
                                        hoverEffect
                                    >
                                    {/* Image Section */}
                                    <div className="relative h-64 bg-muted/50 dark:bg-neutral-800 overflow-hidden rounded-t-2xl">
                                        <SecureImage
                                            bucket="property-images"
                                            path={property.image_url}
                                            placeholder={getPropertyPlaceholder(property.property_type)}
                                            alt={`${property.address}, ${property.city}`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                        {/* Status Badge */}
                                        <div className={`absolute top-4 ${lang === 'he' ? 'left-4' : 'right-4'} flex gap-2 sm:gap-4`}>
                                            {(() => {
                                                const config = getPropertyStateConfig(activeContract ? 'occupied' : 'vacant');
                                                // Create a slightly more prominent white background overlay version of the config 
                                                // to ensure it pops over the image
                                                return (
                                                    <span className={cn(
                                                        "px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all duration-300",
                                                        "bg-white/95 backdrop-blur-sm", 
                                                        config.color
                                                    )}>
                                                        {t(config.labelKey as any)}
                                                    </span>
                                                );
                                            })()}
                                        </div>


                                    </div>

                                    {/* Content */}
                                    <CardContent className="p-6 flex-1 flex flex-col pt-6">
                                        {/* Top Row: Address and Price */}
                                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/10 pb-6 mb-6">
                                            {/* Right side (Address) */}
                                            <div className="flex flex-col flex-1 pr-1 pl-4">
                                                <h3 className="text-2xl font-black text-primary dark:text-blue-400 truncate leading-tight">
                                                    {property.address}
                                                </h3>
                                                {property.city && (
                                                    <span className="text-[1.05rem] font-medium text-muted-foreground mt-1 tracking-tight">
                                                        {property.city}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Left side (Price) */}
                                            <div className="flex flex-col items-start whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div
                                                    onClick={() => {
                                                        const active = property.contracts?.find(c => c.status === 'active');
                                                        if (active && active.linkage_type && active.linkage_type !== 'none') {
                                                            setIndexedRentContract(active);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "text-2xl font-black text-primary dark:text-blue-400 tracking-tight",
                                                        property.contracts?.some(c => c.status === 'active' && c.linkage_type && c.linkage_type !== 'none') && "cursor-pointer hover:underline decoration-2 underline-offset-4"
                                                    )}
                                                >
                                                    ₪{(activeContract?.base_rent || 0).toLocaleString()}
                                                </div>
                                                <span className="text-sm font-medium text-muted-foreground mr-auto ml-1">
                                                    {t('monthlyRentLabel')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Active Contract Details */}
                                        <div className="flex w-full items-center content-center flex-1 mt-auto pb-2 divide-x divide-slate-200 dark:divide-neutral-800 rtl:divide-x-reverse pt-2">
                                            {activeContract ? (
                                                <>
                                                    <div className="flex-1 flex flex-col items-center text-center px-1">
                                                        <span className="text-[0.65rem] md:text-[0.7rem] tracking-tight text-muted-foreground mb-1.5">{t('startDate')}</span>
                                                        <div className="flex items-center font-bold text-primary dark:text-blue-400">
                                                            <span className="text-[0.95rem] md:text-[1.05rem] leading-none tracking-tight">{formatDate(activeContract.start_date)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 flex flex-col items-center text-center px-1">
                                                        <span className="text-[0.65rem] md:text-[0.7rem] tracking-tight text-muted-foreground mb-1.5">{t('endDate')}</span>
                                                        <div className="flex items-center font-bold text-primary dark:text-blue-400">
                                                            <span className="text-[0.95rem] md:text-[1.05rem] leading-none tracking-tight">{activeContract.end_date ? formatDate(activeContract.end_date) : '-'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 flex flex-col items-center text-center px-1">
                                                        <span className="text-[0.65rem] md:text-[0.7rem] tracking-tight text-muted-foreground mb-1.5 text-balance">{lang === 'he' ? 'תאריך סיום האופציה' : 'Option End Date'}</span>
                                                        <div className="flex items-center font-bold text-primary dark:text-blue-400">
                                                            <span className="text-[0.95rem] md:text-[1.05rem] leading-none tracking-tight">{activeContract.end_date ? formatDate(calculateLatestDate(activeContract.end_date, activeContract.option_periods)) : '-'}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full flex justify-center items-center opacity-70">
                                                    <span className="text-sm font-medium">{t('noActiveContract') || (lang === 'he' ? 'אין חוזה פעיל' : 'No active contract')}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Actions (Requested via Nav Buttons) */}
                                        <div className="grid grid-cols-3 w-full border-t border-slate-100 dark:border-neutral-800 pt-3 mt-3 gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1.5 h-auto py-2 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all rounded-xl"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/properties/${property.id}`, { state: { tab: 'files' } });
                                                }}
                                            >
                                                <Folder className="w-4 h-4" />
                                                <span className="text-[0.65rem] md:text-xs font-bold leading-none">{lang === 'he' ? 'מסמכים' : 'Documents'}</span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1.5 h-auto py-2 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all border-x border-slate-100 dark:border-neutral-800 rounded-none"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/properties/${property.id}`, { state: { tab: 'wallet' } });
                                                }}
                                            >
                                                <Wallet className="w-4 h-4" />
                                                <span className="text-[0.65rem] md:text-xs font-bold leading-none">{lang === 'he' ? 'תשלומים' : 'Payments'}</span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex flex-col items-center justify-center gap-1.5 h-auto py-2 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all rounded-xl"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/properties/${property.id}`, { state: { tab: 'contracts' } });
                                                }}
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span className="text-[0.65rem] md:text-xs font-bold leading-none">{lang === 'he' ? 'פרטי חוזה' : 'Contracts'}</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                                </div>
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
