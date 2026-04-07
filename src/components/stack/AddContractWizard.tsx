import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, ArrowRight, Building, Check, User, Calendar,
    Settings as SettingsIcon, Shield, FileText, ChevronDown,
    Cloud, HardDrive, Download, Car, Box, Plus, Trash2,
    MapPin, Image as ImageIcon, Loader2, Upload, AlertTriangle,
    Clock, Wind, ShieldCheck, CheckCircle, Lock, Phone, Mail, IdCard, Info, Sparkles
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
import { RegeneratePaymentsModal } from '../modals/RegeneratePaymentsModal';
import { generatePaymentSchedule } from '../../utils/payment-generator';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useScrollLock } from '../../hooks/useScrollLock';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';
import { LINKAGE_TYPES, LINKAGE_SUB_TYPES } from '../../constants/linkageTypes';

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
    propertyId?: string;
    onSuccess?: () => void;
}

export function AddContractWizard({ initialData, propertyId, onSuccess }: AddContractWizardProps) {
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
        const pId = propertyId || initialData?.propertyId;
        if (pId) {
            setValue('selectedPropertyId', pId);
            setValue('isExistingProperty', true);
            setIsPropertyLocked(true);
            setStep(2); // Skip asset selection since property is pre-filled
        }
    }, [initialData, propertyId, setValue]);

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

            // 3. Generate Payments
            try {
                const { data: genData, error: genError } = await supabase.functions.invoke('generate-payments', {
                    body: {
                        startDate: data.startDate,
                        endDate: data.endDate,
                        baseRent: data.rent,
                        currency: data.currency,
                        paymentFrequency: data.paymentFrequency.toLowerCase(),
                        paymentDay: data.paymentDay,
                        linkageType: data.linkageType,
                        linkageSubType: data.linkageSubType,
                        baseIndexDate: data.baseIndexDate,
                        baseIndexValue: data.baseIndexValue,
                        linkageCeiling: data.linkageCeiling,
                        linkageFloor: data.linkageFloor,
                        rent_periods: data.rentSteps
                    }
                });

                if (genError) throw genError;

                const schedule = genData?.payments || [];
                if (schedule.length > 0) {
                    const { error: insertError } = await supabase.from('payments').insert(
                        schedule.map((p: any) => ({
                            ...p,
                            contract_id: contractData.id,
                            user_id: user.id
                        }))
                    );
                    if (insertError) throw insertError;
                }
            } catch (pGenErr) {
                console.error('Failed to generate initial payments via Edge Function:', pGenErr);

                // FALLBACK: Simple client-side generation if server fails
                try {
                    const fallbackPayments = generatePaymentSchedule({
                        startDate: data.startDate,
                        endDate: data.endDate,
                        baseRent: data.rent,
                        currency: data.currency,
                        paymentFrequency: data.paymentFrequency,
                        paymentDay: data.paymentDay,
                        contractId: contractData.id,
                        userId: user.id
                    });

                    if (fallbackPayments.length > 0) {
                        await supabase.from('payments').insert(fallbackPayments);
                    }
                } catch (fallbackErr) {
                    console.error('Fallback payment generation failed:', fallbackErr);
                }
            }

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

        // Map snake_case AI fields to camelCase form fields for the confidence dots
        const FIELD_MAP: Record<string, string> = {
            'property_address': 'address',
            'size_sqm': 'size',
            'has_parking': 'hasParking',
            'has_storage': 'hasStorage',
            'has_balcony': 'hasBalcony',
            'has_safe_room': 'hasSafeRoom',
            'start_date': 'startDate',
            'end_date': 'endDate',
            'signing_date': 'signingDate',
            'monthly_rent': 'rent',
            'payment_day': 'paymentDay',
            'payment_frequency': 'paymentFrequency',
            'payment_method': 'paymentMethod',
            'linkage_type': 'linkageType',
            'index_calculation_method': 'linkageSubType',
            'base_index_date': 'baseIndexDate',
            'base_index_value': 'baseIndexValue',
            'security_deposit_amount': 'securityDeposit',
            'needs_painting': 'needsPainting',
            'special_clauses': 'specialClauses',
            'rent_steps': 'specialClauses',
            'option_periods': 'specialClauses',
            'pets_allowed': 'specialClauses',
            'guarantors_info': 'specialClauses',
        };

        // Helper to simplify the mapping
        let scannedFullAddress = '';
        let scannedStreet = '';
        let scannedBuilding = '';

        extracted.forEach((field: ExtractedField) => {
            const val = field.extractedValue;
            if (val === undefined || val === null) return;

            const mappedName = FIELD_MAP[field.fieldName] || field.fieldName;

            // Append to existing if multiple things map to specialClauses
            if (mappedName === 'specialClauses' && quotes[mappedName]) {
                quotes[mappedName] = quotes[mappedName] + '\n' + (field.sourceText || '');
                // Keep the lowest confidence if multiple map to the same field
                if (field.confidence === 'low' || confidences[mappedName] === 'low') confidences[mappedName] = 'low';
                else if (field.confidence === 'medium' || confidences[mappedName] === 'medium') confidences[mappedName] = 'medium';
            } else {
                quotes[mappedName] = field.sourceText || '';
                confidences[mappedName] = field.confidence;
            }

            switch (field.fieldName) {
                // People
                case 'tenant_name': setValue('tenants.0.name', val, { shouldValidate: true }); break;
                case 'tenant_id': setValue('tenants.0.id_number', val, { shouldValidate: true }); break;
                case 'tenant_email': setValue('tenants.0.email', val, { shouldValidate: true }); break;
                case 'tenant_phone': setValue('tenants.0.phone', val, { shouldValidate: true }); break;

                // Address Components
                case 'street': scannedStreet = val; break;
                case 'building_number': scannedBuilding = val; break;
                case 'city': setValue('city', val, { shouldValidate: true }); break;
                case 'property_address':
                    setValue('address', val, { shouldValidate: true });
                    scannedFullAddress = val;
                    break;
                case 'rooms': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('rooms', numVal, { shouldValidate: true });
                    break;
                }
                case 'size_sqm': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('size', numVal, { shouldValidate: true });
                    break;
                }
                case 'has_parking': setValue('hasParking', String(val).toLowerCase() === 'true', { shouldValidate: true }); break;
                case 'has_storage': setValue('hasStorage', String(val).toLowerCase() === 'true', { shouldValidate: true }); break;
                case 'has_balcony': setValue('hasBalcony', String(val).toLowerCase() === 'true', { shouldValidate: true }); break;
                case 'has_safe_room': setValue('hasSafeRoom', String(val).toLowerCase() === 'true', { shouldValidate: true }); break;

                // Dates
                case 'start_date': setValue('startDate', val, { shouldValidate: true }); break;
                case 'end_date': setValue('endDate', val, { shouldValidate: true }); break;
                case 'signing_date': setValue('signingDate', val, { shouldValidate: true }); break;

                // Financials
                case 'monthly_rent': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('rent', numVal, { shouldValidate: true });
                    break;
                }
                case 'currency':
                    if (['ILS', 'USD', 'EUR'].includes(val)) {
                        setValue('currency', val as any, { shouldValidate: true });
                    }
                    break;
                case 'payment_day': {
                    const numVal = parseInt(val);
                    if (!isNaN(numVal)) setValue('paymentDay', numVal, { shouldValidate: true });
                    break;
                }
                case 'payment_frequency':
                    if (['Monthly', 'Bimonthly', 'Quarterly', 'Semiannually', 'Annually'].includes(val)) {
                        setValue('paymentFrequency', val as any, { shouldValidate: true });
                    }
                    break;
                case 'payment_method':
                    // Just take a basic matching heuristic or append to special clauses if no match
                    if (val.toLowerCase().includes('check')) setValue('paymentMethod', 'checks');
                    else if (val.toLowerCase().includes('transfer') || val.toLowerCase().includes('העברה')) setValue('paymentMethod', 'transfer');
                    else if (val.toLowerCase().includes('cash')) setValue('paymentMethod', 'cash');
                    else if (val.toLowerCase().includes('bit')) setValue('paymentMethod', 'bit');
                    else if (val.toLowerCase().includes('paybox')) setValue('paymentMethod', 'paybox');
                    break;

                // Linkage
                case 'linkage_type':
                    if (['cpi', 'housing', 'construction', 'usd', 'eur', 'none'].includes(val)) {
                        setValue('linkageType', val as any, { shouldValidate: true });
                        setValue('hasLinkage', val !== 'none', { shouldValidate: true });
                    }
                    break;
                case 'index_calculation_method':
                    setValue('linkageSubType', val as any, { shouldValidate: true });
                    break;
                case 'base_index_date':
                    setValue('baseIndexDate', val, { shouldValidate: true });
                    break;
                case 'base_index_value': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('baseIndexValue', numVal, { shouldValidate: true });
                    break;
                }
                // (limit_type ceiling / floor is harder to parse automatically since the prompt just asks limit_type, I will skip ceiling/floor parsing for now or map it simply later)

                // Security & Others
                case 'security_deposit_amount': {
                    const numVal = parseFloat(val);
                    if (!isNaN(numVal)) setValue('securityDeposit', numVal, { shouldValidate: true });
                    break;
                }
                case 'guarantees':
                    setValue('guarantees', val, { shouldValidate: true });
                    break;
                case 'needs_painting':
                    setValue('needsPainting', String(val).toLowerCase() === 'true', { shouldValidate: true });
                    break;
                case 'special_clauses':
                    setValue('specialClauses', val, { shouldValidate: true });
                    break;
                case 'rent_steps':
                case 'option_periods':
                case 'pets_allowed':
                case 'guarantors_info':
                    // Append unstructured text to special clauses so user sees it
                    if (val) {
                        const existing = watch('specialClauses') || '';
                        setValue('specialClauses', existing ? `${existing}\n\n${field.fieldName}:\n${val}` : `${field.fieldName}:\n${val}`);
                    }
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
                    <Lock className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-3xl font-black text-foreground">
                    {t('upgradeRequired')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {t('limitReachedDesc')}
                </p>
                <div className="flex gap-4 pt-6">
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
            "relative h-full overflow-hidden bg-[#F5F7FA] dark:bg-neutral-950 flex flex-col lg:rounded-t-[2.5rem]",
        )}>
            {/* Floating Toggle Button */}
            <AnimatePresence>
                {scannedContractUrl && !isScanning && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -20 }}
                        onClick={() => setIsContractViewerOpen(!isContractViewerOpen)}
                        className="fixed top-24 left-6 z-50 glass-premium dark:bg-neutral-800/60 shadow-lg border border-[#CFD8DC] p-2 sm:p-6 rounded-full flex items-center gap-2 sm:gap-4 hover:scale-105 transition-all text-[#0D47A1]"
                    >
                        {isContractViewerOpen ? <ChevronDown className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        <span className="text-xs font-black uppercase tracking-widest pr-1 text-[#1A237E]">{t('hideContract')}</span>
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
                        isContractViewerOpen ? "border-b lg:border-b-0 lg:border-r border-[#CFD8DC]" : "h-full w-full"
                    )}
                    style={{
                        height: (isContractViewerOpen && windowWidth < 1024) ? `${splitRatio}%` : '100%',
                        width: (isContractViewerOpen && windowWidth >= 1024) ? `${splitRatio}%` : '100%',
                        flex: (isContractViewerOpen) ? 'none' : '1'
                    }}
                >
                    {/* PROGRESS TRACKER */}
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-black/5 dark:bg-white/5 z-[100]">
                        <motion.div
                            className="h-full bg-primary shadow-lg shadow-primary/20"
                            initial={{ width: 0 }}
                            animate={{ width: `${((step) / STEPS.length) * 100}%` }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        />
                    </div>

                    {/* STEPPER HEADER (No Close Button) */}
                    <div className="flex items-center px-6 py-6 border-b border-border/40 z-10 bg-background/80 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/20">
                                {(() => {
                                    const Icon = STEPS[step - 1].icon;
                                    return <Icon className="w-5 h-5" />;
                                })()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-1">
                                    {t('step')} {step} / {STEPS.length}
                                </span>
                                <span className="font-bold text-lg tracking-tight text-foreground leading-none">
                                    <bdi>{t(STEPS[step - 1].labelKey as any)}</bdi>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pt-6 pb-32 px-6 sm:px-6">
                        <div className="max-w-2xl mx-auto space-y-6">

                            {/* Content Card */}
                            <div className="bg-white rounded-[16px] shadow-[0px_4px_12px_rgba(13,71,161,0.04)] border border-[#CFD8DC]/30 p-6 sm:p-8 min-h-[400px]" dir="rtl">
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
                                                <div className="space-y-8 pb-6">
                                                    {!contractFile && (
                                                        <div className="bg-[#0D47A1] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-md gap-4">
                                                            <div>
                                                                <h3 className="font-extrabold text-lg mb-1">{t('aiScanTitle')}</h3>
                                                                <p className="text-white/80 text-sm">{t('aiScanDesc')}</p>
                                                            </div>
                                                            <Button
                                                                onClick={() => setIsScanning(true)}
                                                                className="bg-white text-[#0D47A1] hover:bg-white/90 font-bold shadow-sm whitespace-nowrap"
                                                            >
                                                                {t('scanNow')}
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {contractFile && (
                                                        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex items-center gap-2 sm:gap-4 text-green-600">
                                                            <CheckCircle className="w-5 h-5" />
                                                            <span className="font-bold text-sm">{t('contractScannedSuccess')}</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-6">
                                                        <div className="border-r-4 border-[#0D47A1] pr-4 mb-6 text-right">
                                                            <h3 className="font-extrabold text-2xl text-[#0D47A1] mb-2">{t('propertyDetails')}</h3>
                                                            <p className="text-[#37474F] text-sm leading-relaxed max-w-sm">בחירת הנכס אליו ישויך החוזה החדש.</p>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {!isPropertyLocked && (
                                                                <button
                                                                    onClick={handleAddNewProperty}
                                                                    className="p-6 rounded-2xl border-2 border-dashed border-[#CFD8DC] hover:border-[#0D47A1]/50 hover:bg-[#F5F7FA] transition-all group flex flex-col items-center justify-center gap-2 sm:gap-4 min-h-[140px] bg-white"
                                                                >
                                                                    <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#0D47A1] group-hover:scale-110 transition-transform">
                                                                        <Plus className="w-6 h-6" />
                                                                    </div>
                                                                    <span className="font-bold text-[#1A237E]">{t('newProperty')}</span>
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
                                                                        "p-6 rounded-2xl border-2 text-right transition-all group relative overflow-hidden bg-white",
                                                                        formData.selectedPropertyId === p.id
                                                                            ? "border-[#0D47A1] bg-[#E3F2FD]/20 shadow-sm"
                                                                            : "border-[#CFD8DC] hover:border-[#0D47A1]/50",
                                                                        isPropertyLocked && formData.selectedPropertyId !== p.id && "hidden"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-end mb-2">
                                                                        {formData.selectedPropertyId === p.id && <CheckCircle className="w-5 h-5 text-[#0D47A1]" />}
                                                                        {formData.selectedPropertyId !== p.id && <Building className="w-5 h-5 text-[#CFD8DC]" />}
                                                                    </div>
                                                                    <p className="font-bold text-lg text-[#1A237E] truncate">{p.address}</p>
                                                                    <p className="text-sm text-[#37474F]">{p.city}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {step === 2 && (
                                                <div className="space-y-8 pb-6">
                                                    <div className="border-r-4 border-[#0D47A1] pr-4 mb-8 text-right">
                                                        <h3 className="font-extrabold text-2xl text-[#0D47A1] mb-2">פרטי הדייר</h3>
                                                        <p className="text-[#37474F] text-sm leading-relaxed max-w-sm">אנא הזן את פרטי השוכר כפי שהם מופיעים בתעודת הזהות.</p>
                                                    </div>

                                                    {formData.tenants.map((tenant, index) => (
                                                        <div key={index} className="space-y-6 relative group">
                                                            {formData.tenants.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants.splice(index, 1);
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    className="absolute -top-10 left-0 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            <div className="space-y-4 text-right">
                                                                <label className="text-sm font-semibold flex items-center justify-end gap-2 text-[#1A237E]">
                                                                    <span>{t('fullName')}</span>
                                                                    <User className="w-4 h-4 text-[#0D47A1]" />
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={tenant.name}
                                                                    onChange={e => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants[index].name = e.target.value;
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    placeholder="ישראל ישראלי"
                                                                    className="w-full bg-white border border-[#CFD8DC] rounded-xl px-6 py-2 sm:py-6 text-right focus:outline-none focus:border-[#0D47A1] transition-all"
                                                                />
                                                            </div>

                                                            <div className="space-y-4 text-right">
                                                                <label className="text-sm font-semibold flex items-center justify-end gap-2 text-[#1A237E]">
                                                                    <span>{t('idNumber')}</span>
                                                                    <IdCard className="w-4 h-4 text-[#0D47A1]" />
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={tenant.id_number}
                                                                    onChange={e => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants[index].id_number = e.target.value;
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    placeholder="000000000"
                                                                    className="w-full bg-white border border-[#CFD8DC] rounded-xl px-6 py-2 sm:py-6 text-right font-mono focus:outline-none focus:border-[#0D47A1] transition-all"
                                                                />
                                                            </div>

                                                            <div className="space-y-4 text-right">
                                                                <label className="text-sm font-semibold flex items-center justify-end gap-2 text-[#1A237E]">
                                                                    <span>{t('phone')}</span>
                                                                    <Phone className="w-4 h-4 text-[#0D47A1]" />
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={tenant.phone}
                                                                    onChange={e => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants[index].phone = e.target.value;
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    placeholder="050-0000000"
                                                                    className="w-full bg-white border border-[#CFD8DC] rounded-xl px-6 py-2 sm:py-6 text-right font-mono focus:outline-none focus:border-[#0D47A1] transition-all"
                                                                    dir="ltr"
                                                                />
                                                            </div>

                                                            <div className="space-y-4 text-right">
                                                                <label className="text-sm font-semibold flex items-center justify-end gap-2 text-[#1A237E]">
                                                                    <span>{t('email')}</span>
                                                                    <Mail className="w-4 h-4 text-[#0D47A1]" />
                                                                </label>
                                                                <input
                                                                    type="email"
                                                                    value={tenant.email}
                                                                    onChange={e => {
                                                                        const newTenants = [...formData.tenants];
                                                                        newTenants[index].email = e.target.value;
                                                                        setValue('tenants', newTenants);
                                                                    }}
                                                                    placeholder="example@domain.com"
                                                                    className="w-full bg-white border border-[#CFD8DC] rounded-xl px-6 py-2 sm:py-6 text-right focus:outline-none focus:border-[#0D47A1] transition-all"
                                                                    dir="ltr"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newTenants = [...formData.tenants];
                                                            newTenants.push({ name: '', id_number: '', email: '', phone: '' });
                                                            setValue('tenants', newTenants);
                                                        }}
                                                        className="w-full mt-4 p-6 border-2 border-dashed border-[#0D47A1]/30 rounded-xl text-[#0D47A1] font-bold hover:bg-[#E3F2FD]/50 transition-colors flex justify-center items-center gap-2"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                        {t('addTenant') || "הוסף שוכר נוסף"}
                                                    </button>

                                                    <div className="mt-8 bg-[#F5F7FA] rounded-xl p-6 sm:p-6 flex items-start gap-4 justify-end">
                                                        <div className="text-right flex-1 pt-1">
                                                            <h4 className="font-bold text-[#0D47A1] text-sm mb-1">שותפים לחוזה</h4>
                                                            <p className="text-sm text-[#37474F]">כל השוכרים המופיעים בחוזה צריכים להיות רשומים עם פרטיהם המלאים להבטחת כיסוי משפטי מעולה.</p>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-[#0D47A1] flex items-center justify-center shrink-0">
                                                            <Info className="w-5 h-5 text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {step === 3 && (
                                                <div className="space-y-8 pb-6">
                                                    <div className="border-r-4 border-[#0D47A1] pr-4 mb-8 text-right">
                                                        <h3 className="font-extrabold text-2xl text-[#0D47A1] mb-2">{t('leaseTerms')}</h3>
                                                        <p className="text-[#37474F] text-sm leading-relaxed max-w-sm">הגדרת תקופות השכירות ותחנות יציאה.</p>
                                                    </div>

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

                                                    <div className="pt-6 border-t border-[#CFD8DC]">
                                                        <h4 className="font-bold text-sm mb-4 uppercase tracking-widest text-[#37474F]">{t('optionPeriods')}</h4>
                                                        {formData.optionPeriods.length === 0 && (
                                                            <div className="text-center py-6 text-[#78909C] text-xs italic bg-[#F5F7FA] rounded-xl border border-dashed border-[#CFD8DC]">
                                                                {t('noOptionsDefined')}
                                                            </div>
                                                        )}
                                                        {formData.optionPeriods.map((period, idx) => (
                                                            <div key={idx} className="flex flex-col gap-4 bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl mb-4 relative">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="absolute top-2 left-2 text-red-500 hover:bg-red-500/10 rounded-full w-8 h-8"
                                                                    onClick={() => setValue('optionPeriods', formData.optionPeriods.filter((_, i) => i !== idx))}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                                <div className="pr-8">
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
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <Input
                                                                        type="number"
                                                                        label={t('optionNoticeDays')}
                                                                        value={period.noticeDays || ''}
                                                                        onChange={(e) => {
                                                                            const newPeriods = [...formData.optionPeriods];
                                                                            newPeriods[idx].noticeDays = e.target.value ? parseInt(e.target.value) : undefined;
                                                                            setValue('optionPeriods', newPeriods);
                                                                        }}
                                                                        placeholder="0"
                                                                        className="bg-white font-mono"
                                                                        dir="ltr"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        label={t('optionReminderDays')}
                                                                        value={period.reminderDays || ''}
                                                                        onChange={(e) => {
                                                                            const newPeriods = [...formData.optionPeriods];
                                                                            newPeriods[idx].reminderDays = e.target.value ? parseInt(e.target.value) : undefined;
                                                                            setValue('optionPeriods', newPeriods);
                                                                        }}
                                                                        placeholder="0"
                                                                        className="bg-white font-mono"
                                                                        dir="ltr"
                                                                    />
                                                                </div>
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
                                                            className="text-[#0D47A1] font-bold p-0 h-auto hover:text-[#1A237E]"
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" /> {t('addPeriod')}
                                                        </Button>

                                                    </div>
                                                </div>
                                            )}

                                            {step === 4 && (
                                                <div className="space-y-8 pb-6">
                                                    <div className="border-r-4 border-[#0D47A1] pr-4 mb-8 text-right">
                                                        <h3 className="font-extrabold text-2xl text-[#0D47A1] mb-2">{t('paymentDetails')}</h3>
                                                        <p className="text-[#37474F] text-sm leading-relaxed max-w-sm">הגדרת סכום השכירות החודשי ואופן התשלום.</p>
                                                    </div>

                                                    <Input
                                                        label={<span>{t('monthlyRent')} <span className="text-red-500">*</span></span>}
                                                        value={formatNumber(formData.rent)}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value);
                                                            if (/^\d*\.?\d*$/.test(val)) setValue('rent', val as any);
                                                        }}
                                                        className="w-full font-bold text-2xl bg-[#F5F7FA] border border-[#CFD8DC] rounded-xl h-16 text-[#1A237E]"
                                                        leftIcon={<span className="text-[#37474F] text-xl font-medium">₪</span>}
                                                    />

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Input
                                                            label={t('paymentDay')}
                                                            type="number"
                                                            min={1}
                                                            max={31}
                                                            value={formData.paymentDay || ''}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                if (!isNaN(val) && val >= 1 && val <= 31) setValue('paymentDay', val);
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-4">
                                                        <Select
                                                            label={t('paymentMethod')}
                                                            value={formData.paymentMethod}
                                                            onChange={val => setValue('paymentMethod', val as any)}
                                                            placeholder={t('selectOption')}
                                                            options={PAYMENT_METHODS.map(pm => ({
                                                                value: pm.id,
                                                                label: t(pm.labelKey as any)
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="p-6 bg-[#F5F7FA] border border-[#CFD8DC] rounded-2xl space-y-4">
                                                        <Checkbox
                                                            label={<span className="font-bold text-[#1A237E]">{t('contractIsIndexed')}</span>}
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
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-6 border-t border-[#CFD8DC]">
                                                                <Select
                                                                    label={<span>{t('indexOption')} <span className="text-red-500">*</span></span>}
                                                                    value={formData.linkageType}
                                                                    onChange={val => setValue('linkageType', val as any)}
                                                                    placeholder={t('selectOption')}
                                                                    options={LINKAGE_TYPES.map((type: any) => ({
                                                                        value: type.id,
                                                                        label: t(type.labelKey as any)
                                                                    }))}
                                                                />

                                                                <div className="space-y-4">
                                                                    <label className="text-sm font-medium text-[#37474F]">{t('linkageMethod')}</label>
                                                                    <SegmentedControl
                                                                        size="sm"
                                                                        options={LINKAGE_SUB_TYPES.map((type: any) => ({
                                                                            label: t(type.labelKey as any),
                                                                            value: type.id
                                                                        }))}
                                                                        value={formData.linkageSubType === 'known' ? 'known' : 'base'}
                                                                        onChange={val => setValue('linkageSubType', val as any)}
                                                                    />
                                                                </div>
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
                                                <div className="space-y-8 pb-6">
                                                    <div className="border-r-4 border-[#0D47A1] pr-4 mb-8 text-right">
                                                        <h3 className="font-extrabold text-2xl text-[#0D47A1] mb-2">{t('securityAndAppendices')}</h3>
                                                        <p className="text-[#37474F] text-sm leading-relaxed max-w-sm">הגדרת בטחונות וסעיפים נוספים לחוזה.</p>
                                                    </div>

                                                    <Input
                                                        label={t('securityDeposit')}
                                                        value={formatNumber(formData.securityDeposit)}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value);
                                                            if (/^\d*\.?\d*$/.test(val)) setValue('securityDeposit', val as any);
                                                        }}
                                                        className="w-full font-bold bg-[#F5F7FA] border border-[#CFD8DC] rounded-xl text-[#1A237E]"
                                                        leftIcon={<span className="text-[#37474F]">₪</span>}
                                                    />

                                                    <Textarea
                                                        label={t('guarantors')}
                                                        value={formData.guarantees}
                                                        onChange={e => setValue('guarantees', e.target.value)}
                                                        className="min-h-[120px] rounded-xl border border-[#CFD8DC] bg-white focus:border-[#0D47A1]"
                                                    />

                                                    <div className="p-6 border border-[#CFD8DC] bg-[#EBECF0]/30 rounded-2xl flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <h4 className="font-bold text-sm text-[#1A237E]">{t('needsPainting')}</h4>
                                                            <p className="text-xs text-[#37474F]">{t('needsPaintingDesc')}</p>
                                                        </div>
                                                        <SegmentedControl
                                                            size="sm"
                                                            options={[
                                                                { label: t('yes'), value: 'yes' },
                                                                { label: t('no'), value: 'no' }
                                                            ]}
                                                            value={formData.needsPainting ? 'yes' : 'no'}
                                                            onChange={(val) => setValue('needsPainting', val === 'yes')}
                                                            className="shrink-0"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {step === 6 && (
                                                <div className="space-y-8">
                                                    <div className="text-center py-6">
                                                        <div className="w-20 h-20 bg-[#E3F2FD] text-[#0D47A1] rounded-full flex items-center justify-center mx-auto mb-6 scale-110 shadow-sm">
                                                            <Check className="w-10 h-10" />
                                                        </div>
                                                        <h3 className="text-2xl font-extrabold text-[#0D47A1]">{t('contractReadySummary')}</h3>
                                                        <p className="text-[#37474F] mt-2">{t('contractReadySummaryDesc', { address: formData.address || '', city: formData.city || '' })}</p>
                                                    </div>

                                                    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-6">
                                                        {/* Property & Infrastructure */}
                                                        <div className="bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl space-y-4">
                                                            <h4 className="font-bold text-[#0D47A1] flex items-center gap-2 border-b border-[#CFD8DC] pb-3 mb-2 sm:mb-4 uppercase tracking-wider text-xs">
                                                                <Building className="w-4 h-4" /> {t('infrastructure')}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                <span className="text-[#37474F]">{t('property')}</span>
                                                                <span className="text-right text-[#1A237E] truncate">{formData.address || '-'}, {formData.city || ''}</span>

                                                                <span className="text-[#37474F]">{t('propertyType')}</span>
                                                                <span className="text-right text-[#1A237E]">{t(formData.property_type as any)}</span>

                                                                {(formData.rooms || formData.size) && (
                                                                    <>
                                                                        <span className="text-[#37474F]">{t('specifications')}</span>
                                                                        <span className="text-right text-[#1A237E] font-medium border border-[#CFD8DC] rounded-xl px-2 py-1 bg-white inline-block w-fit mr-auto">
                                                                            {formData.rooms ? `${formData.rooms} ${t('rooms')}` : ''}
                                                                            {formData.rooms && formData.size ? ' | ' : ''}
                                                                            {formData.size ? `${formData.size} ${t('sizeSqm')}` : ''}
                                                                        </span>
                                                                    </>
                                                                )}

                                                                <span className="text-[#37474F]">{t('features')}</span>
                                                                <div className="flex flex-wrap justify-end gap-2">
                                                                    {formData.hasParking && <span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-lg text-xs uppercase font-bold">{t('hasParking')}</span>}
                                                                    {formData.hasStorage && <span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-lg text-xs uppercase font-bold">{t('hasStorage')}</span>}
                                                                    {formData.hasBalcony && <span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-lg text-xs uppercase font-bold">{t('hasBalcony')}</span>}
                                                                    {formData.hasSafeRoom && <span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-lg text-xs uppercase font-bold">{t('hasSafeRoom')}</span>}
                                                                    {!formData.hasParking && !formData.hasStorage && !formData.hasBalcony && !formData.hasSafeRoom && '-'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Parties Involed */}
                                                        <div className="bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl space-y-4">
                                                            <h4 className="font-bold text-[#0D47A1] flex items-center gap-2 border-b border-[#CFD8DC] pb-3 mb-2 sm:mb-4 uppercase tracking-wider text-xs">
                                                                <User className="w-4 h-4" /> {t('parties')}
                                                            </h4>
                                                            <div className="space-y-4">
                                                                {formData.tenants.map((tenant, idx) => (
                                                                    <div key={idx} className={cn("grid grid-cols-2 gap-y-2 text-sm font-bold", idx > 0 && "pt-4 border-t border-[#CFD8DC]")}>
                                                                        <span className="text-[#37474F]">{t('tenant')} {formData.tenants.length > 1 ? `#${idx + 1}` : ''}</span>
                                                                        <span className="text-right text-[#1A237E]">{tenant.name}</span>

                                                                        {tenant.id_number && (
                                                                            <>
                                                                                <span className="text-[#37474F]">{t('idNumber')}</span>
                                                                                <span className="text-right text-[#1A237E] font-medium">{tenant.id_number}</span>
                                                                            </>
                                                                        )}
                                                                        {tenant.phone && (
                                                                            <>
                                                                                <span className="text-[#37474F]">{t('phone')}</span>
                                                                                <span className="text-right text-[#1A237E] font-medium ltr">{tenant.phone}</span>
                                                                            </>
                                                                        )}
                                                                        {tenant.email && (
                                                                            <>
                                                                                <span className="text-[#37474F]">{t('email')}</span>
                                                                                <span className="text-right text-[#1A237E] font-medium truncate">{tenant.email}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Timeline */}
                                                        <div className="bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl space-y-4">
                                                            <h4 className="font-bold text-[#0D47A1] flex items-center gap-2 border-b border-[#CFD8DC] pb-3 mb-2 sm:mb-4 uppercase tracking-wider text-xs">
                                                                <Calendar className="w-4 h-4" /> {t('timeline')}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                <span className="text-[#37474F]">{t('leasePeriod')}</span>
                                                                <span className="text-right text-[#1A237E]">{formData.startDate ? format(parseISO(formData.startDate), 'dd/MM/yyyy') : '-'} - {formData.endDate ? format(parseISO(formData.endDate), 'dd/MM/yyyy') : '-'}</span>

                                                                {formData.signingDate && (
                                                                    <>
                                                                        <span className="text-[#37474F]">{t('signingDate')}</span>
                                                                        <span className="text-right text-[#1A237E] font-medium">{format(parseISO(formData.signingDate), 'dd/MM/yyyy')}</span>
                                                                    </>
                                                                )}

                                                                {formData.optionPeriods.length > 0 && (
                                                                    <>
                                                                        <span className="text-[#37474F]">{t('optionPeriods')}</span>
                                                                        <div className="text-right text-[#1A237E] space-y-1">
                                                                            {formData.optionPeriods.map((p, i) => (
                                                                                <div key={i} className="text-xs font-medium flex flex-col gap-0.5">
                                                                                    <div>{t('until')} {format(parseISO(p.endDate), 'dd/MM/yyyy')}{p.rentAmount ? ` | ${p.rentAmount}₪` : ''}</div>
                                                                                    {(p.noticeDays || p.reminderDays) && (
                                                                                        <div className="text-xs text-[#78909C]">
                                                                                            {p.noticeDays ? `${t('optionNoticeDays')}: ${p.noticeDays}` : ''}
                                                                                            {p.noticeDays && p.reminderDays ? ' | ' : ''}
                                                                                            {p.reminderDays ? `${t('optionReminderDays')}: ${p.reminderDays}` : ''}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Financials & Linkage */}
                                                        <div className="bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl space-y-4">
                                                            <h4 className="font-bold text-[#0D47A1] flex items-center gap-2 border-b border-[#CFD8DC] pb-3 mb-2 sm:mb-4 uppercase tracking-wider text-xs">
                                                                <SettingsIcon className="w-4 h-4" /> {t('financials')}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                <span className="text-[#37474F]">{t('rent')}</span>
                                                                <span className="text-right text-[#1A237E] font-extrabold">
                                                                    ₪
                                                                    {formatNumber(formData.rent)}
                                                                </span>

                                                                <span className="text-[#37474F]">{t('paymentMethod')}</span>
                                                                <span className="text-right text-[#1A237E]">{t(formData.paymentMethod?.toLowerCase() as any || '')}</span>

                                                                <span className="text-[#37474F]">{t('paymentDay')}</span>
                                                                <span className="text-right text-[#1A237E] font-medium">{formData.paymentDay} {t('month')}</span>

                                                                {formData.rentSteps.length > 0 && (
                                                                    <>
                                                                        <span className="text-[#37474F]">{t('rentSteps')}</span>
                                                                        <div className="text-right space-y-1">
                                                                            {formData.rentSteps.map((s, i) => (
                                                                                <div key={i} className="text-xs font-medium text-[#1A237E]">
                                                                                    {format(parseISO(s.startDate), 'dd/MM/yyyy')}: {s.amount}₪
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {formData.hasLinkage && (
                                                                    <>
                                                                        <span className="text-[#0D47A1] pt-2 col-span-2 border-t border-[#CFD8DC] mt-1 uppercase text-xs">{t('linkage')}</span>
                                                                        <span className="text-[#37474F]">{t('indexOption')}</span>
                                                                        <span className="text-right text-[#1A237E]">{t(LINKAGE_TYPES.find(l => l.id === formData.linkageType)?.labelKey as any || formData.linkageType as any)}</span>
                                                                        <span className="text-[#37474F]">{t('baseDate')}</span>
                                                                        <span className="text-right text-[#1A237E] font-medium">{formData.baseIndexDate ? format(parseISO(formData.baseIndexDate), 'dd/MM/yyyy') : '-'}</span>

                                                                        {(formData.linkageCeiling || formData.linkageFloor) && (
                                                                            <>
                                                                                <span className="text-[#37474F]">{t('restrictions')}</span>
                                                                                <span className="text-right text-[#1A237E] font-medium">
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
                                                            <div className="bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl space-y-4">
                                                                <h4 className="font-bold text-[#0D47A1] flex items-center gap-2 border-b border-[#CFD8DC] pb-3 mb-2 sm:mb-4 uppercase tracking-wider text-xs">
                                                                    <Shield className="w-4 h-4" /> {t('securityAndAppendices')}
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                    {formData.securityDeposit && (
                                                                        <>
                                                                            <span className="text-[#37474F]">{t('securityDeposit')}</span>
                                                                            <span className="text-right font-extrabold text-[#1A237E]">₪{formatNumber(formData.securityDeposit)}</span>
                                                                        </>
                                                                    )}

                                                                    {formData.guarantees && (
                                                                        <>
                                                                            <span className="text-[#37474F]">{t('guaranteesLabel')}</span>
                                                                            <span className="text-right text-[#1A237E] truncate">{formData.guarantees}</span>
                                                                        </>
                                                                    )}

                                                                    {formData.guarantorsInfo && (
                                                                        <>
                                                                            <span className="text-[#37474F]">{t('guarantorsInfo')}</span>
                                                                            <span className="text-right text-[#1A237E] font-medium truncate">{formData.guarantorsInfo}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Additional Details */}
                                                        {(formData.specialClauses || formData.needsPainting) && (
                                                            <div className="bg-[#F5F7FA] border border-[#CFD8DC] p-6 sm:p-6 rounded-2xl space-y-4">
                                                                <h4 className="font-bold text-[#0D47A1] flex items-center gap-2 border-b border-[#CFD8DC] pb-3 mb-2 sm:mb-4 uppercase tracking-wider text-xs">
                                                                    <FileText className="w-4 h-4" /> {t('additionalDetails')}
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm font-bold">
                                                                    {formData.needsPainting && (
                                                                        <>
                                                                            <span className="text-[#37474F]">{t('paintingIncluded')}</span>
                                                                            <span className="text-right text-[#0D47A1] uppercase text-xs font-black">{t('yes')}</span>
                                                                        </>
                                                                    )}

                                                                    {formData.specialClauses && (
                                                                        <>
                                                                            <span className="text-[#37474F] col-span-2">{t('specialClauses')}</span>
                                                                            <div className="text-left font-normal italic col-span-2 bg-white/70 p-2 sm:p-6 rounded-xl border border-[#CFD8DC] text-xs leading-relaxed text-[#1A237E]">
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
                                <div className="flex items-center justify-between px-6 py-2 sm:py-6 bg-white dark:bg-neutral-800 border-b border-border shrink-0">
                                    <span className="text-xs font-black text-muted-foreground flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> {t('originalContract')}
                                    </span>
                                    <button onClick={() => setIsContractViewerOpen(false)} className="text-muted-foreground hover:text-destructive transition-colors">
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
                    supportAction={
                        <Button
                            variant="outline"
                            className="hidden sm:flex h-12 px-6 rounded-2xl border-[#E3F2FD] bg-[#F5F7FA] text-[#0D47A1] hover:bg-[#E3F2FD] font-bold gap-2 shadow-sm"
                            onClick={() => {}}
                        >
                            <Sparkles className="w-5 h-5" />
                            {t('supportAssistant')}
                        </Button>
                    }
                />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isCropping && imageToCrop && (
                    <ImageCropper imageSrc={imageToCrop} onCropComplete={onCropComplete} onCancel={onCropCancel} aspect={4 / 3} />
                )}
            </AnimatePresence>
        </div >
    );
}
