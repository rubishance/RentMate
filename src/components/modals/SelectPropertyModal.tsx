import { AnimatePresence, motion } from 'framer-motion';
import { X, MapPin, Building, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property } from '../../types/database';

interface SelectPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
    onSelect: (propertyId: string) => void;
}

export function SelectPropertyModal({ isOpen, onClose, properties, onSelect }: SelectPropertyModalProps) {
    const { t } = useTranslation();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col max-h-[80vh] border border-white/10"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 pb-4">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {t('chooseProperty')}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* List */}
                            <div className="p-4 overflow-y-auto space-y-3">
                                {properties.map((property) => (
                                    <button
                                        key={property.id}
                                        onClick={() => onSelect(property.id)}
                                        className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-neutral-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-3xl border border-slate-100 dark:border-neutral-800/50 hover:border-indigo-500/30 transition-all group text-start"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm overflow-hidden">
                                            {property.image_url ? (
                                                <img src={property.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                                {property.address}
                                            </p>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" />
                                                {property.city}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
