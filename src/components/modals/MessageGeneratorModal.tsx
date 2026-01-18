import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Copy, MessageCircle, Check, X, Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';

interface MessageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    calculationData: {
        input: any;
        result: any;
    };
}

type Tone = 'friendly' | 'formal';

export function MessageGeneratorModal({ isOpen, onClose, calculationData }: MessageGeneratorModalProps) {
    const { lang } = useTranslation();
    const [tone, setTone] = useState<Tone>('friendly');
    const [shareUrl, setShareUrl] = useState('');
    const [loadingUrl, setLoadingUrl] = useState(false);
    const [copied, setCopied] = useState(false);

    // Generate short URL on open
    useEffect(() => {
        if (isOpen && calculationData && !shareUrl) {
            generateShortUrl();
        }
    }, [isOpen, calculationData]);

    const generateShortUrl = async () => {
        setLoadingUrl(true);
        try {
            // Use stateless Base64 URL to avoid database permissions issues
            const dataToShare = {
                input: calculationData.input,
                result: calculationData.result
            };

            // Encode: JSON -> URL Encode (for unicode) -> Base64
            const jsonStr = JSON.stringify(dataToShare);
            const base64 = btoa(encodeURIComponent(jsonStr));

            // Link directly to calculator page which handles the ?share= param
            const url = `${window.location.origin}/calculator?share=${base64}`;

            setShareUrl(url);
        } catch (err) {
            console.error('Error generating link:', err);
            setShareUrl('Error generating link');
        } finally {
            setLoadingUrl(false);
        }
    };

    const generateMessage = () => {
        if (!calculationData.result) return '';

        const type = calculationData.input.type || 'standard';
        const isReco = type === 'reconciliation';

        let amount, change, percent;

        if (isReco) {
            amount = calculationData.result.totalBackPayOwed?.toLocaleString();
            change = calculationData.result.averageUnderpayment?.toLocaleString();
            percent = calculationData.result.percentageOwed?.toFixed(2);
        } else {
            amount = calculationData.result.newRent?.toLocaleString();
            change = calculationData.result.absoluteChange?.toLocaleString();
            percent = calculationData.result.percentageChange?.toFixed(2);
        }

        const urlToUse = loadingUrl ? '...' : shareUrl;

        // Standard Templates
        const stdTemplatesHe = {
            friendly: `היי! 👋
עשיתי בדיקה לגבי עדכון שכר הדירה לפי המדד 📈.
לפי החישוב, השכירות החדשה היא ₪${amount} (שינוי של ₪${change}, או ${percent}%).
אפשר לראות את החישוב המלא כאן:
${urlToUse}
דברו איתי אם יש שאלות! 🏠`,
            formal: `שלום רב,
בהתאם לחוזה השכירות, בוצע תחשיב עדכון דמי השכירות לפי הצמדה למדד 📈.
סכום השכירות המעודכן הינו ₪${amount}.
הפרשי הצמדה: ₪${change} (${percent}%).
לצפייה בפירוט התחשיב המלא:
${urlToUse}
בברכה,
RentMate 🏠`
        };

        const stdTemplatesEn = {
            friendly: `Hey! 👋
Just checked the rent adjustment based on the index 📈.
The new rent comes out to be ₪${amount} (a change of ₪${change}, or ${percent}%).
You can see the full calculation here:
${urlToUse}
Let me know if you have any questions! 🏠`,
            formal: `Dear Tenant,
In accordance with our lease agreement, the rent has been adjusted based on index linkage 📈.
The updated rent amount is ₪${amount}.
Adjustment difference: ₪${change} (${percent}%).
Please find the detailed calculation attached:
${urlToUse}
Best regards,
RentMate 🏠`
        };

        // Reconciliation Templates
        const recoTemplatesHe = {
            friendly: `היי! 👋
עשיתי חישובי הפרשים (Back-pay) לגבי השכירות 💰.
סך הכל ההפרש לתשלום הוא ₪${amount} (בממוצע ₪${change} לחודש).
אפשר לראות את הפירוט המלא של כל החודשים כאן:
${urlToUse}
דברו איתי ונסדר את זה! 🏠`,
            formal: `שלום רב,
בהתאם להסכם השכירות, בוצע תחשיב הפרשי הצמדה רטרואקטיביים 💰.
סך חוב ההפרשים לתשלום הינו ₪${amount}.
לצפייה בפירוט התחשיב המלא לכל חודש:
${urlToUse}
בברכה,
RentMate 🏠`
        };

        const recoTemplatesEn = {
            friendly: `Hey! 👋
I calculated the rent payment differences (back-pay) 💰.
The total owed difference is ₪${amount} (avg ₪${change}/mo).
You can see the full monthly breakdown here:
${urlToUse}
Let's catch up to settle this! 🏠`,
            formal: `Dear Tenant,
A retroactive index linkage calculation has been performed in accordance with the lease 💰.
The total back-pay amount due is ₪${amount}.
Please find the detailed monthly breakdown attached:
${urlToUse}
Best regards,
RentMate 🏠`
        };

        if (lang === 'he') {
            return isReco ? recoTemplatesHe[tone] : stdTemplatesHe[tone];
        } else {
            return isReco ? recoTemplatesEn[tone] : stdTemplatesEn[tone];
        }
    };

    const handleCopyObj = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleWhatsApp = () => {
        const text = generateMessage();
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <img src="/social/sticker.png" alt="RentMate Sticker" className="w-10 h-10 object-contain drop-shadow-sm" />
                            {lang === 'he' ? 'שתף חישוב' : 'Share Calculation'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-4">
                        {/* Tone Selector */}
                        <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <button
                                onClick={() => setTone('friendly')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tone === 'friendly'
                                    ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {lang === 'he' ? 'ידידותי' : 'Friendly'}
                            </button>
                            <button
                                onClick={() => setTone('formal')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tone === 'formal'
                                    ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {lang === 'he' ? 'רשמי' : 'Formal'}
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div className="relative">
                            {loadingUrl && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                                </div>
                            )}
                            <textarea
                                readOnly
                                value={generateMessage()}
                                className="w-full h-40 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                onClick={() => handleCopyObj(generateMessage())}
                                disabled={loadingUrl}
                                className="absolute top-2 left-2 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                title="Copy Text"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleWhatsApp}
                                disabled={loadingUrl}
                                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                            </button>
                            <button
                                onClick={() => handleCopyObj(shareUrl)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                                {lang === 'he' ? 'העתק קישור' : 'Copy Link'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
