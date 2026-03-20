import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { ArrowRightIcon as ArrowRight, AlertCircleIcon as AlertCircle } from '../icons/NavIcons';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/Card';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';

interface FeedItem {
    id: string;
    type: 'warning' | 'info' | 'success' | 'urgent' | 'action';
    title: string;
    desc: string;
    date?: string;
    actionLabel?: string;
    onAction?: () => void;
}

interface DashboardHeroProps {
    firstName: string;
    feedItems: FeedItem[];
    showOnly?: 'welcome' | 'alerts';
}

export function DashboardHero({ firstName, feedItems, showOnly }: DashboardHeroProps) {
    const { t, lang } = useTranslation();
    const progressItems = feedItems || [];


    return (
        <div className="space-y-8">
            {(!showOnly || showOnly === 'welcome') && (
                /* Zen Welcome */
                <div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground">
                        {firstName || t('user_generic')}
                    </h1>
                </div>
            )}

            {(!showOnly || showOnly === 'alerts') && progressItems.length > 0 && (
                <div className="flex flex-col gap-4 w-full">
                    {progressItems.filter((item: FeedItem) => item.id !== 'welcome').map((item: FeedItem, idx: number) => {
                        const isActionOrInfo = item.type !== 'urgent' && item.type !== 'warning';
                        return <FeedItemCard key={item.id} item={item} isActionOrInfo={isActionOrInfo} lang={lang} t={t} idx={idx} />;
                    })}
                </div>
            )}
        </div>
    );
}

export function getTimeBasedGreeting(t: (key: string) => string) {
    const hour = new Date().getHours();
    if (hour < 5) return t('goodNight');
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    if (hour < 21) return t('goodEvening');
    return t('goodNight');
}

function FeedItemCard({ item, isActionOrInfo, lang, t, idx }: { item: FeedItem, isActionOrInfo: boolean, lang: string, t: any, idx: number }) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, duration: 0.5 }}
            className="w-full"
        >
            <Card
                className={cn(
                    "w-full rounded-[2.5rem] border transition-all duration-300 hover:scale-[1.01] cursor-pointer overflow-hidden",
                    item.type === 'urgent'
                        ? "bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30"
                        : item.type === 'warning'
                            ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30"
                            : "bg-white/40 dark:bg-slate-900/40 backdrop-blur-md"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
                hoverEffect
            >
                <CardContent className={cn("h-full flex flex-col justify-between transition-all duration-300", isExpanded ? "p-5" : "py-3 md:py-4 px-5")}>
                    <div className="relative z-10 w-full flex flex-col items-stretch" dir="auto">
                        <div className={cn("flex items-center justify-between gap-4", isExpanded ? "mb-4" : "mb-0")}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2.5 rounded-2xl shrink-0",
                                    item.type === 'urgent' ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" :
                                        item.type === 'warning' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" :
                                            "bg-primary/10 text-primary dark:bg-primary/20"
                                )}>
                                    {item.type === 'urgent' || item.type === 'warning' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </div>
                                <h3 className={cn(
                                    "font-black text-xl md:text-2xl tracking-tight leading-tight",
                                    isActionOrInfo ? "text-primary" : "text-foreground"
                                )}>
                                    {item.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {item.date && (
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-90 font-mono">
                                        {item.date}
                                    </span>
                                )}
                                <div className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                    <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-base leading-relaxed font-medium mb-4 text-muted-foreground">
                                        {item.desc}
                                    </p>
                                
                                    {item.onAction && (
                                        <div 
                                            className={cn(
                                                "flex items-center gap-2 text-base font-bold uppercase tracking-widest mt-2 hover:opacity-80 transition-opacity w-fit",
                                                isActionOrInfo ? "text-primary dark:text-primary" : "text-primary dark:text-primary"
                                            )}
                                            onClick={(e) => { e.stopPropagation(); item.onAction?.(); }}
                                        >
                                            {t('rentySuggestsAction')}
                                            <ArrowRight className={cn("w-4 h-4", lang === 'he' && "rotate-180")} />
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

