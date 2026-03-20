import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface PlanLimitWidgetProps {
    entityType?: 'properties' | 'contracts' | 'tenants';
}

export function PlanLimitWidget({ entityType = 'properties' }: PlanLimitWidgetProps) {
    const { lang } = useTranslation();
    const navigate = useNavigate();

    // Text configuration based on the design mockup
    const title = lang === 'he' ? 'שדרוג חבילה נדרש' : 'Plan Upgrade Required';
    
    let description = '';
    if (lang === 'he') {
        if (entityType === 'properties') description = 'הגעת למגבלת הנכסים בחבילה הנוכחית שלך. שדרג עכשיו כדי להמשיך לצמוח.';
        else if (entityType === 'contracts') description = 'הגעת למגבלת החוזים בחבילה הנוכחית שלך. שדרג עכשיו כדי להמשיך לצמוח.';
        else description = 'הגעת למגבלת היצירה בחבילה הנוכחית שלך. שדרג עכשיו כדי להמשיך לצמוח.';
    } else {
        description = `You have reached the ${entityType} limit in your current plan. Upgrade now to keep growing.`;
    }

    const buttonText = lang === 'he' ? 'שדרג חבילה עכשיו' : 'Upgrade Plan Now';

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 w-full max-w-lg mx-auto">
            <div className="bg-[#0D47A1] rounded-2xl p-8 md:p-10 w-full flex flex-col items-center text-center shadow-lg border border-primary-600">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    {title}
                </h2>
                <p className="text-base md:text-lg text-white/90 mb-10 leading-relaxed font-medium">
                    {description}
                </p>
                <button
                    onClick={() => navigate('/settings')}
                    className="w-full sm:w-auto px-10 py-3.5 bg-white text-[#0D47A1] hover:bg-white/90 transition-colors rounded-xl font-bold text-base md:text-lg shadow-sm"
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}
