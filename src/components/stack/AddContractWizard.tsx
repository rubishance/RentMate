import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, ArrowRight, Building, Check, User, Calendar,
    Settings as SettingsIcon, Shield, FileText, ChevronDown,
    Cloud, HardDrive, Download, Car, Box, Plus, Trash2,
    MapPin, Image as ImageIcon, Loader2, Upload, AlertTriangle,
    Clock, Wind, ShieldCheck, CheckCircle, Lock
} from 'lucide-react';
import { ContractScanner } from '../ContractScanner';
import { ValidatedField } from '../common/ValidatedField';
import { WizardFooter } from '../common/WizardFooter';
import { ImageCropper } from '../common/ImageCropper';
import { PropertyIcon } from '../common/PropertyIcon';
import { PropertyTypeSelect } from '../common/PropertyTypeSelect';
import { Tooltip } from '../Tooltip';
import { GoogleAutocomplete } from '../common/GoogleAutocomplete';
import { cn, formatDate, formatNumber, parseNumber } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '../ui/DatePicker';
import { parseISO, format, addYears, subDays, isValid, startOfDay } from 'date-fns';
import type { ExtractedField, Tenant, Property } from '../../types/database';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useScrollLock } from '../../hooks/useScrollLock';

import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useSubscription } from '../../hooks/useSubscription';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractSchema, type ContractFormData } from '../../schemas/contract.schema';
import { useToast } from '../../hooks/useToast';
import { CompressionService } from '../../services/compression.service';
import { errorLogService } from '../../services/error-log.service';
import { useDataCache } from '../../contexts/DataCacheContext';
import { propertyService } from '../../services/property.service';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useStack } from '../../contexts/StackContext';
import { useAuth } from '../../contexts/AuthContext';

const STEPS = [
    { id: 1, labelKey: 'stepAsset', icon: Building },
    { id: 2, labelKey: 'stepTenant', icon: User },
    { id: 3, labelKey: 'stepPeriods', icon: Calendar },
    { id: 4, labelKey: 'stepPayments', icon: SettingsIcon },
    { id: 5, labelKey: 'stepSecurity', icon: Shield },
    { id: 6, labelKey: 'stepSummary', icon: Check },
];

interface AddContractWizardProps {
    initialData?: Partial<ContractFormData> & { propertyId?: string; propertyLocked?: boolean };
    onSuccess?: () => void;
}

export function AddContractWizard({ initialData, onSuccess }: AddContractWizardProps) {
    const { lang, t } = useTranslation();
    const { clear: clearCache } = useDataCache();
    const { pop, push } = useStack();
    const { user } = useAuth();

    const { success, error: toastError } = useToast();
    const { trackEvent } = useUsageTracking();

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        trigger,
        formState: { errors }
    } = useForm<ContractFormData>({
        resolver: zodResolver(contractSchema) as any,
        defaultValues: {
            isExistingProperty: true,
            property_type: 'apartment',
            tenants: [{ name: '', id_number: '', email: '', phone: '' }],
            rent: 0,
            currency: 'ILS',
            paymentFrequency: 'Monthly',
            paymentDay: 1,
            paymentMethod: '',
            linkageType: 'none',
            linkageSubType: 'base',
            hasLinkage: false,
            hasLinkageCeiling: false,
            needsPainting: false,
            optionPeriods: [],
            rentSteps: [],
            ...initialData
        }
    });

    const formData: ContractFormData = watch();

    const { canAddActiveContract, loading: subLoading } = useSubscription();

    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isPropertyLocked, setIsPropertyLocked] = useState(initialData?.propertyLocked || false);

    const [existingProperties, setExistingProperties] = useState<Property[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    const [storagePreference, setStoragePreference] = useState<'cloud' | 'device' | 'both'>('device');
    const [saveContractFile, setSaveContractFile] = useState(false);
    const [hasOverlap, setHasOverlap] = useState(false);
    const [blockedIntervals, setBlockedIntervals] = useState<{ from: Date; to: Date }[]>([]);

    const [splitRatio, setSplitRatio] = useState(50);
    const [isContractViewerOpen, setIsContractViewerOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    const [scannedContractUrl, setScannedContractUrl] = useState<string | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedQuotes, setScannedQuotes] = useState<Record<string, string>>({});
    const [fieldConfidence, setFieldConfidence] = useState<Record<string, 'high' | 'medium' | 'low'>>({});

    const [showOverlapWarning, setShowOverlapWarning] = useState(false);
    const [overlapDetails, setOverlapDetails] = useState<{ start: string, end: string } | null>(null);

    // Initial values from props
    useEffect(() => {
        if (initialData?.propertyId) {
            setValue('selectedPropertyId', initialData.propertyId);
            setValue('isExistingProperty', true);
            setIsPropertyLocked(true);
        }
    }, [initialData, setValue]);

    const fetchProperties = useCallback(async (autoSelectNewest = false) => {
        if (!user) return;

        const { data } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            const props = data as Property[];
            setExistingProperties(props);

            if (autoSelectNewest && props.length > 0) {
                setValue('selectedPropertyId', props[0].id);
                setValue('isExistingProperty', true);
                setStep(2);
            }
        }
    }, [user, setValue]);

    const handleAddNewProperty = useCallback(() => {
        push('property_wizard', {
            onSuccess: () => {
                fetchProperties(true);
            }
        }, { isExpanded: true, title: t('addProperty') });
    }, [push, fetchProperties, t]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Linkage logic
    useEffect(() => {
        if (formData.linkageType !== 'cpi' || formData.linkageSubType === 'base') return;

        const referenceDate = formData.signingDate || formData.startDate;
        if (!referenceDate) return;

        const date = new Date(referenceDate);
        const day = date.getDate();
        let publicationDate: Date;

        if (formData.linkageSubType === 'known') {
            const monthOffset = day >= 15 ? 0 : -1;
            publicationDate = new Date(date.getFullYear(), date.getMonth() + monthOffset, 15);
        } else {
            publicationDate = new Date(date.getFullYear(), date.getMonth() + 1, 15);
        }

        const newBaseDate = format(publicationDate, 'yyyy-MM-dd');
        if (formData.baseIndexDate !== newBaseDate) {
            setValue('baseIndexDate', newBaseDate);
        }
    }, [formData.signingDate, formData.startDate, formData.linkageSubType, formData.linkageType, setValue]);

    // Default End Date Logic (1 Year - 1 Day)
    useEffect(() => {
        if (formData.startDate && !formData.endDate) {
            const start = parseISO(formData.startDate);
            if (isValid(start)) {
                const end = subDays(addYears(start, 1), 1);
                setValue('endDate', format(end, 'yyyy-MM-dd'));
            }
        }
    }, [formData.startDate, formData.endDate, setValue]);

    // Blocked intervals
    useEffect(() => {
        if (!formData.selectedPropertyId) {
            setBlockedIntervals([]);
            return;
        }

        async function fetchBlockedIntervals() {
            try {
                const { data, error } = await supabase
                    .from('contracts')
                    .select('start_date, end_date')
                    .eq('property_id', formData.selectedPropertyId)
                    .eq('status', 'active');

                if (error) {
                    console.error('Error fetching blocked intervals:', error);
                    return;
                }

                if (data) {
                    const intervals = data.map(contract => ({
                        from: parseISO(contract.start_date),
                        to: parseISO(contract.end_date)
                    }));
                    setBlockedIntervals(intervals);
                }
            } catch (err) {
                console.error('Error in fetchBlockedIntervals:', err);
            }
        }

        fetchBlockedIntervals();
    }, [formData.selectedPropertyId]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (CompressionService.isImage(file)) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageToCrop(reader.result as string);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
            e.target.value = '';
        } else {
            uploadFile(file);
        }
    };

    const onCropComplete = async (croppedBlob: Blob) => {
        setIsCropping(false);
        setImageToCrop(null);
        const file = new File([croppedBlob], "cropped_image.jpg", { type: "image/jpeg" });
        await uploadFile(file);
    };

    const onCropCancel = () => {
        setIsCropping(false);
        setImageToCrop(null);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        let fileToUpload = file;
        try {
            if (CompressionService.isImage(fileToUpload)) {
                fileToUpload = await CompressionService.compressImage(fileToUpload);
            }
        } catch (error) {
            console.error('Compression failed:', error);
        }

        const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
        const fileName = `prop_${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, fileToUpload);

            if (uploadError) throw uploadError;
            setValue('image_url', filePath);
        } catch (err: any) {
            console.error('Error uploading image:', err);
            setImageError('Failed to upload image: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // UI Navigation logic
    const nextStep = async () => {
        // Simple step validation before moving forward
        const stepFields: (keyof ContractFormData)[][] = [
            ['isExistingProperty', 'selectedPropertyId', 'address', 'city'], // Step 1
            ['tenants'], // Step 2
            ['startDate', 'endDate'], // Step 3
            ['rent', 'currency'], // Step 4
            [], // Step 5
            []  // Step 6 (Summary)
        ];

        const fieldsToValidate = stepFields[step - 1];
        const isStepValid = fieldsToValidate.length > 0
            ? await trigger(fieldsToValidate as any)
            : true;

        if (isStepValid) {
            if (step < STEPS.length) {
                setStep(step + 1);
            } else {
                // We are at the final summary step, handleSubmit will handle validation
                handleSubmit(
                    onSubmit,
                    (errors) => {
                        console.error('Validation Errors:', errors);
                        toastError(t('fillRequiredFields'));
                    }
                )();
            }
        } else {
            toastError(t('fillRequiredFields'));
        }
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const onSubmit = async (data: ContractFormData) => {
        setIsSaving(true);
        try {
            if (!user) throw new Error('You must be logged in to save a contract');

            let propertyId = '';

            // 1. Handle Property (Existing or New)
            if (data.isExistingProperty && data.selectedPropertyId) {
                propertyId = data.selectedPropertyId;
            } else {
                // Create New Property
                const constructedAddress = data.address || '';
                const { data: existingProp } = await supabase
                    .from('properties')
                    .select('id')
                    .eq('address', constructedAddress)
                    .eq('city', data.city || '')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (existingProp) {
                    propertyId = existingProp.id;
                } else {
                    const { data: propData, error: propErr } = await supabase
                        .from('properties')
                        .insert({
                            title: `${data.address || ''}, ${data.city || ''}`,
                            address: data.address || '',
                            city: data.city || '',
                            rooms: data.rooms || 0,
                            size_sqm: data.size || 0,
                            has_parking: data.hasParking,
                            has_storage: data.hasStorage,
                            has_balcony: data.hasBalcony,
                            has_safe_room: data.hasSafeRoom,
                            property_type: data.property_type || 'apartment',
                            image_url: data.image_url || '',
                            user_id: user.id
                        })
                        .select('id')
                        .single();

                    if (propErr) throw propErr;
                    propertyId = propData.id;
                }
            }

            // 2. Create Contract (Consolidated with JSONB)
            const { data: contractData, error: contractErr } = await supabase
                .from('contracts')
                .insert({
                    property_id: propertyId,
                    user_id: user.id,
                    start_date: data.startDate,
                    end_date: data.endDate,
                    signing_date: data.signingDate,
                    base_rent: data.rent,
                    currency: data.currency,
                    payment_frequency: data.paymentFrequency.toLowerCase(),
                    payment_day: data.paymentDay,
                    payment_method: data.paymentMethod,
                    linkage_type: data.linkageType,
                    linkage_sub_type: data.linkageSubType,
                    base_index_value: data.baseIndexValue,
                    base_index_date: data.baseIndexDate,
                    linkage_ceiling: data.linkageCeiling,
                    linkage_floor: data.linkageFloor,
                    security_deposit_amount: data.securityDeposit,
                    guarantees: data.guarantees,
                    guarantors_info: data.guarantorsInfo,
                    special_clauses: data.specialClauses,
                    option_notice_days: data.optionNoticeDays,
                    status: 'active',
                    needs_painting: data.needsPainting,
                    // Consolidated JSONB data
                    tenants: data.tenants,
                    option_periods: data.optionPeriods,
                    rent_periods: data.rentSteps
                })
                .select('id')
                .single();

            if (contractErr) throw contractErr;

            // 6. Handle Contract File
            if (contractFile && data.isExistingProperty) {
                // Storage logic here if needed
            }

            success(t('contractSavedSuccess'));
            clearCache();
            if (onSuccess) onSuccess();
            pop(); // Close wizard
        } catch (err: any) {
            console.error('Error saving contract:', err);
            errorLogService.logError(err, { metadata: { context: 'AddContractWizard.onSubmit' } });
            toastError(err.message || t('errorSavingContract'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleScanComplete = (extracted: ExtractedField[], url: string, file?: File) => {
        if (file) setContractFile(file);
        setScannedContractUrl(url);
        setIsScanning(false);

        // Process extracted data
        const quotes: Record<string, string> = {};
        const confidences: Record<string, any> = {};

        // Helper to simplify the mapping
        let scannedFullAddress = '';
        let scannedStreet = '';
        let scannedBuilding = '';

        extracted.forEach((field: ExtractedField) => {
            const val = field.extractedValue;
            if (val === undefined || val === null) return;

            quotes[field.fieldName] = field.sourceText || '';
            confidences[field.fieldName] = field.confidence;

            switch (field.fieldName) {
                // Address Components
                case 'street': scannedStreet = val; break;
                case 'buildingNum': scannedBuilding = val; break;
                case 'city': setValue('city', val, { shouldValidate: true }); break;
                case 'address':
                    setValue('address', val, { shouldValidate: true });
                    scannedFullAddress = val;
                    break;

                // Dates
                case 'startDate': setValue('startDate', val, { shouldValidate: true }); break;
                case 'endDate': setValue('endDate', val, { shouldValidate: true }); break;
                case 'signingDate': setValue('signingDate', val, { shouldValidate: true }); break;

                // Financials
                case 'rent': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('rent', numVal, { shouldValidate: true });
                    break;
                }
                case 'currency':
                    if (['ILS', 'USD', 'EUR'].includes(val)) {
                        setValue('currency', val as any, { shouldValidate: true });
                    }
                    break;
                case 'paymentFrequency':
                    if (['Monthly', 'Quarterly', 'Annually'].includes(val)) {
                        setValue('paymentFrequency', val as any, { shouldValidate: true });
                    }
                    break;
                case 'paymentDay': {
                    const numVal = parseInt(val);
                    if (!isNaN(numVal)) setValue('paymentDay', numVal, { shouldValidate: true });
                    break;
                }

                // Linkage
                case 'linkageType':
                    if (['cpi', 'housing', 'construction', 'usd', 'eur', 'none'].includes(val)) {
                        setValue('linkageType', val as any, { shouldValidate: true });
                        setValue('hasLinkage', val !== 'none', { shouldValidate: true });
                    }
                    break;
                case 'indexCalculationMethod':
                    setValue('linkageSubType', val as any, { shouldValidate: true });
                    break;
                case 'baseIndexDate':
                    setValue('baseIndexDate', val, { shouldValidate: true });
                    break;
                case 'baseIndexValue': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('baseIndexValue', numVal, { shouldValidate: true });
                    break;
                }
                case 'linkageCeiling': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) {
                        setValue('linkageCeiling', numVal, { shouldValidate: true });
                        setValue('hasLinkageCeiling', numVal > 0, { shouldValidate: true });
                    }
                    break;
                }

                // Security
                case 'securityDeposit': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('securityDeposit', numVal, { shouldValidate: true });
                    break;
                }
                case 'guaranteeType':
                    setValue('guarantees', val, { shouldValidate: true });
                    break;
                case 'guarantorsInfo':
                    setValue('guarantorsInfo', val, { shouldValidate: true });
                    break;
                case 'specialClauses':
                    setValue('specialClauses', val, { shouldValidate: true });
                    break;
            }
        });

        // Construct address if not found directly
        if (!scannedFullAddress && (scannedStreet || scannedBuilding)) {
            const compositeAddress = `${scannedStreet} ${scannedBuilding}`.trim();
            setValue('address', compositeAddress, { shouldValidate: true });
            scannedFullAddress = compositeAddress;
        }

        // Smart Match: Check for existing Property
        if (scannedFullAddress) {
            const scanAddrNorm = scannedFullAddress.replace(/\s/g, '').toLowerCase();
            const matchedProp = existingProperties.find(p => {
                if (!p.address) return false;
                const propAddrNorm = p.address.replace(/\s/g, '').toLowerCase();
                return propAddrNorm.includes(scanAddrNorm) || scanAddrNorm.includes(propAddrNorm);
            });

            if (matchedProp) {
                setValue('isExistingProperty', true);
                setValue('selectedPropertyId', matchedProp.id);
                if (matchedProp.address) setValue('address', matchedProp.address);
                if (matchedProp.city) setValue('city', matchedProp.city);
            }
        }

        setScannedQuotes(quotes);
        setFieldConfidence(confidences);
        setStep(1);
    };

    const ConfidenceDot = ({ field }: { field: string }) => {
        const conf = fieldConfidence[field];
        if (!conf || !formData[field as keyof typeof formData]) return null;
        const color = conf === 'high' ? 'bg-green-500' : conf === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
        return (
            <div className={`w-2 h-2 rounded-full ${color} inline-block ml-2 mb-0.5`} title={`AI Confidence: ${conf}`} />
        );
    };

    const handleDragStart = (e: React.MouseEvent) => {
        const startY = e.clientY;
        const startX = e.clientX;
        const startRatio = splitRatio;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (window.innerWidth < 1024) {
                const delta = moveEvent.clientY - startY;
                const deltaRatio = (delta / window.innerHeight) * 100;
                setSplitRatio(Math.max(20, Math.min(80, startRatio + deltaRatio)));
            } else {
                const delta = startX - moveEvent.clientX; // Left-to-right is opposite due to RTL/LTR logic? Usually width is from left.
                const deltaRatio = (delta / window.innerWidth) * 100;
                setSplitRatio(Math.max(20, Math.min(80, startRatio + deltaRatio)));
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    if (!subLoading && !canAddActiveContract) {
        // Return upgrade notice if limit reached
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50 dark:ring-red-900/10">
                    <Lock className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                    {t('upgradeRequired')}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {t('limitReachedDesc')}
                </p>
                <div className="flex gap-4 pt-4">
                    <Button onClick={() => pop()} variant="secondary">
                        {t('goBack')}
                    </Button>
                    <Button
                        onClick={() => {
                            pop();
                            // Logic to navigate to pricing if needed
                        }}
                        className="bg-brand-500 hover:bg-brand-600 text-white"
                    >
                        {t('upgradeNow')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "relative h-full overflow-hidden bg-slate-50 dark:bg-neutral-950 flex flex-col rounded-t-[2.5rem]",
        )}>
            {/* PROGRESS TRACKER */}
            <div className="absolute top-0 inset-x-0 h-1 bg-black/5 dark:bg-white/5 z-[100]">
                <motion.div
                    className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / STEPS.length) * 100}%` }}
                />
            </div>

            {/* Floating Toggle Button */}
            <AnimatePresence>
                {scannedContractUrl && !isScanning && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -20 }}
                        onClick={() => setIsContractViewerOpen(!isContractViewerOpen)}
                        className="fixed top-24 left-6 z-50 glass-premium dark:bg-neutral-800/60 shadow-lg border border-white/5 p-3 rounded-full flex items-center gap-3 hover:scale-105 transition-all text-indigo-500"
                    >
                        {isContractViewerOpen ? <ChevronDown className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        <span className="text-[10px] font-black uppercase tracking-widest pr-1 text-foreground">{t('hideContract')}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            <div className={cn(
                "flex-1 flex overflow-hidden relative",
                isContractViewerOpen ? "flex-col lg:flex-row-reverse" : "flex-col"
            )}>
                {/* Wizard Pane */}
                <div
                    className={cn(
                        "flex flex-col min-w-0 transition-all duration-300",
                        isContractViewerOpen ? "border-b lg:border-b-0 lg:border-r border-white/5" : "h-full w-full"
                    )}
                    style={{
                        height: (isContractViewerOpen && windowWidth < 1024) ? `${splitRatio}%` : '100%',
                        width: (isContractViewerOpen && windowWidth >= 1024) ? `${splitRatio}%` : '100%',
                        flex: (isContractViewerOpen) ? 'none' : '1'
                    }}
                >
                    {/* Header */}
                    <div className="h-20 glass-premium dark:bg-neutral-900/60 border-b border-white/5 flex items-center justify-between px-8 z-20 shrink-0 backdrop-blur-2xl">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => pop()}
                                className="w-10 h-10 glass-premium dark:bg-neutral-800/40 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all border border-white/5"
                            >
                                <ArrowLeft className={cn("w-4 h-4", lang === 'he' ? 'rotate-180' : '')} />
                            </button>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 mb-1">
                                    {t('step')} {step} / {STEPS.length}
                                </span>
                                <h1 className="font-black text-xl tracking-tighter text-foreground leading-none lowercase">
                                    {t(STEPS[step - 1].labelKey)}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 glass-premium dark:bg-neutral-800/40 p-1.5 rounded-2xl border border-white/5">
                                {STEPS.map((s) => (
                                    <div
                                        key={s.id}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-700",
                                            s.id === step ? "w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : s.id < step ? "bg-indigo-300 dark:bg-indigo-900" : "bg-slate-200 dark:bg-neutral-800"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-32">
                        <div className="max-w-2xl mx-auto px-6">
                            <div className="bg-card glass-premium border border-border rounded-3xl p-6 shadow-xl min-h-[400px]" dir="rtl">
                                <AnimatePresence mode="wait">
                                    {isScanning && (
                                        <ContractScanner
                                            key="scanner"
                                            mode="embedded"
                                            onScanComplete={handleScanComplete}
                                            onCancel={() => setIsScanning(false)}
                                            skipReview={true}
                                        />
                                    )}

                                    {!isScanning && (
                                        <motion.div
                                            key={`step-${step}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-6"
                                        >
                                            {/* Step specific content here */}
                                            {step === 1 && (
                                                <div className="space-y-6">
                                                    {!contractFile && (
                                                        <div className="bg-gradient-to-l from-indigo-600 to-brand-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-xl">
                                                            <div>
                                                                <h3 className="font-black text-lg mb-1">{t('aiScanTitle')}</h3>
                                                                <p className="text-white/80 text-sm">{t('aiScanDesc')}</p>
                                                            </div>
                                                            <Button
                                                                onClick={() => setIsScanning(true)}
                                                                className="bg-white text-brand-600 hover:bg-white/90 font-black shadow-lg"
                                                            >
                                                                {t('scanNow')}
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {contractFile && (
                                                        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 text-green-600">
                                                            <CheckCircle className="w-5 h-5" />
                                                            <span className="font-bold text-sm">{t('contractScannedSuccess')}</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-4">
                                                        <h3 className="font-black text-xl flex items-center gap-3 mb-6"><Building className="w-5 h-5 text-brand-500" /> {t('propertyDetails')}</h3>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {!isPropertyLocked && (
                                                                <button
                                                                    onClick={handleAddNewProperty}
                                                                    className="p-6 rounded-2xl border-2 border-dashed border-secondary dark:border-neutral-800 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group flex flex-col items-center justify-center gap-3 min-h-[140px]"
                                                                >
                                                                    <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform">
                                                                        <Plus className="w-6 h-6" />
                                                                    </div>
                                                                    <span className="font-black text-foreground">{t('newProperty')}</span>
                                                                </button>
                                                            )}

                                                            {existingProperties.map((p) => (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        setValue('isExistingProperty', true);
                                                                        setValue('selectedPropertyId', p.id);
                                                                        if (p.address && p.city) {
                                                                            setValue('address', p.address);
                                                                            setValue('city', p.city);
                                                                        }
                                                                        setStep(2);
                                                                    }}
                                                                    className={cn(
                                                                        "p-6 rounded-2xl border-2 text-right transition-all group relative overflow-hidden",
                                                                        formData.selectedPropertyId === p.id
                                                                            ? "border-brand-500 bg-brand-500/5 shadow-inner-lg"
                                                                            : "border-secondary dark:border-neutral-800 hover:border-brand-500/50",
                                                                        isPropertyLocked && formData.selectedPropertyId !== p.id && "hidden"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-end mb-2">
                                                                        {formData.selectedPropertyId === p.id && <CheckCircle className="w-5 h-5 text-brand-500" />}
                                                                    </div>
                                                                    <p className="font-black text-lg text-foreground truncate">{p.address}</p>
                                                                    <p className="text-sm text-muted-foreground">{p.city}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {step === 2 && (
                                                <div className="space-y-6">
                                                    <h3 className="font-black text-xl flex items-center gap-3 mb-6"><User className="w-5 h-5 text-brand-500" /> {t('tenantDetails')}</h3>

                                                    {formData.tenants.map((tenant, index) => (
                                                        <div key={index} className="p-6 border border-border rounded-3xl space-y-4 relative bg-secondary/5 group transition-colors hover:bg-secondary/10 shadow-sm">
                                                            {formData.tenants.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants.splice(index, 1);
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    className="absolute top-4 left-4 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <Input
                                                                label={<span>{t('fullName')} <span className="text-red-500">*</span></span>}
                                                                value={tenant.name}
                                                                onChange={e => {
                                                                    const newTenants = [...formData.tenants];
                                                                    newTenants[index].name = e.target.value;
                                                                    setValue('tenants', newTenants);
                                                                }}
                                                                className="w-full bg-background"
                                                            />

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <Input
                                                                    label={t('idNumber')}
                                                                    value={tenant.id_number}
                                                                    onChange={e => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants[index].id_number = e.target.value;
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    className="w-full bg-background font-mono"
                                                                />
                                                                <Input
                                                                    label={t('phone')}
                                                                    value={tenant.phone}
                                                                    onChange={e => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants[index].phone = e.target.value;
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    className="w-full bg-background"
                                                                    dir="ltr"
                                                                />
                                                            </div>

                                                            <Input
                                                                label={t('email')}
                                                                value={tenant.email}
                                                                onChange={e => {
                                                                    const newTenants = [...formData.tenants];
                                                                    newTenants[index].email = e.target.value;
                                                                    setValue('tenants', newTenants);
                                                                }}
                                                                className="w-full bg-background"
                                                                type="email"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {step === 3 && (
                                                <div className="space-y-6">
                                                    <h3 className="font-black text-xl flex items-center gap-3 mb-6"><Calendar className="w-5 h-5 text-brand-500" /> {t('leaseTerms')}</h3>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <DatePicker
                                                            label={<span>{t('startDate')} <span className="text-red-500">*</span></span>}
                                                            value={formData.startDate ? parseISO(formData.startDate) : undefined}
                                                            onChange={(date) => setValue('startDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                            placeholder={t('pickDate')}
                                                        />
                                                        <DatePicker
                                                            label={<span>{t('endDate')} <span className="text-red-500">*</span></span>}
                                                            value={formData.endDate ? parseISO(formData.endDate) : undefined}
                                                            onChange={(date) => setValue('endDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                            placeholder={t('pickDate')}
                                                        />
                                                    </div>

                                                    <DatePicker
                                                        label={t('signingDate')}
                                                        value={formData.signingDate ? parseISO(formData.signingDate) : undefined}
                                                        onChange={(date) => setValue('signingDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                        placeholder={t('pickDate')}
                                                    />

                                                    <div className="pt-6 border-t border-border">
                                                        <h4 className="font-black text-sm mb-4 uppercase tracking-widest text-muted-foreground">{t('optionPeriods')}</h4>
                                                        {formData.optionPeriods.map((period, idx) => (
                                                            <div key={idx} className="flex gap-4 items-end bg-secondary/10 p-4 rounded-2xl mb-4">
                                                                <div className="flex-1">
                                                                    <DatePicker
                                                                        label={`${t('extensionEndDate')} ${idx + 1}`}
                                                                        value={period.endDate ? parseISO(period.endDate) : undefined}
                                                                        onChange={(date) => {
                                                                            const newPeriods = [...formData.optionPeriods];
                                                                            newPeriods[idx].endDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                                            setValue('optionPeriods', newPeriods);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-[46px] w-[46px] text-red-500"
                                                                    onClick={() => setValue('optionPeriods', formData.optionPeriods.filter((_, i) => i !== idx))}
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="link"
                                                            onClick={() => {
                                                                const lastEndDateStr = formData.optionPeriods.length > 0
                                                                    ? formData.optionPeriods[formData.optionPeriods.length - 1].endDate
                                                                    : formData.endDate;

                                                                let defaultEndDate = '';
                                                                if (lastEndDateStr) {
                                                                    const last = parseISO(lastEndDateStr);
                                                                    if (isValid(last)) {
                                                                        defaultEndDate = format(addYears(last, 1), 'yyyy-MM-dd');
                                                                    }
                                                                }

                                                                setValue('optionPeriods', [
                                                                    ...formData.optionPeriods,
                                                                    {
                                                                        endDate: defaultEndDate,
                                                                        rentAmount: formData.rent,
                                                                        currency: formData.currency
                                                                    }
                                                                ]);
                                                            }}
                                                            className="text-brand-500 font-black p-0 h-auto"
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" /> {t('addPeriod')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {step === 4 && (
                                                <div className="space-y-6">
                                                    <h3 className="font-black text-xl flex items-center gap-3 mb-6"><SettingsIcon className="w-5 h-5 text-brand-500" /> {t('paymentDetails')}</h3>

                                                    <Input
                                                        label={<span>{t('monthlyRent')} <span className="text-red-500">*</span></span>}
                                                        value={formatNumber(formData.rent)}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value);
                                                            if (/^\d*\.?\d*$/.test(val)) setValue('rent', val as any);
                                                        }}
                                                        className="w-full font-black text-2xl bg-background h-16"
                                                        leftIcon={<span className="text-muted-foreground text-xl">₪</span>}
                                                    />

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Select
                                                            label={t('paymentFrequency')}
                                                            value={formData.paymentFrequency}
                                                            onChange={val => setValue('paymentFrequency', val as any)}
                                                            placeholder={t('selectOption')}
                                                            options={[
                                                                { value: 'monthly', label: t('monthly') },
                                                                { value: 'quarterly', label: t('quarterly') },
                                                                { value: 'annually', label: t('annually') }
                                                            ]}
                                                        />
                                                        <Select
                                                            label={t('paymentMethod')}
                                                            value={formData.paymentMethod}
                                                            onChange={val => setValue('paymentMethod', val as any)}
                                                            placeholder={t('selectOption')}
                                                            options={[
                                                                { value: 'transfer', label: t('transfer') },
                                                                { value: 'checks', label: t('check') },
                                                                { value: 'cash', label: t('cash') },
                                                                { value: 'bit', label: t('bit') },
                                                                { value: 'paybox', label: t('paybox') },
                                                                { value: 'other', label: t('other') }
                                                            ]}
                                                        />
                                                    </div>

                                                    <div className="p-6 bg-secondary/10 rounded-3xl space-y-4">
                                                        <Checkbox
                                                            label={<span className="font-black">{t('contractIsIndexed')}</span>}
                                                            checked={formData.hasLinkage}
                                                            onChange={checked => {
                                                                setValue('hasLinkage', checked);
                                                                if (checked && !formData.baseIndexDate) {
                                                                    const defaultDate = formData.signingDate || formData.startDate || format(new Date(), 'yyyy-MM-dd');
                                                                    setValue('baseIndexDate', defaultDate);
                                                                }
                                                            }}
                                                        />
                                                        {formData.hasLinkage && (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4">
                                                                <Select
                                                                    label={<span>{t('indexOption')} <span className="text-red-500">*</span></span>}
                                                                    value={formData.linkageType}
                                                                    onChange={val => setValue('linkageType', val as any)}
                                                                    placeholder={t('selectOption')}
                                                                    options={[
                                                                        { value: 'cpi', label: t('linkedToCpi') },
                                                                        { value: 'housing', label: t('linkedToHousing') }
                                                                    ]}
                                                                />
                                                                <DatePicker
                                                                    label={<span>{t('baseDate')} <span className="text-red-500">*</span></span>}
                                                                    value={formData.baseIndexDate ? parseISO(formData.baseIndexDate) : undefined}
                                                                    onChange={date => setValue('baseIndexDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                    error={errors.baseIndexDate?.message ? t(errors.baseIndexDate.message as any) : undefined}
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {step === 5 && (
                                                <div className="space-y-6">
                                                    <h3 className="font-black text-xl flex items-center gap-3 mb-6"><Shield className="w-5 h-5 text-brand-500" /> {t('securityAndAppendices')}</h3>

                                                    <Input
                                                        label={t('securityDeposit')}
                                                        value={formatNumber(formData.securityDeposit)}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value);
                                                            if (/^\d*\.?\d*$/.test(val)) setValue('securityDeposit', val as any);
                                                        }}
                                                        className="w-full font-black bg-background"
                                                        leftIcon={<span className="text-muted-foreground">₪</span>}
                                                    />

                                                    <Textarea
                                                        label={t('guarantors')}
                                                        value={formData.guarantees}
                                                        onChange={e => setValue('guarantees', e.target.value)}
                                                        className="min-h-[120px] rounded-2xl"
                                                    />

                                                    <div className="p-6 border-2 border-border rounded-3xl">
                                                        <Checkbox
                                                            label={<span className="font-black">{t('needsPaintingQuery')}</span>}
                                                            checked={formData.needsPainting}
                                                            onChange={checked => setValue('needsPainting', checked)}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {step === 6 && (
                                                <div className="space-y-8">
                                                    <div className="text-center py-6">
                                                        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 scale-110">
                                                            <Check className="w-10 h-10" />
                                                        </div>
                                                        <h3 className="text-2xl font-black">{t('contractReadySummary')}</h3>
                                                        <p className="text-muted-foreground mt-2">{t('contractReadySummaryDesc', { address: formData.address || '', city: formData.city || '' })}</p>
                                                    </div>

                                                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-6">
                                                        {/* Property & Infrastructure */}
                                                        <div className="bg-secondary/10 p-5 rounded-3xl space-y-3">
                                                            <h4 className="font-black text-brand-500 flex items-center gap-2 border-b border-border/50 pb-3 mb-3 uppercase tracking-wider text-[10px]">
                                                                <Building className="w-4 h-4" /> {t('infrastructure')}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                <span className="text-muted-foreground">{t('property')}</span>
                                                                <span className="text-right truncate">{formData.address || '-'}, {formData.city || ''}</span>

                                                                <span className="text-muted-foreground">{t('propertyType')}</span>
                                                                <span className="text-right">{t(formData.property_type as any)}</span>

                                                                {(formData.rooms || formData.size) && (
                                                                    <>
                                                                        <span className="text-muted-foreground">{t('specifications')}</span>
                                                                        <span className="text-right font-normal">
                                                                            {formData.rooms ? `${formData.rooms} ${t('rooms')}` : ''}
                                                                            {formData.rooms && formData.size ? ' | ' : ''}
                                                                            {formData.size ? `${formData.size} ${t('sizeSqm')}` : ''}
                                                                        </span>
                                                                    </>
                                                                )}

                                                                <span className="text-muted-foreground">{t('features')}</span>
                                                                <div className="flex flex-wrap justify-end gap-2">
                                                                    {formData.hasParking && <span className="bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{t('hasParking')}</span>}
                                                                    {formData.hasStorage && <span className="bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{t('hasStorage')}</span>}
                                                                    {formData.hasBalcony && <span className="bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{t('hasBalcony')}</span>}
                                                                    {formData.hasSafeRoom && <span className="bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{t('hasSafeRoom')}</span>}
                                                                    {!formData.hasParking && !formData.hasStorage && !formData.hasBalcony && !formData.hasSafeRoom && '-'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Parties Involed */}
                                                        <div className="bg-secondary/10 p-5 rounded-3xl space-y-3">
                                                            <h4 className="font-black text-brand-500 flex items-center gap-2 border-b border-border/50 pb-3 mb-3 uppercase tracking-wider text-[10px]">
                                                                <User className="w-4 h-4" /> {t('parties')}
                                                            </h4>
                                                            <div className="space-y-4">
                                                                {formData.tenants.map((tenant, idx) => (
                                                                    <div key={idx} className={cn("grid grid-cols-2 gap-y-2 text-sm font-bold", idx > 0 && "pt-4 border-t border-border/30")}>
                                                                        <span className="text-muted-foreground">{t('tenant')} {formData.tenants.length > 1 ? `#${idx + 1}` : ''}</span>
                                                                        <span className="text-right">{tenant.name}</span>

                                                                        {tenant.id_number && (
                                                                            <>
                                                                                <span className="text-muted-foreground">{t('idNumber')}</span>
                                                                                <span className="text-right font-normal">{tenant.id_number}</span>
                                                                            </>
                                                                        )}
                                                                        {tenant.phone && (
                                                                            <>
                                                                                <span className="text-muted-foreground">{t('phone')}</span>
                                                                                <span className="text-right font-normal ltr">{tenant.phone}</span>
                                                                            </>
                                                                        )}
                                                                        {tenant.email && (
                                                                            <>
                                                                                <span className="text-muted-foreground">{t('email')}</span>
                                                                                <span className="text-right font-normal truncate">{tenant.email}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Timeline */}
                                                        <div className="bg-secondary/10 p-5 rounded-3xl space-y-3">
                                                            <h4 className="font-black text-brand-500 flex items-center gap-2 border-b border-border/50 pb-3 mb-3 uppercase tracking-wider text-[10px]">
                                                                <Calendar className="w-4 h-4" /> {t('timeline')}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                <span className="text-muted-foreground">{t('leasePeriod')}</span>
                                                                <span className="text-right">{formData.startDate ? format(parseISO(formData.startDate), 'dd/MM/yyyy') : '-'} - {formData.endDate ? format(parseISO(formData.endDate), 'dd/MM/yyyy') : '-'}</span>

                                                                {formData.signingDate && (
                                                                    <>
                                                                        <span className="text-muted-foreground">{t('signingDate')}</span>
                                                                        <span className="text-right font-normal">{format(parseISO(formData.signingDate), 'dd/MM/yyyy')}</span>
                                                                    </>
                                                                )}

                                                                {formData.optionPeriods.length > 0 && (
                                                                    <>
                                                                        <span className="text-muted-foreground">{t('optionPeriods')}</span>
                                                                        <div className="text-right space-y-1">
                                                                            {formData.optionPeriods.map((p, i) => (
                                                                                <div key={i} className="text-[11px] font-normal">
                                                                                    {t('until')} {format(parseISO(p.endDate), 'dd/MM/yyyy')}
                                                                                    {p.rentAmount ? ` | ${p.rentAmount}₪` : ''}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {formData.optionNoticeDays && (
                                                                    <>
                                                                        <span className="text-muted-foreground">{t('optionNoticeDays')}</span>
                                                                        <span className="text-right font-normal">{formData.optionNoticeDays} {t('days')}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Financials & Linkage */}
                                                        <div className="bg-secondary/10 p-5 rounded-3xl space-y-3">
                                                            <h4 className="font-black text-brand-500 flex items-center gap-2 border-b border-border/50 pb-3 mb-3 uppercase tracking-wider text-[10px]">
                                                                <SettingsIcon className="w-4 h-4" /> {t('financials')}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                <span className="text-muted-foreground">{t('rent')}</span>
                                                                <span className="text-right text-brand-600">
                                                                    {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : '₪'}
                                                                    {formatNumber(formData.rent)}
                                                                    <span className="text-[10px] text-muted-foreground ml-1 uppercase">({t(formData.paymentFrequency.toLowerCase() as any)})</span>
                                                                </span>

                                                                <span className="text-muted-foreground">{t('paymentMethod')}</span>
                                                                <span className="text-right">{t(formData.paymentMethod?.toLowerCase() as any || '')}</span>

                                                                <span className="text-muted-foreground">{t('paymentDay')}</span>
                                                                <span className="text-right font-normal">{formData.paymentDay} {t('month')}</span>

                                                                {formData.rentSteps.length > 0 && (
                                                                    <>
                                                                        <span className="text-muted-foreground">{t('rentSteps')}</span>
                                                                        <div className="text-right space-y-1">
                                                                            {formData.rentSteps.map((s, i) => (
                                                                                <div key={i} className="text-[11px] font-normal">
                                                                                    {format(parseISO(s.startDate), 'dd/MM/yyyy')}: {s.amount}₪
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {formData.hasLinkage && (
                                                                    <>
                                                                        <span className="text-brand-500 pt-2 col-span-2 border-t border-border/30 mt-1 uppercase text-[9px]">{t('linkage')}</span>
                                                                        <span className="text-muted-foreground">{t('indexOption')}</span>
                                                                        <span className="text-right">{t(`linkedTo${formData.linkageType.charAt(0).toUpperCase() + formData.linkageType.slice(1)}` as any)}</span>
                                                                        <span className="text-muted-foreground">{t('baseDate')}</span>
                                                                        <span className="text-right font-normal">{formData.baseIndexDate ? format(parseISO(formData.baseIndexDate), 'dd/MM/yyyy') : '-'}</span>

                                                                        {(formData.linkageCeiling || formData.linkageFloor) && (
                                                                            <>
                                                                                <span className="text-muted-foreground">{t('restrictions')}</span>
                                                                                <span className="text-right font-normal">
                                                                                    {formData.linkageFloor ? `${t('floorLabel')}: ${formData.linkageFloor}%` : ''}
                                                                                    {formData.linkageFloor && formData.linkageCeiling ? ' | ' : ''}
                                                                                    {formData.linkageCeiling ? `${t('ceilingLabel')}: ${formData.linkageCeiling}%` : ''}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Security */}
                                                        {(formData.securityDeposit || formData.guarantees || formData.guarantorsInfo) && (
                                                            <div className="bg-secondary/10 p-5 rounded-3xl space-y-3">
                                                                <h4 className="font-black text-brand-500 flex items-center gap-2 border-b border-border/50 pb-3 mb-3 uppercase tracking-wider text-[10px]">
                                                                    <Shield className="w-4 h-4" /> {t('securityAndAppendices')}
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                    {formData.securityDeposit && (
                                                                        <>
                                                                            <span className="text-muted-foreground">{t('securityDeposit')}</span>
                                                                            <span className="text-right font-bold">₪{formatNumber(formData.securityDeposit)}</span>
                                                                        </>
                                                                    )}

                                                                    {formData.guarantees && (
                                                                        <>
                                                                            <span className="text-muted-foreground">{t('guaranteesLabel')}</span>
                                                                            <span className="text-right truncate">{formData.guarantees}</span>
                                                                        </>
                                                                    )}

                                                                    {formData.guarantorsInfo && (
                                                                        <>
                                                                            <span className="text-muted-foreground">{t('guarantorsInfo')}</span>
                                                                            <span className="text-right font-normal truncate">{formData.guarantorsInfo}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Additional Details */}
                                                        {(formData.specialClauses || formData.needsPainting) && (
                                                            <div className="bg-secondary/10 p-5 rounded-3xl space-y-3">
                                                                <h4 className="font-black text-brand-500 flex items-center gap-2 border-b border-border/50 pb-3 mb-3 uppercase tracking-wider text-[10px]">
                                                                    <FileText className="w-4 h-4" /> {t('additionalDetails')}
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                    {formData.needsPainting && (
                                                                        <>
                                                                            <span className="text-muted-foreground">{t('paintingIncluded')}</span>
                                                                            <span className="text-right text-green-600 uppercase text-[10px]">{t('yes')}</span>
                                                                        </>
                                                                    )}

                                                                    {formData.specialClauses && (
                                                                        <>
                                                                            <span className="text-muted-foreground col-span-2">{t('specialClauses')}</span>
                                                                            <div className="text-left font-normal italic col-span-2 bg-white/50 p-3 rounded-2xl text-xs leading-relaxed border border-border/30">
                                                                                {formData.specialClauses}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contract Viewer Pane */}
                <AnimatePresence>
                    {isContractViewerOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onMouseDown={handleDragStart}
                                className={cn(
                                    "fixed z-40 flex items-center justify-center group",
                                    "lg:h-full lg:w-4 lg:-mr-2 lg:flex-col lg:cursor-col-resize",
                                    "h-4 w-full -mt-2 cursor-row-resize flex-row"
                                )}
                                style={{
                                    top: windowWidth < 1024 ? `${splitRatio}%` : '0',
                                    right: windowWidth >= 1024 ? `${splitRatio}%` : '0',
                                }}
                            >
                                <div className="bg-border group-hover:bg-brand-500/50 transition-colors lg:h-full lg:w-px h-px w-full" />
                            </motion.div>

                            <motion.div
                                initial={windowWidth >= 1024 ? { x: "-100%" } : { y: "100%" }}
                                animate={windowWidth >= 1024 ? { x: 0 } : { y: 0 }}
                                exit={windowWidth >= 1024 ? { x: "-100%" } : { y: "100%" }}
                                className="bg-neutral-100 dark:bg-neutral-900 shadow-2xl z-30 flex flex-col border-border"
                                style={{
                                    height: windowWidth >= 1024 ? '100%' : `${100 - splitRatio}%`,
                                    width: windowWidth >= 1024 ? `${100 - splitRatio}%` : '100%'
                                }}
                            >
                                <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-neutral-800 border-b border-border shrink-0">
                                    <span className="text-xs font-black text-muted-foreground flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> {t('originalContract')}
                                    </span>
                                    <button onClick={() => setIsContractViewerOpen(false)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                        <ChevronDown className="w-6 h-6 rotate-180" />
                                    </button>
                                </div>
                                <div className="flex-1 bg-neutral-200 dark:bg-neutral-950 overflow-hidden relative">
                                    <iframe src={scannedContractUrl || ''} className="w-full h-full border-none" title="Contract" />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Footer Navigation */}
                <WizardFooter
                    onNext={nextStep}
                    onBack={prevStep}
                    isSaving={isSaving}
                    isLastStep={step === 6}
                    showBack={step > 1}
                    savingLabel={`${t('saving')}...`}
                    className={cn(
                        "fixed bottom-0",
                        isContractViewerOpen ? "left-0 lg:left-auto" : "left-0 right-0"
                    )}
                    style={{
                        width: (isContractViewerOpen && windowWidth >= 1024) ? `${splitRatio}%` : '100%',
                        right: 0
                    }}
                />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isCropping && imageToCrop && (
                    <ImageCropper imageSrc={imageToCrop} onCropComplete={onCropComplete} onCancel={onCropCancel} aspect={4 / 3} />
                )}
            </AnimatePresence>
        </div>
    );
}
