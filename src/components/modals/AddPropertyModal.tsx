import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { AssetsIcon as Building2, MapPinIcon as MapPin, RulerIcon as Ruler, BedIcon as BedDouble, ImageIcon, CarIcon as Car, StorageIcon as Box, ContractsIcon as FileText, EditIcon as Pen, TrashIcon as Trash2 } from '../icons/NavIcons';
import { CloseIcon as X, LoaderIcon as Loader2, ShareIcon as Upload, CheckIcon as Check } from '../icons/MessageIcons';
import apartmentIcon from '../../assets/property-types/apartment.png';
import penthouseIcon from '../../assets/property-types/penthouse.png';
import gardenIcon from '../../assets/property-types/garden.png';
import houseIcon from '../../assets/property-types/house.png';
import otherIcon from '../../assets/property-types/other.png';
import { PropertyIcon } from '../common/PropertyIcon';
import { PropertyTypeSelect } from '../common/PropertyTypeSelect';
import { FormLabel } from '../ui/FormLabel';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { AddTenantModal } from './AddTenantModal';
import { ContractDetailsModal } from './ContractDetailsModal';
import { useSubscription } from '../../hooks/useSubscription';
import { CompressionService } from '../../services/compression.service';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property, Contract, Tenant } from '../../types/database';
import { PropertyDocumentsHub } from '../properties/PropertyDocumentsHub';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

// Extend Contract type to include joined tenants data
type ExtendedContract = Contract & { tenants: { name: string } | null };

const PROPERTY_DEFAULTS: Record<string, string> = {
    apartment: apartmentIcon,
    penthouse: penthouseIcon,
    garden: gardenIcon,
    house: houseIcon,
    other: otherIcon
};

interface AddPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    propertyToEdit?: Property | null;
    readOnly?: boolean;
    onDelete?: () => void;
}

export function AddPropertyModal({ isOpen, onClose, onSuccess, propertyToEdit, readOnly, onDelete }: AddPropertyModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'contracts' | 'documents'>('details');
    const [contracts, setContracts] = useState<ExtendedContract[]>([]);
    const [contractLoading, setContractLoading] = useState(false);

    // Overlay Modal State
    const [selectedContract, setSelectedContract] = useState<any | null>(null); // any to match ContractWithDetails
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);

    // Internal read-only state
    const [isReadOnly, setIsReadOnly] = useState(readOnly);

    const [formData, setFormData] = useState({
        address: '',
        city: '',
        rooms: '',
        size_sqm: '',
        rent_price: '',
        image_url: '',
        has_parking: false,
        has_storage: false,
        property_type: 'apartment'
    });

    useEffect(() => {
        setIsReadOnly(readOnly);
    }, [readOnly]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && propertyToEdit) {
            setFormData({
                address: propertyToEdit.address,
                city: propertyToEdit.city,
                rooms: propertyToEdit.rooms?.toString() || '',
                size_sqm: propertyToEdit.size_sqm?.toString() || '',
                rent_price: propertyToEdit.rent_price?.toString() || '',
                image_url: propertyToEdit.image_url || '',
                has_parking: propertyToEdit.has_parking || false,
                has_storage: propertyToEdit.has_storage || false,
                property_type: propertyToEdit.property_type || 'apartment'
            });

            // Fetch contracts if editing or viewing
            if (propertyToEdit) {
                fetchContracts(propertyToEdit.id);
            }
        } else if (isOpen && !propertyToEdit) {
            // Reset form when opening in "Add" mode
            setFormData({
                address: '',
                city: '',
                rooms: '',
                size_sqm: '',
                rent_price: '',
                image_url: '',
                has_parking: false,
                has_storage: false,
                property_type: 'apartment'
            });
            setContracts([]);
            setActiveTab('details');
        }
    }, [isOpen, propertyToEdit, readOnly]);

    async function fetchContracts(propertyId: string) {
        setContractLoading(true);
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*, tenants(name)')
                .eq('property_id', propertyId)
                .order('start_date', { ascending: false });

            if (!error && data) {
                setContracts(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setContractLoading(false);
        }
    }

    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);


    // Subscription Check
    const { canAddProperty, loading: subLoading, plan } = useSubscription();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        let file = e.target.files[0];

        // Compress if image
        try {
            if (CompressionService.isImage(file)) {
                file = await CompressionService.compressImage(file);
            }
        } catch (error) {
            console.error('Compression failed:', error);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            // 1. Always upload to Supabase for App Performance
            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('property-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: data.publicUrl }));


        } catch (err: any) {
            console.error('Error uploading image:', err);
            setError('Failed to upload image: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) {
            onClose();
            return;
        }

        // Check Limit Check
        if (!propertyToEdit && !canAddProperty) {
            setError(`You have reached the maximum number of properties for your current plan (${plan?.name}). Please upgrade to add more.`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in to add a property');

            // Check Limit Check
            if (!propertyToEdit && !canAddProperty) {
                setError(`You have reached the maximum number of properties for your current plan (${plan?.name}). Please upgrade to add more.`);
                return;
            }

            // Validation
            if (!formData.address || !formData.city) {
                throw new Error('Please fill in required fields');
            }

            // Check for duplicates
            if (!propertyToEdit) {
                let query = supabase
                    .from('properties')
                    .select('id')
                    .eq('address', formData.address)
                    .eq('city', formData.city)
                    .eq('user_id', user.id);

                const { data: existing } = await query;
                if (existing && existing.length > 0) {
                    throw new Error('A property with this address already exists.');
                }
            }

            const payload = {
                address: formData.address,
                city: formData.city,
                rooms: Number(formData.rooms) || 0,
                size_sqm: Number(formData.size_sqm) || 0,
                rent_price: Number(formData.rent_price) || 0, // Ensure rent_price is a number
                image_url: formData.image_url || null,
                has_parking: formData.has_parking,
                has_storage: formData.has_storage,
                property_type: formData.property_type,
                status: propertyToEdit ? propertyToEdit.status : 'Vacant', // Preserve status on edit
                title: `${formData.address}, ${formData.city}`, // Auto-generate title for DB constraint
                user_id: user.id // Fix: Include user_id for RLS
            };

            let error;

            if (propertyToEdit) {
                // Update existing property
                // Remove user_id from update payload just in case RLS complains about updating it (though it's same)
                const { user_id, ...updatePayload } = payload;
                const { error: updateError } = await supabase
                    .from('properties')
                    .update(updatePayload)
                    .eq('id', propertyToEdit.id);
                error = updateError;
            } else {
                // Insert new property
                const { error: insertError } = await supabase
                    .from('properties')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                address: '',
                city: '',
                rooms: '',
                size_sqm: '',
                rent_price: '',
                image_url: '',
                has_parking: false,
                has_storage: false,
                property_type: 'apartment'
            });

        } catch (err: any) {
            console.error('Error saving property:', err);
            setError(err.message || 'Failed to save property');
        } finally {
            setLoading(false);
        }
    };

    const handleViewContract = (contract: ExtendedContract) => {
        // Construct the object expected by ContractDetailsModal
        const contractWithDetails = {
            ...contract,
            properties: {
                address: formData.address,
                city: formData.city
            },
            tenants: contract.tenants || { name: 'Unknown' } // Fallback
        };
        setSelectedContract(contractWithDetails);
        setIsContractModalOpen(true);
    };

    const handleViewTenant = async (tenantId: string) => {
        try {
            const { data } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();

            if (data) {
                setSelectedTenant(data);
                setIsTenantModalOpen(true);
            }
        } catch (err) {
            console.error('Error fetching tenant:', err);
        }
    };

    const isEditMode = !!propertyToEdit;
    const { t, lang } = useTranslation();
    const title = isReadOnly ? (lang === 'he' ? 'פרטי נכס' : 'View Property Details') : (isEditMode ? (lang === 'he' ? 'ערוך נכס' : 'Edit Property') : (lang === 'he' ? 'הוסף נכס' : 'Add New Property'));
    const subtitle = isReadOnly ? (lang === 'he' ? 'צפה בפרטי הנכס' : 'View property details') : (isEditMode ? (lang === 'he' ? 'עדכן את פרטי הנכס' : 'Update property details') : (lang === 'he' ? 'הוסף נכס חדש לתיק שלך' : 'Add a new property to your portfolio'));

    if (!isOpen) return null;

    const modalFooter = (
        <div className="flex gap-3 w-full">
            {activeTab === 'details' ? (
                isReadOnly ? (
                    <>
                        {onDelete && (
                            <Button
                                variant="destructive"
                                onClick={() => { onClose(); onDelete(); }}
                                leftIcon={<Trash2 className="w-4 h-4" />}
                            >
                                {lang === 'he' ? 'מחק' : 'Delete'}
                            </Button>
                        )}
                        <div className="flex-1" />
                        <Button
                            variant="secondary"
                            onClick={() => setIsReadOnly(false)}
                            leftIcon={<Pen className="w-4 h-4" />}
                        >
                            {lang === 'he' ? 'ערוך' : 'Edit'}
                        </Button>
                        <Button onClick={onClose}>
                            {lang === 'he' ? 'סגור' : 'Close'}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" className="flex-1" onClick={onClose}>
                            {lang === 'he' ? 'ביטול' : 'Cancel'}
                        </Button>
                        <Button
                            type="submit"
                            form="add-property-form"
                            className="flex-1"
                            isLoading={loading}
                        >
                            {isEditMode ? (lang === 'he' ? 'שמור שינויים' : 'Save Changes') : (lang === 'he' ? 'הוסף נכס' : 'Add Asset')}
                        </Button>
                    </>
                )
            ) : (
                <Button className="w-full" variant="secondary" onClick={onClose}>
                    {lang === 'he' ? 'סגור' : 'Close'}
                </Button>
            )}
        </div>
    );

    return (
        <>
            {isContractModalOpen && (
                <ContractDetailsModal
                    isOpen={isContractModalOpen}
                    onClose={() => setIsContractModalOpen(false)}
                    onSuccess={() => { }}
                    contract={selectedContract}
                    initialReadOnly={true}
                />
            )}
            {isTenantModalOpen && (
                <AddTenantModal
                    isOpen={isTenantModalOpen}
                    onClose={() => setIsTenantModalOpen(false)}
                    onSuccess={() => { }}
                    tenantToEdit={selectedTenant}
                    readOnly={true}
                />
            )}

            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={title}
                description={subtitle}
                footer={modalFooter}
                size="lg"
            >
                <div className="flex flex-col h-full -m-6">
                    {/* Tabs Navigation */}
                    <div className="flex border-b border-border px-6 shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-20">
                        {[
                            { id: 'details', label: lang === 'he' ? 'פרטי נכס' : 'Details' },
                            { id: 'contracts', label: lang === 'he' ? 'היסטוריית חוזים' : 'Contracts' },
                            { id: 'documents', label: lang === 'he' ? 'מסמכים' : 'Documents' }
                        ].map((tab) => {
                            if (tab.id === 'contracts' && !isEditMode && !isReadOnly) return null;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "pb-3 px-4 text-sm font-bold transition-all relative pt-4",
                                        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 min-h-[50vh]">
                        {activeTab === 'details' ? (
                            <form id="add-property-form" onSubmit={handleSubmit} className="space-y-6">
                                {!isReadOnly && !propertyToEdit && !canAddProperty && !subLoading && (
                                    <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <Building2 className="w-5 h-5 text-orange-600 mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-sm text-orange-800 dark:text-orange-400">Plan Limit Reached</h4>
                                                <p className="text-xs text-orange-700 dark:text-orange-500 mt-1">
                                                    You have reached the limit for your <b>{plan?.name}</b> plan. Upgrade to add more assets.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {error && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/50 uppercase font-bold tracking-tight">
                                        <X className="w-4 h-4" /> {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Form Fields - using standardized inputs could be next, but keeping existing logic for speed */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Property Type</label>
                                        <PropertyTypeSelect
                                            value={formData.property_type as any}
                                            onChange={(value) => {
                                                const currentImage = formData.image_url;
                                                const isDefaultOrEmpty = !currentImage || Object.values(PROPERTY_DEFAULTS).some(img => currentImage.includes(img) || currentImage === img);
                                                if (isDefaultOrEmpty) {
                                                    setFormData({ ...formData, property_type: value, image_url: PROPERTY_DEFAULTS[value] });
                                                } else {
                                                    setFormData({ ...formData, property_type: value });
                                                }
                                            }}
                                            disabled={isReadOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">City</label>
                                        <input
                                            type="text"
                                            required
                                            disabled={isReadOnly}
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full h-12 px-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                required
                                                disabled={isReadOnly}
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rooms</label>
                                        <div className="relative">
                                            <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                step="0.5"
                                                disabled={isReadOnly}
                                                value={formData.rooms}
                                                onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                                                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Size (m²)</label>
                                        <div className="relative">
                                            <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                disabled={isReadOnly}
                                                value={formData.size_sqm}
                                                onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                                                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Amenities */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        type="button"
                                        variant={formData.has_parking ? 'primary' : 'outline'}
                                        onClick={() => !isReadOnly && setFormData({ ...formData, has_parking: !formData.has_parking })}
                                        className="h-20 flex-col gap-2 rounded-3xl"
                                        disabled={isReadOnly}
                                    >
                                        <Car className="w-5 h-5" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Parking</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.has_storage ? 'primary' : 'outline'}
                                        onClick={() => !isReadOnly && setFormData({ ...formData, has_storage: !formData.has_storage })}
                                        className="h-20 flex-col gap-2 rounded-3xl"
                                        disabled={isReadOnly}
                                    >
                                        <Box className="w-5 h-5" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Storage</span>
                                    </Button>
                                </div>

                                {/* Image Preview */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Property Image</label>
                                    {formData.image_url ? (
                                        <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-muted group">
                                            <img src={formData.image_url} alt="Property" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => setFormData({ ...formData, image_url: '' })}
                                                    className="absolute top-4 right-4 bg-black/50 hover:bg-black text-white p-2 rounded-full transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ) : !isReadOnly && (
                                        <div className="flex gap-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setUploadMode('upload')}
                                                className="flex-1 h-32 flex-col rounded-3xl border-dashed"
                                            >
                                                <Upload className="w-6 h-6 mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Upload Image</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setUploadMode('url')}
                                                className="flex-1 h-32 flex-col rounded-3xl border-dashed"
                                            >
                                                <ImageIcon className="w-6 h-6 mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Google Maps</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Active Tenancy */}
                                {isReadOnly && contracts.some(c => c.status === 'active') && (
                                    <div className="pt-6 border-t border-border">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Current Tenant</h3>
                                        {contracts.filter(c => c.status === 'active').map(contract => (
                                            <Card key={contract.id} className="p-4 bg-primary/5 border-primary/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                            {contract.tenants?.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{contract.tenants?.name}</p>
                                                            <p className="text-xs text-muted-foreground">{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-primary">₪{contract.base_rent?.toLocaleString()}</p>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </form>
                        ) : activeTab === 'contracts' ? (
                            <div className="space-y-6">
                                {contractLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                                ) : contracts.length === 0 ? (
                                    <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                                        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No contracts found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Active */}
                                        {contracts.filter(c => c.status === 'active').length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    Active Contracts
                                                </h3>
                                                {contracts.filter(c => c.status === 'active').map(c => (
                                                    <Card
                                                        key={c.id}
                                                        onClick={() => handleViewContract(c)}
                                                        hoverEffect
                                                        className="p-5 flex justify-between items-center border-l-4 border-l-emerald-500"
                                                    >
                                                        <div>
                                                            <p className="font-black text-lg">{c.tenants?.name}</p>
                                                            <p className="text-sm text-muted-foreground font-medium">
                                                                {formatDate(c.start_date)} - {formatDate(c.end_date)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-xl text-emerald-600">₪{c.base_rent?.toLocaleString()}</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}

                                        {/* History */}
                                        {contracts.filter(c => c.status !== 'active').length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                                    Previous
                                                </h3>
                                                {contracts.filter(c => c.status !== 'active').map(c => (
                                                    <Card
                                                        key={c.id}
                                                        onClick={() => handleViewContract(c)}
                                                        hoverEffect
                                                        className="p-5 flex justify-between items-center opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all border-none bg-muted/30"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-base">{c.tenants?.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDate(c.start_date)} - {formatDate(c.end_date)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black">₪{c.base_rent?.toLocaleString()}</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full">
                                {propertyToEdit ? (
                                    <PropertyDocumentsHub property={propertyToEdit} readOnly={isReadOnly} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-muted/20 rounded-3xl border-2 border-dashed">
                                        <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                        <h3 className="text-lg font-black uppercase tracking-widest text-muted-foreground mb-1">
                                            Save Property First
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-xs">
                                            To upload documents, please save the property first to create a record in the system.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}
