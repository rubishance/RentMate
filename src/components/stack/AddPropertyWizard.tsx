import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/Button';
import { CheckIcon, ArrowRightIcon, MapPin, Building2, Info, Upload, Image as ImageIcon, Loader2, Trash2, Wind, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyTypeSelect } from '../common/PropertyTypeSelect';
import type { Property } from '../../types/database';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';
import { CompressionService } from '../../services/compression.service';
import { cn } from '../../lib/utils';
import { GoogleAutocomplete } from '../common/GoogleAutocomplete';
import { getPropertyPlaceholder } from '../../lib/property-placeholders';

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
    const { t } = useTranslation();
    const { pop } = useStack();
    const [currentStep, setCurrentStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState<Partial<Property>>({
        property_type: initialData?.property_type || 'apartment',
        address: initialData?.address || '',
        city: initialData?.city || '',
        rooms: initialData?.rooms, // Empty as default
        size_sqm: initialData?.size_sqm, // Also empty by default for consistency
        has_parking: initialData?.has_parking || false,
        has_storage: initialData?.has_storage || false,
        has_balcony: initialData?.has_balcony || false,
        has_safe_room: initialData?.has_safe_room || false,
        image_url: initialData?.image_url || ''
    });

    // Image Upload State
    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

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
        const filePath = `${fileName}`;

        try {
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
        if (currentStep === 0) return !!formData.address && !!formData.city && !!formData.property_type;
        return true;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black overflow-hidden relative">
            {/* DEBUG OVERLAY */}
            <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold py-1 px-4 z-[100] text-center uppercase tracking-widest">
                Wizard Active - Version 2.1 (Fields Injected)
            </div>

            {/* Progress Header */}
            <div className="h-20 flex items-center justify-between px-8 bg-white dark:bg-black border-b border-border z-10 pt-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        {STEPS[currentStep].icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">
                            Step {currentStep + 1} of {STEPS.length}
                        </span>
                        <span className="font-bold text-foreground leading-none">{STEPS[currentStep].title}</span>
                    </div>
                </div>

                {/* Progress Bar (Modern Dots) */}
                <div className="flex gap-2">
                    {STEPS.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-500 ease-out ${idx === currentStep ? 'w-10 bg-primary' : idx < currentStep ? 'w-2 bg-primary/40' : 'w-2 bg-slate-200 dark:bg-neutral-800'
                                }`}
                        />
                    ))}
                </div>
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
                            <div className="space-y-2 text-center mb-10">
                                <h2 className="text-4xl font-black tracking-tighter text-foreground sm:text-5xl">
                                    {STEPS[currentStep].question}
                                </h2>
                                <p className="text-muted-foreground text-lg">
                                    This helps us categorize and manage your assets effectively.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-neutral-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 shadow-minimal min-h-[400px]">
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
                                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, has_balcony: !p.has_balcony }))}
                                                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${formData.has_balcony
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-muted-foreground'
                                                        }`}
                                                >
                                                    <span className="font-bold">{t('balcony')}</span>
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${formData.has_balcony ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                        {formData.has_balcony && <CheckIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, has_safe_room: !p.has_safe_room }))}
                                                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${formData.has_safe_room
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-muted-foreground'
                                                        }`}
                                                >
                                                    <span className="font-bold">{t('safe_room')}</span>
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${formData.has_safe_room ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                        {formData.has_safe_room && <CheckIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, has_parking: !p.has_parking }))}
                                                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${formData.has_parking
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-muted-foreground'
                                                        }`}
                                                >
                                                    <span className="font-bold">{t('parking')}</span>
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${formData.has_parking ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                        {formData.has_parking && <CheckIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setFormData(p => ({ ...p, has_storage: !p.has_storage }))}
                                                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${formData.has_storage
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-muted-foreground'
                                                        }`}
                                                >
                                                    <span className="font-bold">{t('storage')}</span>
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${formData.has_storage ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                                        {formData.has_storage && <CheckIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                </button>
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
                                                            onClick={() => setUploadMode('url')}
                                                            className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", uploadMode === 'url' ? "bg-white dark:bg-neutral-700 text-primary shadow-sm" : "text-muted-foreground")}
                                                        >
                                                            Google Maps
                                                        </button>
                                                    </div>
                                                </div>

                                                {uploadMode === 'url' ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="url"
                                                            placeholder="Static Map URL"
                                                            className="flex-1 bg-slate-50 dark:bg-neutral-800/50 p-4 rounded-2xl text-sm outline-none border border-transparent focus:border-primary/30 transition-all"
                                                            value={formData.image_url}
                                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                if (!formData.address || !formData.city) {
                                                                    alert('Please enter city and address first');
                                                                    return;
                                                                }
                                                                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (process?.env?.VITE_GOOGLE_MAPS_API_KEY);
                                                                if (!apiKey) return;
                                                                const location = `${formData.address}, ${formData.city}`;
                                                                const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${apiKey}`;
                                                                setFormData(prev => ({ ...prev, image_url: imageUrl }));
                                                            }}
                                                            className="px-4 bg-primary/10 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                                                        >
                                                            Generate
                                                        </button>
                                                    </div>
                                                ) : (
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
                                                            <img
                                                                src={formData.image_url || getPropertyPlaceholder(formData.property_type)}
                                                                alt="Preview"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    const placeholder = getPropertyPlaceholder(formData.property_type);
                                                                    if (target.src !== placeholder) {
                                                                        target.src = placeholder;
                                                                    }
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                <button
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
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-8 pb-12 bg-white dark:bg-neutral-900 border-t border-border flex justify-between items-center px-10 z-10">
                <Button variant="ghost" onClick={back} className="rounded-full h-14 px-8 text-lg">
                    Back
                </Button>
                <Button onClick={next} disabled={!isStepValid() || isSaving} size="lg" className="rounded-full h-14 px-12 text-lg shadow-xl shadow-primary/20 transition-all active:scale-95">
                    {isSaving ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('saving') || 'Saving...'}
                        </span>
                    ) : (
                        currentStep === STEPS.length - 1 ? 'Finish' : 'Next'
                    )}
                    {!isSaving && <ArrowRightIcon className="w-5 h-5 ml-2" />}
                </Button>
            </div>
        </div>
    );
}
