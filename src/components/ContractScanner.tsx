import { useState, useEffect } from 'react';
import { LegalDisclaimerModal } from './LegalDisclaimerModal';
import { ContractReviewModal } from './ContractReviewModal';
import { RedactionStudio } from './RedactionStudio';
import { ScannerUtils } from '../lib/scanner-utils';
import type { ExtractedField } from '../types/database';
import { Loader2, FileText, Upload, Shield, AlertTriangle, CheckCircle2, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScannerAnimation } from './ScannerAnimation';

interface ContractScannerProps {
    onScanComplete: (extractedData: ExtractedField[], contractFileUrl: string, contractFile?: File) => void;
    onCancel: () => void;
    mode?: 'modal' | 'embedded';
    skipReview?: boolean;
}

export function ContractScanner({ onScanComplete, onCancel, mode = 'modal', skipReview }: ContractScannerProps) {
    const [step, setStep] = useState<'disclaimer' | 'upload' | 'processing' | 'redact' | 'review' | 'success'>('disclaimer');
    const [scannedImages, setScannedImages] = useState<File[]>([]);
    const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
    const [contractUrl, setContractUrl] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('');
    const [confirmedFields, setConfirmedFields] = useState<ExtractedField[]>([]);
    const [generatedPdf, setGeneratedPdf] = useState<File | null>(null);

    const handleDisclaimerAccept = () => {
        setStep('upload');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStep('processing');
        setError('');

        try {
            setProgress('מעבד קובץ באופן מקומי...');

            // 1. Convert PDF to images locally for redaction
            const images = await ScannerUtils.processFile(file);
            setScannedImages(images);
            setStep('redact');

        } catch (err) {
            console.error('Scanning error:', err);
            setError(err instanceof Error ? err.message : 'נכשל בעיבוד הקובץ');
            setStep('upload');
        }
    };

    const handleRedactionConfirm = async (redactedImages: File[]) => {
        // Update local state
        setScannedImages(redactedImages);

        setStep('processing');
        setProgress('מעלה קבצים לענן המאובטח...');

        try {
            setProgress('מעלה קבצים לענן המאובטח...');

            // 1. Convert images to Base64 to avoid OpenAI timeouts downloading from Storage
            const { supabase } = await import('../lib/supabase');
            const imageUrls: string[] = [];

            for (let i = 0; i < redactedImages.length; i++) {
                const file = redactedImages[i];

                // Convert to Base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                imageUrls.push(base64);
            }

            setProgress('מנתח חוזה באמצעות AI...');

            // 2. Call Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('analyze-contract', {
                body: { images: imageUrls }
            });

            if (error) {
                console.error('AI Service Error (raw):', error);

                // Attempt to extract meaningful message from Supabase error
                // Sometimes error.context or error details are hidden
                let detailedMessage = error.message;

                // If it's the generic "non-2xx" error, try to see if there's more info
                if (detailedMessage && detailedMessage.includes('non-2xx')) {
                    try {
                        // Check if the error object actually contains the response body in some property
                        // For debug: show the whole object
                        detailedMessage += ` details: ${JSON.stringify(error)}`;
                    } catch (e) {
                        // ignore
                    }
                }

                throw new Error(`AI Analysis Failed: ${detailedMessage}`);
            }

            if (!data || !data.fields) {
                console.error('AI Service Invalid Data:', data);
                throw new Error('התקבל מענה לא תקין משירות ה-AI.');
            }

            // 3. Map backend fields (snake_case) to frontend fields (camelCase)
            // Backend fields defined in analyze-contract/index.ts:
            // tenant_name, landlord_name, property_address, monthly_rent, currency, 
            // security_deposit, start_date, end_date, payment_day, tenant_phone, tenant_email

            const fieldMapping: Record<string, ExtractedField['fieldName']> = {
                'tenant_name': 'tenantName',
                'tenant_id': 'tenantId',
                'tenant_email': 'tenantEmail',
                'tenant_phone': 'tenantPhone',

                'landlord_name': 'landlordName',
                'landlord_id': 'landlordId',
                'landlord_phone': 'landlordPhone',

                'property_address': 'address',
                'city': 'city',
                'street': 'street',
                'building_number': 'buildingNum',
                'apartment_number': 'aptNum',
                'size_sqm': 'size',
                'rooms': 'rooms',
                'floor': 'floor',

                'monthly_rent': 'rent',
                'currency': 'currency',
                'payment_day': 'paymentDay',
                'payment_frequency': 'paymentFrequency',

                'security_deposit_amount': 'securityDeposit',
                'guarantees': 'guaranteeType',

                'start_date': 'startDate',
                'end_date': 'endDate',
                'signing_date': 'signingDate', // If used

                // Linkage
                'linkage_type': 'linkageType',
                'index_calculation_method': 'indexCalculationMethod',
                'base_index_date': 'baseIndexDate',
                'base_index_value': 'baseIndexValue',
                'limit_type': 'indexLimitType',

                'renewal_option': 'renewalOption',
                'pets_allowed': 'petsAllowed',
                'guarantors_info': 'guarantorsInfo',
                'special_clauses': 'specialClauses'
            };

            if (!data || !data.fields) {
                throw new Error('Invalid response from AI service');
            }

            const mappedFields: ExtractedField[] = data.fields
                .filter((f: any) => fieldMapping[f.fieldName])
                .map((f: any) => ({
                    fieldName: fieldMapping[f.fieldName],
                    extractedValue: f.extractedValue,
                    sourceText: f.sourceText,
                    confidence: f.confidence === 'high' ? 'high' : f.confidence === 'medium' ? 'medium' : 'low',
                    confidenceScore: f.confidence === 'high' ? 99 : 70,
                    pageNumber: f.pageNumber || 1,
                    userConfirmed: false,
                    manuallyOverridden: false
                }));


            // Special handling: Property Address might need splitting if possible, 
            // but for now we put it in 'address' or 'street'.
            // The AI returns 'property_address'.

            // If the AI didn't return some fields, we can infer confidence 'low'.

            // Generate a local URL for the first page for review
            let url = '';
            if (redactedImages.length > 0) {
                url = URL.createObjectURL(redactedImages[0]);
                setContractUrl(url);
            }

            setExtractedFields(mappedFields);

            if (skipReview) {
                // Skip the internal review step and pass data immediately
                // Also generate PDF if needed (though onScanComplete might handle it differently, 
                // typically we want the PDF generation to happen so we pass it up)

                let pdfFile: File | undefined;
                try {
                    if (redactedImages.length > 0) {
                        pdfFile = await ScannerUtils.generatePdfFromImages(redactedImages);
                    }
                } catch (e) {
                    console.error("Failed to generate PDF for skipReview", e);
                }

                onScanComplete(mappedFields, url, pdfFile);
                return;
            }

            setStep('review');

        } catch (err) {
            console.error('Analysis error:', err);
            setError(err instanceof Error ? err.message : 'נכשל בניתוח החוזה');
            setStep('redact');
        }
    };

    // Delay closing to show success animation
    const handleReviewConfirm = async (fields: ExtractedField[]) => {
        setConfirmedFields(fields);

        // Generate PDF from the (potentially redacted) images
        try {
            // If we have scanned images, generate PDF. 
            // Note: scannedImages was updated in handleRedactionConfirm
            if (scannedImages.length > 0) {
                const pdfFile = await ScannerUtils.generatePdfFromImages(scannedImages);
                setGeneratedPdf(pdfFile);
            }
        } catch (e) {
            console.error("Failed to generate PDF", e);
            // Non-blocking, we just won't have the file
        }

        setStep('success');
    };

    useEffect(() => {
        if (step === 'success') {
            const timer = setTimeout(() => {
                onScanComplete(confirmedFields, contractUrl || '', generatedPdf || undefined);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [step, confirmedFields, contractUrl, onScanComplete, generatedPdf]);

    if (step === 'disclaimer') {
        return <LegalDisclaimerModal onAccept={handleDisclaimerAccept} onDecline={onCancel} />;
    }

    if (step === 'redact') {
        return (
            <RedactionStudio
                images={scannedImages}
                onConfirm={handleRedactionConfirm}
                onCancel={() => setStep('upload')}
            />
        );
    }

    if (step === 'review') {
        return (
            <ContractReviewModal
                extractedFields={extractedFields}
                contractFileUrl={contractUrl}
                onConfirm={handleReviewConfirm}
                onCancel={() => setStep('upload')}
            />
        );
    }

    const isModal = mode === 'modal';

    const containerClasses = isModal
        ? "bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        : "w-full overflow-hidden";

    const content = (
        <motion.div
            key={step}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={containerClasses}
        >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                <div className="relative z-10">
                    {step === 'processing' ? (
                        <ScannerAnimation />
                    ) : step === 'success' ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30"
                        >
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </motion.div>
                    ) : (
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
                            <Upload className="w-8 h-8 text-white" />
                        </div>
                    )}

                    <h2 className="text-2xl font-bold mb-2">
                        {step === 'success' ? 'החוזה עובד בהצלחה!' : 'העלאת חוזה'}
                    </h2>
                    <p className="text-blue-200 text-sm">
                        {step === 'success'
                            ? 'הנתונים הועברו לטופס החוזה'
                            : 'המערכת תנתח את החוזה ותחלץ את הנתונים החשובים באופן מאובטח'
                        }
                    </p>
                </div>

                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white,transparent)] animate-[spin_20s_linear_infinite]"></div>
                </div>
            </div>

            {/* Body */}
            <div className="p-8 bg-card">
                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                    >
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-right">
                            <h3 className="font-bold text-red-800 text-sm">שגיאה בתהליך</h3>
                            <p className="text-red-600 text-sm mt-1">{error}</p>
                        </div>
                    </motion.div>
                )}

                {step === 'processing' ? (
                    <div className="text-center py-6">
                        <motion.h3
                            className="text-lg font-bold text-slate-800 mb-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={progress}
                        >
                            {progress}
                        </motion.h3>
                        <p className="text-slate-500 text-sm">אנא המתן, הניתוח יקח כ-20 שניות...</p>

                        {/* Animated AI Progress bar */}
                        <div className="relative w-full h-3 bg-slate-100 rounded-full mt-8 overflow-hidden">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
                        </div>
                        <div className="mt-4 flex justify-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
                            <span className="flex items-center gap-1"><ScanLine className="w-3 h-3" /> AI Analysis</span>
                        </div>
                    </div>
                ) : step === 'success' ? (
                    <div className="text-center py-6">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-green-600 font-medium mb-4"
                        >
                            כל הנתונים אומתו ונשמרו.
                        </motion.div>
                        <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative group">
                            <input
                                type="file"
                                accept="application/pdf,.pdf,image/png,image/jpeg,image/jpg"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center transition-all duration-300 group-hover:border-blue-500 group-hover:bg-blue-50">
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-12 h-12 mx-auto mb-4"
                                >
                                    <FileText className="w-full h-full text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </motion.div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">בחר קובץ להעלאה</h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    PDF או תמונה (JPG, PNG)
                                </p>
                                <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-900/20 group-hover:bg-blue-600 group-hover:shadow-blue-600/30 transition-all">
                                    <Upload className="w-4 h-4" />
                                    בחר קובץ מהמחשב
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-4 flex items-start gap-3">
                            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-right">
                                <h4 className="font-bold text-blue-900 text-sm">הפרטיות שלך מוגנת</h4>
                                <p className="text-blue-700/80 text-xs mt-1">
                                    בשלב הבא תוכל להשחיר פרטים אישיים רגישים לפני שהקובץ יישלח לניתוח ה-AI.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {step !== 'processing' && step !== 'success' && (
                    <button
                        onClick={onCancel}
                        className="w-full mt-4 text-slate-400 text-sm hover:text-slate-600 transition-colors"
                    >
                        ביטול
                    </button>
                )}
            </div>
        </motion.div>
    );

    if (!isModal) return <AnimatePresence mode="wait">{content}</AnimatePresence>;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="scanner-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                {content}
            </motion.div>
        </AnimatePresence>
    );
}
