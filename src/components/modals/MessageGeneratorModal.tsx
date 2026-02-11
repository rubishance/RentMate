import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShareIcon, CopyIcon, MessageIcon, CheckIcon, CloseIcon, LoaderIcon } from '../icons/MessageIcons';
import { useTranslation } from '../../hooks/useTranslation';
import { UrlCompression } from '../../lib/url-compression';
import { supabase } from '../../lib/supabase';
import { ShortenerService } from '../../services/shortener.service';
import { RentyMascot } from '../common/RentyMascot';

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
            // 1. Create the compressed "stateless" URL (long)
            const compressed = UrlCompression.compress(calculationData);
            const longUrl = `${window.location.origin}/calculator?share=${compressed}`;

            // 2. Shorten it using our internal service (short)
            const shortUrl = await ShortenerService.generateShortLink(longUrl);

            setShareUrl(shortUrl);
        } catch (err) {
            console.error('Error generating link:', err);
            // Fallback to long URL if shortener fails (e.g. DB table missing)
            const compressed = UrlCompression.compress(calculationData);
            const longUrl = `${window.location.origin}/calculator?share=${compressed}`;
            setShareUrl(longUrl);
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
            const res = calculationData.result;
            amount = res.totalBackPayOwed?.toLocaleString();

            // Calculate average manually if missing (safeguard)
            const avgVal = res.averageUnderpayment || (res.totalMonths ? res.totalBackPayOwed / res.totalMonths : 0);
            change = avgVal?.toLocaleString(undefined, { maximumFractionDigits: 0 }); // Round to whole number

            // Percentage (if needed, default to 'N/A' or calculated)
            // If totalBackPayOwed is X and totalRentPaid is Y ... we don't have Y easily here.
            // But we can fallback to 0 or just ignore percentage in template if missing.
            percent = res.percentageOwed?.toFixed(2) || '0.00';
        } else {
            amount = calculationData.result?.newRent?.toLocaleString();
            change = calculationData.result?.absoluteChange?.toLocaleString();
            percent = calculationData.result?.percentageChange?.toFixed(2);
        }

        const urlToUse = loadingUrl ? '...' : shareUrl;

        // Standard Templates
        const stdTemplatesHe = {
            friendly: `היי! 👋
עשיתי בדיקה באתר www.RentMate.co.il לגבי עדכון שכר הדירה לפי המדד 📈.
לפי החישוב, השכירות החדשה היא ${amount}.
אפשר לראות את החישוב המלא כאן:
${urlToUse}`,
            formal: `שלום רב,
בהתאם לחוזה השכירות, בוצע באתר www.RentMate.co.il תחשיב עדכון דמי השכירות לפי הצמדה למדד 📈.
סכום השכירות המעודכן הינו ${amount}.
לצפייה בפירוט התחשיב המלא:
${urlToUse}
בברכה,
RentMate 🏠
www.RentMate.co.il`
        };

        const stdTemplatesEn = {
            friendly: `Hey! 👋
I just checked the rent update according to the index on www.RentMate.co.il 📈.
According to the calculation, the new rent is ${amount}.
You can see the full calculation here:
${urlToUse}`,
            formal: `Dear Tenant,
In accordance with the lease agreement, a rent adjustment calculation based on index linkage has been performed on www.RentMate.co.il 📈.
The updated rent amount is ${amount}.
You can view the full detailed calculation here:
${urlToUse}
Best regards,
RentMate 🏠
www.RentMate.co.il`
        };

        // Reconciliation Templates
        const recoTemplatesHe = {
            friendly: `היי! 👋
עשיתי חישובי הפרשים (Back-pay) לגבי השכירות 💰.
סך הכל ההפרש לתשלום הוא ${amount}.
אפשר לראות את הפירוט המלא של כל החודשים כאן:
${urlToUse}
דברו איתי ונסדר את זה! 🏠
rentmate.co.il`,
            formal: `שלום רב,
בהתאם להסכם השכירות, בוצע תחשיב הפרשי הצמדה רטרואקטיביים 💰.
סך חוב ההפרשים לתשלום הינו ${amount}.
לצפייה בפירוט התחשיב המלא לכל חודש:
${urlToUse}
בברכה,
RentMate 🏠
rentmate.co.il`
        };

        const recoTemplatesEn = {
            friendly: `Hey! 👋
I calculated the rent payment differences (back-pay) 💰.
The total owed difference is ${amount}.
You can see the full monthly breakdown here:
${urlToUse}
Let's catch up to settle this! 🏠
rentmate.co.il`,
            formal: `Dear Tenant,
A retroactive index linkage calculation has been performed in accordance with the lease 💰.
The total back-pay amount due is ${amount}.
Please find the detailed monthly breakdown attached:
${urlToUse}
Best regards,
RentMate 🏠
rentmate.co.il`
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
                            <RentyMascot size={40} showBackground={false} className="drop-shadow-sm" />
                            {lang === 'he' ? 'שתף חישוב' : 'Share Calculation'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="space-y-4">
                        {/* Tone Selector */}
                        <div className="flex p-1 bg-muted dark:bg-gray-700/50 rounded-lg">
                            <button
                                onClick={() => setTone('friendly')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tone === 'friendly'
                                    ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground dark:text-white'
                                    : 'text-muted-foreground dark:text-muted-foreground hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {lang === 'he' ? 'ידידותי' : 'Friendly'}
                            </button>
                            <button
                                onClick={() => setTone('formal')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tone === 'formal'
                                    ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground dark:text-white'
                                    : 'text-muted-foreground dark:text-muted-foreground hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {lang === 'he' ? 'רשמי' : 'Formal'}
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div className="relative">
                            {loadingUrl && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-20">
                                    <LoaderIcon className="w-8 h-8 text-brand-600" />
                                </div>
                            )}
                            <textarea
                                readOnly
                                value={generateMessage()}
                                className="w-full h-40 p-3 bg-secondary dark:bg-foreground/50 border border-border dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <button
                                onClick={() => handleCopyObj(generateMessage())}
                                disabled={loadingUrl}
                                className="absolute top-2 left-2 p-1.5 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg hover:bg-secondary dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                title="Copy Text"
                            >
                                {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 text-muted-foreground" />}
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleWhatsApp}
                                disabled={loadingUrl}
                                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageIcon className="w-5 h-5" />
                                WhatsApp
                            </button>
                            <button
                                onClick={() => handleCopyObj(shareUrl)}
                                className="flex-1 bg-muted hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-foreground dark:text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <CopyIcon className="w-4 h-4" />
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
