import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, LogOut, Trash2, Info } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface ConfirmActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'warning' | 'info';
    icon?: 'logout' | 'delete' | 'info' | 'warning';
    isLoading?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'primary',
    icon = 'info',
    isLoading = false
}) => {
    const { t } = useTranslation();

    const getIcon = () => {
        switch (icon) {
            case 'logout': return <LogOut className="w-8 h-8 text-rose-500" />;
            case 'delete': return <Trash2 className="w-8 h-8 text-rose-500" />;
            case 'warning': return <AlertCircle className="w-8 h-8 text-amber-500" />;
            default: return <Info className="w-8 h-8 text-indigo-500" />;
        }
    };

    const getButtonVariant = () => {
        switch (variant) {
            case 'danger': return 'destructive';
            case 'warning': return 'secondary';
            default: return 'primary';
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Pop-up Window */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            transition: { type: 'spring', stiffness: 300, damping: 30 }
                        }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }}
                        className="relative w-full max-w-sm bg-background dark:bg-neutral-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border-0 sm:border sm:border-border/50 h-auto max-h-[90dvh] pb-6 sm:pb-0 overflow-hidden flex flex-col z-10 rounded-t-3xl sm:rounded-2xl mt-auto sm:mt-0"
                    >
                        <div className="flex flex-col items-center text-center p-6 sm:p-8 space-y-4">
                            <div className="w-16 h-16 rounded-[1.2rem] bg-background dark:bg-neutral-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-neutral-700/50 mb-2">
                                {getIcon()}
                            </div>
                            
                            <h2 className="text-xl font-black tracking-tight text-foreground">
                                {title}
                            </h2>
                            
                            <p className="text-base font-semibold text-foreground/90 leading-relaxed px-2">
                                {message}
                            </p>
                        </div>
                        
                        <div className="flex gap-2 sm:gap-4 px-6 pb-6 w-full">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1 rounded-xl h-12"
                                disabled={isLoading}
                            >
                                {cancelText || t('cancel')}
                            </Button>
                            <Button
                                variant={getButtonVariant()}
                                onClick={onConfirm}
                                className="flex-1 rounded-xl h-12"
                                isLoading={isLoading}
                            >
                                {confirmText || t('save')}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
