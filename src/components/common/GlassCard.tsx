import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    minimal?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className,
    hoverEffect = false,
    minimal = false,
    ...props
}) => {
    const baseClasses = "relative bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-lg overflow-hidden";
    const hoverClasses = hoverEffect ? "transition-all duration-200 hover:shadow-md hover:border-gray-200 dark:hover:border-neutral-700" : "shadow-sm dark:shadow-none";
    const minimalClasses = minimal ? "border-0 shadow-none" : "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(baseClasses, hoverClasses, minimalClasses, className)}
            {...props as any}
        >
            {children}
        </motion.div>
    );
};
