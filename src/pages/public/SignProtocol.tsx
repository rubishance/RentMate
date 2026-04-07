import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { SignaturePad } from '../../components/properties/SignaturePad';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, AlertCircle, Loader2, Calendar, Droplets, Zap, Flame, Key, Wrench, Package, FileType, Home } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types ---
interface ProtocolData {
    id: string;
    property_id: string;
    status: string;
    handover_date: string;
    tenants_details: { name: string, id: string }[];
    content: {
        utilities: Array<{ id: string, type: 'electricity' | 'water' | 'gas', meterNumber: string, reading: string, images: string[] }>;
        inventory: { items: Array<{ id: string, name: string, condition: string, notes: string }>, global_images: string[] };
        fixes: Array<{ id: string, description: string, isFixed: boolean, severity: string, images: string[] }>;
        keys: Array<{ id: string, type: string, amount: number }>;
        includeDisclaimer?: boolean;
    };
    landlord_signature: string;
    properties: { address: string; city: string; };
}

export const SignProtocol = () => {
    const { token } = useParams<{ token: string }>();
    const { lang } = useTranslation();
    const isRtl = lang === 'he';
    const t = useCallback((en: string, he: string) => isRtl ? he : en, [isRtl]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [protocol, setProtocol] = useState<ProtocolData | null>(null);
    const [signature, setSignature] = useState<string | null>(null);

    useEffect(() => {
        const fetchProtocol = async () => {
            if (!token) {
                setError(t('Invalid or missing link', 'קישור לא תקין או חסר'));
                setLoading(false);
                return;
            }

            try {
                // Fetch securely via RPC without requiring auth
                const { data, error: fetchError } = await supabase.rpc('get_public_protocol', {
                    p_token: token
                });

                if (fetchError || !data) {
                    setError(t('Protocol not found, invalid link, or already signed', 'הפרוטוקול לא נמצא, הקישור פג תוקף, או שכבר נחתם.'));
                } else if (data.status === 'signed') {
                     // In case the API returns it anyway (though the RPC filters by pending_signature)
                    setError(t('This protocol has already been signed.', 'פרוטוקול זה כבר נחתם והושלם.'));
                } else {
                    setProtocol(data as ProtocolData);
                }
            } catch (err) {
                console.error('Error fetching protocol:', err);
                setError(t('Error loading protocol. Please try again.', 'שגיאה בטעינת הפרוטוקול. אנא נסה שוב.'));
            } finally {
                setLoading(false);
            }
        };

        fetchProtocol();
    }, [token, isRtl, t]);

    const handleSubmit = async () => {
        if (!signature || !protocol || !token) return;

        setSubmitting(true);
        setError(null);

        try {
            // Apply signature securely via RPC
            const { data, error: updateError } = await supabase.rpc('sign_public_protocol', {
                p_token: token,
                p_signature: signature
            });

            if (updateError || !data) {
                throw new Error(updateError?.message || 'Failed to update signature');
            }

            // Trigger Edge Function for PDF generation (async)
            supabase.functions.invoke('generate-protocol-pdf', {
                body: { protocolId: protocol.id }
            }).catch(console.error);

            setSuccess(true);
        } catch (err) {
            console.error('Submission error:', err);
            setError(t('Error saving protocol. Please try again later.', 'שגיאה בשמירת הפרוטוקול. אנא נסה מאוחר יותר.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !protocol) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-muted/20 p-4 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="bg-white dark:bg-neutral-900 w-full max-w-md p-8 rounded-[2rem] shadow-xl flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-primary">{t('Error', 'שגיאה')}</h2>
                    <p className="text-muted-foreground mb-8">{error}</p>
                    <Button variant="outline" onClick={() => window.location.href = 'https://rentmate.co.il'} className="w-full rounded-xl text-primary border-primary/20 hover:bg-primary/5">
                        {t('Back to Home', 'חזרה לאתר')}
                    </Button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black p-4 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-neutral-900 border w-full max-w-md p-8 rounded-[2rem] shadow-2xl flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-primary">{t('Protocol Signed Successfully!', 'הפרוטוקול נחתם בהצלחה!')}</h2>
                    <p className="text-muted-foreground mb-8">
                        {t('A final PDF copy of this protocol will be ready shortly and sent to the landlord.', 'הפרוטוקול הסופי נשמר מיד במערכת. המשכיר יקבל התראה.')}
                    </p>
                    <Button onClick={() => window.location.href = 'https://rentmate.co.il'} className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12">
                        {t('Close', 'סגור ומעבר לאתר')}
                    </Button>
                </motion.div>
            </div>
        );
    }

    const { properties: property, handover_date, tenants_details, content } = protocol;

    const hebrewKeys: Record<string, string> = {
        'frontDoor': 'דלת כניסה',
        'buildingFob': 'צ׳יפ לבניין',
        'mailBox': 'תיבת דואר',
        'parkingRemote': 'שלט לחניה',
        'roomDoor': 'דלת חדר',
        'storageRoom': 'מחסן'
    };

    const keysArray = Array.isArray(content?.keys) 
        ? content.keys 
        : Object.entries(content?.keys || {}).map(([type, amount], idx) => ({ id: String(idx), type, amount: Number(amount) }));

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-black py-8 px-4 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="max-w-xl mx-auto space-y-6">
                
                {/* Brand Header */}
                <div className="flex justify-between items-center bg-white dark:bg-neutral-900 border px-6 py-4 rounded-[2rem] shadow-sm mb-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Home className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tight text-foreground">RentMate</span>
                    </div>
                    <a href="https://rentmate.co.il" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                        www.rentmate.co.il
                    </a>
                </div>

                {/* Header */}
                <div className="text-center space-y-2 mb-8">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileType className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-foreground">
                        {t('Handover Protocol Review', 'אישור פרוטוקול מסירה')}
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg">
                        {property?.address}, {property?.city}
                    </p>
                </div>

                {/* Details Container */}
                <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 shadow-xl border space-y-8">
                    
                    {/* General Info */}
                    <div className="flex bg-slate-50 dark:bg-neutral-800 p-4 rounded-2xl items-center gap-4">
                        <div className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90 p-2 sm:p-4 rounded-xl shrink-0">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('Handover Date', 'תאריך מסירה')}</p>
                            <p className="text-lg font-bold">{new Date(handover_date).toLocaleDateString(isRtl ? 'he-IL' : 'en-US')}</p>
                        </div>
                    </div>

                    {/* Tenant Info */}
                    {(tenants_details && tenants_details.length > 0) && (
                        <div>
                            <h3 className="font-bold text-lg mb-2 sm:mb-4 flex items-center border-b pb-2"><CheckCircle2 className="w-5 h-5 mr-2 ml-2 text-primary" />{t('Tenant', 'שוכר')}</h3>
                            <p className="font-medium text-lg px-2">{tenants_details[0].name}</p>
                        </div>
                    )}

                    {/* Utilities / Meters */}
                    {content.utilities && content.utilities.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2 flex items-center">
                                <Zap className="w-5 h-5 mr-2 ml-2 text-primary" />
                                {t('Meters', 'מונים')}
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:gap-4">
                                {content.utilities.map((item) => {
                                    if (!item.reading) return null;
                                    let icon = <Zap className="w-5 h-5 text-primary" />;
                                    let label = t('Electricity', 'חשמל');
                                    if (item.type === 'water') { icon = <Droplets className="w-5 h-5 text-blue-500" />; label = t('Water', 'מים'); }
                                    if (item.type === 'gas') { icon = <Flame className="w-5 h-5 text-orange-500" />; label = t('Gas', 'גז'); }
                                    
                                    return (
                                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-slate-50 dark:bg-neutral-800/50 gap-2">
                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border">{icon}</div>
                                                <div>
                                                    <span className="font-bold block">{label}</span>
                                                    {item.meterNumber && <span className="text-xs text-muted-foreground font-mono">#{item.meterNumber}</span>}
                                                </div>
                                            </div>
                                            <div className="font-black text-xl text-left" dir="ltr">{item.reading}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Inventory */}
                    {content.inventory && content.inventory.items && content.inventory.items.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2 flex items-center">
                                <Package className="w-5 h-5 mr-2 ml-2 text-primary" />
                                {t('Inventory & Assets', 'תכולה ומצב הנכס')}
                            </h3>
                            <div className="space-y-3">
                                {content.inventory.items.map((item) => {
                                    const statusColors: Record<string, string> = {
                                        'good': 'bg-emerald-100 text-emerald-700',
                                        'fair': 'bg-blue-100 text-blue-700',
                                        'poor': 'bg-orange-100 text-orange-700',
                                        'broken': 'bg-red-100 text-red-700',
                                        'missing': 'bg-slate-200 text-slate-700'
                                    };
                                    const hebrewStatuses: Record<string, string> = {
                                      'good': 'תקין',
                                      'fair': 'סביר',
                                      'poor': 'לקוי',
                                      'broken': 'שבור',
                                      'missing': 'חסר'
                                    };

                                    return (
                                        <div key={item.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-neutral-800/50 flex flex-col gap-2">
                                            <div className="flex items-start justify-between">
                                                <span className="font-bold">{item.name}</span>
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColors[item.condition] || 'bg-slate-100 text-slate-700'}`}>
                                                    {isRtl ? (hebrewStatuses[item.condition] || item.condition) : (item.condition?.toUpperCase() || '')}
                                                </span>
                                            </div>
                                            {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Fixes */}
                    {content.fixes && content.fixes.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2 flex items-center text-red-600">
                                <Wrench className="w-5 h-5 mr-2 ml-2" />
                                {t('Required Fixes', 'ליקויים לתיקון')}
                            </h3>
                            <div className="space-y-3">
                                {content.fixes.map((fix) => (
                                    <div key={fix.id} className="p-4 rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
                                        <p className="font-medium text-red-800 dark:text-red-300">{fix.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Keys */}
                    {keysArray.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg border-b pb-2 flex items-center">
                                <Key className="w-5 h-5 mr-2 ml-2 text-primary" />
                                {t('Keys Handed Over', 'מפתחות שנימסרו')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {keysArray.map((key) => (
                                    <div key={key.id} className="px-4 py-2 font-medium bg-slate-100 dark:bg-neutral-800 rounded-xl border flex items-center gap-2">
                                        <Key className="w-4 h-4 text-slate-500" />
                                        <span>{isRtl ? (hebrewKeys[key.type] || key.type) : key.type}</span>
                                        <span className="bg-slate-200 dark:bg-neutral-700 px-2 py-0.5 rounded text-xs ml-1">{key.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Legal Disclaimer */}
                    {content.includeDisclaimer && (
                        <div className="p-4 sm:p-6 rounded-2xl bg-slate-100 dark:bg-neutral-800 border text-sm text-foreground space-y-2">
                            <div className="font-bold text-base">{t('Legal Disclaimer', 'הצהרה משפטית - ויתור על פגם נסתר')}</div>
                            <p className="text-muted-foreground leading-relaxed">
                                {t(
                                    "By signing below, the tenant confirms they have inspected the property, it is fit for their needs, and they waive claims of hidden defects that could have reasonably been discovered, except for the defects noted in this protocol.", 
                                    "בחתימתו מטה, השוכר מאשר כי בדק את הנכס, הוא מתאים לצרכיו, והוא מוותר על כל טענה לפגם נסתר שניתן היה לגלותו באופן סביר, למעט הליקויים המצויינים בפרוטוקול זה."
                                )}
                            </p>
                        </div>
                    )}

                    {/* Signatures */}
                    <div className="space-y-6 pt-6 border-t">
                        <h3 className="font-bold text-xl">{t('Signatures', 'חתימות')}</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <p className="text-base font-medium mb-2 sm:mb-4">{t('Landlord Signature', 'חתימת המשכיר')}</p>
                                <div className="border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-2xl p-6 flex flex-col justify-center items-center h-32 relative overflow-hidden">
                                     {protocol.landlord_signature ? (
                                         <img src={protocol.landlord_signature} alt="Landlord Signature" className="max-h-full opacity-80" />
                                     ) : (
                                        <>
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                                            <span className="font-bold text-emerald-800 dark:text-emerald-400">{t('Pre-Signed by Landlord', 'נחתם מראש על ידי המשכיר')}</span>
                                        </>
                                     )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed">
                                <p className="text-base font-medium mb-2 sm:mb-4 text-primary dark:text-primary/90">
                                    {t('Your Signature (Tenant)', 'חתימת השוכר - חתום כאן')}
                                </p>
                                <div className="border border-primary/20 dark:border-primary/20 rounded-2xl overflow-hidden shadow-inner">
                                    <SignaturePad 
                                        label={t('Signature', 'חתימה')}
                                        placeholder={t('Signature', 'חתימה')}
                                        clearLabel={t('Clear', 'נקה')}
                                        onSign={(dataUrl: string) => setSignature(dataUrl ? dataUrl : null)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 pb-8 flex justify-center sticky bottom-4 z-50">
                    <Button
                        disabled={!signature || submitting}
                        onClick={handleSubmit}
                        className="w-full rounded-2xl h-14 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all bg-primary hover:bg-primary/90"
                    >
                        {submitting ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            t('I Approve & Sign', 'אני מאשר וחותם על הפרוטוקול')
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
export default SignProtocol;
