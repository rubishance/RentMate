import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { ReactNode } from 'react';

interface ValidatedFieldProps {
    isValid: boolean;
    children: ReactNode;
    className?: string;
}

export function ValidatedField({ isValid, children, className = '' }: ValidatedFieldProps) {
    return (
        <div className={`relative ${className}`}>
            {children}
            <AnimatePresence>
                {isValid && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.5, x: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none z-10"
                    >
                        <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1 shadow-sm border border-green-200 dark:border-green-800">
                            <Check className="w-4 h-4" strokeWidth={3} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
