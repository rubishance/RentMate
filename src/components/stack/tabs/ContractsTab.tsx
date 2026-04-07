import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Contract } from '../../../types/database';
import { useTranslation } from '../../../hooks/useTranslation';
import { CalendarIcon, UserIcon, FileTextIcon, ArchiveIcon, CheckCircle2Icon, ClockIcon, CalendarPlus } from 'lucide-react';
import { cn, formatDate } from '../../../lib/utils';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '../../ui/Skeleton';
import { getContractStatusConfig } from '../../../constants/statusConfig';
import { EmptyState } from '../../common/EmptyState';
interface ContractsTabProps {
    propertyId: string;
    onAddContract?: () => void;
}

export function ContractsTab({ propertyId, onAddContract }: ContractsTabProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContracts = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('property_id', propertyId)
                .eq('user_id', user.id)
                .order('start_date', { ascending: false });

            if (error) {
                console.error('Error fetching contracts:', error);
            } else {
                setContracts(data || []);
            }
            setLoading(false);
        };

        fetchContracts();
    }, [propertyId]);

    const activeContracts = contracts.filter(c => c.status === 'active');
    const archivedContracts = contracts.filter(c => c.status === 'archived');

    const handleViewContract = (contract: Contract) => {
        navigate(`/contracts/${contract.id}`);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="w-full h-32 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 p-4 sm:p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="w-16 h-3" />
                                    <Skeleton className="w-32 h-5" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Skeleton className="w-20 h-6" />
                                <Skeleton className="w-12 h-3" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-50 dark:border-neutral-700/50 flex justify-between">
                            <Skeleton className="w-32 h-4" />
                            <Skeleton className="w-16 h-4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (contracts.length === 0) {
        return (
            <div className="py-8">
                <EmptyState
                    icon={FileTextIcon}
                    title={t('noActiveContracts')}
                    description={t('addContractDesc')}
                    actionLabel={t('addContract')}
                    onAction={onAddContract || (() => {})}
                />
            </div>
        );
    }

    const ContractCard = ({ contract }: { contract: Contract }) => {
        const tenant = Array.isArray(contract.tenants) ? contract.tenants[0] : (contract as any).tenants;
        const tenantName = tenant?.name || tenant?.full_name || t('unnamed');
        const config = getContractStatusConfig(contract.status);
        const isActive = contract.status === 'active';

        const formatOptionPeriod = (opt: any, idx: number) => {
            if (!opt.endDate) return '';
            const dateStr = format(parseISO(opt.endDate), 'dd/MM/yyyy');
            return lang === 'he' ? `אופציה ${idx + 1}: ${dateStr}` : `Option ${idx + 1}: ${dateStr}`;
        };

        return (
            <button
                onClick={() => handleViewContract(contract)}
                className="w-full text-left p-4 sm:p-6 bg-white dark:bg-neutral-800 rounded-2xl border border-slate-100 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            config.bg,
                            config.color
                        )}>
                            {isActive ? <CheckCircle2Icon className="w-5 h-5" /> : <ArchiveIcon className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                                {tenantName}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-black text-foreground">
                            ₪{contract.base_rent?.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-slate-50 dark:border-neutral-700/50">
                    <div className={cn(
                        "flex items-center gap-2 text-xs font-medium text-muted-foreground",
                        contract.actual_end_date && "line-through opacity-70 decoration-slate-300 dark:decoration-neutral-600"
                    )}>
                        <CalendarIcon className="w-3.5 h-3.5 opacity-50" />
                        {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                    </div>
                    {contract.actual_end_date && (
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-500/10 w-fit px-2 py-1 rounded-md">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {lang === 'he' ? 'סיום מוקדם:' : 'Early End:'} {formatDate(contract.actual_end_date)}
                        </div>
                    )}
                </div>

                {contract.option_periods && contract.option_periods.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-slate-50 dark:border-neutral-700/50 flex flex-col items-start">
                        <div className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground mb-2">
                            {lang === 'he' ? 'אופציות הארכה' : 'Extension Options'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {contract.option_periods.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2.5 py-1 bg-primary/5 dark:bg-blue-500/10 rounded-lg text-xs font-bold text-primary dark:text-blue-400">
                                    <CalendarPlus className="w-3.5 h-3.5" />
                                    {formatOptionPeriod(opt, idx)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-8 w-full">
            {activeContracts.length > 0 && (
                <div className="space-y-4">
                    <h3 className={cn(
                        "text-xs font-black uppercase tracking-widest ml-1",
                        getContractStatusConfig('active').color
                    )}>
                        {t(getContractStatusConfig('active').labelKey as any)}
                    </h3>
                    <div className="space-y-3">
                        {activeContracts.map(c => <ContractCard key={c.id} contract={c} />)}
                    </div>
                </div>
            )}

            {archivedContracts.length > 0 && (
                <div className="space-y-4">
                    <h3 className={cn(
                        "text-xs font-black uppercase tracking-widest ml-1",
                        getContractStatusConfig('archived').color
                    )}>
                        {t(getContractStatusConfig('archived').labelKey as any)}
                    </h3>
                    <div className="space-y-3">
                        {archivedContracts.map(c => <ContractCard key={c.id} contract={c} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
