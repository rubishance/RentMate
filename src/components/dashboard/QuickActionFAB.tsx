import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, FileText, Home, CreditCard } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useStack } from '../../contexts/StackContext';
import { cn } from '../../lib/utils';
import { AddPaymentModal } from '../modals/AddPaymentModal';

export function QuickActionFAB() {
    const { t, lang } = useTranslation();
    const { push } = useStack();
    const [isOpen, setIsOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        window.addEventListener('TOGGLE_QUICK_ACTIONS', handleToggle);
        return () => window.removeEventListener('TOGGLE_QUICK_ACTIONS', handleToggle);
    }, []);

    const actions = [
        {
            id: 'add_contract',
            icon: <FileText className="w-5 h-5" />,
            label: t('newContract') || 'Add Contract',
            color: 'bg-blue-500',
            onClick: () => {
                push('contract_wizard', {}, { isExpanded: true, title: t('newContract') });
                setIsOpen(false);
            }
        },
        {
            id: 'add_asset',
            icon: <Home className="w-5 h-5" />,
            label: t('addProperty') || 'Add Asset',
            color: 'bg-emerald-500',
            onClick: () => {
                push('property_wizard', {}, { isExpanded: true, title: t('addProperty') });
                setIsOpen(false);
            }
        },
        {
            id: 'add_payment',
            icon: <CreditCard className="w-5 h-5" />,
            label: t('logPayment') || 'Add Payment',
            color: 'bg-amber-500',
            onClick: () => {
                setIsPaymentModalOpen(true);
                setIsOpen(false);
            }
        }
    ];

    return (
        <>
            <div className={cn(
                "fixed bottom-24 md:bottom-8 z-50",
                lang === 'he' ? "left-6 md:left-8" : "right-6 md:right-8"
            )}>
                {/* Action Buttons */}
                <AnimatePresence>
                    {isOpen && (
                        <div className="flex flex-col-reverse items-center gap-3 mb-4">
                            {actions.map((action, idx) => (
                                <motion.button
                                    key={action.id}
                                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={action.onClick}
                                    className="group flex items-center gap-3"
                                >
                                    <span className={cn(
                                        "px-3 py-1.5 rounded-xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-slate-200 dark:border-neutral-800 text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                                        lang === 'he' ? "order-last" : "order-first"
                                    )}>
                                        {action.label}
                                    </span>
                                    <div className={cn(
                                        "p-4 rounded-[1.25rem] text-white shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95",
                                        action.color
                                    )}>
                                        {action.icon}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {/* Main FAB Toggle */}
                <motion.button
                    layout
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all duration-500",
                        isOpen
                            ? "bg-neutral-900 dark:bg-neutral-800 rotate-90 scale-90"
                            : "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 hover:shadow-[0_20px_50px_rgba(79,70,229,0.5)] hover:-translate-y-1"
                    )}
                >
                    {isOpen ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                </motion.button>
            </div>

            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={() => setIsPaymentModalOpen(false)}
            />
        </>
    );
}
