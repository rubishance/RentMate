import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useTranslation } from '../../hooks/useTranslation';

interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onReset?: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
    isOpen,
    onClose,
    onReset,
    title,
    children,
    className
}) => {
    const { t } = useTranslation();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-stretch justify-end">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Drawer Content */}
                    <motion.div
                        initial={{ x: '100%', y: '100%' }} // Entry from bottom on mobile, side on desktop
                        animate={{
                            x: 0,
                            y: 0,
                            transition: { type: 'spring', stiffness: 300, damping: 30 }
                        }}
                        exit={{
                            x: '100%',
                            y: '100%',
                            transition: { duration: 0.3, ease: 'easeInOut' }
                        }}
                        className={cn(
                            "relative w-full sm:max-w-md max-h-[92dvh] sm:h-full bg-white dark:bg-neutral-900 shadow-premium flex flex-col sm:rounded-l-[3rem] rounded-t-[3rem] border-t sm:border-t-0 sm:border-l border-border",
                            className
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-8 border-b border-border shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl">
                                    <Filter className="w-5 h-5 text-brand-600" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-foreground lowercase">
                                    {title || t('filters')}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {onReset && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onReset}
                                        className="rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800"
                                        title={t('resetFilters')}
                                    >
                                        <RotateCcw className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-10 custom-scrollbar">
                            {children}
                        </div>

                        {/* Footer - Final Action */}
                        <div className="p-8 border-t border-border bg-slate-50/50 dark:bg-neutral-950/20 shrink-0">
                            <Button
                                onClick={onClose}
                                className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-[11px]"
                            >
                                {t('showResults')}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
