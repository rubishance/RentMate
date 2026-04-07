import { AnimatePresence, motion } from 'framer-motion';
import { X, MapPin, Building, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property } from '../../types/database';
import { createPortal } from 'react-dom';

interface SelectPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
    onSelect: (propertyId: string) => void;
}

export function SelectPropertyModal({ isOpen, onClose, properties, onSelect }: SelectPropertyModalProps) {
    const { t, lang } = useTranslation();

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 mt-auto" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] mt-auto sm:mt-0"
                    >
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-border dark:border-gray-700 bg-white/50 dark:bg-background/50 backdrop-blur-xl shrink-0">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold text-foreground dark:text-white uppercase tracking-tight">
                                {t('chooseProperty')}
                            </h2>
                            <div className="w-9"></div> {/* Spacer for centering */}
                        </div>

                        {/* List */}
                        <div className="p-6 overflow-y-auto pb-10 sm:pb-6 custom-scrollbar flex-1 space-y-3">
                            {properties.map((property) => (
                                <button
                                    key={property.id}
                                    onClick={() => onSelect(property.id)}
                                    className="w-full flex items-center gap-2 sm:gap-4 p-2 sm:p-6 bg-background dark:bg-neutral-800/50 hover:bg-slate-50 dark:hover:bg-indigo-500/10 rounded-2xl border border-slate-100 dark:border-neutral-800/50 hover:border-indigo-500/30 transition-all group text-start"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shadow-sm overflow-hidden shrink-0">
                                        {property.image_url ? (
                                            <img src={property.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0 -space-y-0.5">
                                        <p className="font-bold text-foreground truncate leading-none m-0 pb-0.5">
                                            {property.address}
                                        </p>
                                        <p className="text-sm text-slate-400 flex items-center gap-1 leading-none m-0 pt-0">
                                            <MapPin className="w-3 h-3" />
                                            {property.city}
                                        </p>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-slate-300 group-hover:text-primary transition-all ${lang === 'he' ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`} />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
