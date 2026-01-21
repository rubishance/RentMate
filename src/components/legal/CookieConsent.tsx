import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { Cookie } from 'lucide-react';

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const { t, lang } = useTranslation();

    useEffect(() => {
        const consented = localStorage.getItem('cookie_consent');
        if (!consented) {
            // Show after a small delay
            setTimeout(() => setIsVisible(true), 1500);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-md"
                >
                    <div className="bg-slate-900/95 text-white/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-primary mt-1">
                                <Cookie className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white mb-1">{t('cookieConsentTitle')}</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {t('cookieConsentDesc')}
                                    <a href="/legal/privacy" className="text-primary hover:underline mx-1">
                                        {t('cookieConsentPrivacyPolicy')}
                                    </a>.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={handleAccept}
                                className="px-3 py-1.5 text-xs font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                {t('close')}
                            </button>
                            <button
                                onClick={handleAccept}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                {t('cookieConsentAccept')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
