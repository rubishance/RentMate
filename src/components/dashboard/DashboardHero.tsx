import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { CalendarIcon as Calendar, ArrowRightIcon as ArrowRight } from '../icons/NavIcons';
import { NotificationWarningIcon, NotificationInfoIcon, NotificationErrorIcon, NotificationSuccessIcon } from '../icons/NotificationIcons';
import { cn } from '../../lib/utils';

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
        <div className="space-y-12">
            {/* Zen Welcome */}
            <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                    {t('welcomeBack')}
                </span>
                <h1 className="text-6xl font-black tracking-tighter text-foreground lowercase">
                    {firstName || t('user_generic')}
                </h1>
                <p className="text-base text-muted-foreground font-medium opacity-60">
                    {feedItems.length > 0 && feedItems[0].id !== 'welcome'
                        ? `${t('youHave')} ${feedItems.length} ${t('activeAlerts')}.`
                        : t('allLooksQuiet')}
                </p>
            </div>

            {/* High Impact Alert Card */}
            {primaryAlert && primaryAlert.id !== 'welcome' && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                        "p-10 rounded-[3rem] border flex flex-col md:flex-row items-center gap-10 group cursor-pointer transition-all duration-700",
                        primaryAlert.type === 'urgent'
                            ? "bg-rose-50/30 border-rose-100 dark:border-rose-900/30"
                            : "bg-white dark:bg-neutral-900 border-slate-100 dark:border-neutral-800 shadow-minimal hover:shadow-premium"
                    )}
                    onClick={primaryAlert.onAction}
                >
                    <div className={cn(
                        "w-24 h-24 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-minimal transition-all group-hover:scale-110 group-hover:rotate-3 duration-700",
                        primaryAlert.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                            primaryAlert.type === 'urgent' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' :
                                'bg-slate-50 text-slate-600 dark:bg-neutral-800'
                    )}>
                        {primaryAlert.type === 'warning' ? <NotificationWarningIcon className="w-10 h-10" /> :
                            primaryAlert.type === 'urgent' ? <NotificationErrorIcon className="w-10 h-10" /> :
                                <NotificationInfoIcon className="w-10 h-10" />}
                    </div>

                    <div className="flex-1 text-center md:text-left rtl:md:text-right space-y-3">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <span className={cn(
                                "px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                primaryAlert.type === 'urgent' ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200" : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-slate-300"
                            )}>
                                {primaryAlert.type === 'urgent' ? t('urgent') : t('recommendation')}
                            </span>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{primaryAlert.date}</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-foreground lowercase">{primaryAlert.title}</h2>
                        <p className="text-muted-foreground text-sm max-w-xl font-medium opacity-60 leading-relaxed">{primaryAlert.desc}</p>
                    </div>

                    <div className="shrink-0">
                        <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center shadow-premium-dark group-hover:scale-110 transition-all duration-700">
                            <ArrowRight className="w-7 h-7 rtl:rotate-180" />
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
