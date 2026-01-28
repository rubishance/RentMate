import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/Button';
import { CheckIcon, ArrowRightIcon, MapPin, Building2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyTypeSelect } from '../common/PropertyTypeSelect';
import type { Property } from '../../types/database';
import { useStack } from '../../contexts/StackContext';

// Wizard Steps Configuration
const STEPS = [
    { id: 'type', title: 'Asset Type', question: 'What kind of property is this?', icon: <Building2 className="w-6 h-6" /> },
    { id: 'address', title: 'Location', question: 'Where is it located?', icon: <MapPin className="w-6 h-6" /> },
    { id: 'details', title: 'Details', question: 'Tell us about the property.', icon: <Info className="w-6 h-6" /> },
];

interface AddPropertyWizardProps {
    initialData?: Partial<Property>;
    mode?: 'add' | 'edit';
}

export function AddPropertyWizard({ initialData, mode = 'add' }: AddPropertyWizardProps) {
    const { t } = useTranslation();
    const { pop } = useStack();
    const [currentStep, setCurrentStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState<Partial<Property>>({
        property_type: initialData?.property_type || 'apartment',
        address: initialData?.address || '',
        city: initialData?.city || '',
        rooms: initialData?.rooms || 1,
        size_sqm: initialData?.size_sqm || 0,
        rent_price: 0, // Removed from UI, default to 0
        status: 'Vacant', // Removed from UI, default to Vacant
        title: '', // Removed from UI
        has_parking: initialData?.has_parking || false,
        has_storage: initialData?.has_storage || false
    });

    const next = () => {
        if (currentStep === STEPS.length - 1) {
            // In a real app, we would call a mutation to save the property here
            console.log('Saving property:', formData);
            pop();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const back = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const isStepValid = () => {
        if (currentStep === 0) return !!formData.property_type;
        if (currentStep === 1) return !!formData.address && !!formData.city;
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
                                    <div className="space-y-6 flex flex-col items-center py-4">
                                        <div className="w-full max-w-sm">
                                            <label className="text-sm font-bold text-foreground mb-4 block text-center uppercase tracking-wider">
                                                {t('selectCategory')}
                                            </label>
                                            <PropertyTypeSelect
                                                value={formData.property_type!}
                                                onChange={(val) => setFormData({ ...formData, property_type: val })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 1 && (
                                    <div className="space-y-6 py-4">
                                        <div className="space-y-4">
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700 focus-within:ring-2 ring-primary/20 transition-all">
                                                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">{t('address')}</label>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Herzl 123, Apt 4"
                                                    className="bg-transparent font-black text-2xl text-foreground w-full outline-none placeholder:opacity-30"
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                />
                                            </div>
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700 focus-within:ring-2 ring-primary/20 transition-all">
                                                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">{t('city')}</label>
                                                <input
                                                    type="text"
                                                    placeholder="Tel Aviv"
                                                    className="bg-transparent font-black text-2xl text-foreground w-full outline-none placeholder:opacity-30"
                                                    value={formData.city}
                                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700">
                                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">{t('rooms')}</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                className="bg-transparent font-black text-3xl text-foreground w-full outline-none"
                                                value={formData.rooms || ''}
                                                placeholder="0"
                                                onChange={e => setFormData({ ...formData, rooms: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-700">
                                            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">{t('sqm')}</label>
                                            <input
                                                type="number"
                                                className="bg-transparent font-black text-3xl text-foreground w-full outline-none"
                                                value={formData.size_sqm || ''}
                                                placeholder="0"
                                                onChange={e => setFormData({ ...formData, size_sqm: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>

                                        {/* Features: Parking & Storage */}
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
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
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-8 pb-12 bg-white dark:bg-neutral-900 border-t border-border flex justify-between items-center px-10 z-10">
                <Button variant="ghost" onClick={back} disabled={currentStep === 0} className="rounded-full h-14 px-8 text-lg">
                    Back
                </Button>
                <Button onClick={next} disabled={!isStepValid()} size="lg" className="rounded-full h-14 px-12 text-lg shadow-xl shadow-primary/20 transition-all active:scale-95">
                    {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Button>
            </div>
        </div>
    );
}
