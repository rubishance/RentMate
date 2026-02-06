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
    const baseClasses = "relative bg-background/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden";
    const hoverClasses = hoverEffect ? "transition-all duration-300 hover:shadow-premium hover:-translate-y-1" : "shadow-sm";
    const minimalClasses = minimal ? "border-0 shadow-none" : "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileTap={hoverEffect ? { scale: 0.98 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(baseClasses, hoverClasses, minimalClasses, className)}
            {...props as any}
        >
            {children}
        </motion.div>
    );
};
