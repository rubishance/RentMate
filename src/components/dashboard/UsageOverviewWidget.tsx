import type { FC } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

export const UsageOverviewWidget: FC = () => {
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
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm shrink-0">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground dark:text-white">Approaching Plan Limits</h3>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                        You are nearing the limits for your <b>{plan.name}</b> plan.
                        Consider upgrading to add more {propWarning ? 'properties' : ''}
                        {(propWarning && (tenantWarning || contractWarning)) ? ', ' : ''}
                        {tenantWarning ? 'tenants' : ''}
                        {((propWarning || tenantWarning) && contractWarning) ? ' and ' : ''}
                        {contractWarning ? 'contracts' : ''}.
                    </p>
                    <button
                        onClick={() => navigate('/settings')}
                        className="mt-3 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1"
                    >
                        View Plan Details <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
