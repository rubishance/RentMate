import type { FC } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';

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
        <Card className="border-orange-500/20 bg-orange-500/5 mb-6 md:mb-8 animate-in slide-in-from-top-4 duration-700 shadow-minimal hover:shadow-jewel transition-all">
            <CardContent className="flex items-start gap-4 md:gap-6 pt-6">
                <div className="p-2 md:p-3 bg-white/50 dark:bg-orange-500/10 rounded-2xl shadow-sm shrink-0">
                    <AlertTriangle className="w-5 md:w-6 h-5 md:h-6 text-orange-500" />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 opacity-80">Plan Advisory</span>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground leading-tight">
                        {lang === 'he' ? 'מתקרבים למגבלות החבילה' : 'Approaching Plan Limits'}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {lang === 'he'
                            ? `אתם עומדים לסיים את המכסה בחבילת ה-${plan.name}. כדאי לשדרג כדי להוסיף עוד נכסים, דיירים וחוזים.`
                            : `You are nearing the limits for your ${plan.name} plan. Consider upgrading to add more properties, tenants and contracts.`}
                    </p>
                    <Button
                        variant="ghost"
                        className="p-0 h-auto text-[10px] uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 hover:text-orange-700 gap-2 hover:bg-transparent"
                        onClick={() => navigate('/settings')}
                    >
                        {lang === 'he' ? 'צפייה בפרטי החבילה' : 'View Plan Details'}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
