import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusIcon as Plus,
    PaymentsIcon as PaymentIcon,
    ContractsIcon as ContractIcon,
    AssetsIcon as AssetIcon,
    UploadIcon
} from '../icons/NavIcons';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

export function HeaderActionMenu() {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const isRtl = lang === 'he';

    return (
        <div className="relative z-50">
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-[40] bg-black/5 backdrop-blur-[1px]"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className={`absolute top-14 ${isRtl ? 'right-0 origin-top-right' : 'left-0 origin-top-left'} z-[50] w-64 p-2 glass-premium border-white/10 rounded-[1.5rem] shadow-jewel flex flex-col gap-1 overflow-hidden`}
                        >
                            {/* Option 1: Payment */}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/payments', { state: { action: 'payment' } });
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">
                                    <PaymentIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black lowercase tracking-tight flex-1">{t('addPayment')}</span>
                            </button>

                            {/* Option 2: Contract */}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/contracts/new');
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                                    <ContractIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black lowercase tracking-tight flex-1">{t('addContract')}</span>
                            </button>

                            {/* Option 3: Asset */}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/properties', { state: { action: 'add' } });
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                            >
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
                                    <AssetIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black lowercase tracking-tight flex-1">{t('addAsset')}</span>
                            </button>

                            {/* Option 4: Upload File */}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/properties', { state: { action: 'upload' } });
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                            >
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shadow-sm">
                                    <UploadIcon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black lowercase tracking-tight flex-1">{t('uploadFile')}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-10 w-10 md:h-11 md:w-11 button-jewel rounded-xl shadow-sm flex items-center justify-center relative transition-all duration-300",
                    isOpen && "rotate-45 bg-indigo-600 shadow-indigo-500/20"
                )}
            >
                <Plus className="w-5 h-5 text-white" />
            </motion.button>
        </div>
    );
}
