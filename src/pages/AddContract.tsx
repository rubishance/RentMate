import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Building, Check, User, Calendar, Settings as SettingsIcon, Shield, FileText, ChevronDown, Cloud, HardDrive, Download, Car, Box, Plus, Trash2, MapPin, Image as ImageIcon, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { ContractScanner } from '../components/ContractScanner';
import { PropertyIcon } from '../components/common/PropertyIcon';
import { Tooltip } from '../components/Tooltip';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '../components/ui/DatePicker';
import { parseISO, format } from 'date-fns';
import type { ExtractedField, Tenant, Property } from '../types/database';

import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { generatePaymentSchedule } from '../utils/payment-generator';
import { useSubscription } from '../hooks/useSubscription';

const STEPS = [
    { id: 1, labelKey: 'stepTenantProperty', icon: Building },
    { id: 2, labelKey: 'stepPeriods', icon: Calendar },
    { id: 3, labelKey: 'stepPayments', icon: SettingsIcon },
    { id: 4, labelKey: 'stepSecurity', icon: Shield },
    { id: 5, labelKey: 'stepSummary', icon: Check },
];

export function AddContract() {
    const navigate = useNavigate();
    const { lang, t } = useTranslation();
    const { canAddContract, loading: subLoading, plan } = useSubscription();

    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        // Property
        city: '',
        address: '',
        rooms: '',
        size: '',
        image_url: '',
        hasParking: false,
        hasStorage: false,
        property_type: 'apartment',

        // Tenant
        tenantName: '',
        tenantId: '',
        tenantEmail: '',
        tenantPhone: '',

        // Financials
        rent: '',
        currency: 'ILS',
        paymentFrequency: 'Monthly',
        paymentDay: '1',
        paymentMethod: 'Checks',

        // Dates
        signingDate: '',
        startDate: '',
        endDate: '',

        optionPeriods: [] as {
            length: string;
            unit: 'months' | 'years';
            rentAmount?: string;
            currency?: 'ILS' | 'USD' | 'EUR';
        }[],

        // Variable Rent (Rent Steps)
        rentSteps: [] as {
            startDate: string;
            amount: string;
            currency: 'ILS' | 'USD' | 'EUR';
        }[],

        // Linkage
        linkageType: 'none',
        linkageSubType: 'known', // 'known' | 'respect_of' | 'base'
        baseIndexDate: '',
        baseIndexValue: '',
        linkageCeiling: '',
        linkageFloor: '',

        // Security
        securityDeposit: '',
        guarantees: '',
        guarantorsInfo: '',

        // Specs
        petsAllowed: 'true',
        specialClauses: '',

        // UI State
        hasLinkage: false,
        needsPainting: false,
    });

    const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    const [existingTenants, setExistingTenants] = useState<any[]>([]);
    const [isExistingTenant, setIsExistingTenant] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string>(''); // For existing selection
    const [existingProperties, setExistingProperties] = useState<Property[]>([]);
    const [isExistingProperty, setIsExistingProperty] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(''); // For existing selection
    const [storagePreference, setStoragePreference] = useState<'cloud' | 'device' | 'both'>('device');
    const [saveContractFile, setSaveContractFile] = useState(false);
    const [hasOverlap, setHasOverlap] = useState(false);
    const [blockedIntervals, setBlockedIntervals] = useState<{ from: Date; to: Date }[]>([]);

    useEffect(() => {
        // Fetch tenants for selection
        supabase.from('tenants').select('*').then(({ data }) => {
            if (data) setExistingTenants(data as Tenant[]);
        });

        // Fetch properties for selection
        supabase.from('properties').select('*').then(({ data }) => {
            if (data) setExistingProperties(data as Property[]);
        });
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

        // Adjust for timezone offset to avoid date shifting
        publicationDate.setMinutes(publicationDate.getMinutes() - publicationDate.getTimezoneOffset());
        const newBaseDate = publicationDate.toISOString().split('T')[0];

        if (formData.baseIndexDate !== newBaseDate) {
            setFormData(prev => ({ ...prev, baseIndexDate: newBaseDate }));
        }

    }, [formData.signingDate, formData.startDate, formData.linkageSubType, formData.linkageType]);

    // Split Screen State
    const [splitRatio, setSplitRatio] = useState(50); // percentage for top pane
    const [isContractViewerOpen, setIsContractViewerOpen] = useState(false); // Start closed until scan
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
        if (!selectedPropertyId) {
            setBlockedIntervals([]);
            return;
        }

        async function fetchBlockedIntervals() {
            try {
                const { data, error } = await supabase
                    .from('contracts')
                    .select('start_date, end_date')
                    .eq('property_id', selectedPropertyId)
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
    }, [selectedPropertyId]);

    // Block access if limit reached
    if (!subLoading && !canAddContract) {
        return (
            <div className="h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('limitReached')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('limitReachedDesc', { plan: plan?.name || 'Free' })}
                    </p>
                    <button
                        onClick={() => navigate('/contracts')}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
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
        const file = e.target.files[0];
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



    const nextStep = async () => {
        if (hasOverlap) {
            setShowOverlapWarning(true);
            return;
        }
        if (step === 5) {
            setIsSaving(true);
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('You must be logged in to save a contract');

                let propertyId = '';

                // 1. Handle Property (Existing or New)
                if (isExistingProperty && selectedPropertyId) {
                    propertyId = selectedPropertyId;
                    // Optional: Update property rent price if changed? Keeping it simple for now.
                } else {
                    // Create New Property
                    // Check for existing property first
                    const constructedAddress = formData.address.trim();
                    const { data: existingProp } = await supabase
                        .from('properties')
                        .select('id')
                        .eq('address', constructedAddress)
                        .eq('city', formData.city)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (existingProp) {
                        propertyId = existingProp.id;
                    } else {
                        const { data: propData, error: propError } = await supabase.from('properties').insert({
                            title: `${constructedAddress}, ${formData.city}`,
                            address: constructedAddress,
                            city: formData.city,
                            rooms: parseFloat(formData.rooms) || 0,
                            size_sqm: parseInt(formData.size) || 0,
                            has_parking: formData.hasParking,
                            has_storage: formData.hasStorage,
                            property_type: formData.property_type,
                            status: 'Occupied',
                            image_url: formData.image_url || null,
                            user_id: user.id
                        }).select().single();

                        if (propError) throw new Error(`Property Error: ${propError.message}`);
                        propertyId = propData.id;
                    }
                }

                // 2. Handle Tenant
                let tenantId: string;

                if (isExistingTenant && selectedTenantId) {
                    // Start by checking if selected tenant is valid
                    // Update existing tenant's property_id link
                    const { error: updateError } = await supabase
                        .from('tenants')
                        .update({ property_id: propertyId })
                        .eq('id', selectedTenantId);

                    if (updateError) throw new Error(`Update Tenant Error: ${updateError.message}`);
                    tenantId = selectedTenantId;
                } else {
                    // Create New Tenant
                    const { data: newTenant, error: createError } = await supabase.from('tenants').insert({
                        property_id: propertyId,
                        name: formData.tenantName,
                        full_name: formData.tenantName,
                        monthly_rent: parseFloat(formData.rent) || 0,
                        id_number: formData.tenantId,
                        email: formData.tenantEmail,
                        phone: formData.tenantPhone,
                        user_id: user.id
                    }).select().single();

                    if (createError) throw new Error(`Create Tenant Error: ${createError.message}`);
                    tenantId = newTenant.id;
                }

                // 3. Create Contract
                const { data: newContract, error: contractError } = await supabase.from('contracts').insert({
                    property_id: propertyId,
                    tenant_id: tenantId,
                    signing_date: formData.signingDate || null,
                    start_date: formData.startDate || null,
                    end_date: formData.endDate || null,
                    base_rent: parseFloat(formData.rent) || 0,
                    currency: 'ILS',
                    payment_frequency: formData.paymentFrequency.toLowerCase(),
                    payment_day: parseInt(formData.paymentDay) || 1,
                    linkage_type: (!formData.linkageType || formData.linkageType === 'none') ? 'none' : formData.linkageType,
                    linkage_sub_type: formData.linkageType === 'cpi' ? formData.linkageSubType : null,
                    linkage_ceiling: parseFloat(formData.linkageCeiling) || null,
                    linkage_floor: parseFloat(formData.linkageFloor) || null,
                    base_index_date: formData.baseIndexDate || null,
                    base_index_value: parseFloat(formData.baseIndexValue) || null,
                    security_deposit_amount: parseFloat(formData.securityDeposit) || 0,
                    status: 'active',
                    option_periods: formData.optionPeriods.map(p => ({
                        length: parseInt(p.length) || 0,
                        unit: p.unit,
                        rentAmount: parseFloat(p.rentAmount || '') || null,
                        currency: p.currency || 'ILS'
                    })),
                    rent_periods: formData.rentSteps.map(s => ({
                        startDate: s.startDate,
                        amount: parseFloat(s.amount) || 0,
                        currency: s.currency
                    })),
                    contract_file_url: null as string | null,
                    user_id: user.id,
                    needs_painting: formData.needsPainting,
                    guarantors_info: formData.guarantorsInfo || null,
                    special_clauses: formData.specialClauses || null
                }).select().single();

                if (contractError) throw new Error(`Contract Error: ${contractError.message} `);

                // 3.5 Generate Expected Payments
                if (newContract) {
                    const schedule = await generatePaymentSchedule({
                        startDate: formData.startDate,
                        endDate: formData.endDate,
                        baseRent: parseFloat(formData.rent) || 0,
                        currency: 'ILS',
                        paymentFrequency: formData.paymentFrequency.toLowerCase() as any,
                        paymentDay: parseInt(formData.paymentDay) || 1,
                        linkageType: (!formData.linkageType || formData.linkageType === 'none') ? 'none' : formData.linkageType as any,
                        linkageSubType: formData.linkageSubType as any,
                        baseIndexDate: formData.baseIndexDate || null,
                        baseIndexValue: parseFloat(formData.baseIndexValue) || null,
                        linkageCeiling: parseFloat(formData.linkageCeiling) || null,

                        linkageFloor: parseFloat(formData.linkageFloor) || null,
                        rent_periods: formData.rentSteps.map(s => ({
                            startDate: s.startDate,
                            amount: parseFloat(s.amount) || 0,
                            currency: s.currency,
                        }))
                    });

                    if (schedule.length > 0) {
                        const { error: paymentError } = await supabase.from('payments').insert(
                            schedule.map(p => ({
                                ...p,
                                contract_id: newContract.id
                            }))
                        );
                        if (paymentError) console.error('Error generating payments:', paymentError);
                    }
                }

                // 4. Handle File Storage
                if (contractFile && saveContractFile) {


                    // Cloud Upload
                    if (storagePreference === 'cloud' || storagePreference === 'both') {
                        const fileExt = contractFile.name.split('.').pop();
                        const fileName = `${tenantId}_${Date.now()}.${fileExt}`;
                        const filePath = `${propertyId}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('contracts')
                            .upload(filePath, contractFile);

                        if (uploadError) {
                            console.error('Upload failed:', uploadError);
                            // Don't fail the whole process, just alert or log
                            alert("החוזה נוצר אך העלאת הקובץ נכשלה.");
                        } else {
                            const { data: { publicUrl } } = supabase.storage
                                .from('contracts')
                                .getPublicUrl(filePath);



                            // Update contract with file URL
                            await supabase.from('contracts')
                                .update({ contract_file_url: publicUrl })
                                .eq('id', newContract.id);
                        }
                    }

                    // Device Download
                    if (storagePreference === 'device' || storagePreference === 'both') {
                        const url = URL.createObjectURL(contractFile);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `contract_${formData.tenantName.trim().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }

                }



                navigate('/contracts');

            } catch (err: any) {
                console.error(err);
                alert(`Failed to save: ${err.message} `);
            } finally {
                setIsSaving(false);
            }
            return;
        }
        setStep(s => Math.min(s + 1, 5));
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

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
        const moveHandler = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
            const totalHeight = window.innerHeight;
            const newRatio = Math.min(Math.max((clientY / totalHeight) * 100, 20), 80);
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

        let scannedStreet = '';
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
                case 'rooms': newFormData.rooms = val; break;
                case 'size': newFormData.size = val; break;

                // Tenant
                case 'tenantName': newFormData.tenantName = val; break;
                case 'tenantId': newFormData.tenantId = val; break;
                case 'tenantEmail': newFormData.tenantEmail = val; break;
                case 'tenantPhone': newFormData.tenantPhone = val; break;

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
                const pAddr = p.address.replace(/\s/g, '');
                return pAddr.includes(scanAddrNorm) || scanAddrNorm.includes(pAddr);
            });

            if (matchedProp) {
                setIsExistingProperty(true);
                setSelectedPropertyId(matchedProp.id);
                newFormData.city = matchedProp.city || newFormData.city;
                newFormData.address = matchedProp.address || newFormData.address;
            }

            const matchedTenant = existingTenants.find(t =>
                (newFormData.tenantId && t.id_number === newFormData.tenantId)
            );

            if (matchedTenant) {
                setIsExistingTenant(true);
                setSelectedTenantId(matchedTenant.id);
                newFormData.tenantId = matchedTenant.id_number;
                newFormData.tenantName = matchedTenant.name;
            }

            setFormData(newFormData);
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
        <div className="relative h-screen overflow-hidden bg-background">
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
                        <span className="text-xs font-bold pl-1 text-foreground">{isContractViewerOpen ? 'הסתר חוזה' : 'הצג חוזה'}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Top Pane: Wizard Form */}
            <div
                className={cn(
                    "w-full overflow-y-auto custom-scrollbar",
                    isContractViewerOpen ? "border-b border-border/50" : "h-full"
                )}
                style={{ height: isContractViewerOpen ? `${splitRatio}%` : '100%' }}
            >
                <div className={cn("max-w-2xl mx-auto p-6 transition-all", isContractViewerOpen ? "pb-20" : "pb-40")}>
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-secondary rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">New Contract</h1>
                            <p className="text-sm text-muted-foreground">Drafting a new lease agreement</p>
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
                                                    <h3 className="font-bold text-lg mb-1">סריקה חכמה ב-AI</h3>
                                                    <p className="text-blue-100 text-sm opacity-90">העלה או סרוק חוזה למילוי פרטים אוטומטי</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsScanning(true)}
                                                    className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm"
                                                >
                                                    סרוק עכשיו
                                                </button>
                                            </div>
                                        )}

                                        {contractFile && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                                                <Check className="w-5 h-5" />
                                                <span className="font-medium text-sm">החוזה נסרק ועבר השחרה בהצלחה</span>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-lg flex items-center gap-2"><Building className="w-4 h-4" /> פרטי הנכס</h3>

                                                <div className="flex bg-secondary/50 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => setIsExistingProperty(false)}
                                                        className={cn(
                                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                            !isExistingProperty ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {t('newProperty')}
                                                    </button>
                                                    <button
                                                        onClick={() => setIsExistingProperty(true)}
                                                        className={cn(
                                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                            isExistingProperty ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {t('existingProperty')}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExistingProperty ? (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('chooseProperty')}</label>
                                                    <select
                                                        className="w-full p-3 bg-background border border-border rounded-xl"
                                                        value={selectedPropertyId}
                                                        onChange={(e) => {
                                                            const newId = e.target.value;
                                                            setSelectedPropertyId(newId);
                                                            const prop = existingProperties.find(p => p.id === newId);
                                                            if (prop) {
                                                                setFormData({
                                                                    ...formData,
                                                                    city: prop.city || '',


                                                                    address: prop.address || ''
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <option value="">{t('selectProperty')}</option>
                                                        {existingProperties.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.city}, {p.address}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Asset Type */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('propertyType')} <ConfidenceDot field="property_type" /></label>
                                                            <div className="relative">
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
                                                                    {formData.property_type ? (
                                                                        <PropertyIcon type={formData.property_type as any} className="w-5 h-5" />
                                                                    ) : (
                                                                        <Building className="w-4 h-4" />
                                                                    )}
                                                                </div>
                                                                <select
                                                                    value={formData.property_type}
                                                                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                                                                    className="w-full pr-10 pl-4 py-3 bg-background border border-border rounded-xl appearance-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
                                                                >
                                                                    <option value="apartment">{t('apartment')}</option>
                                                                    <option value="penthouse">{t('penthouse')}</option>
                                                                    <option value="garden">{t('gardenApartment')}</option>
                                                                    <option value="house">{t('house')}</option>
                                                                    <option value="other">{t('other')}</option>
                                                                </select>
                                                                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                            </div>
                                                        </div>

                                                        {/* City */}
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">עיר {scannedQuotes.city && <Tooltip quote={scannedQuotes.city} />} <ConfidenceDot field="city" /></label>
                                                            <input
                                                                value={formData.city}
                                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                                className="w-full p-3 bg-background border border-border rounded-xl" />
                                                        </div>
                                                    </div>

                                                    {/* Address */}
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium flex items-center gap-2">כתובת {scannedQuotes.street && <Tooltip quote={scannedQuotes.street} />} <ConfidenceDot field="address" /></label>
                                                        <div className="relative">
                                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                            <input
                                                                value={formData.address}
                                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                                className="w-full p-3 bg-background border border-border rounded-xl pl-10"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Specs */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('rooms')} <ConfidenceDot field="rooms" /></label>
                                                            <input
                                                                type="number"
                                                                value={formData.rooms}
                                                                onChange={e => setFormData({ ...formData, rooms: e.target.value })}
                                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('sizeSqm')} <ConfidenceDot field="size" /></label>
                                                            <input
                                                                type="number"
                                                                value={formData.size}
                                                                onChange={e => setFormData({ ...formData, size: e.target.value })}
                                                                className="w-full p-3 bg-background border border-border rounded-xl"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Amenities */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                            formData.hasParking ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                        )}>
                                                            <input type="checkbox" className="hidden" checked={formData.hasParking} onChange={e => setFormData({ ...formData, hasParking: e.target.checked })} />
                                                            <div className="p-2 bg-secondary rounded-full text-foreground"><Car className="w-5 h-5" /></div>
                                                            <span className="font-medium flex items-center gap-2">{t('parking')} <ConfidenceDot field="hasParking" /></span>
                                                        </label>

                                                        <label className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                            formData.hasStorage ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                                        )}>
                                                            <input type="checkbox" className="hidden" checked={formData.hasStorage} onChange={e => setFormData({ ...formData, hasStorage: e.target.checked })} />
                                                            <div className="p-2 bg-secondary rounded-full text-foreground"><Box className="w-5 h-5" /></div>
                                                            <span className="font-medium flex items-center gap-2">{t('storage')} <ConfidenceDot field="hasStorage" /></span>
                                                        </label>
                                                    </div>

                                                    {/* Image Section */}
                                                    <div className="space-y-3 pt-2">
                                                        <label className="text-sm font-medium">תמונת הנכס</label>

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
                                                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                                                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            if (!formData.address || !formData.city) {
                                                                                alert('נא להזין כתובת ועיר קודם');
                                                                                return;
                                                                            }

                                                                            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                                                                            if (!apiKey) return;

                                                                            const location = `${formData.address}, ${formData.city}`;
                                                                            const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(location)}&key=${apiKey}`;

                                                                            setFormData(prev => ({ ...prev, image_url: imageUrl }));
                                                                        }}
                                                                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                                                                    >
                                                                        ייבא מ-Google
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
                                                                            {isUploading ? 'מעלה...' : 'לחץ להעלאת תמונה'}
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
                                                                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
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

                                        <hr className="border-border" />

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-lg flex items-center gap-2"><User className="w-4 h-4" /> {t('tenantDetails')}</h3>

                                                {/* Type Toggle */}
                                                <div className="flex bg-secondary/50 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => setIsExistingTenant(false)}
                                                        className={cn(
                                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                            !isExistingTenant ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {t('newTenant')}
                                                    </button>
                                                    <button
                                                        onClick={() => setIsExistingTenant(true)}
                                                        className={cn(
                                                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                            isExistingTenant ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {t('existingTenant')}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExistingTenant ? (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('chooseTenant')}</label>
                                                    <select
                                                        className="w-full p-3 bg-background border border-border rounded-xl"
                                                        value={selectedTenantId}
                                                        onChange={(e) => {
                                                            const newId = e.target.value;
                                                            setSelectedTenantId(newId);
                                                            const tenant = existingTenants.find(t => t.id === newId);
                                                            if (tenant) {
                                                                setFormData({
                                                                    ...formData,
                                                                    tenantName: tenant.full_name || tenant.name || '',
                                                                    tenantId: tenant.id_number || '',
                                                                    tenantEmail: tenant.email || '',
                                                                    tenantPhone: tenant.phone || ''
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <option value="">בחר דייר...</option>
                                                        {existingTenants.map(t => (
                                                            <option key={t.id} value={t.id}>{t.full_name || t.name} ({t.id_number})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium flex items-center gap-2">{t('fullName')} {scannedQuotes.tenantName && <Tooltip quote={scannedQuotes.tenantName} />} <ConfidenceDot field="tenantName" /></label>
                                                        <input
                                                            value={formData.tenantName}
                                                            onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
                                                            className="w-full p-3 bg-background border border-border rounded-xl" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('idNumber')} {scannedQuotes.tenantId && <Tooltip quote={scannedQuotes.tenantId} />} <ConfidenceDot field="tenantId" /></label>
                                                            <input
                                                                value={formData.tenantId}
                                                                onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                                                                className="w-full p-3 bg-background border border-border rounded-xl" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">{t('phone')} {scannedQuotes.tenantPhone && <Tooltip quote={scannedQuotes.tenantPhone} />} <ConfidenceDot field="tenantPhone" /></label>
                                                            <input
                                                                value={formData.tenantPhone}
                                                                onChange={e => setFormData({ ...formData, tenantPhone: e.target.value })}
                                                                className="w-full p-3 bg-background border border-border rounded-xl" dir="ltr" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium flex items-center gap-2">{t('email')} {scannedQuotes.tenantEmail && <Tooltip quote={scannedQuotes.tenantEmail} />} <ConfidenceDot field="tenantEmail" /></label>
                                                        <input
                                                            value={formData.tenantEmail}
                                                            onChange={e => setFormData({ ...formData, tenantEmail: e.target.value })}
                                                            className="w-full p-3 bg-background border border-border rounded-xl" type="email" dir="ltr" />
                                                    </div>
                                                </>
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
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <DatePicker
                                                    label={t('signingDate')}
                                                    value={formData.signingDate ? parseISO(formData.signingDate) : undefined}
                                                    onChange={(date) => setFormData({
                                                        ...formData,
                                                        signingDate: date ? format(date, 'yyyy-MM-dd') : ''
                                                    })}
                                                    placeholder="בחר תאריך..."
                                                />
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
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        optionPeriods: [...prev.optionPeriods, { length: '12', unit: 'months', rentAmount: '', currency: 'ILS' }]
                                                    }))}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> {t('addPeriod')}
                                                </button>
                                            </div>

                                            {formData.optionPeriods.length === 0 && (
                                                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
                                                    {t('noOptionPeriods')}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {formData.optionPeriods.map((period, idx) => (
                                                    <div key={idx} className="flex flex-col bg-secondary/10 rounded-xl p-1 mb-2">
                                                        <div className="flex gap-2 items-center p-1">
                                                            <div className="relative flex-1">
                                                                <input
                                                                    type="number"
                                                                    value={period.length}
                                                                    onChange={(e) => {
                                                                        const newPeriods = [...formData.optionPeriods];
                                                                        newPeriods[idx].length = e.target.value;
                                                                        setFormData({ ...formData, optionPeriods: newPeriods });
                                                                    }}
                                                                    className="w-full p-3 bg-background border border-border rounded-lg pl-36"
                                                                />
                                                                <div className="absolute left-1 top-1 bottom-1 flex bg-secondary/50 rounded-lg p-1 gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newPeriods = [...formData.optionPeriods];
                                                                            newPeriods[idx].unit = 'months';
                                                                            setFormData({ ...formData, optionPeriods: newPeriods });
                                                                        }}
                                                                        className={cn(
                                                                            "px-2 rounded-md text-xs font-medium transition-all",
                                                                            period.unit === 'months' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                                        )}
                                                                    >
                                                                        {t('months')}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newPeriods = [...formData.optionPeriods];
                                                                            newPeriods[idx].unit = 'years';
                                                                            setFormData({ ...formData, optionPeriods: newPeriods });
                                                                        }}
                                                                        className={cn(
                                                                            "px-2 rounded-md text-xs font-medium transition-all",
                                                                            period.unit === 'years' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                                        )}
                                                                    >
                                                                        {t('years')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newPeriods = formData.optionPeriods.filter((_, i) => i !== idx);
                                                                    setFormData({ ...formData, optionPeriods: newPeriods });
                                                                }}
                                                                className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                        {/* Option Rent */}
                                                        <div className="flex gap-2 items-center pr-2 pb-2 pl-2">
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('optionRent')}:</span>
                                                            <input
                                                                type="number"
                                                                value={period.rentAmount || ''}
                                                                onChange={e => {
                                                                    const newPeriods = [...formData.optionPeriods];
                                                                    newPeriods[idx].rentAmount = e.target.value;
                                                                    setFormData({ ...formData, optionPeriods: newPeriods });
                                                                }}
                                                                className="w-32 p-1.5 text-xs bg-background border border-border rounded-lg"
                                                            />
                                                            <select
                                                                value={period.currency || 'ILS'}
                                                                onChange={e => {
                                                                    const newPeriods = [...formData.optionPeriods];
                                                                    newPeriods[idx].currency = e.target.value as any;
                                                                    setFormData({ ...formData, optionPeriods: newPeriods });
                                                                }}
                                                                className="p-1.5 text-xs bg-background border border-border rounded-lg"
                                                            >
                                                                <option value="ILS">₪</option>
                                                                <option value="USD">$</option>
                                                                <option value="EUR">€</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <DatePicker
                                                    label={t('startDate')}
                                                    value={formData.startDate ? parseISO(formData.startDate) : undefined}
                                                    onChange={(date) => setFormData({ ...formData, startDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                    disabledDays={blockedIntervals}
                                                    error={hasOverlap}
                                                    placeholder="בחר תאריך..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <DatePicker
                                                    label={t('endDate')}
                                                    value={formData.endDate ? parseISO(formData.endDate) : undefined}
                                                    onChange={(date) => setFormData({ ...formData, endDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                    minDate={formData.startDate ? parseISO(formData.startDate) : undefined}
                                                    disabledDays={blockedIntervals}
                                                    placeholder="בחר תאריך..."
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

                                                                    if (years > 0) return ` ${years} ${t('years')}${remainingMonths > 0 ? ` ו-${remainingMonths} ${t('months')}` : ''}`;
                                                                    if (months > 0) return ` ${months} ${t('months')}`;
                                                                    return ` ${diffDays} ימים`;
                                                                })()}
                                                            </span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                            }

                            {
                                step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        <h3 className="font-semibold text-lg flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> {t('paymentDetails')}</h3>

                                        <div className="space-y-4">
                                            {/* Rent Amount */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">
                                                    {t('monthlyRent')}
                                                    {scannedQuotes.rent && <Tooltip quote={scannedQuotes.rent} />} <ConfidenceDot field="rent" />
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3 text-muted-foreground">₪</span>
                                                    <input
                                                        type="number"
                                                        value={formData.rent}
                                                        onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                                                        className="w-full pl-8 p-3 bg-background border border-border rounded-xl"
                                                    />
                                                </div>
                                            </div>

                                            {/* Rent Steps (Variable Rent) */}
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-medium flex items-center gap-2">{t('rentSteps')} (אופציונלי) <ConfidenceDot field="rentSteps" /></label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            rentSteps: [...prev.rentSteps, { startDate: '', amount: '', currency: 'ILS' }]
                                                        }))}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> {t('addStep')}
                                                    </button>
                                                </div>

                                                {formData.rentSteps.length > 0 && (
                                                    <div className="space-y-2 bg-secondary/10 p-3 rounded-xl">
                                                        {formData.rentSteps.map((step, idx) => (
                                                            <div key={idx} className="flex gap-2 items-end">
                                                                <div className="flex-1 space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground">{t('stepDate')}</label>
                                                                    <DatePicker
                                                                        value={step.startDate ? parseISO(step.startDate) : undefined}
                                                                        onChange={(date) => {
                                                                            const newSteps = [...formData.rentSteps];
                                                                            newSteps[idx].startDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                                            setFormData({ ...formData, rentSteps: newSteps });
                                                                        }}
                                                                        className="w-full"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground">{t('newAmount')}</label>
                                                                    <input
                                                                        type="number"
                                                                        value={step.amount}
                                                                        onChange={e => {
                                                                            const newSteps = [...formData.rentSteps];
                                                                            newSteps[idx].amount = e.target.value;
                                                                            setFormData({ ...formData, rentSteps: newSteps });
                                                                        }}
                                                                        className="w-full p-2 text-xs bg-background border border-border rounded-lg"
                                                                    />
                                                                </div>
                                                                <div className="w-20 space-y-1">
                                                                    <label className="text-[10px] text-muted-foreground opacity-0">מטבע</label>
                                                                    <select
                                                                        value={step.currency}
                                                                        onChange={e => {
                                                                            const newSteps = [...formData.rentSteps];
                                                                            newSteps[idx].currency = e.target.value as any;
                                                                            setFormData({ ...formData, rentSteps: newSteps });
                                                                        }}
                                                                        className="w-full p-2 text-xs bg-background border border-border rounded-lg"
                                                                    >
                                                                        <option value="ILS">₪</option>
                                                                        <option value="USD">$</option>
                                                                        <option value="EUR">€</option>
                                                                    </select>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newSteps = formData.rentSteps.filter((_, i) => i !== idx);
                                                                        setFormData({ ...formData, rentSteps: newSteps });
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

                                            {/* Linkage Section */}
                                            <div className="bg-secondary/10 p-4 rounded-xl space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium flex items-center gap-2">{t('linkageAndIndices')} <ConfidenceDot field="linkageType" /></label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <label
                                                            className={cn(
                                                                "flex flex-col items-center gap-2 p-2 border rounded-xl cursor-pointer transition-all",
                                                                !formData.linkageType || formData.linkageType === 'none' ? "border-slate-500 bg-slate-50 ring-1 ring-slate-500" : "border-border hover:border-slate-300"
                                                            )}
                                                        >
                                                            <input type="radio" name="linkage" className="hidden" checked={!formData.linkageType || formData.linkageType === 'none'} onChange={() => setFormData({ ...formData, linkageType: 'none', baseIndexDate: '', baseIndexValue: '' })} />
                                                            <span className="text-xs font-bold text-center">{t('notLinked')}</span>
                                                        </label>

                                                        <label
                                                            className={cn(
                                                                "flex flex-col items-center gap-2 p-2 border rounded-xl cursor-pointer transition-all",
                                                                formData.linkageType === 'cpi' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
                                                            )}
                                                        >
                                                            <input type="radio" name="linkage" className="hidden" checked={formData.linkageType === 'cpi'} onChange={() => setFormData({ ...formData, linkageType: 'cpi' })} />
                                                            <span className="text-xs font-bold text-center">{t('linkedToCpi')}</span>
                                                        </label>

                                                        <label
                                                            className={cn(
                                                                "flex flex-col items-center gap-2 p-2 border rounded-xl cursor-pointer transition-all",
                                                                formData.linkageType === 'usd' ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-border hover:border-green-300"
                                                            )}
                                                        >
                                                            <input type="radio" name="linkage" className="hidden" checked={formData.linkageType === 'usd'} onChange={() => setFormData({ ...formData, linkageType: 'usd' })} />
                                                            <span className="text-xs font-bold text-center">{t('linkedToUsd')}</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {(formData.linkageType === 'cpi' || formData.linkageType === 'usd') && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className="space-y-4 pt-4 border-t border-border/50"
                                                    >
                                                        {formData.linkageType === 'cpi' && (
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium">{t('indexType')}</label>
                                                                <div className="flex bg-secondary/30 p-1 rounded-xl gap-1">
                                                                    {[
                                                                        { label: 'מדד ידוע', val: 'known' },
                                                                        { label: 'בגין החודש', val: 'respect_of' }
                                                                    ].map(type => (
                                                                        <button
                                                                            key={type.val}
                                                                            onClick={() => setFormData({ ...formData, linkageSubType: type.val })}
                                                                            className={cn(
                                                                                "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                                                                                formData.linkageSubType === type.val
                                                                                    ? "bg-background text-foreground shadow-sm"
                                                                                    : "text-muted-foreground hover:text-foreground"
                                                                            )}
                                                                        >
                                                                            {type.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium flex items-center gap-2">
                                                                {t('baseDate')}
                                                                {scannedQuotes.baseIndexDate && <Tooltip quote={scannedQuotes.baseIndexDate} />} <ConfidenceDot field="baseIndexDate" />
                                                            </label>
                                                            <DatePicker
                                                                value={formData.baseIndexDate ? parseISO(formData.baseIndexDate) : undefined}
                                                                onChange={(date) => setFormData({ ...formData, baseIndexDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                                className="w-full"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium flex items-center gap-2">{t('ceiling')} <ConfidenceDot field="linkageCeiling" /></label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        value={formData.linkageCeiling}
                                                                        onChange={(e) => setFormData({ ...formData, linkageCeiling: e.target.value })}
                                                                        className="w-full p-2.5 pl-8 bg-background border border-border rounded-xl text-sm"
                                                                    />
                                                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">%</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2 pt-7">
                                                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-xl hover:bg-secondary/50 transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.linkageFloor === '0'}
                                                                        onChange={(e) => setFormData({ ...formData, linkageFloor: e.target.checked ? '0' : '' })}
                                                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                    />
                                                                    <span className="text-sm font-medium flex items-center gap-2">{t('floorIndex')} <ConfidenceDot field="linkageFloor" /></span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Payment Details continued */}
                                            <div className="grid grid-cols-2 gap-4">

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium flex items-center gap-2">{t('paymentFrequency')} <ConfidenceDot field="paymentFrequency" /></label>
                                                    <div className="relative">
                                                        <select
                                                            value={formData.paymentFrequency}
                                                            onChange={e => setFormData({ ...formData, paymentFrequency: e.target.value })}
                                                            className="w-full p-3 bg-background border border-border rounded-xl appearance-none"
                                                        >
                                                            <option value="monthly">{t('monthly')}</option>
                                                            <option value="bimonthly">{t('bimonthly')}</option>
                                                            <option value="quarterly">רבעוני</option>
                                                            <option value="semi_annually">חצי שנתי</option>
                                                            <option value="yearly">שנתי</option>
                                                        </select>
                                                        <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">{t('paymentMethod')} {scannedQuotes.paymentMethod && <Tooltip quote={scannedQuotes.paymentMethod} />} <ConfidenceDot field="paymentMethod" /></label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.paymentMethod}
                                                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                                        className="w-full p-3 bg-background border border-border rounded-xl appearance-none"
                                                    >
                                                        <option value="bank_transfer">{t('bankTransfer')}</option>
                                                        <option value="check">{t('check')}</option>
                                                        <option value="cash">{t('cash')}</option>
                                                        <option value="bit">{t('bit')}</option>
                                                        <option value="paybox">{t('paybox')}</option>
                                                        <option value="credit_card">{t('creditCard')}</option>
                                                        <option value="other">{t('other')}</option>
                                                    </select>
                                                    <ChevronDown className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            }

                            {
                                step === 4 && (
                                    <motion.div
                                        key="step4"
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
                                                        value={formData.securityDeposit}
                                                        onChange={e => setFormData({ ...formData, securityDeposit: e.target.value })}
                                                        className="w-full p-3 pl-8 bg-background border border-border rounded-xl no-spinner" type="number" />
                                                    <span className="absolute left-4 top-3 text-muted-foreground">₪</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">{t('guarantors')} {scannedQuotes.guarantees && <Tooltip quote={scannedQuotes.guarantees} />} <ConfidenceDot field="guarantees" /></label>
                                                <textarea
                                                    value={formData.guarantees}
                                                    onChange={e => setFormData({ ...formData, guarantees: e.target.value })}
                                                    className="w-full p-3 bg-background border border-border rounded-xl min-h-[100px]"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium flex items-center gap-2">{t('pets')} <ConfidenceDot field="petsAllowed" /></label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => setFormData({ ...formData, petsAllowed: 'true' })}
                                                        className={cn(
                                                            "p-3 rounded-xl border text-sm font-medium transition-all",
                                                            formData.petsAllowed === 'true' ? "bg-green-50 border-green-500 text-green-700" : "border-border hover:bg-secondary/50"
                                                        )}
                                                    >
                                                        {t('allowed')}
                                                    </button>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, petsAllowed: 'false' })}
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
                                                    <input type="checkbox" className="hidden" checked={formData.needsPainting} onChange={e => setFormData({ ...formData, needsPainting: e.target.checked })} />
                                                    <div className="p-2 bg-secondary rounded-full text-foreground"><Box className="w-5 h-5" /></div>
                                                    <span className="font-medium flex items-center gap-2">הדירה דורשת צביעה?</span>
                                                </label>
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
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Check className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-bold">החוזה מוכן הסיכום!</h3>
                                            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                                                החוזה עבור <strong>{formData.address}, {formData.city}</strong> מוכן ליצירה.
                                            </p>
                                        </div>

                                        <div className="bg-secondary/20 p-4 rounded-xl text-sm space-y-3 text-right">
                                            <h4 className="font-bold text-xs text-muted-foreground mb-2">סיכום נתונים</h4>
                                            <div className="flex justify-between flex-row-reverse border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">{t('tenant')}</span>
                                                <span className="font-medium">{formData.tenantName || '-'}</span>
                                            </div>
                                            <div className="flex justify-between flex-row-reverse border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">{t('period')}</span>
                                                <span className="font-medium">{formData.startDate} - {formData.endDate}</span>
                                            </div>
                                            <div className="flex justify-between flex-row-reverse border-b border-border/50 pb-2">
                                                <span className="text-muted-foreground">שכ"ד</span>
                                                <span className="font-medium">₪{formData.rent || '0'}</span>
                                            </div>
                                            {!(!formData.linkageType || formData.linkageType === 'none') && (
                                                <>
                                                    <div className="flex justify-between flex-row-reverse border-b border-border/50 pb-2">
                                                        <span className="text-muted-foreground">הצמדה</span>
                                                        <span className="font-medium">
                                                            {formData.linkageType === 'cpi' ? 'למדד' : 'לדולר'}
                                                            {formData.linkageType === 'cpi' && formData.linkageSubType === 'known' && ' (ידוע)'}
                                                            {formData.linkageType === 'cpi' && formData.linkageSubType === 'respect_of' && ' (בגין)'}
                                                        </span>
                                                    </div>
                                                    {(formData.linkageCeiling || formData.linkageFloor) && (
                                                        <div className="flex justify-between flex-row-reverse border-b border-border/50 pb-2">
                                                            <span className="text-muted-foreground">הגבלות</span>
                                                            <span className="font-medium text-xs">
                                                                {formData.linkageCeiling && `תקרה: ${formData.linkageCeiling}% `}
                                                                {formData.linkageFloor && `רצפה: ${formData.linkageFloor}% `}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="flex justify-between flex-row-reverse">
                                                <span className="text-muted-foreground">תשלום</span>
                                                <span className="font-medium">{formData.paymentMethod} ({formData.paymentFrequency})</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="text-muted-foreground">{lang === 'he' ? 'פיקדון' : 'Deposit Amount'}:</div>
                                                <div className="font-medium">{formData.securityDeposit ? `₪${formData.securityDeposit}` : '-'}</div>
                                                <div className="text-muted-foreground">ערבויות:</div>
                                                <div className="font-medium">{formData.guarantees || '-'}</div>
                                                <div className="text-muted-foreground">בעלי חיים:</div>
                                                <div className="font-medium">{formData.petsAllowed === 'true' ? 'מותר' : 'אסור'}</div>
                                            </div>
                                        </div>



                                        {contractFile && (
                                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveContractFile}
                                                        onChange={e => setSaveContractFile(e.target.checked)}
                                                        className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
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
                                                                                    ? "border-blue-500 bg-white shadow-md z-10"
                                                                                    : "border-transparent bg-slate-50 hover:bg-white hover:border-blue-200"
                                                                            )}
                                                                        >
                                                                            <div className="flex flex-col items-center gap-2 text-center">
                                                                                <div className={cn(
                                                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                                                                    isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"
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
                </div> {/* End of Scrollable Wizard Container */}

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
                                className="fixed w-full h-4 -mt-2 z-40 cursor-row-resize flex items-center justify-center group"
                                style={{ top: `${splitRatio}%` }}
                            >
                                <div className="w-full h-px bg-border group-hover:bg-primary/50 transition-colors" />
                                <div className="absolute bg-white border border-border shadow-sm rounded-full px-2 py-0.5 pointer-events-none">
                                    <div className="w-8 h-1 bg-slate-200 rounded-full" />
                                </div>
                            </motion.div>

                            {/* Viewer Pane */}
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ y: { type: "spring", bounce: 0, duration: 0.4 } }}
                                className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t border-border shadow-[0_-5px_30px_rgba(0,0,0,0.1)] z-30 flex flex-col"
                                style={{ height: `${100 - splitRatio}%` }}
                            >
                                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-border/50 shrink-0">
                                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                        <FileText className="w-4 h-4" /> חוזה מקור
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={scannedContractUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-slate-50 text-blue-600 rounded-lg transition-colors flex items-center gap-1"
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
                                        src={scannedContractUrl}
                                        className="w-full h-full border-none"
                                        title="Contract Viewer"
                                    />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
            {/* Footer Actions - Fixed above Bottom Nav */}
            <div className="fixed bottom-[74px] left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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
                        disabled={isSaving}
                        className={cn(
                            "flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20",
                            isSaving && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                שומר...
                            </>
                        ) : (
                            <>
                                {step === 5 ? 'צור חוזה' : 'הבא'} <ArrowRight className="w-4 h-4 rotate-180" />
                            </>
                        )}
                    </button>
                </div>
            </div>


            {/* Overlap Warning Modal */}
            <AnimatePresence>
                {showOverlapWarning && (
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

                            <h3 className="text-xl font-bold text-slate-900">שים לב! זוהתה חפיפה בתאריכים</h3>
                            <p className="text-slate-600">
                                התאריכים שבחרת ({formData.startDate} - {formData.endDate}) חופפים לחוזה קיים בנכס זה.
                            </p>

                            {overlapDetails && (
                                <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800">
                                    חוזה קיים: {new Date(overlapDetails.start).toLocaleDateString()} - {new Date(overlapDetails.end).toLocaleDateString()}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowOverlapWarning(false)}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
                                >
                                    אישור
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
