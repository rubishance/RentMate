import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { ArrowRightIcon as ArrowRight, AlertCircleIcon as AlertCircle } from '../icons/NavIcons';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/Card';
import { DashboardChatBar } from './DashboardChatBar';
import { CheckCircle2 } from 'lucide-react';

interface FeedItem {
    id: string;
    type: 'warning' | 'info' | 'success' | 'urgent' | 'action';
    title: string;
    desc: string;
    date: string;
    actionLabel?: string;
    onAction?: () => void;
}

interface DashboardHeroProps {
    firstName: string;
    feedItems: FeedItem[];
}

export function DashboardHero({ firstName, feedItems }: DashboardHeroProps) {
    const { t, lang } = useTranslation();

    return (
        <div className="space-y-8">
            {/* Zen Welcome */}
            <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">
                    {getTimeBasedGreeting(t)}
                </span>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground lowercase">
                    {firstName || t('user_generic')}
                </h1>
            </div>

            {/* Dashboard AI Chat Bar */}
            <DashboardChatBar className="mb-4" />

            {/* High Impact Alert Card / Carousel */}
            {feedItems.length > 0 && (
                <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-4 snap-x snap-mandatory scrollbar-hide md:justify-center">
                    {feedItems.filter(item => item.id !== 'welcome').map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.1 * idx, duration: 0.5 }}
                            className="flex-shrink-0 snap-center w-[300px] md:w-[350px]"
                        >
                            <Card
                                className={cn(
                                    "h-full rounded-[2.5rem] border border-white/20 dark:border-white/10 transition-all duration-300 hover:scale-[1.02]",
                                    item.type === 'urgent'
                                        ? "bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30"
                                        : item.type === 'warning'
                                            ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30"
                                            : "bg-white/40 dark:bg-slate-900/40 backdrop-blur-md"
                                )}
                                onClick={item.onAction}
                                hoverEffect
                            >
                                <CardContent className="p-5 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={cn(
                                                "p-2.5 rounded-2xl",
                                                item.type === 'urgent' ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" :
                                                    item.type === 'warning' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" :
                                                        "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                                            )}>
                                                {item.type === 'urgent' || item.type === 'warning' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 font-mono">{item.date}</span>
                                        </div>

                                        <h3 className="font-bold text-base leading-tight mb-2 line-clamp-2 text-foreground">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 font-medium">
                                            {item.desc}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                        {t('rentySuggestsAction')}
                                        <ArrowRight className={cn("w-3 h-3", lang === 'he' && "rotate-180")} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getTimeBasedGreeting(t: (key: string) => string) {
    const hour = new Date().getHours();
    if (hour < 5) return t('goodNight');
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    if (hour < 21) return t('goodEvening');
    return t('goodNight');
}
