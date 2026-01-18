import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    tilt?: boolean;
}

export function GlassCard({ children, className = '', delay = 0, tilt = false }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            whileHover={tilt ? { y: -5, boxShadow: "0 15px 40px rgba(59, 130, 246, 0.15)" } : {}}
            className={`glass-bionic-card p-6 ${className}`}
        >
            {children}
        </motion.div>
    );
}
