import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Building2, UploadCloud, CheckCircle2, User, Users, Phone, Mail, FileText, Briefcase, CreditCard, ChevronRight, Loader2, Info, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export default function TenantApplication() {
    const { token: propertyId } = useParams();
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const isRtl = lang === 'he';

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'intro' | 'form' | 'success' | 'full'>('intro');
    const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
    const [propertyInfo, setPropertyInfo] = useState<{ address: string, city: string } | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        id_number: '',
        monthly_income: '',
        employment_details: ''
    });

    const [files, setFiles] = useState<{ idCopy: File | null, payslips: File[] }>({
        idCopy: null,
        payslips: []
    });

    useEffect(() => {
        const fetchProperty = async () => {
            if (!propertyId) return;
            setLoading(true);
            try {
                // Try to fetch property info. Might be blocked by RLS if not authenticated,
                // but we attempt it anyway in case public read is allowed or we are testing while logged in.
                const { data } = await supabase
                    .from('properties')
                    .select('address, city')
                    .eq('id', propertyId)
                    .maybeSingle();

                if (data) {
                    setPropertyInfo(data);
                    
                    // Check applicant count limit
                    const { count } = await supabase
                        .from('tenant_candidates')
                        .select('*', { count: 'exact', head: true })
                        .eq('property_id', propertyId);
                        
                    if (count !== null && count >= 20) {
                        setStep('full');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch property", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [propertyId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'payslip') => {
        if (!e.target.files?.length) return;
        
        if (type === 'id') {
            setFiles(prev => ({ ...prev, idCopy: e.target.files![0] }));
        } else {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => ({ ...prev, payslips: [...prev.payslips, ...newFiles] }));
        }
    };

    const removePayslip = (index: number) => {
        setFiles(prev => ({
            ...prev,
            payslips: prev.payslips.filter((_, i) => i !== index)
        }));
    };

    const uploadFile = async (file: File, candidateToken: string, folder: string): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${propertyId}/${folder}/${candidateToken}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('tenant_documents') // We will need to create this bucket or use 'property_documents'
                .upload(fileName, file);

            if (error) {
                // Fallback to property_documents if tenant_documents doesn't exist
                const { data: fallbackData, error: fallbackError } = await supabase.storage
                    .from('property_documents')
                    .upload(`applications/${fileName}`, file);
                    
                if (fallbackError) throw fallbackError;
                return fallbackData.path;
            }

            return data.path;
        } catch (error) {
            console.error('Error uploading file:', error);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propertyId) return;

        setSubmitting(true);
        try {
            // Generate a unique token for this candidate
            const candidateToken = crypto.randomUUID();

            let documentPaths: { idCopy?: string, payslips: string[] } = { payslips: [] };

            // Upload Optional Documents
            if (files.idCopy) {
                const path = await uploadFile(files.idCopy, candidateToken, 'ids');
                if (path) documentPaths.idCopy = path;
            }

            for (const file of files.payslips) {
                const path = await uploadFile(file, candidateToken, 'payslips');
                if (path) documentPaths.payslips.push(path);
            }

            // Defensive check for limit before insert
            const { count } = await supabase
                .from('tenant_candidates')
                .select('*', { count: 'exact', head: true })
                .eq('property_id', propertyId);
                
            if (count !== null && count >= 20) {
                setStep('full');
                return;
            }

            // Insert into DB
            const { error } = await supabase
                .from('tenant_candidates')
                .insert({
                    property_id: propertyId,
                    token: candidateToken,
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                    id_number: formData.id_number,
                    monthly_income: formData.monthly_income ? Number(formData.monthly_income) : null,
                    employment_details: formData.employment_details,
                    documents: documentPaths
                });

            if (error) throw error;

            setStep('success');
        } catch (error: any) {
            console.error('Submission failed:', error);
            alert(isRtl ? `אירעה שגיאה: ${error?.message || 'אנא נסה שנית.'}` : `Error submitting: ${error?.message || 'Please try again.'}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className={`min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 ${isRtl ? 'rtl' : 'ltr'}`}>
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl shadow-primary-900/5 mb-8">
                    <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-primary-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        {isRtl ? 'בקשתך נשלחה בהצלחה!' : 'Application Submitted!'}
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        {isRtl ? 'פרטיך הועברו לבעל הנכס.' : 'Your details have been forwarded to the landlord.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-primary-600 font-medium text-sm">
                        <span>Powered by RentMate</span>
                        <div className="w-5 h-5 bg-primary-600 rounded-lg rotate-3" />
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'full') {
        return (
            <div className={`min-h-screen bg-muted/30 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
                <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <div className="flex justify-center items-center gap-2 text-primary-600 font-bold text-xl mb-4">
                            <div className="w-6 h-6 bg-primary-600 rounded-lg rotate-3" />
                            <span>RentMate</span>
                        </div>
                    </div>

                    <div className="bg-white py-8 px-6 shadow-xl shadow-primary-900/5 sm:rounded-3xl sm:px-10 border border-border text-center">
                        <div className="mx-auto h-16 w-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-amber-100 dark:border-amber-800/30">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                            {isRtl ? 'ההרשמה הסתיימה' : 'Registration Closed'}
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed mb-6">
                            {isRtl 
                                ? 'נכס זה הגיע למכסה המקסימלית של מתעניינים ואינו מקבל פניות חדשות בשלב זה.'
                                : 'This property has reached its maximum number of applicants and is not accepting new queries at this time.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'intro') {
        return (
            <div className={`min-h-screen bg-muted/30 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
                <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <div className="flex justify-center items-center gap-2 text-primary-600 font-bold text-xl mb-4">
                            <div className="w-6 h-6 bg-primary-600 rounded-lg rotate-3" />
                            <span>RentMate</span>
                        </div>
                    </div>

                    <div className="bg-white py-8 px-6 shadow-xl shadow-primary-900/5 sm:rounded-3xl sm:px-10 border border-border">
                        <div className="text-center mb-8">
                            <div className="mx-auto h-16 w-16 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-primary-100 dark:border-primary-800/30">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-3">
                                {isRtl ? 'ברוכים הבאים לטופס המועמדות המאובטח' : 'Welcome to the Secure Application Form'}
                            </h2>
                            <p className="text-muted-foreground text-base leading-relaxed">
                                {isRtl 
                                    ? 'טופס זה נועד לרכז את כל המרכיבים שבעל הנכס צריך על מנת לזרז את תהליכי הקבלה, להקטין בירוקרטיה ולשמור על פרטיותך.'
                                    : 'This form gathers all necessary details for the landlord to speed up the acceptance process, reduce bureaucracy, and protect your privacy.'}
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                                <div className="mt-0.5 text-primary-500"><ShieldCheck className="w-5 h-5"/></div>
                                <div>
                                    <h4 className="font-semibold text-foreground text-base mb-1">{isRtl ? 'הצפנת נתונים מחמירה' : 'Strict Data Encryption'}</h4>
                                    <p className="text-muted-foreground text-xs">{isRtl ? 'המסמכים שלך מועלים ישירות לשרת מאובטח.' : 'Your documents are uploaded directly to a secure server.'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                                <div className="mt-0.5 text-primary-500"><Lock className="w-5 h-5"/></div>
                                <div>
                                    <h4 className="font-semibold text-foreground text-base mb-1">{isRtl ? 'פרטיות מובטחת' : 'Guaranteed Privacy'}</h4>
                                    <p className="text-muted-foreground text-xs">{isRtl ? 'רק בעל הנכס המיועד יוכל לצפות בנתונים שלך.' : 'Only the designated landlord can view your data.'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-6 mt-2">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-start h-5 mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={disclaimerAgreed}
                                        onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                                        className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500 transition-colors cursor-pointer"
                                    />
                                </div>
                                <span className="text-base text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                                    {isRtl 
                                        ? 'על ידי סימון תיבה זו, אני מאשר/ת כי הפרטים והמסמכים שאמסור יועברו תחת הצפנה בלעדית לבעל הנכס לצורך שקילת מועמדותי לשכירות. הנתונים לא ישמשו לצרכים שיווקיים.'
                                        : 'By checking this box, I confirm that the details and documents I provide will be transmitted exclusively to the landlord under encryption to consider my rental application. The data will not be used for marketing purposes.'}
                                </span>
                            </label>
                        </div>
                        
                        <div className="mt-8">
                            <button
                                onClick={() => setStep('form')}
                                disabled={!disclaimerAgreed}
                                className={`w-full py-3.5 rounded-xl text-base font-medium transition-all shadow-premium flex justify-center items-center gap-2 ${disclaimerAgreed ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-primary-600/50 text-white cursor-not-allowed'}`}
                            >
                                {isRtl ? 'המשך למילוי הטופס' : 'Continue to Application'}
                                <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-muted/30 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
            <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-primary-100 dark:border-primary-800/30">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-foreground">
                        {isRtl ? 'טופס מועמדות לשכירות' : 'Rental Application Form'}
                    </h2>
                    <p className="mt-2 text-base text-muted-foreground max-w-sm mx-auto">
                        {propertyInfo 
                            ? (isRtl ? `עבור הנכס ב${propertyInfo.address}, ${propertyInfo.city}` : `For property at ${propertyInfo.address}, ${propertyInfo.city}`)
                            : (isRtl ? 'אנא מלא את פרטיך כדי שנוכל להכיר אותך טוב יותר.' : 'Please fill in your details so we can get to know you better.')
                        }
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white py-8 px-4 shadow-xl shadow-primary-900/5 sm:rounded-3xl sm:px-10 border border-border">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        
                        {/* Personal Details */}
                        <div>
                            <h3 className="text-lg leading-6 font-medium text-foreground border-b border-border pb-2 mb-4">
                                {isRtl ? 'פרטים אישיים' : 'Personal Details'}
                            </h3>
                            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="block text-base font-medium text-foreground">
                                        {isRtl ? 'שם מלא *' : 'Full Name *'}
                                    </label>
                                    <div className="mt-1 relative rounded-lg shadow-sm">
                                        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={formData.full_name}
                                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                                            className={`focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-base border-border rounded-xl bg-muted/30 py-3 ${isRtl ? 'pr-10' : 'pl-10'}`}
                                            placeholder={isRtl ? 'ישראל ישראלי' : 'John Doe'}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-base font-medium text-foreground">
                                        {isRtl ? 'טלפון נייד *' : 'Mobile Phone *'}
                                    </label>
                                    <div className="mt-1 relative rounded-lg shadow-sm">
                                        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                            <Phone className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                            className={`focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-base border-border rounded-xl bg-muted/30 py-3 ${isRtl ? 'pr-10' : 'pl-10'}`}
                                            placeholder="05X-XXXXXXX"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-base font-medium text-foreground">
                                        {isRtl ? 'דוא"ל' : 'Email'}
                                    </label>
                                    <div className="mt-1 relative rounded-lg shadow-sm">
                                        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            className={`focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-base border-border rounded-xl bg-muted/30 py-3 ${isRtl ? 'pr-10' : 'pl-10'}`}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-base font-medium text-foreground">
                                        {isRtl ? 'תעודת זהות' : 'ID Number'}
                                    </label>
                                    <div className="mt-1 relative rounded-lg shadow-sm">
                                        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.id_number}
                                            onChange={e => setFormData({...formData, id_number: e.target.value})}
                                            className={`focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-base border-border rounded-xl bg-muted/30 py-3 ${isRtl ? 'pr-10' : 'pl-10'}`}
                                            placeholder={isRtl ? '9 ספרות' : '9 digits'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Details */}
                        <div className="pt-2">
                            <h3 className="text-lg leading-6 font-medium text-foreground border-b border-border pb-2 mb-4">
                                {isRtl ? 'רקע תעסוקתי ופיננסי' : 'Financial & Employment Background'}
                            </h3>
                            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="block text-base font-medium text-foreground">
                                        {isRtl ? 'מקום עבודה / תפקיד' : 'Workplace / Role'}
                                    </label>
                                    <div className="mt-1 relative rounded-lg shadow-sm">
                                        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.employment_details}
                                            onChange={e => setFormData({...formData, employment_details: e.target.value})}
                                            className={`focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-base border-border rounded-xl bg-muted/30 py-3 ${isRtl ? 'pr-10' : 'pl-10'}`}
                                            placeholder={isRtl ? 'לדוגמה: מתכנת בחברת הייטק' : 'e.g., Software Engineer at Tech Corp'}
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-base font-medium text-foreground">
                                        {isRtl ? 'הכנסה חודשית נטו (₪)' : 'Net Monthly Income (₪)'}
                                    </label>
                                    <div className="mt-1 relative rounded-lg shadow-sm">
                                        <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="number"
                                            value={formData.monthly_income}
                                            onChange={e => setFormData({...formData, monthly_income: e.target.value})}
                                            className={`focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-base border-border rounded-xl bg-muted/30 py-3 ${isRtl ? 'pr-10' : 'pl-10'}`}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Documents (Optional) */}
                        <div className="pt-2">
                            <h3 className="text-lg leading-6 font-medium text-foreground border-b border-border pb-2 mb-4">
                                {isRtl ? 'מסמכים תומכים (אופציונלי)' : 'Supporting Documents (Optional)'}
                            </h3>
                            <div className="bg-primary-50/50 rounded-xl p-4 border border-primary-100 mb-4 flex gap-3 text-primary-800 text-sm">
                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-500" />
                                <p>{isRtl ? 'צירוף מסמכים מראש מזרז את תהליך בדיקת המועמדות ומגדיל את הסיכויים לאישור מהיר.' : 'Attaching documents in advance speeds up the screening process and increases chances of quick approval.'}</p>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Upload ID */}
                                <div>
                                    <label className="block text-base font-medium text-foreground mb-2">
                                        {isRtl ? 'צילום תעודת זהות + ספח' : 'ID Copy'}
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-xl hover:bg-muted/30 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*,.pdf"
                                            onChange={(e) => handleFileChange(e, 'id')}
                                        />
                                        <div className="space-y-1 text-center">
                                            {files.idCopy ? (
                                                <div className="text-primary-600 font-medium break-words px-2">{files.idCopy.name}</div>
                                            ) : (
                                                <>
                                                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                                                    <div className="flex text-base text-muted-foreground justify-center">
                                                        <span className="relative rounded-lg font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                                            {isRtl ? 'לחץ להעלאת קובץ' : 'Click to upload'}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Payslips */}
                                <div>
                                    <label className="block text-base font-medium text-foreground mb-2">
                                        {isRtl ? 'תלושי שכר (3 חודשים אחרונים)' : 'Pay Slips (Last 3 months)'}
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-xl hover:bg-muted/30 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            multiple
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            accept="image/*,.pdf"
                                            onChange={(e) => handleFileChange(e, 'payslip')}
                                        />
                                        <div className="space-y-1 text-center">
                                            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                                            <div className="flex text-base text-muted-foreground justify-center">
                                                <span className="relative rounded-lg font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                                    {isRtl ? 'לחץ להעלאת קבצים' : 'Click to upload'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {files.payslips.length > 0 && (
                                        <ul className="mt-3 space-y-2">
                                            {files.payslips.map((file, idx) => (
                                                <li key={idx} className="flex items-center justify-between text-base bg-muted/30 ring-1 ring-slate-200 rounded-xl p-2 px-3">
                                                    <span className="truncate max-w-[200px] text-muted-foreground">{file.name}</span>
                                                    <button type="button" onClick={() => removePayslip(idx)} className="text-red-500 hover:text-red-700 font-medium">
                                                        {isRtl ? 'הסר' : 'Remove'}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-5">
                            <button 
                                type="submit" 
                                className="w-full flex justify-center py-3.5 rounded-xl text-base bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 shadow-premium items-center gap-2"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    isRtl ? 'שלח מועמדות' : 'Submit Application'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
