import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { useStack } from '../../contexts/StackContext';
import { Home, FileText, CreditCard, X, FileStack } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddPaymentModal } from './AddPaymentModal';

interface DashboardAddModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DashboardAddModal({ isOpen, onClose }: DashboardAddModalProps) {
    const { t, lang } = useTranslation();
    const { push } = useStack();
    const navigate = useNavigate();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const isRtl = lang === 'he';

    const handleAction = useCallback((action: string) => {
        onClose();
        setTimeout(() => {
            if (action === 'property') {
                push('property_wizard', {}, { isExpanded: true, title: t('addProperty') });
            } else if (action === 'contract') {
                push('contract_wizard', {}, { isExpanded: true, title: t('newContract') });
            } else if (action === 'payment') {
                setIsPaymentModalOpen(true);
            } else if (action === 'document') {
                navigate('/documents', { state: { action: 'upload' } });
            }
        }, 300); // Wait for modal exit animation
    }, [push, t, onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-8"
                        onClick={handleBackdropClick}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[2.5rem] shadow-jewel overflow-hidden flex flex-col relative"
                        >
                            <div className="absolute top-6 right-6 z-10">
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 pt-12 grid gap-4">
                                <button
                                    onClick={() => handleAction('property')}
                                    className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl transition-all duration-300 text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Home className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{t('addProperty') || 'Add Asset'}</h3>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleAction('contract')}
                                    className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl transition-all duration-300 text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{t('newContract') || 'Add Contract'}</h3>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleAction('payment')}
                                    className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl transition-all duration-300 text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{t('logPayment') || 'Add Payment'}</h3>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleAction('document')}
                                    className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl transition-all duration-300 text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <FileStack className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{lang === 'he' ? 'העלאת מסמך' : 'Add Document'}</h3>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Render Payment Modal independently out of the transition hierarchy to avoid unmounting when parent closes */}
            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => setIsPaymentModalOpen(false)}
            />
        </>
    );
}
