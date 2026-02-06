import { useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { rentalTrendService } from '../../services/rental-trend.service';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Property } from '../../types/database';
import { cn } from '../../lib/utils';
import { WalletIcon, FolderIcon, MapPinIcon, PlusIcon, MoreVertical, Edit2, Trash2, CheckIcon, FilePlus, FileText, Car, Archive, ShieldCheck, ArrowUpDown, Accessibility, Upload, Loader2, Calendar, ArrowLeft } from 'lucide-react';
import { BalconyIcon, SafeRoomIcon, StorageIcon, CarIcon } from '../icons/NavIcons';
import { Menu, MenuButton, MenuItem, MenuItems, Transition, Portal } from '@headlessui/react';
import { PropertyDocumentsHub } from '../properties/PropertyDocumentsHub';
import { Button } from '../ui/Button';
import { SnapshotTab } from './tabs/SnapshotTab';
import { ContractsTab } from './tabs/ContractsTab';
import { WalletTab } from './tabs/WalletTab';
import { PropertyTypeSelect } from '../common/PropertyTypeSelect';
import { GoogleAutocomplete } from '../common/GoogleAutocomplete';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';
import { Contract } from '../../types/database';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import { AnimatePresence, motion } from 'framer-motion';
import { useDataCache } from '../../contexts/DataCacheContext';
import { AddPaymentModal } from '../modals/AddPaymentModal';
import { DollarSign } from 'lucide-react';
import { propertyService } from '../../services/property.service';
import { CompressionService } from '../../services/compression.service';
import { getPropertyPlaceholder } from '../../lib/property-placeholders';

interface PropertyHubProps {
    propertyId: string;
    property: Property;
    onDelete?: () => void;
    onSave?: () => void;
}

type TabType = 'contracts' | 'wallet' | 'files';

export function PropertyHub({ property: initialProperty, propertyId, onDelete, onSave }: PropertyHubProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const { push, pop } = useStack();
    const { set, clear } = useDataCache();
    const [activeTab, setActiveTab] = useState<TabType>('contracts');
    const [property, setProperty] = useState(initialProperty);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProperty, setEditedProperty] = useState<Property>(initialProperty);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    // Modals
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeContract, setActiveContract] = useState<Contract | null>(null);
    const [marketTrend, setMarketTrend] = useState<any>(null);

    // Auto-Navigation State
    const location = useLocation();
    const [requestedDocTab, setRequestedDocTab] = useState<'media' | 'utilities' | 'maintenance' | 'documents' | 'checks' | undefined>(undefined);
    const [shouldAutoUpload, setShouldAutoUpload] = useState(false);

    useEffect(() => {
        if (location.state?.action === 'upload') {
            setActiveTab('files');
            setRequestedDocTab('documents');
            setShouldAutoUpload(true);

            // Clear location state
            window.history.replaceState({}, '');
        }
    }, [location]);

    // Self-healing synchronization: Ensure property status matches active contracts
    useEffect(() => {
        const sync = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Sync status
            const newStatus = await propertyService.syncOccupancyStatus(propertyId, user.id);
            if (newStatus && newStatus !== property.status) {
                console.log(`[PropertyHub] Status out of sync for ${propertyId}. Updating: ${property.status} -> ${newStatus}`);
                setProperty(prev => ({ ...prev, status: newStatus }));
                clear(); // Invalidate dashboard/list cache
            }

            // 2. Fetch active contract for extension details
            const { data: contracts } = await supabase
                .from('contracts')
                .select('*')
                .eq('property_id', propertyId)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1);

            if (contracts && contracts.length > 0) {
                setActiveContract(contracts[0]);
            }
        };
        sync();

        // 3. Fetch market trend
        const trend = rentalTrendService.getRegionalTrend(property.city);
        setMarketTrend(trend);
    }, [propertyId, property.city]);

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
        // Default to upload mode if is a local image, or url if is a google maps link
        if (property.image_url?.includes('google')) {
            setUploadMode('url');
        } else {
            setUploadMode('upload');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        setImageError(null);
        let file = e.target.files[0];

        try {
            if (CompressionService.isImage(file)) {
                file = await CompressionService.compressImage(file);
            }
        } catch (error) {
            console.error('Compression failed:', error);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `prop_${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('property-images')
                .getPublicUrl(filePath);

            setEditedProperty(prev => ({ ...prev, image_url: data.publicUrl }));
        } catch (err: any) {
            console.error('Error uploading image:', err);
            setImageError('Failed to upload image: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedProperty(property);
    };

    const handleSave = async () => {
        if (!propertyId) {
            console.error('[PropertyHub] Critical: Attempted to save property without a propertyId. This would cause a Supabase error.');
            alert(t('error_missing_id') || 'System Error: Missing Property ID');
            return;
        }

        setSaving(true);
        try {
            const updates: any = {
                address: (editedProperty.address || '').trim(),
                city: (editedProperty.city || '').trim(),
                rooms: Number(editedProperty.rooms) || 0,
                size_sqm: Number(editedProperty.size_sqm) || 0,
                property_type: editedProperty.property_type || 'apartment',
                has_parking: !!editedProperty.has_parking,
                has_storage: !!editedProperty.has_storage,
                has_balcony: !!editedProperty.has_balcony,
                has_safe_room: !!editedProperty.has_safe_room,
                image_url: editedProperty.image_url || null,
                updated_at: new Date().toISOString()
            };

            let { error } = await supabase
                .from('properties')
                .update(updates)
                .eq('id', propertyId);

            // Schema Cache Error Handling (PostgREST)
            if (error && (error.message?.includes('schema cache') || error.message?.includes('column'))) {
                console.warn('[PropertyHub] Modern schema columns missing from API cache. Retrying with legacy fields...');

                // Remove columns that were added in today's migrations
                const legacyUpdates = { ...updates };
                delete legacyUpdates.has_balcony;
                delete legacyUpdates.has_safe_room;
                delete legacyUpdates.updated_at; // Might be missing if migration 20260130172500 didn't run

                const { error: retryError } = await supabase
                    .from('properties')
                    .update(legacyUpdates)
                    .eq('id', propertyId);

                error = retryError;
            }

            if (error) {
                console.error('[PropertyHub] Supabase update error:', error);
                throw error;
            }

            setProperty(prev => ({ ...prev, ...editedProperty }));
            setIsEditing(false);
            clear(); // Sync cache
            if (onSave) onSave();
        } catch (error: any) {
            console.error('Error saving property:', error);
            alert(`${t('failed_to_save_changes')}\n\nError: ${error.message || error.details || 'Unknown error'}`);
        } finally {
            setSaving(false);
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

    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black">
            {/* 1. Header & Cover */}
            <div className="relative shrink-0">
                <div className="h-48 bg-slate-200 dark:bg-neutral-800 relative overflow-hidden">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 z-20 w-10 h-10 glass-premium dark:bg-neutral-800/40 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10 group"
                    >
                        <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", lang === 'he' ? 'rotate-180 group-hover:translate-x-1' : '')} />
                    </button>
                    <img
                        src={property.image_url || getPropertyPlaceholder(property.property_type)}
                        alt={property.address}
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const placeholder = getPropertyPlaceholder(property.property_type);
                            if (target.src !== placeholder) {
                                target.src = placeholder;
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-black via-transparent to-transparent/60" />
                </div>

                <div className="px-3 md:px-6 -mt-12 relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            {/* Status Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 glass-premium dark:bg-black/50 backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 text-[9px] font-black uppercase tracking-widest mb-2 shadow-minimal">
                                {(() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const hasActiveContract = (property as any).contracts?.some((c: any) =>
                                        c.status === 'active' &&
                                        c.start_date <= today &&
                                        (!c.end_date || c.end_date >= today)
                                    );
                                    const currentStatus = hasActiveContract ? 'Occupied' : property.status;
                                    const isOccupied = currentStatus === 'Occupied';

                                    return (
                                        <>
                                            <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(var(--status-color),0.5)]", isOccupied ? "bg-emerald-500" : "bg-amber-500")} />
                                            {t((currentStatus?.toLowerCase() || 'vacant') as any)}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Market Trend Badge */}
                            {marketTrend && (
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 ml-2 backdrop-blur-md rounded-full border text-[10px] font-black uppercase tracking-widest mb-2 transition-all",
                                    marketTrend.annualGrowth > 0
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                        : "bg-red-500/10 border-red-500/20 text-red-600"
                                )}>
                                    {marketTrend.annualGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {marketTrend.annualGrowth > 0 ? '+' : ''}{marketTrend.annualGrowth}%
                                    {lang === 'he' ? 'שכירות בעיר (למ"ס)' : 'Market Rent (CBS)'}
                                </div>
                            )}

                            {isEditing ? (
                                <div className="space-y-4 bg-white/80 dark:bg-black/80 p-4 rounded-2xl border border-primary/20 backdrop-blur-xl">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</label>
                                        <div className="pt-2">
                                            <GoogleAutocomplete
                                                label={t('address')}
                                                value={editedProperty.address || ''}
                                                onChange={val => setEditedProperty(prev => ({ ...prev, address: val }))}
                                                type="address"
                                                biasCity={editedProperty.city}
                                                className="text-xl font-black tracking-tighter"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <GoogleAutocomplete
                                                label={t('city')}
                                                value={editedProperty.city || ''}
                                                onChange={val => setEditedProperty(prev => ({ ...prev, city: val }))}
                                                type="cities"
                                                className="text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
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

                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t('propertyType')}</label>
                                        <PropertyTypeSelect
                                            value={editedProperty.property_type || 'apartment'}
                                            onChange={(val) => setEditedProperty(prev => ({ ...prev, property_type: val }))}
                                        />
                                    </div>

                                    <div className="pt-4 grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'has_balcony', label: t('balcony'), icon: BalconyIcon },
                                            { key: 'has_safe_room', label: t('safeRoom'), icon: SafeRoomIcon },
                                            { key: 'has_parking', label: t('parking'), icon: CarIcon },
                                            { key: 'has_storage', label: t('storage'), icon: StorageIcon },
                                        ].map((feat) => (
                                            <button
                                                key={feat.key}
                                                type="button"
                                                onClick={() => setEditedProperty(prev => ({ ...prev, [feat.key]: !prev[feat.key as keyof Property] }))}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                                                    editedProperty[feat.key as keyof Property]
                                                        ? "bg-primary/10 border-primary/30 text-primary"
                                                        : "bg-slate-50 dark:bg-neutral-800 border-slate-100 dark:border-neutral-700 text-muted-foreground"
                                                )}
                                            >
                                                <feat.icon className="w-3.5 h-3.5" />
                                                {feat.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-neutral-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('propertyImage')}</label>
                                            <div className="flex p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl">
                                                <button
                                                    onClick={() => setUploadMode('upload')}
                                                    className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", uploadMode === 'upload' ? "bg-white dark:bg-neutral-700 text-primary shadow-sm" : "text-muted-foreground")}
                                                >
                                                    {t('upload') || 'Upload'}
                                                </button>
                                                <button
                                                    onClick={() => setUploadMode('url')}
                                                    className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", uploadMode === 'url' ? "bg-white dark:bg-neutral-700 text-primary shadow-sm" : "text-muted-foreground")}
                                                >
                                                    Street View
                                                </button>
                                            </div>
                                        </div>

                                        {uploadMode === 'url' ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 text-xs bg-slate-50 dark:bg-neutral-800 p-3 rounded-xl border border-slate-100 dark:border-neutral-700 outline-none focus:border-primary"
                                                    value={editedProperty.image_url || ''}
                                                    onChange={e => setEditedProperty(prev => ({ ...prev, image_url: e.target.value }))}
                                                    placeholder="https://..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (process?.env?.VITE_GOOGLE_MAPS_API_KEY);
                                                        if (!apiKey || !editedProperty.address) return;
                                                        const location = `${editedProperty.address}, ${editedProperty.city}`;
                                                        const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${apiKey}`;
                                                        setEditedProperty(prev => ({ ...prev, image_url: imageUrl }));
                                                    }}
                                                    className="px-3 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-primary/20"
                                                >
                                                    {lang === 'he' ? 'אוטומטי' : 'Auto'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl p-6 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-all text-center group cursor-pointer h-24 flex items-center justify-center">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    disabled={isUploading}
                                                    onChange={handleFileUpload}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col items-center gap-1">
                                                    {isUploading ? (
                                                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                    ) : (
                                                        <Upload className="w-5 h-5 text-slate-300 group-hover:text-primary transition-all" />
                                                    )}
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {isUploading ? 'Uploading...' : 'Click to upload'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {editedProperty.image_url && (
                                            <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-100 dark:border-neutral-800 group">
                                                <img
                                                    src={editedProperty.image_url || getPropertyPlaceholder(editedProperty.property_type)}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        const placeholder = getPropertyPlaceholder(editedProperty.property_type);
                                                        if (target.src !== placeholder) {
                                                            target.src = placeholder;
                                                        }
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                    <button
                                                        onClick={() => setEditedProperty(p => ({ ...p, image_url: '' }))}
                                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-xl"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {imageError && (
                                            <p className="text-[10px] text-red-500 font-bold">{imageError}</p>
                                        )}
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
                                            {property.rooms ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span>{property.rooms}</span>
                                                    <span className="text-[10px] uppercase tracking-wider opacity-70">{t('rooms')}</span>
                                                </div>
                                            ) : null}
                                            {property.rooms && property.size_sqm ? <div className="w-[1px] h-3 bg-current opacity-20" /> : null}
                                            {property.size_sqm ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span>{property.size_sqm}</span>
                                                    <span className="text-[10px] uppercase tracking-wider opacity-70">{t('sqm')}</span>
                                                </div>
                                            ) : null}
                                            {(property.has_parking || property.has_storage || property.has_balcony || property.has_safe_room) && (
                                                <>
                                                    {(property.rooms || property.size_sqm) && <div className="w-[1px] h-3 bg-current opacity-20" />}
                                                    <div className="flex items-center gap-2">
                                                        {property.has_balcony && <BalconyIcon className="w-3.5 h-3.5" />}
                                                        {property.has_safe_room && <SafeRoomIcon className="w-3.5 h-3.5" />}
                                                        {property.has_parking && <CarIcon className="w-3.5 h-3.5" />}
                                                        {property.has_storage && <StorageIcon className="w-3.5 h-3.5" />}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-muted-foreground font-medium">{property.city}</p>
                                        {activeContract?.option_periods && activeContract.option_periods.length > 0 && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                    <Calendar className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                                                        {lang === 'he' ? 'כולל אופציה' : 'Incl. Option'}: {activeContract.option_periods[0].length} {activeContract.option_periods[0].unit === 'years' ? (lang === 'he' ? 'שנים' : 'yrs') : (lang === 'he' ? 'חודשים' : 'mos')}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
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
                                        className="w-12 h-12 button-jewel text-white rounded-[1.2rem] shadow-jewel hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="w-12 h-12 glass-premium dark:bg-neutral-800/40 rounded-[1.2rem] border border-white/5 text-foreground hover:bg-white/10 transition-all flex items-center justify-center shrink-0"
                                    >
                                        <PlusIcon className="w-5 h-5 rotate-45" />
                                    </button>
                                </div>
                            ) : (
                                <Menu as="div" className="relative inline-block text-left">
                                    <MenuButton
                                        className="w-12 h-12 glass-premium dark:bg-neutral-800/40 rounded-[1.2rem] border border-white/5 text-foreground hover:bg-white/10 transition-all focus:outline-none flex items-center justify-center"
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
            <div className="px-3 md:px-6 relative z-20">
                <div className="flex gap-1.5 glass-premium dark:bg-white/5 backdrop-blur-2xl p-1.5 rounded-[1.8rem] border border-white/5 shadow-minimal overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2.5 px-6 py-2.5 rounded-[1.3rem] transition-all duration-700 whitespace-nowrap group relative",
                                    isActive
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5"
                                )}
                            >
                                <Icon className={cn(
                                    "w-3.5 h-3.5 transition-transform duration-700",
                                    isActive ? "scale-110" : "group-hover:scale-110"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabPropertyHub"
                                        className="absolute inset-0 bg-white/10 dark:bg-black/5 rounded-[1.3rem] -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pt-6 pb-20">
                <div className="px-3 md:px-6 h-full">
                    {activeTab === 'contracts' && <ContractsTab key={refreshKey} propertyId={propertyId} onAddContract={handleAddContract} />}
                    {activeTab === 'wallet' && <WalletTab key={refreshKey} propertyId={propertyId} property={property} />}
                    {activeTab === 'files' && <PropertyDocumentsHub key={refreshKey} property={property} requestedTab={requestedDocTab} autoOpenUpload={shouldAutoUpload} />}
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
                verificationText={property.address}
                verificationLabel={lang === 'he' ? `הקלד את כתובת הנכס (${property.address}) לאישור` : `Type the property address (${property.address}) to confirm`}
                isDeleting={isDeleting}
            />

            <AddPaymentModal
                isOpen={isAddPaymentModalOpen}
                onClose={() => setIsAddPaymentModalOpen(false)}
                onSuccess={() => {
                    // Update cache/lists
                    clear();
                    setRefreshKey(prev => prev + 1);
                }}
                initialData={{
                    contract_id: (property as any).contracts?.find((c: any) => c.status === 'active')?.id
                }}
            />
        </div>
    );
}
