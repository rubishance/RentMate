import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Globe, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useTranslation } from '../../hooks/useTranslation';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../lib/utils';

export function SettingsTray() {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const { lang } = useTranslation();
    const isRtl = lang === 'he';

    const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(location.pathname);

    if (isAuthPage) return null;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 p-3 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-full shadow-lg md:hidden"
            >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
                        />

                        {/* Tray */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/10 rounded-t-[2.5rem] z-[70] p-8 pb-12 md:hidden"
                            dir={isRtl ? 'rtl' : 'ltr'}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold text-black dark:text-white">
                                    {isRtl ? 'הגדרות' : 'Settings'}
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                                        <Globe className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            {isRtl ? 'שפה' : 'Language'}
                                        </span>
                                    </div>
                                    <LanguageToggle className="w-full h-12" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                                        <Moon className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            {isRtl ? 'מראה' : 'Appearance'}
                                        </span>
                                    </div>
                                    <ThemeToggle className="w-full h-12" />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
