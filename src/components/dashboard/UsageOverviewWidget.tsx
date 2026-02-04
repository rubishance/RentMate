import type { FC } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export const UsageOverviewWidget: FC = () => {
    const { lang } = useTranslation();
    const { plan, usage, loading } = useSubscription();
    const navigate = useNavigate();

    if (loading || !plan) return null;

    // Check for warnings (>80% usage)
    const checkWarning = (current: number, max: number) => {
        if (max === -1) return false;
        return (current / max) >= 0.8;
    };

    const propWarning = checkWarning(usage.properties, plan.max_properties);
    const tenantWarning = checkWarning(usage.tenants, plan.max_tenants);
    const contractWarning = checkWarning(usage.contracts, plan.max_contracts);

    if (!propWarning && !tenantWarning && !contractWarning) return null;

    return (
        <div className="glass-premium border-orange-500/20 bg-orange-500/5 rounded-3xl p-6 mb-8 animate-in slide-in-from-top-4 duration-700 shadow-minimal hover:shadow-jewel transition-all group">
            <div className="flex items-start gap-6">
                <div className="p-3 bg-white/10 dark:bg-orange-500/10 rounded-2xl shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 opacity-60">Plan Advisory</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {lang === 'he' ? 'מתקרבים למגבלות החבילה' : 'Approaching Plan Limits'}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {lang === 'he'
                            ? `אתם עומדים לסיים את המכסה בחבילת ה-${plan.name}. כדאי לשדרג כדי להוסיף עוד נכסים, דיירים וחוזים.`
                            : `You are nearing the limits for your ${plan.name} plan. Consider upgrading to add more properties, tenants and contracts.`}
                    </p>
                    <button
                        onClick={() => navigate('/settings')}
                        className="pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-2 transition-all group-hover:gap-3"
                    >
                        {lang === 'he' ? 'צפייה בפרטי החבילה' : 'View Plan Details'}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
