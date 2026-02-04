import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { CheckCircle2, ArrowRight, User, Building2, FileText, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface PortfolioReadinessWidgetProps {
    profile: { full_name?: string; phone?: string; phone_number?: string } | null;
    stats: {
        active_properties?: number;
        totalProperties?: number;
        storageCounts?: { media: number };
        active_contracts?: unknown[];
        totalContracts?: number;
    };
}

export function PortfolioReadinessWidget({ profile, stats }: PortfolioReadinessWidgetProps) {
    const { lang } = useTranslation();
    const navigate = useNavigate();
    const isRtl = lang === 'he';

    // 1. Identity Check
    const hasIdentity = !!(profile?.full_name && (profile?.phone || profile?.phone_number));

    // 2. Asset Check
    const hasAsset = (stats?.active_properties || 0) > 0 || (stats?.totalProperties || 0) > 0 || ((stats?.storageCounts?.media ?? 0) > 0); // Fallback heuristics if stats are vague

    // 3. Contract Check
    const hasContract = (stats?.active_contracts?.length || 0) > 0 || (stats?.totalContracts || 0) > 0;

    const steps = [
        {
            id: 'identity',
            title: lang === 'he' ? 'השלמת פרופיל' : 'Verify Identity',
            desc: lang === 'he' ? 'דרישת חובה ליצירת חוזים' : 'Required for legal contracts',
            isComplete: hasIdentity,
            icon: User,
            action: () => navigate('/settings'),
            cta: lang === 'he' ? 'להגדרות' : 'Go to Settings'
        },
        {
            id: 'asset',
            title: lang === 'he' ? 'הוספת נכס ראשון' : 'Add First Asset',
            desc: lang === 'he' ? 'הבסיס לניהול התיק שלך' : 'The foundation of your portfolio',
            isComplete: hasAsset,
            icon: Building2,
            action: () => navigate('/properties/new'),
            cta: lang === 'he' ? 'אשף ההוספה' : 'Open Wizard'
        },
        {
            id: 'contract',
            title: lang === 'he' ? 'חתימה על חוזה' : 'Sign Lease',
            desc: lang === 'he' ? 'יצירת תזרים מזומנים' : 'Start generating cashflow',
            isComplete: hasContract,
            icon: FileText,
            action: () => navigate('/contracts/new'), // Or leads to empty state
            cta: lang === 'he' ? 'חוזה חדש' : 'New Contract'
        }
    ];

    const completedCount = steps.filter(s => s.isComplete).length;
    const progress = (completedCount / steps.length) * 100;
    const isFullyComplete = completedCount === 3;

    // Optional: Hide if complete? Or show a "Trophy" state?
    // Let's show a "Trophy" state if complete, but maybe collapsible.

    return (
        <div className="h-full flex flex-col glass-premium rounded-3xl p-5 border border-white/20 shadow-sm relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <Trophy className={cn("w-4 h-4 text-indigo-600 dark:text-indigo-400", isFullyComplete && "text-yellow-500")} />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">
                        {lang === 'he' ? 'מוכנות לניהול' : 'Portfolio Setup'}
                    </h3>
                </div>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mb-6 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />
            </div>

            {/* Steps List */}
            <div className="flex-1 space-y-3">
                {steps.map((step) => (
                    <button
                        key={step.id}
                        id={step.id === 'asset' ? 'portfolio-add-asset-btn' : undefined}
                        onClick={step.action}
                        disabled={step.isComplete}
                        className={cn(
                            "w-full flex items-center p-3 rounded-2xl transition-all duration-300 text-right rtl:text-right ltr:text-left group/item relative overflow-hidden",
                            step.isComplete
                                ? "bg-emerald-50/50 dark:bg-emerald-900/10 opacity-60 hover:opacity-100"
                                : "bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 shadow-sm hover:shadow-md"
                        )}
                    >
                        {/* Status Icon */}
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors mr-3 rtl:ml-3 rtl:mr-0",
                            step.isComplete
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 group-hover/item:bg-indigo-100 group-hover/item:text-indigo-600"
                        )}>
                            {step.isComplete ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-xs font-bold truncate",
                                    step.isComplete ? "text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-500/30" : "text-foreground"
                                )}>
                                    {step.title}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate opacity-80">
                                {step.desc}
                            </p>
                        </div>

                        {/* Action CTA (Only if incomplete) */}
                        {!step.isComplete && (
                            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-4 rtl:left-4 rtl:right-auto">
                                <ArrowRight className={cn("w-4 h-4 text-indigo-500", isRtl && "rotate-180")} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Celebration (Only when complete) */}
            {isFullyComplete && (
                <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3 animate-bounce shadow-lg shadow-yellow-200">
                        <Trophy className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h4 className="font-bold text-lg text-foreground mb-1">
                        {lang === 'he' ? 'התיק מוכן!' : 'Portfolio Ready!'}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4">
                        {lang === 'he' ? 'כל הכבוד, סיימת את ההגדרות הראשוניות.' : 'Great job, you completed the setup.'}
                    </p>
                    <button
                        onClick={() => {/* Dismiss logic could go here or parent handles it */ }}
                        className="text-[10px] font-black uppercase text-indigo-600 hover:underline"
                    >
                        {lang === 'he' ? 'סגור וידג׳ט' : 'Dismiss Widget'}
                    </button>
                </div>
            )}
        </div>
    );
}
