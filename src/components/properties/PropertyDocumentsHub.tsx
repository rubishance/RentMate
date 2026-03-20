import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Wrench, FileStack, Banknote, ChevronRight, Folder as FolderIcon, ChevronLeft } from 'lucide-react';
import type { Property } from '../../types/database';
import { MediaGallery } from './MediaGallery';
import { UtilityBillsManager } from './UtilityBillsManager';
import { MaintenanceRecords } from './MaintenanceRecords';
import { MiscDocuments } from './MiscDocuments';
import { ChecksManager } from './ChecksManager';
import { ProtocolsManager } from './ProtocolsManager';
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

type TabType = 'menu' | 'media' | 'utilities' | 'maintenance' | 'documents' | 'checks' | 'protocols';

export function PropertyDocumentsHub({ property, readOnly, requestedTab, autoOpenUpload }: PropertyDocumentsHubProps) {
    const { t, lang } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('menu');

    useEffect(() => {
        if (requestedTab) {
            setActiveTab(requestedTab);
        }
    }, [requestedTab]);

    const categories = [
        {
            id: 'media' as TabType,
            label: t('mediaStorage'),
            icon: ImageIcon,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            description: lang === 'he' ? 'מדיה' : 'Photos and videos'
        },
        {
            id: 'utilities' as TabType,
            label: t('utilitiesStorage'),
            icon: FileText,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            description: lang === 'he' ? 'חשבונות חשמל, מים, ארנונה' : 'Electricity, water, tax bills'
        },
        {
            id: 'documents' as TabType,
            label: t('documentsStorage'),
            icon: FileStack,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            description: lang === 'he' ? 'ביטוחים, נסח טאבו, שונות' : 'Insurance, deeds, misc'
        },
        {
            id: 'checks' as TabType,
            label: t('checksStorage'),
            icon: Banknote,
            color: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-50 dark:bg-pink-900/20',
            description: lang === 'he' ? 'צילומי צ\'קים לשכירות וביטחון' : 'Rent & security checks'
        },
        {
            id: 'protocols' as TabType,
            label: (lang === 'he' ? 'פרוטוקולי מסירה' : 'Protocols & Handovers'),
            icon: FolderIcon,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            description: lang === 'he' ? 'פרוטוקולים חתומים ומאושרים' : 'Signed delivery protocols'
        },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'media': return <MediaGallery property={property} readOnly={readOnly} />;
            case 'utilities': return <UtilityBillsManager property={property} readOnly={readOnly} />;
            case 'documents': return <MiscDocuments property={property} readOnly={readOnly} autoOpenUpload={autoOpenUpload} />;
            case 'checks': return <ChecksManager property={property} readOnly={readOnly} />;
            case 'protocols': return <ProtocolsManager property={property} readOnly={readOnly} />;
            default: return null;
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
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
                        className="flex-1 overflow-y-auto no-scrollbar pb-6"
                    >
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-2 lg:grid-cols-3 gap-3"
                        >
                            {categories.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <motion.button
                                        key={category.id}
                                        variants={itemVariants}
                                        onClick={() => setActiveTab(category.id)}
                                        className="text-start focus:outline-none focus-visible:ring-2 ring-primary rounded-[1.5rem] group"
                                    >
                                        <GlassCard className="h-full p-4 flex flex-col gap-3 transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:bg-white/40 dark:hover:bg-neutral-800/60 active:scale-[0.98]">
                                            <div className="flex items-start justify-between">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", category.bg)}>

                                                </div>
                                                <ChevronLeft className={cn("w-4 h-4 text-muted-foreground/50 transition-transform duration-300 group-hover:-translate-x-1", lang === 'he' ? "" : "rotate-180")} />
                                            </div>

                                            <div className="space-y-1">
                                                <h3 className="font-black text-sm text-foreground tracking-tight leading-tight">
                                                    {category.label}
                                                </h3>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-tight opacity-90">
                                                    {category.description}
                                                </p>
                                            </div>
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
                        <div className="sticky top-0 z-10 flex items-center gap-3 pb-4 mb-4 border-b border-white/10 bg-background/80 backdrop-blur-xl">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTab('menu')}
                                className="h-9 px-3 gap-2 bg-muted/50 dark:bg-neutral-800/50 hover:bg-muted dark:hover:bg-neutral-800 rounded-xl"
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
                        <div className="flex-1 overflow-y-auto min-h-0 bg-background/50 dark:bg-neutral-900/30 rounded-3xl border border-slate-200/40 dark:border-neutral-800/40 p-1 mb-4 pb-24">
                            {renderContent()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
