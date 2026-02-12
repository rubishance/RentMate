import { useTranslation } from '../../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import {
    PlusCircle,
    Banknote,
    Wrench,
    MessageCircle,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ActionItem {
    id: string;
    icon: any;
    label: string;
    subLabel?: string;
    gradient: string;
    onClick: () => void;
    variant?: 'primary' | 'standard';
}

export function SmartActionsRow() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const actions: ActionItem[] = [
        {
            id: 'log_rent',
            icon: Banknote,
            label: t('logPayment') || 'Log Rent',
            subLabel: t('quickAction') || 'Quick Action',
            gradient: 'from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30 border-emerald-500/20',
            onClick: () => navigate('/payments?action=log'),
            variant: 'primary'
        },
        {
            id: 'add_expense',
            icon: PlusCircle,
            label: t('addExpense') || 'Add Expense',
            gradient: 'from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 border-blue-500/20',
            onClick: () => navigate('/properties?tab=maintenance&action=log'),
            variant: 'standard'
        },
        {
            id: 'request_maintenance',
            icon: Wrench,
            label: t('maintenanceRequest') || 'Maintenance',
            gradient: 'from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 border-orange-500/20',
            onClick: () => navigate('/properties?tab=maintenance&action=new'),
            variant: 'standard'
        },
        {
            id: 'message_tenant',
            icon: MessageCircle,
            label: t('messageTenant') || 'Message',
            gradient: 'from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 border-violet-500/20',
            onClick: () => navigate('/contacts'), // Assuming contacts or similar
            variant: 'standard'
        }
    ];

    return (
        <div className="w-full overflow-x-auto pb-4 -mb-4 scrollbar-hide">
            <div className="flex items-center gap-3 min-w-max px-1">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className={cn(
                            "relative group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
                            "backdrop-blur-xl border shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95",
                            "bg-white/5 dark:bg-black/20", // Deep Glass Base
                            action.gradient
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-xl bg-white/10 text-white backdrop-blur-md",
                            "shadow-inner border border-white/10"
                        )}>
                            <action.icon className="w-5 h-5" />
                        </div>

                        <div className="flex flex-col items-start min-w-[80px]">
                            <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">
                                {action.label}
                            </span>
                            {action.subLabel && (
                                <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">
                                    {action.subLabel}
                                </span>
                            )}
                        </div>

                        {action.variant === 'primary' && (
                            <div className="absolute -top-1 -right-1">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
