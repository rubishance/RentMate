import React from 'react';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import logoFinalCleanV2 from '../../assets/logo-final-clean-v2.png';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    icon?: React.ElementType;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, icon: Icon }) => {
    const { lang } = useTranslation();
    const isRtl = lang === 'he';

    return (
        <div className={`relative flex items-center justify-between gap-4 mb-6 ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
            <div className={`flex items-center gap-3 min-w-[33%] ${isRtl ? 'justify-end' : 'justify-start'}`}>
                {Icon && (
                    <div className="p-2.5 bg-brand-navy/5 rounded-xl shrink-0">
                        <Icon className="w-6 h-6 text-brand-navy" />
                    </div>
                )}
                <div className="min-w-0">
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-brand-navy leading-tight"
                    >
                        {title}
                    </motion.h1>
                    {subtitle && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm text-gray-500 hidden sm:block truncate max-w-[200px] sm:max-w-md"
                        >
                            {subtitle}
                        </motion.p>
                    )}
                </div>
            </div>

            {/* Branding - Final Logo Image - Absolute Center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <img src={logoFinalCleanV2} alt="RentMate" className="h-14 w-auto object-contain drop-shadow-sm" />
            </div>

            <div className={`flex items-center gap-2 min-w-[33%] ${isRtl ? 'justify-start' : 'justify-end'}`}>
                {action && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="shrink-0"
                    >
                        {action}
                    </motion.div>
                )}
            </div>
        </div>
    );
};
