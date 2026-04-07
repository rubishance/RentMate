import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { useScrollLock } from '../../hooks/useScrollLock';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;
    modeless?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    className,
    modeless = false
}) => {
    useScrollLock(isOpen && !modeless);

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw] h-[95vh]'
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className={cn(
                    "fixed inset-0 z-[100] flex justify-center",
                    "items-end sm:items-center p-0 sm:p-6",
                    modeless && "pointer-events-none"
                )}>
                    {/* Backdrop */}
                    {!modeless && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                    )}

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            transition: { type: 'spring', stiffness: 300, damping: 30 }
                        }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }}
                        className={cn(
                            "relative w-full bg-window flex flex-col overflow-hidden",
                            "h-auto max-h-[90dvh] rounded-t-3xl border-0 mt-auto pb-[env(safe-area-inset-bottom)]", // Mobile: Bottom sheet
                            "sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-border/50 sm:shadow-premium sm:mt-0 sm:pb-0", // Desktop: Standard modal
                            sizes[size],
                            modeless && "pointer-events-auto",
                            className
                        )}
                    >
                        {/* Mobile Drawer Handle */}
                        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0 absolute top-0 left-0 right-0 z-50">
                            <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 sm:px-6 pt-8 sm:pt-6 border-b border-border shrink-0 bg-window z-10">
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
                                {description && (
                                    <p className="text-base text-muted-foreground mt-1">{description}</p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full -mx-2"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                            {children}
                        </div>

                        {/* Fixed Footer */}
                        {footer && (
                            <div className="p-6 border-t border-border bg-window/50 shrink-0">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
