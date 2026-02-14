import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { CalendarIcon as Calendar, ArrowRightIcon as ArrowRight } from '../icons/NavIcons';
import { NotificationWarningIcon, NotificationInfoIcon, NotificationErrorIcon, NotificationSuccessIcon } from '../icons/NotificationIcons';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/Card';

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
    const { t } = useTranslation();
    const primaryAlert = feedItems[0];

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

            {/* High Impact Alert Card */}
            {primaryAlert && primaryAlert.id !== 'welcome' && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Card
                        className={cn(
                            "rounded-[2rem] border-0 cursor-pointer transition-all duration-500",
                            primaryAlert.type === 'urgent'
                                ? "bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30"
                                : "bg-card hover:shadow-lg hover:translate-y-[-2px]"
                        )}
                        onClick={primaryAlert.onAction}
                        hoverEffect={primaryAlert.type !== 'urgent'}
                    >
                        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-110 duration-500",
                                primaryAlert.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                    primaryAlert.type === 'urgent' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            )}>
                                {primaryAlert.type === 'warning' ? <NotificationWarningIcon className="w-8 h-8" /> :
                                    primaryAlert.type === 'urgent' ? <NotificationErrorIcon className="w-8 h-8" /> :
                                        <NotificationInfoIcon className="w-8 h-8" />}
                            </div>

                            <div className="flex-1 text-center md:text-left rtl:md:text-right space-y-2">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                        primaryAlert.type === 'urgent' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                    )}>
                                        {primaryAlert.type === 'urgent' ? t('urgent') : t('recommendation')}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{primaryAlert.date}</span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{primaryAlert.title}</h2>
                                <p className="text-muted-foreground text-sm max-w-xl font-medium leading-relaxed">{primaryAlert.desc}</p>
                            </div>

                            <div className="shrink-0">
                                <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-md group-hover:scale-110 transition-all duration-500">
                                    <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
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
