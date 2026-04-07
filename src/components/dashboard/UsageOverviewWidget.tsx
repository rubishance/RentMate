import type { FC } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

export const UsageOverviewWidget: FC = () => {
    const { lang } = useTranslation();
    const { plan, usage, loading } = useSubscription();
    const navigate = useNavigate();

    if (loading || !plan) return null;

    // Check for fully reached limits (100%)
    const checkLimitReached = (current: number, max: number) => {
        if (max === -1) return false;
        return current >= max;
    };

    const propLimit = checkLimitReached(usage.properties, plan.max_properties);
    const tenantLimit = checkLimitReached(usage.tenants, plan.max_tenants);
    const contractLimit = checkLimitReached(usage.contracts, plan.max_contracts);

    const isLimitReached = propLimit || tenantLimit || contractLimit;

    if (isLimitReached) {
        // Render the "Plan Limit Widget" format
        const title = lang === 'he' ? 'שדרוג חבילה נדרש' : 'Plan Upgrade Required';
        let description = '';
        let entityType = 'properties';

        if (propLimit) {
            entityType = 'properties';
        } else if (contractLimit) {
            entityType = 'contracts';
        } else if (tenantLimit) {
            entityType = 'tenants';
        }

        if (lang === 'he') {
            if (entityType === 'properties') description = 'הגעת למגבלת הנכסים בחבילה הנוכחית שלך. שדרג עכשיו כדי להמשיך לצמוח.';
            else if (entityType === 'contracts') description = 'הגעת למגבלת החוזים בחבילה הנוכחית שלך. שדרג עכשיו כדי להמשיך לצמוח.';
            else description = 'הגעת למגבלת היצירה בחבילה הנוכחית שלך. שדרג עכשיו כדי להמשיך לצמוח.';
        } else {
            description = `You have reached the ${entityType} limit in your current plan. Upgrade now to keep growing.`;
        }

        const buttonText = lang === 'he' ? 'שדרג חבילה עכשיו' : 'Upgrade Plan Now';

        return (
            <div className="bg-[#0D47A1] rounded-2xl p-8 w-full flex flex-col items-center text-center shadow-lg border border-primary-600 animate-in slide-in-from-top-4 duration-700">
                <h2 className="text-2xl font-bold text-white mb-2 sm:mb-4">
                    {title}
                </h2>
                <p className="text-sm md:text-base text-white/90 mb-6 leading-relaxed font-medium">
                    {description}
                </p>
                <button
                    onClick={() => navigate('/settings')}
                    className="w-full sm:w-auto px-8 py-2 sm:py-4 bg-white text-[#0D47A1] hover:bg-white/90 transition-colors rounded-xl font-bold text-sm md:text-base shadow-sm"
                >
                    {buttonText}
                </button>
            </div>
        );
    }

    // Check for warnings (>= 80% usage)
    const checkWarning = (current: number, max: number) => {
        if (max === -1) return false;
        return (current / max) >= 0.8;
    };

    const propWarning = checkWarning(usage.properties, plan.max_properties);
    const tenantWarning = checkWarning(usage.tenants, plan.max_tenants);
    const contractWarning = checkWarning(usage.contracts, plan.max_contracts);

    if (!propWarning && !tenantWarning && !contractWarning) return null;

    return (
        <Card className="rounded-2xl border-orange-500/20 bg-orange-500/5 h-full animate-in slide-in-from-top-4 duration-700 shadow-minimal hover:shadow-jewel transition-all">
            <CardContent className="flex items-start gap-4 md:gap-6 pt-6">
                <div className="p-2 md:p-2 sm:p-4 bg-white/50 dark:bg-orange-500/10 rounded-2xl shadow-sm shrink-0">
                    <AlertTriangle className="w-5 md:w-6 h-5 md:h-6 text-orange-500" />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-warning opacity-80">
                            {lang === 'he' ? 'התראת חבילה' : 'Plan Advisory'}
                        </span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-primary leading-tight">
                        {lang === 'he' ? 'מתקרבים למגבלות החבילה' : 'Approaching Plan Limits'}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {lang === 'he'
                            ? `אתם עומדים לסיים את המכסה בחבילת ה-${plan.name}. כדאי לשדרג כדי להוסיף עוד נכסים, דיירים וחוזים.`
                            : `You are nearing the limits for your ${plan.name} plan. Consider upgrading to add more properties, tenants and contracts.`}
                    </p>
                    <Button
                        variant="ghost"
                        className="p-0 h-auto text-xs uppercase tracking-[0.2em] text-warning hover:text-orange-700 gap-2 hover:bg-transparent"
                        onClick={() => navigate('/settings')}
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                        {lang === 'he' ? 'צפייה בפרטי החבילה' : 'View Plan Details'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
