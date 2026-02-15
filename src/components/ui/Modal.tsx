import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

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
    useEffect(() => {
        if (isOpen && !modeless) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, modeless]);

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
                    "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6",
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
                            "relative w-full bg-background/95 dark:bg-neutral-900/95 shadow-premium rounded-3xl overflow-hidden flex flex-col border border-border/50",
                            "max-h-[90dvh] sm:max-h-[85vh]",
                            sizes[size],
                            modeless && "pointer-events-auto",
                            className
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border shrink-0 bg-white dark:bg-neutral-900 z-10">
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
                                {description && (
                                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full -mr-2"
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
                            <div className="p-6 border-t border-border bg-gray-50/50 dark:bg-neutral-900/50 shrink-0">
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
