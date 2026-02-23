import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useStack } from '../../contexts/StackContext';

export function GlobalActionFab() {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { push } = useStack();
    const [isOpen, setIsOpen] = useState(false);
    const isRtl = lang === 'he';

    // Hide FAB on specific pages
    const hideOnPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/wizard'];
    if (hideOnPaths.some(path => location.pathname.startsWith(path))) return null;

    return (
        <>
            <div className="fixed-fab-container">
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                className="absolute bottom-20 right-0 origin-bottom-right z-[100] w-64 p-3 glass-premium border-white/10 rounded-[2rem] shadow-jewel flex flex-col gap-2"
                            >
                                {/* Option 1: Payment */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/payments', { state: { action: 'payment' } });
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <PaymentIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-black lowercase tracking-tight flex-1">{t('addPayment')}</span>
                                </button>

                                {/* Option 2: Contract */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        push('contract_wizard', {
                                            onSuccess: () => navigate('/contracts')
                                        }, { isExpanded: true, title: t('addContract') });
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <ContractIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-black lowercase tracking-tight flex-1">{t('addContract')}</span>
                                </button>

                                {/* Option 3: Asset */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/properties', { state: { action: 'add' } });
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <AssetIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-black lowercase tracking-tight flex-1">{t('addAsset')}</span>
                                </button>

                                {/* Option 4: Upload File */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/properties', { state: { action: 'upload' } });
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors group w-full text-start"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <UploadIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-black lowercase tracking-tight flex-1">{t('uploadFile')}</span>
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
                        "h-14 w-14 md:h-16 md:w-16 button-jewel rounded-[1.5rem] shadow-jewel flex items-center justify-center relative z-[100] transition-all duration-300",
                        isOpen && "rotate-45"
                    )}
                >
                    <Plus className="w-6 h-6" />
                </motion.button>
            </div>
        </>
    );
}
