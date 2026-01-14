import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    gradient?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className,
    hoverEffect = false,
    gradient = false,
    ...props
}) => {
    const baseClasses = "relative bg-white/80 backdrop-blur-xl border border-white/20 shadow-sm rounded-2xl overflow-hidden";
    const hoverClasses = hoverEffect ? "transition-all duration-300 hover:shadow-lg hover:shadow-brand-navy/5 hover:-translate-y-1 hover:bg-white/90" : "";
    const gradientClasses = gradient ? "bg-gradient-to-br from-white/90 to-white/50" : "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(baseClasses, hoverClasses, gradientClasses, className)}
            {...props as any}
        >
            {/* Subtle noise or sheen effect overlay could go here */}
            {children}
        </motion.div>
    );
};
