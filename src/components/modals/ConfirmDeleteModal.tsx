import { AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { useState, useEffect } from 'react';

export interface AffectedItem {
    label: string;
    count?: number;
    items?: string[];
    type: 'warning' | 'info' | 'critical';
}

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isDeleting?: boolean;
    requireDoubleConfirm?: boolean;
    affectedItems?: AffectedItem[];
    verificationText?: string;
    verificationLabel?: string;
}

export function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isDeleting,
    requireDoubleConfirm,
    affectedItems,
    verificationText,
    verificationLabel
}: ConfirmDeleteModalProps) {
    const { t, lang } = useTranslation();
    const [step, setStep] = useState(1);
    const [inputValue, setInputValue] = useState('');

    // Reset state whenever modal is opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setInputValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isVerificationMatched = !verificationText || inputValue === verificationText;
    const canConfirm = isVerificationMatched;

    const handleConfirm = () => {
        if (!canConfirm) return;

        if (requireDoubleConfirm && step === 1) {
            setStep(2);
        } else {
            onConfirm();
        }
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-window rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground dark:text-white">
                                {step === 1 ? title : (lang === 'he' ? 'אישור סופי' : 'Final Confirmation')}
                            </h3>
                        </div>

                        {step === 1 ? (
                            <div className="space-y-4">
                                <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
                                    {message}
                                </p>

                                {affectedItems && affectedItems.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/30">
                                        <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                                            {lang === 'he' ? 'הנתונים הבאים יושפעו:' : 'The following data will be affected:'}
                                        </h4>
                                        <ul className="space-y-2">
                                            {affectedItems.map((item, idx) => (
                                                <li key={idx} className="text-sm flex items-start gap-2 text-red-700 dark:text-red-300">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                    <div>
                                                        <span className="font-medium">
                                                            {item.count ? `${item.count} ` : ''}{item.label}
                                                        </span>
                                                        {item.items && (
                                                            <p className="text-xs opacity-75 mt-0.5">
                                                                {item.items.join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {verificationText && (
                                    <div className="space-y-2 pt-2">
                                        <label className="text-sm font-bold text-foreground block">
                                            {verificationLabel || (lang === 'he' ? `אנא הקלד "${verificationText}" לאישור` : `Type "${verificationText}" to confirm`)}
                                        </label>
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={verificationText}
                                            className="w-full p-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-mono text-sm"
                                            autoComplete="off"
                                            onPaste={(e) => e.preventDefault()}
                                        />
                                    </div>
                                )}

                                <div className="p-3 text-sm text-muted-foreground bg-secondary dark:bg-gray-700/50 rounded-lg">
                                    {lang === 'he'
                                        ? 'פעולה זו אינה הפיכה. המידע ימחק לצמיתות ולא ניתן יהיה לשחזר אותו.'
                                        : 'This action cannot be undone. The data will be deleted permanently and cannot be restored.'}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-gray-700 dark:text-gray-200 font-medium text-lg">
                                    {lang === 'he'
                                        ? 'האם את/ה בטוח/ה לגמרי?'
                                        : 'Are you absolutely sure?'}
                                </p>
                                <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                                    {lang === 'he'
                                        ? 'את/ה עומד/ת למחוק מידע זה לצמיתות. נא אשר/י פעולה זו.'
                                        : 'You are about to permanently delete this data. Please confirm this action.'}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 text-gray-700 bg-muted hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isDeleting || !canConfirm}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors shadow-lg flex items-center justify-center gap-2 ${isDeleting || !canConfirm
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                                    }`}
                            >
                                {isDeleting ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    step === 1 && requireDoubleConfirm ? (
                                        <>
                                            {lang === 'he' ? 'אני מבין/ה, המשך' : 'I Understand, Continue'} <ArrowRight className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            {isDeleting ? t('deleting') : t('delete')}
                                        </>
                                    )
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
        , document.body);
}
