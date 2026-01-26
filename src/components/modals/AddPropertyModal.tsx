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
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

// Extend Contract type to include joined tenants data
type ExtendedContract = Contract;

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
    initialData?: {
        title?: string;
        address?: string;
        city?: string;
    };
}

export function AddPropertyModal({ isOpen, onClose, onSuccess, propertyToEdit, readOnly, onDelete, initialData }: AddPropertyModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'contracts' | 'documents'>('details');
    const [contracts, setContracts] = useState<ExtendedContract[]>([]);
    const [contractLoading, setContractLoading] = useState(false);

    // Overlay Modal State
    const [selectedContract, setSelectedContract] = useState<any | null>(null); // any to match ContractWithDetails
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);

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
                address: initialData?.address || '',
                city: initialData?.city || '',
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
    }, [isOpen, propertyToEdit, readOnly, initialData]);

    async function fetchContracts(propertyId: string) {
        setContractLoading(true);
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFetchingGoogle, setIsFetchingGoogle] = useState(false);


    // Subscription Check
    const { canAddProperty, loading: subLoading, plan } = useSubscription();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        setError(null);
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
        const fileName = `prop_${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
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

    const handleGoogleFetch = async () => {
        if (!formData.address || !formData.city) {
            alert(lang === 'he' ? 'נא להזין כתובת ועיר קודם' : 'Please enter address and city first');
            return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            alert(lang === 'he' ? 'מפתח Google Maps חסר' : 'Google Maps API key missing');
            return;
        }

        setIsFetchingGoogle(true);
        try {
            const location = `${formData.address}, ${formData.city}`;
            const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${encodeURIComponent(location)}&key=${apiKey}`;
            setFormData(prev => ({ ...prev, image_url: imageUrl }));
        } catch (err) {
            console.error('Error fetching Google image:', err);
        } finally {
            setIsFetchingGoogle(false);
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
            tenants: Array.isArray(contract.tenants) ? contract.tenants : [{ name: 'Unknown' }]
        };
        setSelectedContract(contractWithDetails);
        setIsContractModalOpen(true);
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

            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={title}
                description={subtitle}
                footer={modalFooter}
                size="lg"
            >
                <div className="flex flex-col h-full">
                    {/* Simplified Tab Navigation */}
                    <div className="flex border-b border-border mb-8 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'details', label: lang === 'he' ? 'פרטי נכס' : 'Details' },
                            { id: 'contracts', label: lang === 'he' ? 'חוזים' : 'Contracts' },
                            { id: 'documents', label: lang === 'he' ? 'מסמכים' : 'Documents' }
                        ].map((tab) => {
                            if (tab.id !== 'details' && !isEditMode && !isReadOnly) return null;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "pb-4 px-6 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
                                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-[500px] h-[60vh]">
                        {activeTab === 'details' ? (
                            <form id="add-property-form" onSubmit={handleSubmit} className="space-y-10">
                                {error && (
                                    <div className="p-4 text-xs font-bold bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-2">
                                        <X className="w-4 h-4" /> {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Primary Info */}
                                    <div className="md:col-span-2 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t('location')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-1">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder={t('city')}
                                                    disabled={isReadOnly}
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                    className="w-full h-14 px-5 rounded-[1.25rem] bg-slate-50 border-transparent focus:bg-white border-2 focus:border-primary transition-all outline-none font-bold"
                                                />
                                            </div>
                                            <div className="md:col-span-2 relative">
                                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder={t('address')}
                                                    disabled={isReadOnly}
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                    className="w-full h-14 pl-12 pr-5 rounded-[1.25rem] bg-slate-50 border-transparent focus:bg-white border-2 focus:border-primary transition-all outline-none font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Property Type & Specs */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t('specifications')}</h4>
                                        <PropertyTypeSelect
                                            value={formData.property_type as any}
                                            onChange={(value) => setFormData(prev => ({ ...prev, property_type: value }))}
                                            disabled={isReadOnly}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    placeholder={t('rooms')}
                                                    disabled={isReadOnly}
                                                    value={formData.rooms}
                                                    onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                                                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white border-2 focus:border-primary transition-all outline-none font-bold text-sm"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                                <input
                                                    type="number"
                                                    placeholder={t('size')}
                                                    disabled={isReadOnly}
                                                    value={formData.size_sqm}
                                                    onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                                                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white border-2 focus:border-primary transition-all outline-none font-bold text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amenities & Image */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t('visuals')}</h4>
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant={formData.has_parking ? 'primary' : 'outline'}
                                                onClick={() => !isReadOnly && setFormData({ ...formData, has_parking: !formData.has_parking })}
                                                className="flex-1 h-12 rounded-2xl"
                                                disabled={isReadOnly}
                                            >
                                                <Car className="w-4 h-4 mr-2" /> <span className="text-[10px] font-black uppercase tracking-widest">Parking</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={formData.has_storage ? 'primary' : 'outline'}
                                                onClick={() => !isReadOnly && setFormData({ ...formData, has_storage: !formData.has_storage })}
                                                className="flex-1 h-12 rounded-2xl"
                                                disabled={isReadOnly}
                                            >
                                                <Box className="w-4 h-4 mr-2" /> <span className="text-[10px] font-black uppercase tracking-widest">Storage</span>
                                            </Button>
                                        </div>

                                        {!formData.image_url && !isReadOnly && (
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setUploadMode('upload')}
                                                        className={cn(
                                                            "flex-1 h-12 rounded-2xl border-2 transition-all flex items-center justify-center gap-2",
                                                            uploadMode === 'upload' ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-dashed border-slate-200 text-muted-foreground hover:border-primary hover:text-primary"
                                                        )}
                                                    >
                                                        <Upload className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">{t('uploadFile')}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUploadMode('url')}
                                                        className={cn(
                                                            "flex-1 h-12 rounded-2xl border-2 transition-all flex items-center justify-center gap-2",
                                                            uploadMode === 'url' ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-dashed border-slate-200 text-muted-foreground hover:border-primary hover:text-primary"
                                                        )}
                                                    >
                                                        <ImageIcon className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">Maps</span>
                                                    </button>
                                                </div>

                                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {uploadMode === 'upload' ? (
                                                        <div
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="w-full py-10 border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 rounded-[1.5rem] transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group"
                                                        >
                                                            <input
                                                                type="file"
                                                                ref={fileInputRef}
                                                                onChange={handleFileUpload}
                                                                accept="image/*"
                                                                className="hidden"
                                                            />
                                                            {isUploading ? (
                                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                                    <Upload className="w-6 h-6" />
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                                                {isUploading ? t('uploading') : t('clickToUpload')}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <input
                                                                    type="url"
                                                                    placeholder={t('image_url_placeholder', { defaultValue: 'Enter image URL or use Maps' })}
                                                                    value={formData.image_url}
                                                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white border-2 focus:border-primary transition-all outline-none text-sm font-bold"
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                onClick={handleGoogleFetch}
                                                                isLoading={isFetchingGoogle}
                                                                className="px-6 h-12 rounded-2xl"
                                                            >
                                                                {t('importFromGoogle')}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {formData.image_url && (
                                            <div className="relative aspect-video rounded-[1.5rem] overflow-hidden group">
                                                <img src={formData.image_url} alt="Property" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        ) : activeTab === 'contracts' ? (
                            <div className="space-y-8 py-4">
                                {contractLoading ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary/30" /></div>
                                ) : contracts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                                        <FileText className="w-12 h-12" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">{t('noContracts')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {contracts.map(c => (
                                            <Card
                                                key={c.id}
                                                className={cn(
                                                    "p-6 cursor-pointer border-none shadow-minimal transition-all hover:shadow-premium group",
                                                    c.status === 'active' ? "bg-emerald-50/30 dark:bg-emerald-950/20" : "bg-white dark:bg-neutral-900"
                                                )}
                                                onClick={() => handleViewContract(c)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="space-y-1">
                                                        <p className="font-black text-lg">{Array.isArray(c.tenants) ? c.tenants.map(t => t.name).join(', ') : t('unknownTenant')}</p>
                                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                            {formatDate(c.start_date)} - {formatDate(c.end_date)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-xl">₪{c.base_rent?.toLocaleString()}</p>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                                            c.status === 'active' ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {c.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-4 h-full">
                                {propertyToEdit ? (
                                    <div className="h-full overflow-hidden">
                                        <PropertyDocumentsHub property={propertyToEdit} readOnly={isReadOnly} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-muted-foreground">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-xs uppercase tracking-widest">{t('saveRequired')}</h3>
                                            <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">{t('savePropertyToAttachDocs')}</p>
                                        </div>
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
