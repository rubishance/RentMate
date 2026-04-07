import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '../../constants/documentCategories';
import type { Property } from '../../types/database';
import { MediaGallery } from './MediaGallery';
import { UtilityBillsManager } from './UtilityBillsManager';
import { MaintenanceRecords } from './MaintenanceRecords';
import { MiscDocuments } from './MiscDocuments';
import { ChecksManager } from './ChecksManager';
import { ProtocolsManager } from './ProtocolsManager';
import { ReceiptsManager } from './ReceiptsManager';
import { useTranslation } from '../../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { GlassCard } from '../common/GlassCard';

interface PropertyDocumentsHubProps {
    property: Property;
    readOnly?: boolean;
    requestedTab?: TabType;
    autoOpenUpload?: boolean;
}

type TabType = 'menu' | 'media' | 'utilities' | 'maintenance' | 'documents' | 'checks' | 'protocols' | 'receipts' | 'tenant_form';

export function PropertyDocumentsHub({ property, readOnly, requestedTab, autoOpenUpload }: PropertyDocumentsHubProps) {
    const { t, lang } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('menu');

    useEffect(() => {
        if (requestedTab) {
            setActiveTab(requestedTab);
        }
    }, [requestedTab]);

    const categories = DOCUMENT_CATEGORIES.map(cat => {
        const key = cat.labelKey || cat.id;
        let translatedLabel = t(key as any);
        // If translation is missing (returns the key), use the category's fallback
        if (translatedLabel === key) {
            translatedLabel = lang === 'he' ? cat.fallbackHe : cat.fallbackEn;
        }

        return {
            id: cat.id as TabType,
            label: translatedLabel,
            icon: cat.icon,
            color: cat.color,
            bg: cat.bg
        };
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'media': return <MediaGallery property={property} readOnly={readOnly} />;
            case 'utilities': return <UtilityBillsManager property={property} readOnly={readOnly} />;
            case 'documents': return <MiscDocuments property={property} readOnly={readOnly} autoOpenUpload={autoOpenUpload} />;
            case 'checks': return <ChecksManager property={property} readOnly={readOnly} />;
            case 'protocols': return <ProtocolsManager property={property} readOnly={readOnly} />;
            case 'receipts': return <ReceiptsManager property={property} readOnly={readOnly} />;
            case 'tenant_form': return <MiscDocuments property={property} readOnly={readOnly} autoOpenUpload={autoOpenUpload} categoryFilter="tenant_form" />;
            default: return null;
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.02 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 25 } }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <AnimatePresence mode="wait">
                {activeTab === 'menu' ? (
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-y-auto no-scrollbar"
                    >
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="flex flex-col gap-2"
                        >
                            {categories.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <motion.button
                                        key={category.id}
                                        variants={itemVariants}
                                        onClick={() => setActiveTab(category.id)}
                                        className="text-start focus:outline-none focus-visible:ring-2 ring-primary rounded-2xl group w-full"
                                    >
                                        <GlassCard className="w-full flex items-center justify-between p-2 sm:p-4 px-4 transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:bg-white/60 dark:hover:bg-neutral-800/80 active:scale-[0.98]">
                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <div className={cn("w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110 duration-300", category.bg)}>
                                                    <Icon className={cn("w-5 h-5", category.color)} />
                                                </div>
                                                <h3 className="font-bold text-sm md:text-base text-foreground tracking-tight leading-tight">
                                                    {category.label}
                                                </h3>
                                            </div>
                                            <ChevronLeft className={cn("w-4 h-4 text-muted-foreground/30 transition-transform duration-300 group-hover:-translate-x-1", lang === 'he' ? "" : "rotate-180 drop-shadow-sm")} />
                                        </GlassCard>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-full"
                    >
                        {/* Sticky Inline Header */}
                        <div className="sticky top-0 z-10 flex items-center gap-2 sm:gap-4 pb-4 mb-4 border-b border-white/10 bg-background/80 backdrop-blur-xl">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTab('menu')}
                                className="h-9 px-2 sm:px-4 gap-2 bg-muted/50 dark:bg-neutral-800/50 hover:bg-muted dark:hover:bg-neutral-800 rounded-xl"
                            >
                                <ChevronRight className={cn("w-4 h-4", lang === 'he' ? "" : "rotate-180")} />
                                <span className="text-xs font-bold">{lang === 'he' ? 'חזרה לתיקיות' : 'Back to Folders'}</span>
                            </Button>

                            <div className="flex-1 flex items-center gap-2">
                                {(() => {
                                    const category = categories.find(c => c.id === activeTab);
                                    if (!category) return null;
                                    const ActiveIcon = category.icon;
                                    return (
                                        <>
                                            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", category.bg)}>
                                                <ActiveIcon className={cn("w-3.5 h-3.5", category.color)} />
                                            </div>
                                            <span className="font-bold text-sm tracking-tight">{category.label}</span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-background/50 dark:bg-neutral-900/30 rounded-2xl border border-slate-200/40 dark:border-neutral-800/40 p-1 mb-2 pb-2">
                            {renderContent()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
