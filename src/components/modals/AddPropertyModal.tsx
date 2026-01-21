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
import { supabase } from '../../lib/supabase';
import { AddTenantModal } from './AddTenantModal';
import { ContractDetailsModal } from './ContractDetailsModal';
import { useSubscription } from '../../hooks/useSubscription';
import { CompressionService } from '../../services/compression.service';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property, Contract, Tenant } from '../../types/database';
import { PropertyDocumentsHub } from '../properties/PropertyDocumentsHub';

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

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            {/* Overlay Modals */}
            {isContractModalOpen && (
                <ContractDetailsModal
                    isOpen={isContractModalOpen}
                    onClose={() => setIsContractModalOpen(false)}
                    onSuccess={() => { }} // No refresh needed for viewing
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

            <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col ${activeTab === 'contracts' ? 'h-[80vh]' : 'max-h-[calc(100vh-2rem)]'}`}>
                {/* Header */}
                <div className="p-6 border-b border-border dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
                            {propertyToEdit?.property_type || formData.property_type ? (
                                <PropertyIcon type={propertyToEdit?.property_type || formData.property_type as any} className="w-6 h-6" />
                            ) : (
                                <Building2 className="w-5 h-5 text-primary" />
                            )}
                            {title}
                        </h2>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isReadOnly && (
                            <button
                                onClick={() => setIsReadOnly(false)}
                                className="p-2 text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-blue-900/20 rounded-full transition-colors flex items-center gap-2 px-3 bg-primary/10/50"
                            >
                                <Pen className="w-4 h-4" />
                                <span className="text-sm font-medium">{lang === 'he' ? 'ערוך' : 'Edit'}</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-full transition-colors"
                            aria-label={lang === 'he' ? 'סגור' : 'Close'}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                {/* Tabs Navigation */}
                <div className="flex border-b border-border dark:border-gray-700 px-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('details')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'details'
                            ? 'text-primary dark:text-blue-400'
                            : 'text-muted-foreground hover:text-gray-700 dark:text-muted-foreground'
                            }`}
                    >
                        {lang === 'he' ? 'פרטי נכס' : 'Details'}
                        {activeTab === 'details' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary dark:bg-blue-400 rounded-t-full" />
                        )}
                    </button>
                    {(isEditMode || isReadOnly) && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('contracts')}
                            className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'contracts'
                                ? 'text-primary dark:text-blue-400'
                                : 'text-muted-foreground hover:text-gray-700 dark:text-muted-foreground'
                                }`}
                        >
                            {lang === 'he' ? 'היסטוריית חוזים' : 'Contracts History'}
                            {activeTab === 'contracts' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary dark:bg-blue-400 rounded-t-full" />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveTab('documents')}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'documents'
                            ? 'text-primary dark:text-blue-400'
                            : 'text-muted-foreground hover:text-gray-700 dark:text-muted-foreground'
                            }`}
                    >
                        {lang === 'he' ? 'מרכז מסמכים' : 'Documents Center'}
                        {activeTab === 'documents' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary dark:bg-blue-400 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'details' ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                        {!isReadOnly && !propertyToEdit && !canAddProperty && !subLoading && (
                            <div className="p-4 mb-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-start gap-3">
                                <div className="p-1 bg-orange-100 rounded-full shrink-0">
                                    <Building2 className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">Plan Limit Reached</h4>
                                    <p className="text-xs mt-1">
                                        You have reached the maximum number of properties for your <b>{plan?.name}</b> plan.
                                        Please upgrade your subscription to add more assets.
                                    </p>
                                </div>
                            </div>
                        )}


                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                                <X className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Asset Type */}
                            <div className="space-y-2 md:col-span-1">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {lang === 'he' ? 'סוג הנכס' : 'Asset Type'}
                                </label>
                                <PropertyTypeSelect
                                    value={formData.property_type as any}
                                    onChange={(value) => {
                                        // Auto-update image if it's currently empty OR looks like a default image
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

                            {/* City */}
                            <div className="space-y-2 md:col-span-1">
                                <FormLabel label={lang === 'he' ? 'עיר' : 'City'} required readOnly={isReadOnly} />
                                <input
                                    type="text"
                                    required
                                    disabled={isReadOnly}
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                                    aria-label={lang === 'he' ? 'עיר' : 'City'}
                                />
                            </div>

                            {/* Address */}
                            <div className="space-y-2 md:col-span-2">
                                <FormLabel label={lang === 'he' ? 'כתובת' : 'Address'} required readOnly={isReadOnly} />
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        disabled={isReadOnly}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                                        aria-label={lang === 'he' ? 'כתובת' : 'Address'}
                                    />
                                </div>
                            </div>

                            {/* Rooms & Size Compact Row */}
                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {lang === 'he' ? 'חדרים' : 'Rooms'}
                                    </label>
                                    <div className="relative">
                                        <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            type="number"
                                            step="0.5"
                                            disabled={isReadOnly}
                                            value={formData.rooms}
                                            onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                                            aria-label={lang === 'he' ? 'חדרים' : 'Rooms'}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {lang === 'he' ? 'גודל (מ״ר)' : 'Size (m²)'}
                                    </label>
                                    <div className="relative">
                                        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            type="number"
                                            disabled={isReadOnly}
                                            value={formData.size_sqm}
                                            onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                                            aria-label={lang === 'he' ? 'גודל במטר רבוע' : 'Size in square meters'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Amenities - Visual Toggles */}
                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${formData.has_parking ? 'border-indigo-600 bg-indigo-50' : 'border-border bg-white hover:border-slate-300'}`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={formData.has_parking}
                                        onChange={e => setFormData({ ...formData, has_parking: e.target.checked })}
                                        disabled={isReadOnly}
                                    />
                                    <div className={`p-2 rounded-full mb-2 ${formData.has_parking ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <Car className="w-6 h-6" />
                                    </div>
                                    <span className={`font-medium text-sm ${formData.has_parking ? 'text-indigo-900' : 'text-muted-foreground'}`}>
                                        {lang === 'he' ? 'חניה פרטית' : 'Private Parking'}
                                    </span>
                                </label>

                                <label className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${formData.has_storage ? 'border-indigo-600 bg-indigo-50' : 'border-border bg-white hover:border-slate-300'}`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={formData.has_storage}
                                        onChange={e => setFormData({ ...formData, has_storage: e.target.checked })}
                                        disabled={isReadOnly}
                                    />
                                    <div className={`p-2 rounded-full mb-2 ${formData.has_storage ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <Box className="w-6 h-6" />
                                    </div>
                                    <span className={`font-medium text-sm ${formData.has_storage ? 'text-indigo-900' : 'text-muted-foreground'}`}>
                                        {lang === 'he' ? 'מחסן' : 'Storage Room'}
                                    </span>
                                </label>
                            </div>

                            {/* Image Section */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {lang === 'he' ? 'תמונת הנכס' : 'Property Image'}
                                </label>

                                {/* Toggle Tabs - Show in Edit Mode too */}
                                {!isReadOnly && (
                                    <>
                                        <div className="flex p-1 bg-muted dark:bg-gray-700/50 rounded-lg w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setUploadMode('upload')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === 'upload'
                                                    ? 'bg-white dark:bg-gray-600 text-primary dark:text-blue-400 shadow-sm'
                                                    : 'text-muted-foreground hover:text-gray-700 dark:text-muted-foreground'
                                                    }`}
                                            >
                                                {lang === 'he' ? 'העלאת קובץ' : 'Upload File'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUploadMode('url')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === 'url'
                                                    ? 'bg-white dark:bg-gray-600 text-primary dark:text-blue-400 shadow-sm'
                                                    : 'text-muted-foreground hover:text-gray-700 dark:text-muted-foreground'
                                                    }`}
                                            >
                                                Google Maps / URL
                                            </button>
                                        </div>


                                        {uploadMode === 'url' ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <input
                                                            type="url"
                                                            disabled={isReadOnly}
                                                            value={formData.image_url}
                                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                            className="w-full pl-9 pr-4 py-2 border border-border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-foreground dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                                            placeholder="https://..."
                                                            aria-label={lang === 'he' ? 'כתובת תמונה' : 'Image URL'}
                                                        />
                                                    </div>
                                                    {!isReadOnly && (
                                                        <button
                                                            type="button"
                                                            disabled={isFetchingGoogle}
                                                            onClick={async () => {
                                                                if (!formData.address || !formData.city) {
                                                                    setError('Please enter address and city first');
                                                                    return;
                                                                }

                                                                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

                                                                if (!apiKey) {
                                                                    setError('Google Maps API configuration missing');
                                                                    console.error('Missing VITE_GOOGLE_MAPS_API_KEY');
                                                                    return;
                                                                }

                                                                setIsFetchingGoogle(true);
                                                                setError(null);

                                                                try {
                                                                    const location = `${formData.address}, ${formData.city}`;
                                                                    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(location)}&key=${apiKey}`;

                                                                    // Fetch metadata to verify image exists
                                                                    const response = await fetch(metadataUrl);
                                                                    const data = await response.json();

                                                                    if (data.status === 'OK') {
                                                                        const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${apiKey}`;
                                                                        setFormData(prev => ({ ...prev, image_url: imageUrl }));
                                                                    } else if (data.status === 'ZERO_RESULTS') {
                                                                        setError(lang === 'he' ? 'לא נמצאה תמונת רחוב לכתובת זו' : 'No Street View image found for this location');
                                                                    } else if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
                                                                        console.error('Google Maps API Error:', data);
                                                                        setError(lang === 'he' ? 'שגיאת מפתח API - נא לבדוק הגדרות' : 'Google Maps API Error - Check configuration');
                                                                    } else {
                                                                        console.error('Google Maps API Error:', data);
                                                                        setError(lang === 'he' ? 'שגיאה בטעינת התמונה' : 'Error loading Street View image');
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Error fetching Street View metadata:', err);
                                                                    setError(lang === 'he' ? 'שגיאת תקשורת' : 'Network error while fetching image');
                                                                } finally {
                                                                    setIsFetchingGoogle(false);
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/10 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isFetchingGoogle && <Loader2 className="w-4 h-4 animate-spin" />}
                                                            {lang === 'he' ? 'קבל מגוגל' : 'Fetch from Google'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 hover:bg-secondary dark:hover:bg-gray-800/50 transition-colors text-center cursor-pointer group">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        disabled={isReadOnly || isUploading}
                                                        onChange={handleFileUpload}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                    />
                                                    <div className="flex flex-col items-center gap-1">
                                                        {isUploading ? (
                                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                                        ) : (
                                                            <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        )}
                                                        <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                                                            {isUploading ? (lang === 'he' ? 'מעלה...' : 'Uploading...') : (lang === 'he' ? 'לחץ להעלאה' : 'Click to upload')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Preview */}
                                {formData.image_url && (
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border dark:border-gray-700 bg-secondary mt-2">
                                        <img
                                            src={formData.image_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error('Failed to load property image:', formData.image_url);
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop';
                                            }}
                                        />
                                        {!isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full shadow-sm hover:bg-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Current Tenancy Section - Only in Read Only Mode */}
                            {isReadOnly && contracts.some(c => c.status === 'active' && new Date(c.end_date) >= new Date(new Date().setHours(0, 0, 0, 0))) && (
                                <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-border dark:border-gray-700">
                                    <h3 className="text-sm font-medium text-foreground dark:text-white mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Current Tenancy
                                    </h3>
                                    {contracts.filter(c => c.status === 'active' && new Date(c.end_date) >= new Date(new Date().setHours(0, 0, 0, 0))).map(contract => (
                                        <div key={contract.id} className="bg-primary/10 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl space-y-4">
                                            {/* Contract Header */}
                                            <div
                                                className="flex items-center justify-between border-b border-blue-200 dark:border-blue-700/50 pb-3 cursor-pointer hover:bg-primary/10/50 dark:hover:bg-blue-800/30 transition-colors rounded-t-lg -mx-4 -mt-4 px-4 pt-4"
                                                onClick={() => handleViewContract(contract)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-primary/10 dark:bg-blue-800 rounded-lg text-primary dark:text-blue-300">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground dark:text-white">Active Contract</p>
                                                        {contract.contract_file_url ? (
                                                            <a
                                                                href={contract.contract_file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-xs text-primary hover:text-primary hover:underline flex items-center gap-1"
                                                            >
                                                                View PDF
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">No PDF attached</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">Signed: {new Date(contract.signing_date || contract.start_date || '').toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            {/* Tenant & Rent */}
                                            <div
                                                className="flex items-center justify-between cursor-pointer hover:bg-primary/10/50 dark:hover:bg-blue-800/30 transition-colors -mx-4 -mb-4 px-4 pb-4 rounded-b-lg pt-2"
                                                onClick={() => {
                                                    if (contract.tenant_id) {
                                                        handleViewTenant(contract.tenant_id);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-blue-800 flex items-center justify-center text-primary dark:text-blue-200 font-bold shrink-0">
                                                        {contract.tenants?.name.charAt(0).toUpperCase() || 'T'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground dark:text-white">{contract.tenants?.name || 'Unknown Tenant'}</p>
                                                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                                            {new Date(contract.start_date || '').toLocaleDateString()} - {new Date(contract.end_date || '').toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-bold text-lg text-blue-700 dark:text-blue-300">₪{contract.base_rent?.toLocaleString()}</p>
                                                    <span className="text-xs text-primary/70 dark:text-blue-400/70">per month</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 z-10 pt-4 flex gap-3 border-t border-border dark:border-gray-700 -mx-6 px-6 -mb-6 pb-6 mt-6">
                            {isReadOnly ? (
                                <>
                                    {onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onDelete();
                                            }}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    )}
                                    <div className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={() => setIsReadOnly(false)}
                                        className="px-6 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                    >
                                        <Pen className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 bg-muted hover:bg-gray-200 rounded-xl font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 text-gray-700 bg-muted hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                                    >
                                        {lang === 'he' ? 'ביטול' : 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || (!propertyToEdit && !canAddProperty)}
                                        className="flex-1 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {loading ? (isEditMode ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'מוסיף...' : 'Adding...')) : (isEditMode ? (lang === 'he' ? 'שמור שינויים' : 'Save Changes') : (lang === 'he' ? 'הוסף נכס' : 'Add Asset'))}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                ) : activeTab === 'contracts' ? (
                    <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50">
                        {contractLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : contracts.length === 0 ? (
                            <div className="text-center py-10">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-muted-foreground">No contracts found for this property.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Active Contracts */}
                                {contracts.filter(c => c.status === 'active' && new Date(c.end_date) >= new Date(new Date().setHours(0, 0, 0, 0))).length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-green-700 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            Active Contracts
                                        </h3>
                                        {contracts.filter(c => c.status === 'active' && new Date(c.end_date) >= new Date(new Date().setHours(0, 0, 0, 0))).map(c => (
                                            <div key={c.id} className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-foreground">{c.tenants?.name || 'Unknown Tenant'}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(c.start_date || '').toLocaleDateString()} - {new Date(c.end_date || '').toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-medium">₪{c.base_rent?.toLocaleString()}</p>
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* History / Other */}
                                {contracts.filter(c => c.status !== 'active' || new Date(c.end_date) < new Date(new Date().setHours(0, 0, 0, 0))).length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                                            History
                                        </h3>
                                        {contracts.filter(c => c.status !== 'active' || new Date(c.end_date) < new Date(new Date().setHours(0, 0, 0, 0))).map(c => (
                                            <div key={c.id} className="bg-white p-4 rounded-xl border border-border flex justify-between items-center opacity-75 grayscale hover:grayscale-0 transition-all">
                                                <div>
                                                    <p className="font-bold text-foreground">{c.tenants?.name || 'Unknown Tenant'}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(c.start_date || '').toLocaleDateString()} - {new Date(c.end_date || '').toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-medium">₪{c.base_rent?.toLocaleString()}</p>
                                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">{c.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 z-10 pt-4 flex gap-3 border-t border-border dark:border-gray-700 -mx-6 px-6 -mb-6 pb-6 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'documents' ? (
                    <div className="overflow-y-auto flex-1 h-full">
                        {propertyToEdit ? (
                            <PropertyDocumentsHub property={propertyToEdit} readOnly={isReadOnly} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                                <FileText className="w-12 h-12 text-gray-300 mb-3" />
                                <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
                                    {lang === 'he' ? 'שמור את הנכס תחילה' : 'Save Property First'}
                                </h3>
                                <p className="text-muted-foreground dark:text-muted-foreground max-w-xs">
                                    {lang === 'he'
                                        ? 'כדי להעלות מסמכים, יש לשמור את הנכס תחילה במערכת.'
                                        : 'To upload documents, please save the property first.'}
                                </p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
        , document.body);
}
