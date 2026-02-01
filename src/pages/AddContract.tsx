import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Building, Check, User, Calendar, Settings as SettingsIcon, Shield, FileText, ChevronDown, Cloud, HardDrive, Download, Car, Box, Plus, Trash2, MapPin, Image as ImageIcon, Loader2, Upload, AlertTriangle, Clock, Wind, ShieldCheck, CheckCircle } from 'lucide-react';
import { ContractScanner } from '../components/ContractScanner';
import { PropertyIcon } from '../components/common/PropertyIcon';
import { PropertyTypeSelect } from '../components/common/PropertyTypeSelect';
import { Tooltip } from '../components/Tooltip';
import { GoogleAutocomplete } from '../components/common/GoogleAutocomplete';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn, formatDate, formatNumber, parseNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '../components/ui/DatePicker';
import { parseISO, format, addYears, subDays, isValid } from 'date-fns';
import type { ExtractedField, Tenant, Property } from '../types/database';

import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { generatePaymentSchedule } from '../utils/payment-generator';
import { useSubscription } from '../hooks/useSubscription';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractSchema, type ContractFormData } from '../schemas/contract.schema';
import { useToast } from '../hooks/useToast';
import { CompressionService } from '../services/compression.service';
import { useDataCache } from '../contexts/DataCacheContext';
import { propertyService } from '../services/property.service';

const STEPS = [
    { id: 1, labelKey: 'stepAsset', icon: Building },
    { id: 2, labelKey: 'stepTenant', icon: User },
    { id: 3, labelKey: 'stepPeriods', icon: Calendar },
    { id: 4, labelKey: 'stepPayments', icon: SettingsIcon },
    { id: 5, labelKey: 'stepSecurity', icon: Shield },
    { id: 6, labelKey: 'stepSummary', icon: Check },
];

export function AddContract() {
    const navigate = useNavigate();
    const location = useLocation();
    const { lang, t } = useTranslation();
    const { clear: clearCache } = useDataCache();

    const { success, error: toastError } = useToast();
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
            isExistingProperty: false,
            property_type: 'apartment',
            tenants: [{ name: '', id_number: '', email: '', phone: '' }],
            rent: 0,
            currency: 'ILS',
            paymentFrequency: 'Monthly',
            paymentDay: 1,
            paymentMethod: 'Checks',
            linkageType: 'none',
            linkageSubType: 'known',
            petsAllowed: 'true',
            hasLinkage: false,
            hasLinkageCeiling: false,
            needsPainting: false,
            optionPeriods: [],
            rentSteps: []
        }
    });

    const formData: ContractFormData = watch(); // Compatibility bridge

    useEffect(() => {
        const prefill = (location.state as any)?.prefill;
        if (prefill) {
            const updatedData = {
                ...formData,
                tenants: [{
                    name: prefill.tenant_name || '',
                    id_number: '',
                    email: '',
                    phone: '',
                }],
                rent: prefill.monthly_rent || 0,
                image_url: prefill?.image ? prefill.image : '',
                hasParking: !!prefill?.parking,
                hasStorage: !!prefill?.storage,
                hasBalcony: !!prefill?.balcony,
                hasSafeRoom: !!prefill?.safe_room,
                property_type: (prefill?.property_type || 'apartment') as any,
            };

            if (prefill.property_id) {
                setValue('isExistingProperty', true);
                setValue('selectedPropertyId', prefill.property_id);
                setIsPropertyLocked(true);
                setStep(2);
            }
            reset(updatedData);
            // Clear state after reading to prevent re-fill on refresh
            window.history.replaceState({}, document.title);
        }

        const propertyLocked = (location.state as any)?.propertyLocked;
        if (propertyLocked) {
            setIsPropertyLocked(true);
        }
    }, [location.state]);

    const { canAddContract, loading: subLoading, plan } = useSubscription();

    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    const [existingProperties, setExistingProperties] = useState<Property[]>([]);
    const [isPropertyLocked, setIsPropertyLocked] = useState(false);
    const [storagePreference, setStoragePreference] = useState<'cloud' | 'device' | 'both'>('device');
    const [saveContractFile, setSaveContractFile] = useState(false);
    const [hasOverlap, setHasOverlap] = useState(false);
    const [blockedIntervals, setBlockedIntervals] = useState<{ from: Date; to: Date }[]>([]);

    useEffect(() => {
        // Fetch properties for selection
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('properties')
                .select('*')
                .eq('user_id', user.id);

            if (data) setExistingProperties(data as Property[]);
        };

        fetchUserData();
    }, []);

    // Auto-calculate Base Index Date based on Israeli standards
    useEffect(() => {
        if (formData.linkageType !== 'cpi' || formData.linkageSubType === 'base') return;

        const referenceDate = formData.signingDate || formData.startDate;
        if (!referenceDate) return;

        const date = new Date(referenceDate);
        const day = date.getDate();

        let publicationDate: Date;

        if (formData.linkageSubType === 'known') {
            // Known Index (Madad Yadua):
            // If date >= 15th, the index for previous month was published on the 15th of this month.
            // If date < 15th, the latest known index is from 2 months ago, published on 15th of last month.
            const monthOffset = day >= 15 ? 0 : -1;
            publicationDate = new Date(date.getFullYear(), date.getMonth() + monthOffset, 15);
            // Example: Jan 20 (Day 20). Offset 0. PubDate: Jan 15. (Dec Index). Correct.
            // Example: Jan 10 (Day 10). Offset -1. PubDate: Dec 15 (Year-1 if needed). (Nov Index). Correct.
        } else {
            // In Respect Of (Madad B'gin):
            // Index of the current month, published on the 15th of NEXT month.
            publicationDate = new Date(date.getFullYear(), date.getMonth() + 1, 15);
        }

        // Use format instead of toISOString to avoid timezone shifting
        const newBaseDate = format(publicationDate, 'yyyy-MM-dd');

        if (formData.baseIndexDate !== newBaseDate) {
            setValue('baseIndexDate', newBaseDate);
        }

    }, [formData.signingDate, formData.startDate, formData.linkageSubType, formData.linkageType]);

    // Split Screen State
    const [splitRatio, setSplitRatio] = useState(50); // percentage for top pane
    const [isContractViewerOpen, setIsContractViewerOpen] = useState(false); // Start closed until scan
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [scannedContractUrl, setScannedContractUrl] = useState<string | null>(null);
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedQuotes, setScannedQuotes] = useState<Record<string, string>>({});
    const [fieldConfidence, setFieldConfidence] = useState<Record<string, 'high' | 'medium' | 'low'>>({});

    // Draggable Handle Logic
    const [showOverlapWarning, setShowOverlapWarning] = useState(false);
    const [overlapDetails, setOverlapDetails] = useState<{ start: string, end: string } | null>(null);

    // Fetch Active Contract Intervals for Blocking
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

    // Block access if limit reached
    if (!subLoading && !canAddContract) {
        return (
            <div className="h-screen flex items-center justify-center p-4 bg-secondary dark:bg-foreground">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground dark:text-white">
                        {t('limitReached')}
                    </h2>
                    <p className="text-muted-foreground dark:text-muted-foreground">
                        {t('limitReachedDesc', { plan: plan?.name || 'Free' })}
                    </p>
                    <button
                        onClick={() => navigate('/properties')}
                        className="w-full py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                        {t('backToContracts')}
                    </button>
                    {/* Placeholder for Upgrade Button */}
                </div>
            </div>
        );
    }

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

            setValue('image_url', data.publicUrl);
        } catch (err: any) {
            console.error('Error uploading image:', err);
            setImageError('Failed to upload image: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };



    const onSubmit = async (data: ContractFormData) => {
        setIsSaving(true);
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
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
                            property_type: data.property_type,
                            status: 'Occupied',
                            image_url: data.image_url || null,
                            user_id: user.id
                        }).select().single();

                    if (propErr) throw new Error(`Property Error: ${propErr.message}`);
                    propertyId = propData.id;
                }
            }

            // 2. Create Contract
            // Helper to safely parse numbers and return null instead of NaN
            const safeFloat = (val: any) => {
                const parsed = parseFloat(val);
                return (!isNaN(parsed) && isFinite(parsed)) ? parsed : null;
            };

            const sanitizePayload = (obj: any): any => {
                if (obj === null || obj === undefined) return obj;
                if (obj instanceof Date) return obj.toISOString();
                if (typeof obj === 'number') return (isNaN(obj) || !isFinite(obj)) ? null : obj;
                if (Array.isArray(obj)) return obj.map(sanitizePayload);
                if (typeof obj === 'object') {
                    if (obj.constructor && obj.constructor.name !== 'Object') return null;
                    const sanitized: any = {};
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            sanitized[key] = sanitizePayload(obj[key]);
                        }
                    }
                    return sanitized;
                }
                return obj;
            };

            const contractPayload = {
                property_id: propertyId,
                tenants: (data.tenants || []).filter(t => t.name.trim() !== '').map(t => ({
                    name: t.name || '',
                    id_number: t.id_number || '',
                    email: t.email || '',
                    phone: t.phone || ''
                })),
                signing_date: data.signingDate || null,
                start_date: data.startDate || null,
                end_date: data.endDate || null,
                base_rent: data.rent || 0,
                currency: data.currency,
                payment_frequency: data.paymentFrequency,
                payment_day: data.paymentDay,
                linkage_type: data.linkageType,
                linkage_sub_type: (data.linkageType === 'none') ? null : data.linkageSubType,
                linkage_ceiling: data.hasLinkageCeiling ? data.linkageCeiling : null,
                linkage_floor: data.linkageFloor,
                base_index_date: data.baseIndexDate || null,
                base_index_value: data.baseIndexValue,
                security_deposit_amount: data.securityDeposit || 0,
                status: 'active',
                option_notice_days: data.optionNoticeDays || null,
                option_periods: (data.optionPeriods || []).map((p, idx) => {
                    const prevDateStr = idx === 0 ? data.endDate : data.optionPeriods[idx - 1].endDate;
                    const prevDate = prevDateStr ? parseISO(prevDateStr) : null;
                    const currDate = p.endDate ? parseISO(p.endDate) : null;
                    let months = 0;
                    if (prevDate && isValid(prevDate) && currDate && isValid(currDate)) {
                        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        months = Math.round(diffDays / 30);
                    }
                    return {
                        length: months || 0,
                        unit: 'months' as const,
                        rentAmount: p.rentAmount,
                        currency: p.currency || 'ILS'
                    };
                }),
                rent_periods: (data.rentSteps || []).map(s => ({
                    startDate: s.startDate || data.startDate,
                    amount: s.amount || 0,
                    currency: s.currency || 'ILS'
                })),
                user_id: user.id,
                needs_painting: !!data.needsPainting,
                pets_allowed: data.petsAllowed === 'true',
                special_clauses: data.specialClauses,
                guarantees: data.guarantees,
                guarantors_info: data.guarantorsInfo
            };

            const sanitizedPayload = sanitizePayload(contractPayload);
            const { data: newContract, error: contractError } = await supabase.from('contracts').insert(sanitizedPayload).select().single();

            if (contractError) throw new Error(`[${contractError.code}] ${contractError.message}`);

            // 3. Generate Expected Payments
            if (newContract) {
                const schedule = await generatePaymentSchedule({
                    startDate: data.startDate,
                    endDate: data.endDate,
                    baseRent: data.rent || 0,
                    currency: data.currency as any,
                    paymentFrequency: data.paymentFrequency as any,
                    paymentDay: data.paymentDay,
                    linkageType: data.linkageType as any,
                    linkageSubType: data.linkageSubType as any,
                    baseIndexDate: data.baseIndexDate || null,
                    baseIndexValue: data.baseIndexValue,
                    linkageCeiling: data.hasLinkageCeiling ? data.linkageCeiling : null,
                    linkageFloor: data.linkageFloor,
                    rent_periods: (data.rentSteps || []).map(s => ({
                        startDate: s.startDate || data.startDate,
                        amount: s.amount || 0,
                        currency: s.currency || 'ILS',
                    }))
                });

                if (schedule.length > 0) {
                    await supabase.from('payments').insert(
                        schedule.map(p => ({
                            ...p,
                            contract_id: newContract.id,
                            user_id: user.id
                        }))
                    );
                }
            }

            // 4. Handle File Storage
            if (contractFile && saveContractFile) {
                let fileToUpload = contractFile;
                if (CompressionService.isImage(fileToUpload)) {
                    fileToUpload = await CompressionService.compressImage(fileToUpload);
                }

                if (storagePreference === 'cloud' || storagePreference === 'both') {
                    const fileName = `contract_${Date.now()}.${fileToUpload.name.split('.').pop()}`;
                    const filePath = `${propertyId}/${fileName}`;
                    const { error: uploadError } = await supabase.storage.from('contracts').upload(filePath, fileToUpload);
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(filePath);
                        await supabase.from('contracts').update({ contract_file_url: publicUrl }).eq('id', newContract.id);
                    }
                }

                if (storagePreference === 'device' || storagePreference === 'both') {
                    const url = URL.createObjectURL(contractFile);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `contract_${data.tenants[0]?.name.trim().replace(/\s+/g, '_') || 'tenant'}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }

            await propertyService.syncOccupancyStatus(propertyId, user.id);
            clearCache();
            success(t('success'), t('contractCreated'));
            navigate('/properties');
        } catch (err: any) {
            console.error('Save error:', err);
            toastError(t('error'), err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const nextStep = async () => {
        if (step === 1) {
            if (!formData.address && !formData.selectedPropertyId) {
                toastError(t('stepAsset'), t('propertyRequired'));
                return;
            }

            if (!formData.selectedPropertyId) {
                const title = `${formData.address || ''}, ${formData.city || ''}`;
                const { data: propData } = await supabase.from('properties').select('id').eq('title', title).maybeSingle();
                if (propData) setValue('selectedPropertyId', propData.id);
            }

            const isStepValid = await trigger(['selectedPropertyId', 'address', 'city']);
            if (!isStepValid) return;
        }

        if (step === 2) {
            const isStepValid = await trigger('tenants');
            if (!isStepValid) return;
        }

        if (step === 3) {
            const isStepValid = await trigger(['startDate', 'endDate']);
            if (!isStepValid) return;
            await checkOverlap(formData.selectedPropertyId || '', formData.startDate || '', formData.endDate || '');
        }

        if (step === 4) {
            const isStepValid = await trigger('rent');
            if (!isStepValid) return;
        }

        if (step === 5) {
            const isStepValid = await trigger();
            if (!isStepValid) return;
        }

        if (step < 6) {
            setStep(s => s + 1);
            window.scrollTo(0, 0);
        } else {
            handleSubmit(onSubmit as any)();
        }
    };

    const prevStep = () => {
        setStep(s => Math.max(s - 1, 1));
    };

    // Overlap Check Logic
    async function checkOverlap(propId: string, start: string, end: string) {
        if (!propId || !start || !end) return;

        // Reset overlap state before checking
        setHasOverlap(false);

        try {
            const { data: overlaps, error } = await supabase
                .from('contracts')
                .select('start_date, end_date')
                .eq('property_id', propId)
                .eq('status', 'active') // Only check active contracts
                .or(`and(start_date.lte.${end},end_date.gte.${start})`) // Overlap logic: StartA <= EndB AND EndA >= StartB
                .limit(1);

            if (error) {
                console.error("Error checking overlap", error);
                return;
            }

            if (overlaps && overlaps.length > 0) {
                setOverlapDetails({ start: overlaps[0].start_date, end: overlaps[0].end_date });
                setShowOverlapWarning(true);
                setHasOverlap(true);
            }
        } catch (err) {
            console.error(err);
        }
    }



    const handleDragStart = () => {
        const isDesktop = window.innerWidth >= 1024;
        const moveHandler = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const clientVal = isDesktop
                ? ('touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX)
                : ('touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY);
            const totalSize = isDesktop ? window.innerWidth : window.innerHeight;
            const newRatio = Math.min(Math.max((clientVal / totalSize) * 100, 25), 75);
            setSplitRatio(newRatio);
        };
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('touchend', upHandler);
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('touchend', upHandler);
    };

    const handleScanComplete = (extractedData: ExtractedField[], url: string, file?: File) => {
        setIsScanning(false);
        if (url) {
            setScannedContractUrl(url);
            setIsContractViewerOpen(true); // Open viewer automatically after scan
        }
        if (file) setContractFile(file);

        // Extract values, quotes, and CONFIDENCE
        const quotes: Record<string, string> = {};
        const confidences: Record<string, 'high' | 'medium' | 'low'> = {};
        const newFormData: any = { ...formData };

        const scannedStreet = '';
        let scannedBuilding = '';

        extractedData.forEach(field => {
            const key = field.fieldName;
            const val = String(field.extractedValue || '');
            const quote = field.sourceText || '';
            let conf: 'high' | 'medium' | 'low' = field.confidence === 'high' ? 'high' : field.confidence === 'medium' ? 'medium' : 'low';

            // Override confidence to low if value is empty
            if (!val || val.trim() === '') {
                conf = 'low';
            }

            if (key) {
                quotes[key] = quote;
                confidences[key] = conf;
            }

            // Field Mapping

            switch (key) {
                // Property
                case 'city':
                    newFormData.city = val;
                    break;
                case 'address':
                case 'street': // Fallback if scanner maps to street
                    newFormData.address = val;
                    break;
                case 'buildingNum':
                    scannedBuilding = val;
                    break;
                case 'rooms':
                    newFormData.rooms = val;
                    break;
                case 'size':
                    newFormData.size = val;
                    break;
                case 'hasParking': // Note: Scanner maps 'has_parking' -> 'hasParking'? No, let's check Scanner.
                    // Scanner mapping: 'has_parking': (undefined in previous edit? Let's assume standard camelCase or manual)
                    // Re-reading Scanner: 'has_parking': undefined in list!
                    // Wait, I didn't add has_parking to Scanner mapping!
                    // I need to be careful. I will stick to what I DEFINED in Scanner.
                    // Scanner has: tenantName, tenantId, tenantEmail, tenantPhone, landlordName...
                    // address, city, street, buildingNum, aptNum, size, rooms, floor
                    // rent, currency, paymentDay, paymentFrequency
                    // securityDeposit, guaranteeType
                    // startDate, endDate, signingDate
                    // linkageType, indexCalculationMethod, baseIndexDate, baseIndexValue, indexLimitType
                    // renewalOption, petsAllowed

                    break;

                // Correct cases based on Scanner mapping:
                // Duplicates removed

                // Tenant
                // Tenants (Store in first tenant for scan results)
                case 'tenantName': newFormData.tenants[0].name = val; break;
                case 'tenantId': newFormData.tenants[0].id_number = val; break;
                case 'tenantEmail': newFormData.tenants[0].email = val; break;
                case 'tenantPhone': newFormData.tenants[0].phone = val; break;

                // Financials
                case 'rent': newFormData.rent = val; break;
                case 'currency': newFormData.currency = val; break;
                case 'paymentFrequency': newFormData.paymentFrequency = val; break;
                case 'paymentDay': newFormData.paymentDay = val; break;

                // Dates
                case 'signingDate': newFormData.signingDate = val; break;
                case 'startDate': newFormData.startDate = val; break;
                case 'endDate': newFormData.endDate = val; break;

                // Linkage
                case 'linkageType':
                    newFormData.linkageType = val;
                    newFormData.hasLinkage = val !== 'none' && val !== 'null' && !!val;
                    break;
                case 'indexCalculationMethod': newFormData.linkageSubType = val; break;
                case 'baseIndexDate': newFormData.baseIndexDate = val; break;
                case 'baseIndexValue': newFormData.baseIndexValue = val; break;
                case 'linkageCeiling':
                    newFormData.linkageCeiling = val;
                    newFormData.hasLinkageCeiling = !!val && val !== '0';
                    break;

                // Security
                case 'securityDeposit': newFormData.securityDeposit = val; break;
                case 'guaranteeType': newFormData.guarantees = val; break;
                case 'guarantorsInfo': newFormData.guarantorsInfo = val; break;
                case 'petsAllowed': newFormData.petsAllowed = val; break;
                case 'specialClauses': newFormData.specialClauses = val; break;
            }

            // Also preserve original logic if needed, but the switch above covers most.
            // Map confidence
            quotes[key] = quote;
            confidences[key] = conf; // Use original key for confidence lookups

            if (!newFormData.address && (scannedStreet || scannedBuilding)) {
                newFormData.address = `${scannedStreet} ${scannedBuilding}`.trim();
            }

            // Smart Match: Check for existing Property and Tenant
            const scanAddress = (newFormData.address || '').trim();
            const scanAddrNorm = scanAddress.replace(/\s/g, '');

            const matchedProp = existingProperties.find(p => {
                if (!p.address) return false;
            });

            if (matchedProp) {
                setValue('isExistingProperty', true);
                setValue('selectedPropertyId', matchedProp.id);

                if (matchedProp.address && matchedProp.city) {
                    setValue('address', matchedProp.address);
                    setValue('city', matchedProp.city);
                }
            }
            setScannedQuotes(quotes);
            setFieldConfidence(confidences);
            setStep(1);
        });
    };



    const ConfidenceDot = ({ field }: { field: string }) => {
        const conf = fieldConfidence[field];
        // Only show confidence if there is a value extracted and it's not effectively empty
        if (!conf || !formData[field as keyof typeof formData]) return null;
        const color = conf === 'high' ? 'bg-green-500' : conf === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
        return (
            <div className={`w-2 h-2 rounded-full ${color} inline-block ml-2 mb-0.5`} title={`AI Confidence: ${conf}`} />
        );
    };

    return (
        <div className={cn(
            "relative h-screen overflow-hidden bg-background flex",
            isContractViewerOpen ? "flex-col lg:flex-row-reverse" : "flex-col"
        )}>
            {/* Floating Toggle Button */}
            <AnimatePresence>
                {scannedContractUrl && !isScanning && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -20 }}
                        onClick={() => setIsContractViewerOpen(!isContractViewerOpen)}
                        className="fixed top-24 left-4 z-50 bg-white shadow-lg border border-border p-2 rounded-full flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        {isContractViewerOpen ? <ChevronDown className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
                        <span className="text-xs font-bold pl-1 text-foreground">{t('hideContract')}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Top Pane: Wizard Form */}
            <div
                className={cn(
                    "flex-1 overflow-y-auto custom-scrollbar transition-all duration-300",
                    isContractViewerOpen ? "border-b lg:border-b-0 lg:border-r border-border/50" : "h-full w-full"
                )}
                style={{
                    height: (isContractViewerOpen && windowWidth < 1024) ? `${splitRatio}%` : '100%',
                    width: (isContractViewerOpen && windowWidth >= 1024) ? `${splitRatio}%` : '100%',
                    flex: (isContractViewerOpen) ? 'none' : '1'
                }}
            >
                <div className={cn("max-w-2xl mx-auto p-6 transition-all", isContractViewerOpen ? "pb-20" : "pb-40")}>
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate('/properties')} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('newContract')}</h1>
                            <p className="text-sm text-muted-foreground">{t('newContractDesc')}</p>
                        </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-between mb-8 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10" />
                        {STEPS.map((s) => {
                            const isActive = s.id === step;
                            const isCompleted = s.id < step;
                            const Icon = s.icon;

                            return (
                                <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                            isActive ? "border-primary bg-primary text-primary-foreground scale-110" :
                                                isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground bg-background"
                                        )}
                                    >
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={cn("text-xs font-medium transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")}>
                                        {t(s.labelKey)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Main Form Content */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]" dir="rtl">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                isScanning ? (
                                    <ContractScanner mode="embedded" onScanComplete={handleScanComplete} onCancel={() => setIsScanning(false)} skipReview={true} />
                                ) : (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        {/* AI Scan Banner */}
                                        {!contractFile && (
                                            <div className="bg-gradient-to-l from-blue-600 to-indigo-600 rounded-xl p-6 text-white flex items-center justify-between shadow-lg">
                                                <div>
                                                    <h3 className="font-bold text-lg mb-1">{t('aiScanTitle')}</h3>
                                                    <p className="text-blue-100 text-sm opacity-90">{t('aiScanDesc')}</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsScanning(true)}
                                                    className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/10 transition-colors shadow-sm"
                                                >
                                                    {t('scanNow')}
                                                </button>
                                            </div>
                                        )}

                                        {contractFile && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                                                <Check className="w-5 h-5" />
                                                <span className="font-medium text-sm">{t('contractScannedSuccess')}</span>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-lg flex items-center gap-2"><Building className="w-4 h-4" /> {t('propertyDetails')}</h3>

                                                {!isPropertyLocked && (
                                                    <div className="flex bg-secondary/50 p-1 rounded-lg">
                                                        <button
                                                            onClick={() => setValue('isExistingProperty', false)}
                                                            className={cn(
                                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                                !formData.isExistingProperty ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            {t('newProperty')}
                                                        </button>
                                                        <button
                                                            onClick={() => setValue('isExistingProperty', true)}
                                                            className={cn(
                                                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                                formData.isExistingProperty ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            {t('existingProperty')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {formData.isExistingProperty ? (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('chooseProperty')}</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {existingProperties.map((p) => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setValue('selectedPropertyId', p.id);
                                                                    if (p.address && p.city) {
                                                                        setValue('address', p.address);
                                                                        setValue('city', p.city);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "p-4 rounded-xl border-2 text-right transition-all group",
                                                                    formData.selectedPropertyId === p.id
                                                                        ? "border-primary bg-primary/5 shadow-md"
                                                                        : "border-secondary dark:border-gray-800 hover:border-primary/50"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-xs font-semibold text-primary">{t('property')}</span>
                                                                    {formData.selectedPropertyId === p.id && <CheckCircle className="w-5 h-5 text-primary" />}
                                                                </div>
                                                                <p className="font-bold text-lg text-foreground">{p.address}</p>
                                                                <p className="text-sm text-muted-foreground">{p.city}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Asset Type */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('propertyType')} <ConfidenceDot field="property_type" /></label>
                                                            <PropertyTypeSelect
                                                                value={formData.property_type as any}
                                                                onChange={(val) => setValue('property_type', val as any)}
                                                            />
                                                        </div>

                                                        {/* City */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('city')} <span className="text-red-500">*</span> {scannedQuotes.city && <Tooltip quote={scannedQuotes.city} />} <ConfidenceDot field="city" /></label>
                                                            <GoogleAutocomplete
                                                                value={formData.city || ''}
                                                                onChange={val => setValue('city', val)}
                                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                                type="cities"
                                                                error={!!errors.city}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Address */}
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium flex items-center gap-2">{t('address')} <span className="text-red-500">*</span> {scannedQuotes.street && <Tooltip quote={scannedQuotes.street} />} <ConfidenceDot field="address" /></label>
                                                        <div className="relative">
                                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                                            <GoogleAutocomplete
                                                                value={formData.address || ''}
                                                                onChange={(val) => setValue('address', val)}
                                                                className="w-full p-3 bg-background border border-border rounded-xl pl-10"
                                                                type="address"
                                                                biasCity={formData.city}
                                                                placeholder={t('searchProperty')}
                                                                error={!!errors.address}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Specs */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('rooms')} <ConfidenceDot field="rooms" /></label>
                                                            <input
                                                                type="text"
                                                                value={formData.rooms?.toString() || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setValue('rooms', val === '' ? undefined : parseFloat(val) as any);
                                                                }}
                                                                className="w-full p-3 bg-background border border-border rounded-xl no-spinner"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('sizeSqm')} <ConfidenceDot field="size" /></label>
                                                            <input
                                                                type="text"
                                                                value={formData.size?.toString() || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setValue('size', val === '' ? undefined : parseFloat(val) as any);
                                                                }}
                                                                className="w-full p-3 bg-background border border-border rounded-xl no-spinner"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Amenities */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                            formData.hasBalcony ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                        )}>
                                                            <input type="checkbox" className="hidden" checked={formData.hasBalcony} onChange={e => setValue('hasBalcony', e.target.checked)} />
                                                            <div className="p-2 bg-secondary rounded-full text-foreground"><Wind className="w-5 h-5" /></div>
                                                            <span className="font-medium flex items-center gap-2">{t('balcony')} <ConfidenceDot field="hasBalcony" /></span>
                                                        </label>

                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                            formData.hasSafeRoom ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                        )}>
                                                            <input type="checkbox" className="hidden" checked={formData.hasSafeRoom} onChange={e => setValue('hasSafeRoom', e.target.checked)} />
                                                            <div className="p-2 bg-secondary rounded-full text-foreground"><ShieldCheck className="w-5 h-5" /></div>
                                                            <span className="font-medium flex items-center gap-2">{t('safeRoom')} <ConfidenceDot field="hasSafeRoom" /></span>
                                                        </label>

                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                            formData.hasParking ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                        )}>
                                                            <input type="checkbox" className="hidden" checked={formData.hasParking} onChange={e => setValue('hasParking', e.target.checked)} />
                                                            <div className="p-2 bg-secondary rounded-full text-foreground"><Car className="w-5 h-5" /></div>
                                                            <span className="font-medium flex items-center gap-2">{t('parking')} <ConfidenceDot field="hasParking" /></span>
                                                        </label>

                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                            formData.hasStorage ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                        )}>
                                                            <input type="checkbox" className="hidden" checked={formData.hasStorage} onChange={e => setValue('hasStorage', e.target.checked)} />
                                                            <div className="p-2 bg-secondary rounded-full text-foreground"><Box className="w-5 h-5" /></div>
                                                            <span className="font-medium flex items-center gap-2">{t('storage')} <ConfidenceDot field="hasStorage" /></span>
                                                        </label>
                                                    </div>

                                                    {/* Image Section */}
                                                    <div className="space-y-3 pt-2">
                                                        <label className="text-sm font-medium">{t('propertyImage')}</label>

                                                        {/* Toggle Tabs */}
                                                        <div className="flex p-1 bg-secondary/50 rounded-lg w-fit">
                                                            <button
                                                                type="button"
                                                                onClick={() => setUploadMode('upload')}
                                                                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", uploadMode === 'upload' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                                            >
                                                                {t('uploadFile')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setUploadMode('url')}
                                                                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", uploadMode === 'url' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                                            >
                                                                {t('importFromGoogle')}
                                                            </button>
                                                        </div>

                                                        {uploadMode === 'url' ? (
                                                            <div className="space-y-2">
                                                                <div className="flex gap-2">
                                                                    <div className="relative flex-1">
                                                                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                        <input
                                                                            type="url"
                                                                            value={formData.image_url}
                                                                            onChange={(e) => setValue('image_url', e.target.value)}
                                                                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            if (!formData.address || !formData.city) {
                                                                                alert(t('enterAddressAndCityFirst'));
                                                                                return;
                                                                            }

                                                                            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                                                                            if (!apiKey) return;

                                                                            const location = `${formData.address}, ${formData.city}`;
                                                                            const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${apiKey}`;

                                                                            setValue('image_url', imageUrl);
                                                                        }}
                                                                        className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/10 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                                                                    >
                                                                        {t('importFromGoogle')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:bg-secondary/20 transition-colors text-center cursor-pointer group">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        disabled={isUploading}
                                                                        onChange={handleFileUpload}
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                                    />
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        {isUploading ? (
                                                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                                        ) : (
                                                                            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {isUploading ? t('uploading') : t('clickToUpload')}
                                                                        </span>
                                                                        {imageError && (
                                                                            <span className="text-xs text-red-500 mt-1">{imageError}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Preview */}
                                                        {formData.image_url && (
                                                            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-secondary/10 mt-2">
                                                                <img
                                                                    src={formData.image_url}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop';
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setValue('image_url', '')}
                                                                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full shadow-sm hover:bg-white"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        {/* AI Scan Banner moved to Tenant details when asset is pre-set or as alternative scan point */}
                                        {!contractFile && (
                                            <div className="bg-gradient-to-l from-blue-600 to-indigo-600 rounded-xl p-6 text-white flex items-center justify-between shadow-lg mb-4">
                                                <div>
                                                    <h3 className="font-bold text-lg mb-1">{t('aiScanTitle')}</h3>
                                                    <p className="text-blue-100 text-sm opacity-90">{t('aiScanDesc')}</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsScanning(true)}
                                                    className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/10 transition-colors shadow-sm"
                                                >
                                                    {t('scanNow')}
                                                </button>
                                            </div>
                                        )}

                                        {contractFile && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700 mb-4">
                                                <Check className="w-5 h-5" />
                                                <span className="font-medium text-sm">{t('contractScannedSuccess')}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-lg flex items-center gap-2"><User className="w-4 h-4" /> {t('tenantDetails')}</h3>
                                        </div>

                                        <div className="space-y-6">
                                            {formData.tenants.map((tenant, index) => (
                                                <div key={index} className="p-4 border border-border rounded-2xl space-y-4 relative bg-secondary/5 group transition-colors hover:bg-secondary/10">
                                                    {formData.tenants.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTenants = [...formData.tenants];
                                                                newTenants.splice(index, 1);
                                                                setValue('tenants', newTenants);
                                                            }}
                                                            className="absolute top-3 left-3 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium flex items-center gap-2">
                                                            {t('fullName')} <span className="text-red-500">*</span>
                                                            {index === 0 && scannedQuotes.tenantName && <Tooltip quote={scannedQuotes.tenantName} />}
                                                            {index === 0 && <ConfidenceDot field="tenants" />}
                                                        </label>
                                                        <input
                                                            value={tenant.name}
                                                            onChange={e => {
                                                                const newTenants = [...formData.tenants];
                                                                newTenants[index].name = e.target.value;
                                                                setValue('tenants', newTenants);
                                                            }}
                                                            className={cn(
                                                                "w-full p-3 bg-background border rounded-xl transition-all duration-300",
                                                                (!tenant.name && index === 0 && step === 2) ? "border-red-500 ring-1 ring-red-500" : "border-border"
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">{t('idNumber')}</label>
                                                            <input
                                                                value={tenant.id_number}
                                                                onChange={e => {
                                                                    const newTenants = [...formData.tenants];
                                                                    newTenants[index].id_number = e.target.value;
                                                                    setValue('tenants', newTenants);
                                                                }}
                                                                className="w-full p-3 bg-background border border-border rounded-xl font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">{t('phone')}</label>
                                                            <input
                                                                value={tenant.phone}
                                                                onChange={e => {
                                                                    const newTenants = [...formData.tenants];
                                                                    newTenants[index].phone = e.target.value;
                                                                    setValue('tenants', newTenants);
                                                                }}
                                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">{t('email')}</label>
                                                        <input
                                                            value={tenant.email}
                                                            onChange={e => {
                                                                const newTenants = [...formData.tenants];
                                                                newTenants[index].email = e.target.value;
                                                                setValue('tenants', newTenants);
                                                            }}
                                                            className="w-full p-3 bg-background border border-border rounded-xl"
                                                            type="email"
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <DatePicker
                                                    label={t('signingDate')}
                                                    value={formData.signingDate ? parseISO(formData.signingDate) : undefined}
                                                    onChange={(date) => {
                                                        const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
                                                        setValue('signingDate', dateStr);
                                                        // Pre-fill base index date if it's empty
                                                        if (dateStr && !formData.baseIndexDate) {
                                                            setValue('baseIndexDate', dateStr);
                                                        }
                                                    }}
                                                    placeholder={t('selectDate')}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <DatePicker
                                                    label={<span>{t('startDate')} <span className="text-red-500">*</span></span>}
                                                    value={formData.startDate ? parseISO(formData.startDate) : undefined}
                                                    onChange={(date) => {
                                                        const startDateStr = date ? format(date, 'yyyy-MM-dd') : '';
                                                        const prevStartDateStr = formData.startDate;
                                                        const prevEndDateStr = formData.endDate;

                                                        let newEndDateStr = prevEndDateStr;

                                                        // Check if the current end date was auto-calculated from the previous start date
                                                        let wasAutoCalculated = false;
                                                        if (prevStartDateStr && prevEndDateStr) {
                                                            const prevStart = parseISO(prevStartDateStr);
                                                            if (isValid(prevStart)) {
                                                                const expectedPrevEnd = format(subDays(addYears(prevStart, 1), 1), 'yyyy-MM-dd');
                                                                wasAutoCalculated = expectedPrevEnd === prevEndDateStr;
                                                            }
                                                        }

                                                        // Update end date if it's empty OR it was auto-calculated previously
                                                        if (date && (!prevEndDateStr || wasAutoCalculated)) {
                                                            const calculatedEnd = subDays(addYears(date, 1), 1);
                                                            newEndDateStr = format(calculatedEnd, 'yyyy-MM-dd');
                                                        }

                                                        setValue('startDate', startDateStr);
                                                        setValue('endDate', newEndDateStr);
                                                    }}
                                                    disabledDays={blockedIntervals}
                                                    error={hasOverlap || (!formData.startDate && step === 3)}
                                                    placeholder={t('selectDate')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <DatePicker
                                                    label={<span>{t('endDate')} <span className="text-red-500">*</span></span>}
                                                    value={formData.endDate ? parseISO(formData.endDate) : undefined}
                                                    onChange={(date) => setValue('endDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    minDate={formData.startDate ? parseISO(formData.startDate) : undefined}
                                                    disabledDays={blockedIntervals}
                                                    error={!formData.endDate && step === 3}
                                                    placeholder={t('selectDate')}
                                                />
                                                {formData.startDate && formData.endDate && (
                                                    <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg flex items-center gap-2">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>
                                                            {t('contractDuration')}:
                                                            <span className="font-bold text-foreground">
                                                                {(() => {
                                                                    const start = new Date(formData.startDate);
                                                                    const end = new Date(formData.endDate);
                                                                    const diffTime = Math.abs(end.getTime() - start.getTime());
                                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include end date

                                                                    const months = Math.floor(diffDays / 30);
                                                                    const years = Math.floor(months / 12);
                                                                    const remainingMonths = months % 12;

                                                                    if (years > 0) return ` ${years} ${t('years')}${remainingMonths > 0 ? ` ${t('and')}${remainingMonths} ${t('months')}` : ''}`;
                                                                    if (months > 0) return ` ${months} ${t('months')}`;
                                                                    return ` ${diffDays} ${t('days')}`;
                                                                })()}
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    {t('optionPeriods')}
                                                    {scannedQuotes.optionPeriod && <Tooltip quote={scannedQuotes.optionPeriod} />} <ConfidenceDot field="optionPeriod" />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const lastOption = formData.optionPeriods[formData.optionPeriods.length - 1];
                                                        const baseDateStr = lastOption?.endDate || formData.endDate;
                                                        let defaultDate = '';

                                                        if (baseDateStr) {
                                                            const baseDate = parseISO(baseDateStr);
                                                            if (isValid(baseDate)) {
                                                                defaultDate = format(addYears(baseDate, 1), 'yyyy-MM-dd');
                                                            }
                                                        }

                                                        setValue('optionPeriods', [...formData.optionPeriods, { endDate: defaultDate, rentAmount: null as any, currency: 'ILS' }]);
                                                    }}
                                                    className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> {t('addPeriod')}
                                                </button>
                                            </div>

                                            {formData.optionPeriods.length === 0 && (
                                                <div className="text-sm text-muted-foreground italic p-3 bg-secondary rounded-xl text-center border border-dashed border-border">
                                                    {t('noOptionPeriods')}
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {formData.optionPeriods.map((period, idx) => (
                                                    <div key={idx} className="flex gap-2 items-end bg-secondary/10 p-3 rounded-xl">
                                                        <div className="flex-1 space-y-2">
                                                            <DatePicker
                                                                label={`${t('extensionEndDate')} ${idx + 1}`}
                                                                value={period.endDate ? parseISO(period.endDate) : undefined}
                                                                onChange={(date) => {
                                                                    const newPeriods = [...formData.optionPeriods];
                                                                    newPeriods[idx].endDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                                    setValue('optionPeriods', newPeriods);
                                                                }}
                                                                minDate={idx === 0
                                                                    ? (formData.endDate ? parseISO(formData.endDate) : undefined)
                                                                    : (formData.optionPeriods[idx - 1].endDate ? parseISO(formData.optionPeriods[idx - 1].endDate) : undefined)
                                                                }
                                                                className="w-full"
                                                            />
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newPeriods = formData.optionPeriods.filter((_, i) => i !== idx);
                                                                setValue('optionPeriods', newPeriods);
                                                            }}
                                                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-border/50 h-[46px]"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Extension Notice Days */}
                                            {formData.optionPeriods.length > 0 && (
                                                <div className="pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium flex items-center gap-2">
                                                            {t('extensionNoticeDays')}
                                                        </label>
                                                        <div className="relative">
                                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                value={formatNumber(formData.optionNoticeDays)}
                                                                onChange={e => {
                                                                    const val = parseNumber(e.target.value);
                                                                    if (/^\d*$/.test(val)) setValue('optionNoticeDays', val as any);
                                                                }}
                                                                className="w-full p-3 pl-10 bg-background border border-border rounded-xl no-spinner"
                                                                placeholder="e.g. 60"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {
                                step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> {t('paymentDetails')}</h3>

                                        <div className="space-y-6">
                                            {/* 1. Rent Amount */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    {t('monthlyRent')} <span className="text-red-500">*</span>
                                                    {scannedQuotes.rent && <Tooltip quote={scannedQuotes.rent} />} <ConfidenceDot field="rent" />
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3 text-muted-foreground">{formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}</span>
                                                    <input
                                                        type="text"
                                                        value={formatNumber(formData.rent)}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value);
                                                            if (/^\d*\.?\d*$/.test(val)) setValue('rent', val as any);
                                                        }}
                                                        className={cn(
                                                            "w-full pl-8 p-3 bg-background border rounded-xl font-bold text-lg no-spinner transition-all duration-300",
                                                            ((!formData.rent || formData.rent <= 0) && step === 4) ? "border-red-500 ring-1 ring-red-500" : "border-border"
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* Extension Rent Amount(s) - Moved here from Step 3 */}
                                            {formData.optionPeriods.map((period, idx) => (
                                                <div key={idx} className="space-y-3 p-4 bg-secondary/10 rounded-2xl border border-dashed border-border animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-sm font-medium flex items-center gap-2">
                                                        {t('stepOptionRent')} {formData.optionPeriods.length > 1 ? idx + 1 : ''}
                                                        <span className="text-xs text-muted-foreground font-normal">
                                                            ({period.endDate ? formatDate(period.endDate) : t('noEndDate')})
                                                        </span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3 text-muted-foreground">{formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}</span>
                                                        <input
                                                            type="text"
                                                            value={formatNumber(period.rentAmount)}
                                                            onChange={e => {
                                                                const val = parseNumber(e.target.value);
                                                                if (/^\d*\.?\d*$/.test(val)) {
                                                                    const newPeriods = [...formData.optionPeriods];
                                                                    newPeriods[idx].rentAmount = val as any;
                                                                    setValue('optionPeriods', newPeriods);
                                                                }
                                                            }}
                                                            className="w-full pl-8 p-3 bg-background border border-border rounded-xl font-bold text-lg no-spinner"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            {/* 2. Frequency & Method Grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium flex items-center gap-2">{t('paymentFrequency')} <ConfidenceDot field="paymentFrequency" /></label>
                                                    <div className="relative">
                                                        <select
                                                            value={formData.paymentFrequency}
                                                            onChange={e => setValue('paymentFrequency', e.target.value as any)}
                                                            className="w-full p-3 bg-background border border-border rounded-xl appearance-none pr-10"
                                                        >
                                                            <option value="Monthly">{t('monthly')}</option>
                                                            <option value="Quarterly">{t('quarterly')}</option>
                                                            <option value="Annually">{t('annually')}</option>
                                                        </select>
                                                        <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium flex items-center gap-2">{t('paymentMethod')} <ConfidenceDot field="paymentMethod" /></label>
                                                    <div className="relative">
                                                        <select
                                                            value={formData.paymentMethod}
                                                            onChange={e => setValue('paymentMethod', e.target.value as any)}
                                                            className="w-full p-3 bg-background border border-border rounded-xl appearance-none pr-10"
                                                        >
                                                            <option value="Transfer">{t('transfer')}</option>
                                                            <option value="Checks">{t('checks')}</option>
                                                            <option value="Cash">{t('cash')}</option>
                                                            <option value="Other">{t('other')}</option>
                                                        </select>
                                                        <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Rent Steps (מדרגות שכר דירה) */}
                                            <div className="space-y-3 pt-2 border-t border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium flex items-center gap-2">{t('rentSteps')} {t('optional')} <ConfidenceDot field="rentSteps" /></label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setValue('rentSteps', [...formData.rentSteps, { startDate: '', amount: null as any, currency: 'ILS' }])}
                                                        className="text-xs text-primary hover:text-primary font-bold flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg"
                                                    >
                                                        <Plus className="w-3 h-3" /> {t('addStep')}
                                                    </button>
                                                </div>

                                                {formData.rentSteps.length > 0 && (
                                                    <div className="space-y-2 bg-secondary/10 p-3 rounded-xl">
                                                        {formData.rentSteps.map((step, idx) => (
                                                            <div key={idx} className="flex gap-2 items-end">
                                                                <div className="flex-[2] space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground font-bold">{t('stepDate')}</label>
                                                                    <DatePicker
                                                                        value={step.startDate ? parseISO(step.startDate) : undefined}
                                                                        onChange={(date) => {
                                                                            const newSteps = [...formData.rentSteps];
                                                                            newSteps[idx].startDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                                            setValue('rentSteps', newSteps);
                                                                        }}
                                                                        className="w-full"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground font-bold">{t('newAmount')}</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-2 top-2 text-[10px] text-muted-foreground opacity-50">{formData.currency === 'ILS' ? '₪' : formData.currency === 'USD' ? '$' : '€'}</span>
                                                                        <input
                                                                            type="text"
                                                                            value={formatNumber(step.amount)}
                                                                            onChange={e => {
                                                                                const val = parseNumber(e.target.value);
                                                                                if (/^\d*\.?\d*$/.test(val)) {
                                                                                    const newSteps = [...formData.rentSteps];
                                                                                    newSteps[idx].amount = val as any;
                                                                                    setValue('rentSteps', newSteps);
                                                                                }
                                                                            }}
                                                                            className="w-full p-2 pl-6 text-xs bg-background border border-border rounded-lg no-spinner font-bold"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newSteps = formData.rentSteps.filter((_, i) => i !== idx);
                                                                        setValue('rentSteps', newSteps);
                                                                    }}
                                                                    className="p-2 mb-[1px] text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 4. Linkage Section (Checkbox first) */}
                                            <div className="space-y-4 pt-2 border-t border-border/50">
                                                <label className="flex items-center gap-3 cursor-pointer p-4 border border-border rounded-2xl hover:bg-secondary/20 transition-all group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.hasLinkage}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setValue('hasLinkage', checked);
                                                            setValue('linkageType', checked ? (formData.linkageType === 'none' ? 'cpi' : formData.linkageType) : 'none');
                                                            setValue('baseIndexDate', (checked && (!formData.baseIndexDate || formData.baseIndexDate === '')) ? formData.signingDate : formData.baseIndexDate);
                                                        }}
                                                        className="w-5 h-5 rounded-lg border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-sm font-bold text-foreground block">
                                                            {t('contractIsIndexed')}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{t('contractIsIndexedDesc') || 'Apply index or currency linkage to rent payments'}</span>
                                                    </div>
                                                </label>

                                                {formData.hasLinkage && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="space-y-4 bg-secondary/5 p-4 rounded-2xl border border-dashed border-border"
                                                    >
                                                        {/* Category Toggle: Currency vs Index */}
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('linkageCategory')}</label>
                                                            <div className="flex bg-secondary/30 p-1 rounded-xl gap-1">
                                                                {[
                                                                    { label: t('indexOption'), val: 'index' },
                                                                    { label: t('foreignCurrency'), val: 'currency' }
                                                                ].map(cat => (
                                                                    <button
                                                                        key={cat.val}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const isNewCurrency = cat.val === 'currency';
                                                                            setValue('linkageType', isNewCurrency ? 'usd' : 'cpi');
                                                                            if (!formData.baseIndexDate) {
                                                                                setValue('baseIndexDate', formData.signingDate);
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all border-none",
                                                                            ((['usd', 'eur'].includes(formData.linkageType)) === (cat.val === 'currency'))
                                                                                ? "bg-white dark:bg-black text-foreground shadow-sm"
                                                                                : "text-muted-foreground hover:text-foreground bg-transparent"
                                                                        )}
                                                                    >
                                                                        {cat.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Specific Selection */}
                                                        {['usd', 'eur'].includes(formData.linkageType) ? (
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium">{t('foreignCurrency')}</label>
                                                                <div className="relative">
                                                                    <select
                                                                        value={formData.linkageType}
                                                                        onChange={(e) => setValue('linkageType', e.target.value as any)}
                                                                        className="w-full p-3 bg-background border border-border rounded-xl appearance-none"
                                                                    >
                                                                        <option value="usd">{t('linkedToUsd')}</option>
                                                                        <option value="eur">{t('linkedToEur')}</option>
                                                                    </select>
                                                                    <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {/* Index Choice Dropdown */}
                                                                <div className="space-y-2">
                                                                    <label className="text-sm font-medium">{t('indexOption')}</label>
                                                                    <div className="relative">
                                                                        <select
                                                                            value={formData.linkageType}
                                                                            onChange={(e) => setValue('linkageType', e.target.value as any)}
                                                                            className="w-full p-3 bg-background border border-border rounded-xl appearance-none"
                                                                        >
                                                                            <option value="cpi">{t('linkedToCpi')}</option>
                                                                            <option value="housing">{t('linkedToHousing')}</option>
                                                                            <option value="construction">{t('linkedToConstruction')}</option>
                                                                        </select>
                                                                        <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                {/* Base Index Rate & Date */}
                                                                <div className="bg-background/80 p-4 rounded-xl border border-border/50 space-y-4">
                                                                    <div className="space-y-3">
                                                                        <div className="flex bg-secondary/30 p-1 rounded-lg gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setValue('linkageSubType', 'base');
                                                                                    setValue('baseIndexValue', '' as any);
                                                                                }}
                                                                                className={cn(
                                                                                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all border-none",
                                                                                    formData.linkageSubType !== 'known' ? "bg-white dark:bg-black shadow-sm" : "bg-transparent opacity-60"
                                                                                )}
                                                                            >
                                                                                {t('monthIndex')}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setValue('linkageSubType', 'known');
                                                                                    setValue('baseIndexDate', '');
                                                                                }}
                                                                                className={cn(
                                                                                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all border-none",
                                                                                    formData.linkageSubType === 'known' ? "bg-white dark:bg-black shadow-sm" : "bg-transparent opacity-60"
                                                                                )}
                                                                            >
                                                                                {t('manualValue')}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {formData.linkageSubType === 'known' ? (
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium flex items-center gap-2">
                                                                                {t('baseIndexValue')} <ConfidenceDot field="baseIndexValue" />
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={formatNumber(formData.baseIndexValue)}
                                                                                onChange={(e) => {
                                                                                    const val = parseNumber(e.target.value);
                                                                                    if (/^\d*\.?\d*$/.test(val)) setValue('baseIndexValue', val as any);
                                                                                }}
                                                                                className="w-full p-2.5 bg-background border border-border rounded-lg no-spinner font-mono text-sm"
                                                                                placeholder="e.g. 105.2"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs font-medium flex items-center gap-2">
                                                                                {t('baseDate')}
                                                                                {scannedQuotes.baseIndexDate && <Tooltip quote={scannedQuotes.baseIndexDate} />} <ConfidenceDot field="baseIndexDate" />
                                                                            </label>
                                                                            <DatePicker
                                                                                value={formData.baseIndexDate ? parseISO(formData.baseIndexDate) : undefined}
                                                                                onChange={(date) => setValue('baseIndexDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                                                className="w-full text-sm"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Index Type (מדד ידוע vs מדד קובע) */}
                                                                <div className="space-y-2">
                                                                    <label className="text-sm font-medium">{t('calculationMethod')}</label>
                                                                    <div className="flex bg-secondary/30 p-1 rounded-xl gap-1">
                                                                        {[
                                                                            { label: t('knownIndexLabel'), val: 'known' },
                                                                            { label: t('respectOfLabel'), val: 'respect_of' }
                                                                        ].map(type => (
                                                                            <button
                                                                                key={type.val}
                                                                                type="button"
                                                                                onClick={() => setValue('linkageSubType', type.val as any)}
                                                                                className={cn(
                                                                                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none",
                                                                                    (formData.linkageSubType === type.val)
                                                                                        ? "bg-white dark:bg-black text-foreground shadow-sm"
                                                                                        : "text-muted-foreground hover:text-foreground bg-transparent hover:opacity-100"
                                                                                )}
                                                                            >
                                                                                {type.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Ceiling & Floor - At the bottom of index detail */}
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-2">
                                                                        <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-xl hover:bg-secondary/50 transition-colors">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.hasLinkageCeiling}
                                                                                onChange={(e) => {
                                                                                    setValue('hasLinkageCeiling', e.target.checked);
                                                                                    if (!e.target.checked) setValue('linkageCeiling', undefined);
                                                                                }}
                                                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                            />
                                                                            <span className="text-xs font-bold">{t('linkageCeiling')}</span>
                                                                        </label>
                                                                        {formData.hasLinkageCeiling && (
                                                                            <div className="relative mt-1">
                                                                                <input
                                                                                    type="text"
                                                                                    value={formatNumber(formData.linkageCeiling)}
                                                                                    onChange={(e) => {
                                                                                        const val = parseNumber(e.target.value);
                                                                                        if (/^\d*\.?\d*$/.test(val)) setValue('linkageCeiling', val as any);
                                                                                    }}
                                                                                    className="w-full p-2 bg-background border border-border rounded-lg text-xs no-spinner"
                                                                                    placeholder="%"
                                                                                />
                                                                                <span className="absolute right-3 top-2 text-muted-foreground text-[10px]">%</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-xl hover:bg-secondary/50 transition-colors h-[38px]">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.linkageFloor === 0}
                                                                                onChange={(e) => setValue('linkageFloor', e.target.checked ? 0 : undefined)}
                                                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                            />
                                                                            <span className="text-xs font-bold">{t('floorIndex')}</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            }

                            {
                                step === 5 && (
                                    <motion.div
                                        key="step5"
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Shield className="w-4 h-4" /> {t('securityAndAppendices')}
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">{t('securityDeposit')} {scannedQuotes.securityDeposit && <Tooltip quote={scannedQuotes.securityDeposit} />} <ConfidenceDot field="securityDeposit" /></label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formatNumber(formData.securityDeposit)}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value);
                                                            if (/^\d*\.?\d*$/.test(val)) setValue('securityDeposit', val as any);
                                                        }}
                                                        className="w-full p-3 pl-8 bg-background border border-border rounded-xl no-spinner font-bold"
                                                    />
                                                    <span className="absolute left-4 top-3 text-muted-foreground">₪</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">{t('guarantors')} {scannedQuotes.guarantees && <Tooltip quote={scannedQuotes.guarantees} />} <ConfidenceDot field="guarantees" /></label>
                                                <textarea
                                                    value={formData.guarantees}
                                                    onChange={e => setValue('guarantees', e.target.value)}
                                                    className="w-full p-3 bg-background border border-border rounded-xl min-h-[100px]"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">{t('pets')} <ConfidenceDot field="petsAllowed" /></label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => setValue('petsAllowed', 'true')}
                                                        className={cn(
                                                            "p-3 rounded-xl border text-sm font-medium transition-all",
                                                            formData.petsAllowed === 'true' ? "bg-green-50 border-green-500 text-green-700" : "border-border hover:bg-secondary/50"
                                                        )}
                                                    >
                                                        {t('allowed')}
                                                    </button>
                                                    <button
                                                        onClick={() => setValue('petsAllowed', 'false')}
                                                        className={cn(
                                                            "p-3 rounded-xl border text-sm font-medium transition-all",
                                                            formData.petsAllowed === 'false' ? "bg-red-50 border-red-500 text-red-700" : "border-border hover:bg-secondary/50"
                                                        )}
                                                    >
                                                        {t('forbidden')}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                    formData.needsPainting ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                )}>
                                                    <input type="checkbox" className="hidden" checked={formData.needsPainting} onChange={e => setValue('needsPainting', e.target.checked)} />
                                                    <div className="p-2 bg-secondary rounded-full text-foreground"><Box className="w-5 h-5" /></div>
                                                    <span className="font-medium flex items-center gap-2">הדירה דורשת צביעה?</span>
                                                </label>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            }

                            {
                                step === 6 && (
                                    <motion.div
                                        key="step6"
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Check className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-bold">החוזה מוכן הסיכום!</h3>
                                            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                                                החוזה עבור <strong>{formData.address}, {formData.city}</strong> מוכן ליצירה.
                                            </p>
                                        </div>

                                        <div className="space-y-6 text-right">
                                            {/* Section 1: Asset & Physical Details */}
                                            <div className="bg-secondary/10 p-4 rounded-xl space-y-3">
                                                <h4 className="font-bold text-sm text-primary flex items-center gap-2 flex-row-reverse border-b border-border/50 pb-2 mb-3">
                                                    <Building className="w-4 h-4" /> {t('propertySpecs')}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <span className="text-muted-foreground">{t('address')}</span>
                                                    <span className="font-medium">{formData.address || '-'}, {formData.city || '-'}</span>

                                                    <span className="text-muted-foreground">{t('propertyType')}</span>
                                                    <span className="font-medium">{t(formData.property_type as any)}</span>

                                                    <span className="text-muted-foreground">{t('rooms')}</span>
                                                    <span className="font-medium">{formData.rooms || '-'} {t('rooms')}</span>

                                                    <span className="text-muted-foreground">{t('sizeSqm')}</span>
                                                    <span className="font-medium">{formData.size ? `${formData.size} ${t('sqm')}` : '-'}</span>

                                                    <span className="text-muted-foreground">{t('parking')}</span>
                                                    <span className="font-medium">{formData.hasParking ? t('yes') : t('no')}</span>

                                                    <span className="text-muted-foreground">{t('storage')}</span>
                                                    <span className="font-medium">{formData.hasStorage ? t('yes') : t('no')}</span>
                                                </div>
                                            </div>

                                            {/* Section 2: Parties Involved */}
                                            <div className="bg-secondary/10 p-4 rounded-xl space-y-3">
                                                <h4 className="font-bold text-sm text-primary flex items-center gap-2 flex-row-reverse border-b border-border/50 pb-2 mb-3">
                                                    <User className="w-4 h-4" /> {t('partiesInvolved')}
                                                </h4>
                                                <div className="space-y-4">
                                                    {formData.tenants.map((tenant, idx) => (
                                                        <div key={idx} className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-white/50 p-2 rounded-lg">
                                                            <span className="text-muted-foreground font-bold">{t('tenant')} {formData.tenants.length > 1 ? idx + 1 : ''}</span>
                                                            <span className="font-bold">{tenant.name || '-'}</span>

                                                            <span className="text-muted-foreground">{t('idNumber')}</span>
                                                            <span className="font-medium">{tenant.id_number || '-'}</span>

                                                            <span className="text-muted-foreground">{t('phone')}</span>
                                                            <span className="font-medium">{tenant.phone || '-'}</span>

                                                            <span className="text-muted-foreground">{t('email')}</span>
                                                            <span className="font-medium">{tenant.email || '-'}</span>
                                                        </div>
                                                    ))}
                                                    {formData.guarantorsInfo && (
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-border/30 pt-2">
                                                            <span className="text-muted-foreground">{t('guarantors')}</span>
                                                            <span className="font-medium whitespace-pre-line">{formData.guarantorsInfo}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Section 3: Lease Timeline & Terms */}
                                            <div className="bg-secondary/10 p-4 rounded-xl space-y-3">
                                                <h4 className="font-bold text-sm text-primary flex items-center gap-2 flex-row-reverse border-b border-border/50 pb-2 mb-3">
                                                    <Calendar className="w-4 h-4" /> {t('leaseTerms')}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <span className="text-muted-foreground">{t('startDate')}</span>
                                                    <span className="font-medium">{formatDate(formData.startDate)}</span>

                                                    <span className="text-muted-foreground">{t('endDate')}</span>
                                                    <span className="font-medium">{formatDate(formData.endDate)}</span>

                                                    <span className="text-muted-foreground">{t('signingDate')}</span>
                                                    <span className="font-medium">{formData.signingDate ? formatDate(formData.signingDate) : '-'}</span>

                                                    <span className="text-muted-foreground">{t('optionPeriods')}</span>
                                                    <span className="font-medium">{formData.optionPeriods.length > 0 ? `${formData.optionPeriods.length} ${t('periods')}` : t('no')}</span>

                                                    {formData.optionPeriods.map((period, idx) => (
                                                        <div key={idx} className="contents text-xs">
                                                            <span className="text-muted-foreground pr-4 border-r border-border/30 flex items-center h-full">└ {t('option')} {idx + 1}</span>
                                                            <span className="font-medium py-1">
                                                                {formatDate(period.endDate)} {period.rentAmount ? `(₪${formatNumber(period.rentAmount)})` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Section 4: Financial & Linkage Details */}
                                            <div className="bg-secondary/10 p-4 rounded-xl space-y-3">
                                                <h4 className="font-bold text-sm text-primary flex items-center gap-2 flex-row-reverse border-b border-border/50 pb-2 mb-3">
                                                    <SettingsIcon className="w-4 h-4" /> {t('financials')}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <span className="text-muted-foreground">{t('monthlyRent')}</span>
                                                    <span className="font-bold text-lg text-primary">₪{formatNumber(formData.rent || '0')}</span>

                                                    {formData.rentSteps.length > 0 && (
                                                        <div className="col-span-2 space-y-1 mb-2">
                                                            <div className="text-xs text-muted-foreground mb-1">{t('rentSteps')}:</div>
                                                            {formData.rentSteps.map((step, idx) => (
                                                                <div key={idx} className="flex justify-between flex-row-reverse text-xs bg-white/30 p-1 px-2 rounded">
                                                                    <span>{step.startDate ? formatDate(step.startDate) : '-'}:</span>
                                                                    <span className="font-bold">₪{formatNumber(step.amount)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <span className="text-muted-foreground">{t('paymentFrequency')}</span>
                                                    <span className="font-medium">
                                                        {(() => {
                                                            const map: any = { 'monthly': 'monthly', 'bimonthly': 'bimonthly', 'quarterly': 'quarterly', 'semi_annually': 'semiAnnually', 'yearly': 'annually' };
                                                            return t(map[formData.paymentFrequency] || formData.paymentFrequency as any);
                                                        })()}
                                                    </span>

                                                    <span className="text-muted-foreground">{t('paymentMethod')}</span>
                                                    <span className="font-medium">
                                                        {(() => {
                                                            const map: any = { 'bank_transfer': 'transfer', 'check': 'check', 'cash': 'cash', 'bit': 'bit', 'paybox': 'paybox', 'credit_card': 'creditCard', 'other': 'other' };
                                                            return t(map[formData.paymentMethod] || formData.paymentMethod as any);
                                                        })()}
                                                    </span>

                                                    <span className="text-muted-foreground">{t('linkageType')}</span>
                                                    <span className="font-medium">
                                                        {formData.linkageType === 'none' ? t('notLinked') :
                                                            formData.linkageType === 'cpi' ? t('linkedToCpi') :
                                                                formData.linkageType === 'usd' ? t('linkedToUsd') :
                                                                    formData.linkageType === 'eur' ? t('linkedToEur') : formData.linkageType}
                                                    </span>

                                                    {formData.linkageType !== 'none' && (
                                                        <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-1 mt-1 border-t border-border/20 pt-1">
                                                            <span className="text-muted-foreground text-xs pr-4">└ {t('indexSubType')}</span>
                                                            <span className="font-medium text-xs">
                                                                {formData.linkageSubType === 'known' ? t('knownIndex') :
                                                                    formData.linkageSubType === 'respect_of' ? t('inRespectOf') :
                                                                        formData.linkageSubType === 'base' ? t('baseIndexValue') : formData.linkageSubType}
                                                            </span>

                                                            <span className="text-muted-foreground text-xs pr-4">└ {t('baseIndexDate')}</span>
                                                            <span className="font-medium text-xs">{formData.baseIndexDate ? formatDate(formData.baseIndexDate) : '-'}</span>

                                                            {(formData.linkageCeiling || formData.linkageFloor) && (
                                                                <>
                                                                    <span className="text-muted-foreground text-xs pr-4">└ {t('capCeiling')}</span>
                                                                    <span className="font-medium text-xs">
                                                                        {formData.linkageCeiling && `${formData.linkageCeiling}% `}
                                                                        {formData.linkageFloor && `(${t('floorIndex')})`}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    <span className="text-muted-foreground">{t('securityDeposit')}</span>
                                                    <span className="font-medium">{formData.securityDeposit ? `₪${formatNumber(formData.securityDeposit)}` : '-'}</span>

                                                    <span className="text-muted-foreground">{t('petsAllowed')}</span>
                                                    <span className="font-medium">{formData.petsAllowed === 'true' ? t('yes') : t('no')}</span>
                                                </div>
                                            </div>
                                        </div>



                                        {contractFile && (
                                            <div className="bg-primary/10/50 rounded-xl p-4 border border-blue-100">
                                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveContractFile}
                                                        onChange={e => setSaveContractFile(e.target.checked)}
                                                        className="w-5 h-5 rounded border-blue-300 text-primary focus:ring-indigo-500"
                                                    />
                                                    <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2 m-0">
                                                        <Shield className="w-4 h-4" /> לשמור את קובץ החוזה?
                                                    </h4>
                                                </label>

                                                <AnimatePresence>
                                                    {saveContractFile && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="space-y-3 overflow-hidden"
                                                        >
                                                            <div className="flex gap-2 pt-2">
                                                                {[
                                                                    { id: 'cloud', label: 'ענן RentMate', icon: Cloud, desc: 'שמירה מאובטחת וגישה מכל מקום' },
                                                                    { id: 'device', label: 'מכשיר זה', icon: HardDrive, desc: 'הורדה למחשב בלבד' },
                                                                    { id: 'both', label: 'גם וגם', icon: Download, desc: 'גיבוי כפול' }
                                                                ].map((opt) => {
                                                                    const Icon = opt.icon;
                                                                    const isSelected = storagePreference === opt.id;
                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            onClick={() => setStoragePreference(opt.id as any)}
                                                                            className={cn(
                                                                                "flex-1 relative p-3 rounded-xl border-2 transition-all text-right",
                                                                                isSelected
                                                                                    ? "border-primary bg-white shadow-md z-10"
                                                                                    : "border-transparent bg-slate-50 hover:bg-white hover:border-blue-200"
                                                                            )}
                                                                        >
                                                                            <div className="flex flex-col items-center gap-2 text-center">
                                                                                <div className={cn(
                                                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                                                                    isSelected ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                                                                                )}>
                                                                                    <Icon className="w-4 h-4" />
                                                                                </div>
                                                                                <div>
                                                                                    <div className={cn("font-bold text-xs", isSelected ? "text-blue-900" : "text-slate-700")}>{opt.label}</div>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <p className="text-center text-[10px] text-slate-400 mt-2">
                                                                {storagePreference === 'cloud' && 'החוזה יישמר בשרתי RentMate המאובטחים.'}
                                                                {storagePreference === 'device' && 'החוזה יירד למכשיר הנוכחי ולא יישמר בענן.'}
                                                                {storagePreference === 'both' && 'החוזה יישמר בענן וגם יירד למכשיר.'}
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </motion.div>
                                )
                            }
                        </AnimatePresence >
                    </div >
                </div >
            </div >

            {/* Split Handle & Viewer */}
            <AnimatePresence>
                {scannedContractUrl && isContractViewerOpen && (
                    <>
                        {/* Drag Handle */}
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
                                height: windowWidth >= 1024 ? '100%' : '16px',
                                width: windowWidth >= 1024 ? '16px' : '100%'
                            }}
                        >
                            <div className={cn(
                                "bg-border group-hover:bg-primary/50 transition-colors",
                                "lg:h-full lg:w-px h-px w-full"
                            )} />
                            <div className={cn(
                                "absolute bg-white border border-border shadow-sm rounded-full pointer-events-none",
                                "lg:px-0.5 lg:py-2 px-2 py-0.5"
                            )}>
                                <div className={cn(
                                    "bg-slate-200 rounded-full",
                                    "lg:w-1 lg:h-8 w-8 h-1"
                                )} />
                            </div>
                        </motion.div>

                        {/* Viewer Pane */}
                        <motion.div
                            initial={windowWidth >= 1024 ? { x: "-100%" } : { y: "100%" }}
                            animate={windowWidth >= 1024 ? { x: 0 } : { y: 0 }}
                            exit={windowWidth >= 1024 ? { x: "-100%" } : { y: "100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className={cn(
                                "bg-slate-100 shadow-[0_-5px_30px_rgba(0,0,0,0.1)] z-30 flex flex-col",
                                "lg:h-full lg:border-r border-t lg:border-t-0 border-border"
                            )}
                            style={{
                                height: windowWidth >= 1024 ? '100%' : `${100 - splitRatio}%`,
                                width: windowWidth >= 1024 ? `${100 - splitRatio}%` : '100%'
                            }}
                        >
                            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-border/50 shrink-0">
                                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                    <FileText className="w-4 h-4" /> חוזה מקור
                                </span>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={scannedContractUrl || ''}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-slate-50 text-primary rounded-lg transition-colors flex items-center gap-1"
                                        title="פתח בחלון חדש"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="text-xs">הורד</span>
                                    </a>
                                    <button
                                        onClick={() => setIsContractViewerOpen(false)}
                                        className="p-1 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                                    >
                                        <ChevronDown className="w-5 h-5 rotate-180" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-200 overflow-hidden relative">
                                <iframe
                                    src={scannedContractUrl || ''}
                                    className="w-full h-full border-none"
                                    title="Contract Viewer"
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <div className={cn(
                "fixed bottom-[74px] p-4 bg-background/95 backdrop-blur-md border-t border-border z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300",
                isContractViewerOpen ? "left-0 lg:left-auto" : "left-0 right-0"
            )}
                style={{
                    width: (isContractViewerOpen && windowWidth >= 1024) ? `${splitRatio}%` : '100%',
                    right: (isContractViewerOpen && windowWidth >= 1024) ? '0' : '0'
                }}>
                <div className="flex gap-3 max-w-2xl mx-auto">
                    {step > 1 && (
                        <button
                            onClick={prevStep}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium border border-border hover:bg-secondary/50 transition-colors bg-background"
                        >
                            חזור
                        </button>
                    )}
                    <button
                        onClick={nextStep}
                        disabled={isSaving || (
                            step === 1 ? (!formData.address && !formData.selectedPropertyId) :
                                step === 2 ? !formData.tenants[0]?.name :
                                    step === 3 ? (!formData.startDate || !formData.endDate) :
                                        step === 4 ? (!formData.rent || formData.rent <= 0) :
                                            false
                        )}
                        className={cn(
                            "flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20",
                            (isSaving || (
                                step === 1 ? (!formData.address && !formData.selectedPropertyId) :
                                    step === 2 ? !formData.tenants[0]?.name :
                                        step === 3 ? (!formData.startDate || !formData.endDate) :
                                            step === 4 ? (!formData.rent || formData.rent <= 0) :
                                                false
                            )) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{t('saving')}...</span>
                            </>
                        ) : (
                            <>
                                {step === 6 ? 'צור חוזה' : 'הבא'} <ArrowRight className="w-4 h-4 rotate-180" />
                            </>
                        )}
                    </button>
                </div>
            </div>


            {/* Overlap Warning Modal */}
            <AnimatePresence>
                {
                    showOverlapWarning && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center space-y-4"
                            >
                                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>

                                <h3 className="text-xl font-bold text-slate-900">{t('overlapWarningTitle')}</h3>
                                <p className="text-slate-600">
                                    {t('overlapWarningDesc')} ({formatDate(formData.startDate)} - {formatDate(formData.endDate)})
                                </p>

                                {overlapDetails && (
                                    <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800">
                                        {t('existingContract')}: {formatDate(overlapDetails.start)} - {formatDate(overlapDetails.end)}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowOverlapWarning(false)}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
                                    >
                                        {t('done')}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
            </AnimatePresence>
        </div >
    );
}
