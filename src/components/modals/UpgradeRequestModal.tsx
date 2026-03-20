import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

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
        // Use a short timeout to allow the modal to start closing before navigating,
        // preventing React batching from ignoring the navigate call if the component is unmounted.
        setTimeout(() => {
            navigate('/select-plan');
        }, 150);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto z-[9999]">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-card flex flex-col max-h-[90vh] text-left align-middle shadow-xl transition-all border border-white/20">
                                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-white flex items-center gap-2">
                                                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500 drop-shadow-sm" /> {lang === 'he' ? 'שדרג ל-RentMate PRO' : 'Upgrade to RentMate PRO'}
                                                </Dialog.Title>
                                                <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
                                                    {lang === 'he' 
                                                        ? 'שדרג ל-Pro ותיהנה משקט נפשי מוחלט. עזוב את התלות בקלסרים ואקסלים ועבור לניהול עוצמתי עם כל הכלים שאתה צריך.' 
                                                        : 'Upgrade to Pro and enjoy complete peace of mind. Leave spreadsheets behind and move to powerful management with all the tools you need.'}
                                                </p>
                                            </div>
                                            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted dark:hover:bg-neutral-800 transition-colors">
                                                <X className="w-5 h-5 text-muted-foreground" />
                                            </button>
                                        </div>

                                        <div className="bg-gradient-to-b from-white to-gray-50/50 dark:from-neutral-900 dark:to-neutral-900/50 rounded-2xl p-4 mb-5 border border-border shadow-sm">
                                            <div className="grid grid-cols-3 gap-4 text-xs sm:text-sm mb-3 font-bold text-muted-foreground border-b border-border pb-2 uppercase tracking-wider">
                                                <div>{t('feature')}</div>
                                                <div className="text-center font-mono tracking-widest">FREE</div>
                                                <div className="text-center font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400">PRO</div>
                                            </div>

                                            <div className="space-y-2.5">
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

                                        <div className="flex justify-end gap-2 sm:gap-3">
                                            <button
                                                type="button"
                                                className="px-4 py-2 text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 bg-muted dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
