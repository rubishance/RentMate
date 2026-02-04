import { useTranslation } from '../../hooks/useTranslation';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { Property } from '../../types/database';

interface PortfolioVisualizerProps {
    properties: Property[];
    isLocked?: boolean;
}

export function PortfolioVisualizer({ properties, isLocked = false }: PortfolioVisualizerProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { effectiveTheme } = useUserPreferences();

    // Mock Data Generator based on real property count
    const cityData = properties.reduce((acc, prop) => {
        acc[prop.city] = (acc[prop.city] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(cityData).map(([name, value]) => ({ name, value }));
    const COLORS = ['#F97316', '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6'];

    // Mock Yield Data
    const yieldData = [
        { month: 'Jan', yield: 2.1 },
        { month: 'Feb', yield: 2.3 },
        { month: 'Mar', yield: 2.8 }, // Optimized
        { month: 'Apr', yield: 3.1 },
        { month: 'May', yield: 3.0 },
        { month: 'Jun', yield: 3.2 },
    ];

    if (isLocked) {
        return (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-dashed border-border group cursor-pointer" onClick={() => navigate('/pricing')}>
                {/* Blurred Background Preview */}
                <div className="absolute inset-0 bg-secondary/50 backdrop-blur-sm filter blur-sm p-6 grid grid-cols-3 gap-4 opacity-50">
                    <div className="bg-slate-300 dark:bg-slate-700 h-full rounded-xl w-full" />
                    <div className="bg-slate-300 dark:bg-slate-700 h-full rounded-xl w-full" />
                    <div className="bg-slate-300 dark:bg-slate-700 h-full rounded-xl w-full" />
                </div>

                {/* Lock Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 z-10 p-6 text-center transition-all group-hover:bg-white/50 dark:group-hover:bg-black/50">
                    <div className="p-4 bg-background rounded-full shadow-2xl mb-4 group-hover:scale-110 transition-transform duration-500">
                        <Lock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
                        {t('portfolioVisualizerLocked') || 'Unlock Portfolio Intelligence'}
                    </h3>
                    <p className="text-muted-foreground mt-2 max-w-sm">
                        {t('masterTierFeature') || 'Visualize your geographic exposure, net yield trends, and risk distribution.'}
                    </p>
                    <span className="mt-4 text-xs font-bold text-primary uppercase tracking-widest border-b border-primary">
                        {t('upgradeToMaster') || 'Upgrade to Master'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Exposure Chart */}
            <div className="bg-background/40 backdrop-blur-xl border border-white/20 dark:border-white/5 p-6 rounded-2xl shadow-sm">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">{t('exposureByCity')}</h4>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: effectiveTheme === 'dark' ? '#fff' : '#000' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Yield Trend */}
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/10 to-purple-900/10 backdrop-blur-xl border border-indigo-500/20 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider">{t('netYieldTrend')}</h4>
                    <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-lg">
                        +1.4% {t('vsLastYear')}
                    </span>
                </div>

                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yieldData}>
                            <defs>
                                <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                            <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: effectiveTheme === 'dark' ? '#1f2937' : '#fff', borderRadius: '12px', border: 'none' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="yield"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorYield)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
