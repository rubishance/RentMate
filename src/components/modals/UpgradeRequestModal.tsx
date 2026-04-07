import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { createPortal } from 'react-dom';

interface UpgradeRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    source?: string;
}

export default function UpgradeRequestModal({ isOpen, onClose, source }: UpgradeRequestModalProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();

    const handleChangePlan = () => {
        onClose();
        setTimeout(() => {
            navigate('/select-plan');
        }, 150);
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 mt-auto" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] mt-auto sm:mt-0"
                    >
                        {/* Header */}
                        <div className="p-6 flex items-start justify-between border-b border-border dark:border-gray-700 bg-white/50 dark:bg-background/50 backdrop-blur-xl shrink-0">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex-1 px-6">
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-white flex items-center justify-end gap-2">
                                    {lang === 'he' ? 'שדרג ל-RentMate PRO' : 'Upgrade to RentMate PRO'} <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500 drop-shadow-sm" />
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                                    {lang === 'he' 
                                        ? 'שדרג ל-Pro ותיהנה משקט נפשי מוחלט. עזוב את התלות בקלסרים ואקסלים ועבור לניהול עוצמתי עם כל הכלים שאתה צריך.' 
                                        : 'Upgrade to Pro and enjoy complete peace of mind. Leave spreadsheets behind and move to powerful management with all the tools you need.'}
                                </p>
                            </div>
                        </div>

                        {/* Body content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            <div className="bg-gradient-to-b from-white to-gray-50/50 dark:from-neutral-900 dark:to-neutral-900/50 rounded-2xl p-6 border border-border shadow-sm">
                                <div className="grid grid-cols-3 gap-4 text-xs sm:text-sm mb-2 sm:mb-4 font-bold text-muted-foreground border-b border-border pb-2 uppercase tracking-wider">
                                    <div>{t('feature')}</div>
                                    <div className="text-center font-mono tracking-widest">FREE</div>
                                    <div className="text-center font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400">PRO</div>
                                </div>

                                <div className="space-y-4.5">
                                    {/* Row 1 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? 'מספר נכסים לניהול' : 'Properties to Manage'}</div>
                                        <div className="text-center font-medium text-muted-foreground">1</div>
                                        <div className="text-center font-bold text-amber-600 dark:text-amber-500">3</div>
                                    </div>
                                    {/* Row 2 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? 'סריקת חוזים (AI)' : 'AI Contract Scan'}</div>
                                        <div className="text-center font-medium text-muted-foreground">1</div>
                                        <div className="text-center font-bold text-amber-600 dark:text-amber-500">{t('unlimited', { defaultValue: 'ללא הגבלה' })}</div>
                                    </div>
                                    {/* Row 3 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? 'אחסון ענן מאובטח' : 'Secure Cloud Storage'}</div>
                                        <div className="text-center text-muted-foreground font-medium">{lang === 'he' ? 'מוגבל' : 'Limited'}</div>
                                        <div className="text-center text-amber-600 dark:text-amber-500"><Check className="w-5 h-5 mx-auto" /></div>
                                    </div>
                                    {/* Row 4 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? 'סינון דיירים וחתימות דיגיטליות' : 'Tenant Screening & E-Sign'}</div>
                                        <div className="text-center text-muted-foreground"><X className="w-4 h-4 mx-auto opacity-50" /></div>
                                        <div className="text-center text-amber-600 dark:text-amber-500"><Check className="w-5 h-5 mx-auto" /></div>
                                    </div>
                                    {/* Row 5 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? 'פרוטוקול מסירה דיגיטלי' : 'Digital Delivery Protocol'}</div>
                                        <div className="text-center text-muted-foreground"><X className="w-4 h-4 mx-auto opacity-50" /></div>
                                        <div className="text-center text-amber-600 dark:text-amber-500"><Check className="w-5 h-5 mx-auto" /></div>
                                    </div>
                                    {/* Row 6 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? 'הפקת דו"ח לרו"ח' : 'CPA Report Generation'}</div>
                                        <div className="text-center text-muted-foreground"><X className="w-4 h-4 mx-auto opacity-50" /></div>
                                        <div className="text-center text-amber-600 dark:text-amber-500"><Check className="w-5 h-5 mx-auto" /></div>
                                    </div>
                                    {/* Row 7 */}
                                    <div className="grid grid-cols-3 gap-4 text-sm md:text-base items-center pt-2 border-t border-border/50">
                                        <div className="font-semibold text-foreground">{lang === 'he' ? "תמיכת פרימיום בעדיפות" : 'Priority Premium Support'}</div>
                                        <div className="text-center text-muted-foreground"><X className="w-4 h-4 mx-auto opacity-50" /></div>
                                        <div className="text-center text-amber-600 dark:text-amber-500"><Check className="w-5 h-5 mx-auto" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-border dark:border-gray-700 bg-slate-50/50 dark:bg-background/50 shrink-0 pb-10 sm:pb-6 flex items-center justify-between">
                            <button
                                type="button"
                                className="px-6 py-2.5 text-sm sm:text-base font-medium text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 transition-colors"
                                onClick={onClose}
                            >
                                {t('maybeLater')}
                            </button>
                            <button
                                type="button"
                                className="flex items-center gap-2 px-6 py-2.5 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                                onClick={handleChangePlan}
                            >
                                <Star className="w-4 h-4 fill-current" /> {lang === 'he' ? 'שנה תוכנית' : 'Change Plan'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
