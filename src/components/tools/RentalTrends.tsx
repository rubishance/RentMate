import { useEffect, useState } from 'react';
import { rentalTrendService, RentalTrend } from '../../services/rental-trend.service';
import { useTranslation } from '../../hooks/useTranslation';
import { TrendingUp, TrendingDown, MapPin, Info, ArrowUpRight, Percent } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { motion } from 'framer-motion';

export function RentalTrends() {
    const { t, lang } = useTranslation();
    const [stats, setStats] = useState<any>(null);
    const [regionalTrends, setRegionalTrends] = useState<RentalTrend[]>([]);

    useEffect(() => {
        setStats(rentalTrendService.getNationalStats());
        setRegionalTrends(rentalTrendService.getAllRegionalTrends());
    }, []);

    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* National Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-8 border-l-4 border-l-brand-600">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                                {lang === 'he' ? 'עלייה שנתית ארצית' : 'national annual growth'}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tighter text-foreground">
                                    {stats.annual}%
                                </span>
                                <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
                            </div>
                        </div>
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                            <Percent className="w-6 h-6 text-brand-600" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-8 border-l-4 border-l-emerald-500">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                                {lang === 'he' ? 'חוזים חדשים' : 'new contracts'}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tighter text-foreground">
                                    +{stats.newContracts}%
                                </span>
                                <ArrowUpRight className="w-5 h-5 text-emerald-500 mb-1" />
                            </div>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-8 border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                                {lang === 'he' ? 'שכר דירה ממוצע (למ"ס)' : 'avg monthly rent (cbs)'}
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black tracking-tighter text-foreground">
                                    ₪{stats.averageRent.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                            <Info className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Regional Comparison Table/Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black tracking-tighter lowercase flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-brand-600" />
                        {lang === 'he' ? 'מגמות לפי אזורים' : 'regional trends'}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regionalTrends.map((trend, idx) => (
                        <motion.div
                            key={trend.region}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <GlassCard className="p-6 hover:shadow-premium transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-lg font-black tracking-tight text-foreground lowercase">
                                        {lang === 'he' ? trend.region : trend.region}
                                    </span>
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-colors",
                                        trend.annualGrowth > 0
                                            ? "bg-emerald-500/10 text-emerald-500"
                                            : "bg-red-500/10 text-red-500"
                                    )}>
                                        {trend.annualGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {Math.abs(trend.annualGrowth)}%
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                                        <span>{lang === 'he' ? 'שכירות ממוצעת' : 'avg rent'}</span>
                                        <span>₪{trend.averageRent.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand-500 group-hover:bg-brand-400 transition-colors"
                                            style={{ width: `${(trend.averageRent / 7000) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Footnote */}
            <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-neutral-900/50 rounded-3xl border border-slate-100 dark:border-neutral-800">
                <Info className="w-5 h-5 text-muted-foreground opacity-40 shrink-0" />
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                    {lang === 'he'
                        ? 'הנתונים מבוססים על מדדי הלמ"ס (שירותי דיור בבעלות) וסקירות שוק לשנת 2025. המדד משקף את השינוי בעלויות השכירות הריאליות בשוק החופשי.'
                        : 'Data based on CBS (Owner-Occupied Dwelling Services) indices and market reviews for 2025. The index reflects real rental cost changes in the free market.'}
                </p>
            </div>
        </div>
    );
}

// Helper for class names since we don't always have tailwind-merge in all components
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
