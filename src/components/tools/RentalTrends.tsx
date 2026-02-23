import { useEffect, useState, useMemo } from 'react';
import { rentalTrendService } from '../../services/rental-trend.service';
import { useTranslation } from '../../hooks/useTranslation';
import { TrendingUp, TrendingDown, Info, ArrowUpRight, ShieldCheck, Filter, X } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { FilterDrawer } from '../common/FilterDrawer';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';

export function RentalTrends() {
    const { t, lang } = useTranslation();

    // Filters State
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [propertyType, setPropertyType] = useState<string>('apartment');
    const [rooms, setRooms] = useState<number>(3);
    const [duration, setDuration] = useState<'1Y' | '2Y' | '5Y'>('1Y');
    const [hasMamah, setHasMamah] = useState<boolean>(false);
    const [showFilters, setShowFilters] = useState(false);

    // Data State
    const [nationalStats, setNationalStats] = useState<any>(null);
    const regions = useMemo(() => rentalTrendService.getAllRegions(), []);

    useEffect(() => {
        setNationalStats(rentalTrendService.getNationalStats());
    }, []);

    const filteredData = useMemo(() => {
        return rentalTrendService.getFilteredTrend({
            regions: selectedRegions,
            propertyType,
            rooms,
            duration,
            hasMamah
        });
    }, [selectedRegions, propertyType, rooms, duration, hasMamah]);

    const resetFilters = () => {
        setSelectedRegions([]);
        setPropertyType('apartment');
        setRooms(3);
        setDuration('1Y');
        setHasMamah(false);
    };

    const toggleRegion = (reg: string) => {
        setSelectedRegions(prev =>
            prev.includes(reg) ? prev.filter(r => r !== reg) : [...prev, reg]
        );
    };

    if (!nationalStats) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground">
                        {lang === 'he' ? 'ניתוח שוק חכם' : 'Smart Market Intelligence'}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                        {lang === 'he' ? 'נתוני למ"ס וניתוח מגמות המותאמים לנכס שלך' : 'CBS data and trend analysis tailored to your property'}
                    </p>
                </div>
                <Button
                    onClick={() => setShowFilters(true)}
                    variant={showFilters ? 'primary' : 'outline'}
                    className="rounded-2xl text-xs font-black uppercase tracking-widest gap-2"
                >
                    <Filter className="w-4 h-4" />
                    {lang === 'he' ? 'מסננים' : 'Filters'}
                </Button>
            </div>

            {/* Active Filters Summary */}
            {(selectedRegions.length > 0 || propertyType !== 'apartment' || rooms !== 3 || duration !== '1Y' || hasMamah) && (
                <div className="flex flex-wrap gap-2">
                    {selectedRegions.map(reg => (
                        <div key={reg} className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[9px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {reg}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => toggleRegion(reg)} />
                        </div>
                    ))}
                    {propertyType !== 'apartment' && (
                        <div className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[9px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {t(propertyType as any)}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setPropertyType('apartment')} />
                        </div>
                    )}
                    {hasMamah && (
                        <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full text-[9px] font-black uppercase flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
                            {t('includeMamahPremium')}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setHasMamah(false)} />
                        </div>
                    )}
                </div>
            )}

            {/* Filter Drawer */}
            <FilterDrawer
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                onReset={resetFilters}
                title={t('marketAnalysisFilters')}
            >
                <div className="space-y-10">
                    {/* Region Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">
                            {lang === 'he' ? 'אזורי השוואה' : 'Regions'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {regions.map((reg) => (
                                <Button
                                    key={reg}
                                    onClick={() => toggleRegion(reg)}
                                    variant={selectedRegions.includes(reg) ? 'primary' : 'outline'}
                                    className="rounded-2xl text-[10px] font-black uppercase tracking-widest px-4 py-3 h-auto"
                                >
                                    {reg}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('propertyType')}</label>
                        <Select
                            value={propertyType}
                            onChange={(value) => setPropertyType(value)}
                            options={[
                                { value: 'apartment', label: t('apartment') },
                                { value: 'house', label: t('house') },
                                { value: 'penthouse', label: t('penthouse') }
                            ]}
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('rooms')}</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[2, 3, 4, 5].map(r => (
                                <Button
                                    key={r}
                                    onClick={() => setRooms(r)}
                                    variant={rooms === r ? 'primary' : 'outline'}
                                    className="h-12 rounded-xl font-black text-[10px]"
                                >
                                    {r}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('comparisonDuration')}</label>
                        <div className="flex gap-2">
                            {(['1Y', '2Y', '5Y'] as const).map(d => (
                                <Button
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    variant={duration === d ? 'primary' : 'outline'}
                                    className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                >
                                    {d}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 rounded-[2rem] border border-brand-100 dark:border-brand-900/20">
                        <div className="flex items-center justify-between cursor-pointer group" onClick={() => setHasMamah(!hasMamah)}>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                                    {t('includeMamahPremium')}
                                </span>
                                <p className="text-[8px] text-muted-foreground font-medium">{t('mamahImpactDesc')}</p>
                            </div>
                            <Switch
                                checked={hasMamah}
                                onChange={setHasMamah}
                            />
                        </div>
                    </div>
                </div>
            </FilterDrawer>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Projection Card */}
                <GlassCard className="p-8 bg-brand-600 text-white border-none shadow-2xl shadow-brand-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:scale-[1.7] transition-transform duration-700">
                        <TrendingUp className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                {lang === 'he' ? 'שכירות שוק ממוצעת' : 'Avg Market Rent'}
                            </span>
                            <div className="text-6xl font-black tracking-tighter">
                                ₪{Math.round(filteredData.avgRent).toLocaleString()}
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                    {lang === 'he' ? `צמיחה ל-${duration}` : `${duration} Growth`}
                                </span>
                                <div className="text-2xl font-black flex items-center gap-1">
                                    {filteredData.avgGrowth > 0 ? '+' : ''}{filteredData.avgGrowth.toFixed(1)}%
                                    {filteredData.avgGrowth > 0 ? <TrendingUp className="w-5 h-5 text-emerald-300" /> : <TrendingDown className="w-5 h-5 text-red-300" />}
                                </div>
                            </div>
                            <div className="w-[1px] h-10 bg-white/20" />
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                    {lang === 'he' ? 'בסיס' : 'Basis'}
                                </span>
                                <div className="text-2xl font-black lowercase text-white">
                                    {rooms}{lang === 'he' ? ' חד\'' : 'rm'} {t(propertyType as any) || propertyType}
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Insight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassCard className="p-6 border-l-4 border-l-brand-600 bg-white dark:bg-neutral-900 shadow-sm">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                                    {lang === 'he' ? 'שוכר חדש מול חידוש' : 'New vs Renewal'}
                                </h4>
                                <ArrowUpRight className="w-4 h-4 text-brand-600" />
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1 text-foreground">
                                        <span>{lang === 'he' ? 'שוכר חדש' : 'New Tenant'}</span>
                                        <span className="text-emerald-600">+{nationalStats.newContracts}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[46%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1 text-foreground">
                                        <span>{lang === 'he' ? 'חידוש חוזה' : 'Renewal'}</span>
                                        <span className="text-brand-600">+{nationalStats.renewals}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-500 w-[30%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 border-l-4 border-l-emerald-500 bg-white dark:bg-neutral-900 shadow-sm">
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                                {lang === 'he' ? 'פרמיית מיגון (ממ"ד)' : 'Safety Premium'}
                            </h4>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-emerald-600">+{nationalStats.safetyPremium}%</div>
                                    <p className="text-[10px] text-muted-foreground leading-tight font-semibold">
                                        {lang === 'he' ? 'פרמיית שכירות על יחידות עם ממ"ד ב-2025' : 'Rent premium for units with safe rooms in 2025'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 col-span-1 md:col-span-2 border-l-4 border-l-amber-500 bg-white dark:bg-neutral-900 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                                    {lang === 'he' ? 'שוק מול מדד המחירים' : 'Market vs CPI Gap'}
                                </h4>
                                <p className="text-sm font-bold text-foreground">
                                    {lang === 'he' ? (
                                        <>מחירי השוק עקפו את המדד ב-<span className="text-amber-600">2.4%</span> השנה.</>
                                    ) : (
                                        <>Market rents outpaced the CPI by <span className="text-amber-600">2.4%</span> this year.</>
                                    )}
                                </p>
                            </div>
                            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/40 rounded-2xl text-[10px] font-black text-amber-600 uppercase border border-amber-500/30 shrink-0">
                                {lang === 'he' ? 'פער אסטרטגי' : 'Strategic Gap'}
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Footnote */}
            <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-neutral-900/50 rounded-3xl border border-slate-100 dark:border-neutral-800">
                <Info className="w-5 h-5 text-muted-foreground opacity-40 shrink-0" />
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                    {lang === 'he'
                        ? 'הנתונים מבוססים על מדדי הלמ"ס (שירותי דיור בבעלות) וסקירות שוק לשנת 2025. הניתוח לוקח בחשבון התאמות גודל, סוג נכס ומרכיבי מיגון.'
                        : 'Data based on CBS indices and 2025 market reviews. Analysis includes room counts, property types, and safety premiums adjustments.'}
                </p>
            </div>
        </div>
    );
}
