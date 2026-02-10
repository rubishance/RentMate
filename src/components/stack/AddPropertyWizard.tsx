import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Checkbox } from '../ui/Checkbox';
import { CheckIcon, ArrowRightIcon, MapPin, Building2, Info, Upload, Image as ImageIcon, Loader2, Trash2, Wind, ShieldCheck, Car, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyTypeSelect } from '../common/PropertyTypeSelect';
import type { Property } from '../../types/database';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';
import { CompressionService } from '../../services/compression.service';
import { cn } from '../../lib/utils';
import { GoogleAutocomplete } from '../common/GoogleAutocomplete';
import { getPropertyPlaceholder } from '../../lib/property-placeholders';
import { SecureImage } from '../common/SecureImage';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { useAuth } from '../../contexts/AuthContext';
import { useUsageTracking } from '../../hooks/useUsageTracking';

// Wizard Steps Configuration
const STEPS = [
    { id: 'address', title: 'Location', question: 'Where is it located?', icon: <MapPin className="w-6 h-6" /> },
    { id: 'details', title: 'Details', question: 'Tell us about the property.', icon: <Info className="w-6 h-6" /> },
];

interface AddPropertyWizardProps {
    initialData?: Partial<Property>;
    mode?: 'add' | 'edit';
    onSuccess?: () => void;
}

export function AddPropertyWizard({ initialData, mode = 'add', onSuccess }: AddPropertyWizardProps) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { pop } = useStack();
    const { trackEvent } = useUsageTracking();
    const [currentStep, setCurrentStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState<Partial<Property>>({
        property_type: initialData?.property_type || 'apartment',
        address: initialData?.address || '',
        city: initialData?.city || '',
        rooms: initialData?.rooms,
        size_sqm: initialData?.size_sqm,
        has_parking: !!initialData?.has_parking,
        has_storage: !!initialData?.has_storage,
        has_balcony: !!initialData?.has_balcony,
        has_safe_room: !!initialData?.has_safe_room,
        image_url: initialData?.image_url || ''
    });

    // Auto-advance if primary details are prefilled (AI Support)
    useEffect(() => {
        if (currentStep === 0 && initialData?.address && initialData?.city) {
            // Briefly wait to ensure UI renders then jump
            const timer = setTimeout(() => {
                next();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []); // Only on mount if initialData exists

    // Image Upload State
    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [isFetchingMap, setIsFetchingMap] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    const handleGoogleMapsFetch = async () => {
        if (!formData.address || !formData.city) {
            alert('Please enter city and address first');
            setUploadMode('upload');
            return;
        }

        setIsFetchingMap(true);
        setImageError(null);

        try {
            const location = `${formData.address}, ${formData.city}`;
            const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
                body: {
                    action: 'streetview',
                    location
                }
            });

            if (error) throw error;
            if (data?.publicUrl) {
                setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
            }
        } catch (err: any) {
            console.error('Street View Error:', err);
            let detailedError = err?.context?.message || err?.message || 'Unknown error';
            setImageError(detailedError);
            alert(`Failed to fetch Street View: ${detailedError}`);
        } finally {
            setIsFetchingMap(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
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
        const filePath = user ? `${user.id}/${fileName}` : fileName;

        try {
            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            setFormData(prev => ({ ...prev, image_url: filePath }));
        } catch (err: any) {
            console.error('Error uploading image:', err);
            setImageError('Failed to upload image: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const next = async () => {
        if (currentStep === STEPS.length - 1) {
            setIsSaving(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');

                const startData: any = {
                    address: (formData.address || '').trim(),
                    city: (formData.city || '').trim(),
                    property_type: formData.property_type,
                    rooms: Number(formData.rooms) || 0,
                    size_sqm: Number(formData.size_sqm) || 0,
                    has_parking: !!formData.has_parking,
                    has_storage: !!formData.has_storage,
                    has_balcony: !!formData.has_balcony,
                    has_safe_room: !!formData.has_safe_room,
                    image_url: formData.image_url || null,
                    user_id: user.id
                };

                let { error } = await supabase
                    .from('properties')
                    .insert(startData);

                // Resilience for schema cache mismatches
                if (error && (error.message?.includes('schema cache') || error.message?.includes('column'))) {
                    console.warn('[AddPropertyWizard] Modern schema columns missing. Retrying with legacy fields...');
                    const legacyData = { ...startData };
                    delete legacyData.has_balcony;
                    delete legacyData.has_safe_room;

                    const { error: retryError } = await supabase
                        .from('properties')
                        .insert(legacyData);
                    error = retryError;
                }


                if (error) throw error;

                // Track analytics event
                trackEvent('property_created', {
                    property_type: startData.property_type,
                    city: startData.city
                });

                // Success - close and refresh via parent/cache clearing
                if (onSuccess) onSuccess();
                pop();
            } catch (error) {
                console.error('Error saving property:', error);
                alert('Failed to save property. Please try again.');
            } finally {
                setIsSaving(false);
            }
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const back = () => {
        if (currentStep === 0) {
            pop();
        } else {
            setCurrentStep(prev => Math.max(prev - 1, 0));
        }
    };

    const isStepValid = () => {
        const valid = currentStep === 0 ? (!!formData.address && !!formData.city && !!formData.property_type) : true;
        console.log('Wizard Validation:', { currentStep, valid, address: !!formData.address, city: !!formData.city, type: !!formData.property_type }); // DEBUG
        return valid;
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-black overflow-hidden relative">
            {/* PROGRESS TRACKER (High Blur) */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-black/5 dark:bg-white/5 z-[100]">
                <motion.div
                    className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>

            {/* Progress Header */}
            <div className="h-24 flex items-center justify-between px-8 md:px-12 glass-premium dark:bg-neutral-900/60 border-b border-white/5 z-10 pt-4 backdrop-blur-2xl">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 glass-premium dark:bg-neutral-800/40 rounded-2xl flex items-center justify-center text-indigo-500 shadow-minimal border border-white/5">
                        {STEPS[currentStep].icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 leading-none mb-1">
                            {t('step')} {currentStep + 1} / {STEPS.length}
                        </span>
                        <span className="font-black text-xl tracking-tighter text-foreground leading-none lowercase">{STEPS[currentStep].title}</span>
                    </div>
                </div>

                <button
                    onClick={() => pop()}
                    className="p-3 glass-premium dark:bg-neutral-800/40 rounded-full border-white/5 text-muted-foreground hover:text-foreground transition-all"
                >
                    <Trash2 className="w-5 h-5 opacity-30" />
                </button>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto px-6 py-12">
                <div className="max-w-xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="space-y-8"
                        >
                            <div className="space-y-4 text-center mb-16">
                                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-tight lowercase">
                                    {STEPS[currentStep].question}
                                </h2>
                                <p className="text-muted-foreground text-lg font-medium opacity-40 max-w-md mx-auto">
                                    {t('wizard_desc') || 'We help you categorize and manage your assets effectively.'}
                                </p>
                            </div>

                            <div className="p-1 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[4rem] shadow-minimal overflow-hidden">
                                <div className="p-10 space-y-10">
                                    {currentStep === 0 && (
                                        <div className="space-y-6 py-4">
                                            <div className="space-y-4">
                                                {/* Asset Type moved to page 1 as requested */}
                                                <div className="p-6 rounded-[2rem] bg-white dark:bg-neutral-800/30 border border-slate-100 dark:border-neutral-700 mb-4">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-4 text-center">
                                                        {t('selectCategory')}
                                                    </label>
                                                    <PropertyTypeSelect
                                                        value={formData.property_type!}
                                                        onChange={(val) => setFormData({ ...formData, property_type: val })}
                                                    />
                                                </div>

                                                {/* City above Address */}
                                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700 focus-within:ring-2 ring-primary/20 transition-all">
                                                    <GoogleAutocomplete
                                                        label={t('city')}
                                                        value={formData.city || ''}
                                                        onChange={(val: string) => setFormData({ ...formData, city: val })}
                                                        type="cities"
                                                    />
                                                </div>
                                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700 focus-within:ring-2 ring-primary/20 transition-all">
                                                    <GoogleAutocomplete
                                                        label={t('address')}
                                                        value={formData.address || ''}
                                                        onChange={(val: string) => setFormData({ ...formData, address: val })}
                                                        type="address"
                                                        biasCity={formData.city}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 1 && (
                                        <div className="space-y-8 py-4">

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700">
                                                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">{t('rooms')}</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        className="bg-transparent font-black text-3xl text-foreground w-full outline-none"
                                                        value={formData.rooms ?? ''}
                                                        placeholder="0"
                                                        onChange={e => setFormData({ ...formData, rooms: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700">
                                                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">{t('sqm')}</label>
                                                    <input
                                                        type="number"
                                                        className="bg-transparent font-black text-3xl text-foreground w-full outline-none"
                                                        value={formData.size_sqm ?? ''}
                                                        placeholder="0"
                                                        onChange={e => setFormData({ ...formData, size_sqm: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                                    />
                                                </div>

                                                {/* Features: Balcony, Safe Room, Parking & Storage */}
                                                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Checkbox
                                                        label={t('balcony')}
                                                        checked={formData.has_balcony || false}
                                                        onChange={(val) => setFormData(p => ({ ...p, has_balcony: val }))}
                                                        icon={<Wind className="w-5 h-5" />}
                                                    />

                                                    <Checkbox
                                                        label={t('safe_room')}
                                                        checked={formData.has_safe_room || false}
                                                        onChange={(val) => setFormData(p => ({ ...p, has_safe_room: val }))}
                                                        icon={<ShieldCheck className="w-5 h-5" />}
                                                    />

                                                    <Checkbox
                                                        label={t('parking')}
                                                        checked={formData.has_parking || false}
                                                        onChange={(val) => setFormData(p => ({ ...p, has_parking: val }))}
                                                        icon={<Car className="w-5 h-5" />}
                                                    />

                                                    <Checkbox
                                                        label={t('storage')}
                                                        checked={formData.has_storage || false}
                                                        onChange={(val) => setFormData(p => ({ ...p, has_storage: val }))}
                                                        icon={<Package className="w-5 h-5" />}
                                                    />
                                                </div>

                                                {/* Image Upload & Google Maps Restoration */}
                                                <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-neutral-800">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('propertyImage') || 'Property Image'}</label>
                                                        <div className="flex p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl">
                                                            <button
                                                                onClick={() => setUploadMode('upload')}
                                                                className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", uploadMode === 'upload' ? "bg-white dark:bg-neutral-700 text-primary shadow-sm" : "text-muted-foreground")}
                                                            >
                                                                {t('upload') || 'Upload'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setUploadMode('url');
                                                                    handleGoogleMapsFetch();
                                                                }}
                                                                className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", uploadMode === 'url' ? "bg-white dark:bg-neutral-700 text-primary shadow-sm" : "text-muted-foreground")}
                                                            >
                                                                Google Maps
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {uploadMode === 'url' && isFetchingMap && (
                                                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-[2rem] bg-slate-50/50 dark:bg-neutral-800/20">
                                                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                                                                Fetching Street View...
                                                            </span>
                                                        </div>
                                                    )}

                                                    {uploadMode === 'upload' && (
                                                        <div className="relative border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-[2rem] p-8 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-all text-center group cursor-pointer">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                disabled={isUploading}
                                                                onChange={handleFileUpload}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                            <div className="flex flex-col items-center gap-2">
                                                                {isUploading ? (
                                                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                                ) : (
                                                                    <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary transition-all" />
                                                                )}
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                    {isUploading ? 'Uploading...' : 'Click to upload picture'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Image Preview */}
                                                    <AnimatePresence>
                                                        {formData.image_url && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.9 }}
                                                                className="relative w-full h-48 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-neutral-800 shadow-lg group"
                                                            >
                                                                <SecureImage
                                                                    bucket="property-images"
                                                                    path={formData.image_url}
                                                                    placeholder={getPropertyPlaceholder(formData.property_type)}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setFormData(p => ({ ...p, image_url: '' }))}
                                                                        className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-xl"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-8 pb-12 glass-premium dark:bg-neutral-900/60 border-t border-white/5 flex justify-between items-center px-12 z-20 backdrop-blur-2xl">
                <button
                    onClick={back}
                    className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all hover:bg-white/5"
                >
                    {t('back')}
                </button>
                <button
                    onClick={next}
                    disabled={!isStepValid() || isSaving}
                    className="h-14 px-12 button-jewel font-black text-[11px] uppercase tracking-[0.2em] text-white rounded-[1.5rem] shadow-jewel hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                >
                    {isSaving ? (
                        <span className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('saving') || 'Saving...'}
                        </span>
                    ) : (
                        <>
                            {currentStep === STEPS.length - 1 ? t('finish') || 'Finish' : t('next') || 'Next'}
                            <ArrowRightIcon className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
