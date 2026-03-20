import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { SignaturePad } from '../../components/properties/SignaturePad';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, AlertCircle, Loader2, Calendar, Droplets, Zap, Flame, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types ---
interface MeterData { value: string; photoPath: string | null; }
interface InventoryItem {
    id: string;
    label: string;
    labelHe: string;
    status: 'intact' | 'damaged' | 'na';
    note: string;
    photoPath: string | null;
}
interface ProtocolData {
    id: string;
    property_id: string;
    date: string;
    type: 'move_in' | 'move_out';
    status: string;
    meters: Record<string, MeterData>;
    inventory: InventoryItem[];
    properties: { address: string; city: string; };
}

export const SignProtocol = () => {
    const { token } = useParams<{ token: string }>();
    const { lang } = useTranslation();
    const isRtl = lang === 'he';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [protocol, setProtocol] = useState<ProtocolData | null>(null);
    const [signature, setSignature] = useState<string | null>(null);

    useEffect(() => {
        const fetchProtocol = async () => {
            if (!token) {
                setError(isRtl ? 'קישור לא תקין או חסר' : 'Invalid or missing link');
                setLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('property_protocols')
                    .select('*, properties(address, city)')
                    .eq('tenant_signing_token', token)
                    .single();

                if (fetchError || !data) {
                    setError(isRtl ? 'הפרוטוקול לא נמצא או שכבר נחתם' : 'Protocol not found or already signed');
                } else if (data.status === 'completed') {
                    setError(isRtl ? 'פרוטוקול זה כבר נחתם והושלם.' : 'This protocol has already been signed and completed.');
                } else {
                    setProtocol(data);
                }
            } catch (err) {
                console.error('Error fetching protocol:', err);
                setError(isRtl ? 'שגיאה בטעינת הפרוטוקול. אנא נסה שוב.' : 'Error loading protocol. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchProtocol();
    }, [token, isRtl]);

    const handleSubmit = async () => {
        if (!signature || !protocol) return;

        setSubmitting(true);
        setError(null);

        try {
            // Update protocol record
            const { error: updateError } = await supabase
                .from('property_protocols')
                .update({
                    tenant_signature: signature,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', protocol.id);

            if (updateError) throw updateError;

            // Trigger Edge Function for PDF generation (async, don't await blocking UI if it fails it should retry or queue)
            supabase.functions.invoke('generate-protocol-pdf', {
                body: { protocolId: protocol.id }
            }).catch(console.error);

            setSuccess(true);
        } catch (err) {
            console.error('Submission error:', err);
            setError(isRtl ? 'שגיאה בשמירת הפרוטוקול. אנא נסה יותק מאוחר.' : 'Error saving protocol. Please try later.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (error || !protocol) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-muted/20 p-4 ${isRtl ? 'rtl' : 'ltr'}`}>
                <div className="bg-card w-full max-w-md p-8 rounded-3xl shadow-xl flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{isRtl ? 'שגיאה' : 'Error'}</h2>
                    <p className="text-muted-foreground mb-8">{error}</p>
                    <Button variant="outline" onClick={() => window.location.href = 'https://rentmate.co.il'} className="w-full">
                        {isRtl ? 'חזרה לאתר' : 'Back to Home'}
                    </Button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-muted/20 p-4 ${isRtl ? 'rtl' : 'ltr'}`}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card w-full max-w-md p-8 rounded-3xl shadow-xl flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{isRtl ? 'הפרוטוקול נחתם בהצלחה!' : 'Protocol Signed Successfully!'}</h2>
                    <p className="text-muted-foreground mb-8">
                        {isRtl ? 'עותק של הפרוטוקול הסופי (PDF) יישלח לבעל הנכס ולך בהקדם.' : 'A final PDF copy of this protocol will be ready shortly.'}
                    </p>
                    <Button variant="primary" onClick={() => window.location.href = 'https://rentmate.co.il'} className="w-full rounded-xl">
                        {isRtl ? 'סגור ומעבר לאתר החברה' : 'Close'}
                    </Button>
                </motion.div>
            </div>
        );
    }

    const { properties: property, date, type, meters, inventory } = protocol;

    return (
        <div className={`min-h-screen bg-muted/10 py-12 px-4 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="max-w-2xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">
                        {isRtl ? 'אישור פרוטוקול מסירה' : 'Move-in Protocol Approval'}
                    </h1>
                    <p className="text-muted-foreground">
                        {property?.address}, {property?.city}
                    </p>
                </div>

                {/* Details Card */}
                <div className="bg-card rounded-3xl p-6 shadow-sm border border-border space-y-8">
                    
                    {/* General Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3">
                            <div className="bg-brand-100 text-brand-600 p-2 rounded-xl">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{isRtl ? 'תאריך מסירה' : 'Date'}</p>
                                <p className="font-semibold">{new Date(date).toLocaleDateString(isRtl ? 'he-IL' : 'en-US')}</p>
                            </div>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3">
                            <div className="bg-brand-100 text-brand-600 p-2 rounded-xl">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{isRtl ? 'סוג פרוטוקול' : 'Type'}</p>
                                <p className="font-semibold">{type === 'move_in' ? (isRtl ? 'כניסה' : 'Move-in') : (isRtl ? 'עזיבה' : 'Move-out')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Meters */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2">{isRtl ? 'מונים' : 'Meters'}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(meters).map(([key, data]) => {
                                if (!data || (!data.value && !data.photoPath)) return null;
                                let icon = <Zap className="w-4 h-4 text-brand-500" />;
                                if (key === 'water') icon = <Droplets className="w-4 h-4 text-primary" />;
                                if (key === 'gas') icon = <Flame className="w-4 h-4 text-orange-500" />;

                                return (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10">
                                        <div className="flex items-center gap-2">
                                            {icon}
                                            <span className="font-medium capitalize">{key}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold">{data.value || '-'}</span>
                                            {data.photoPath && <ImageIcon className="w-4 h-4 text-brand-400" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Inventory */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg border-b pb-2">{isRtl ? 'תכולה ומצב הנכס' : 'Inventory & Condition'}</h3>
                        <div className="space-y-3">
                            {inventory.filter(item => item.status !== 'na').map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-border bg-muted/10 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{isRtl ? item.labelHe : item.label}</span>
                                        <span className={`text-sm px-2 py-1 rounded-full font-medium ${item.status === 'intact' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {isRtl ? (item.status === 'intact' ? 'תקין' : 'פגום') : (item.status === 'intact' ? 'Working' : 'Damaged')}
                                        </span>
                                    </div>
                                    {item.note && <p className="text-base text-muted-foreground mt-1">{item.note}</p>}
                                    {item.photoPath && (
                                        <div className="mt-2 flex items-center gap-1 text-sm text-brand-600 bg-brand-50 w-fit px-2 py-1 rounded-lg">
                                            <ImageIcon className="w-3 h-3" />
                                            {isRtl ? 'תמונה צורפה' : 'Photo Attached'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="space-y-6 pt-4 border-t">
                        <h3 className="font-bold text-lg">{isRtl ? 'חתימות' : 'Signatures'}</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="text-base font-medium mb-2">{isRtl ? 'חתימת בעל הנכס' : 'Landlord Signature'}</p>
                                <div className="border rounded-xl bg-card p-4 flex justify-center h-24 items-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                                    <span className="text-base text-muted-foreground">{isRtl ? 'נחתם מראש' : 'Signed'}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-base font-medium mb-2">{isRtl ? 'חתימת השוכר - חתום כאן' : 'Tenant Signature - Sign Below'}</p>
                                <SignaturePad 
                                    onSign={(dataUrl: string) => setSignature(dataUrl ? dataUrl : null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-card w-full border-t border-border p-4 fixed bottom-0 left-0 right-0 z-50 px-4 md:static md:bg-transparent md:border-none md:p-0 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none">
                    <Button
                        variant="primary"
                        isLoading={submitting}
                        disabled={!signature}
                        onClick={handleSubmit}
                        className="w-full max-w-2xl rounded-xl py-3.5 text-lg font-bold"
                    >
                        {isRtl ? 'אני מאשר וחותם על הפרוטוקול' : 'Approve & Submit Protocol'}
                    </Button>
                </div>
                {/* Spacer for fixed footer on mobile */}
                <div className="h-24 md:hidden"></div>
            </div>
        </div>
    );
};
export default SignProtocol;
