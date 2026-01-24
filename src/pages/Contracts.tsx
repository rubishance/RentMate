import { ContractsIcon as FileText, PlusIcon as Plus } from '../components/icons/NavIcons';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Contract } from '../types/database';
import { ActionMenu } from '../components/ui/ActionMenu';
import { ContractDetailsModal } from '../components/modals/ContractDetailsModal';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';
import { useTranslation } from '../hooks/useTranslation';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDataCache } from '../contexts/DataCacheContext';
import { formatDate, cn } from '../lib/utils';

interface ContractWithDetails extends Contract {
    properties: { address: string, city: string };
    tenants: { name: string };
}

export function Contracts() {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');
    const { get, set } = useDataCache();
    const CACHE_KEY = 'contracts_list';

    // Modal State
    const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(true);

    // Delete State
    const [deleteTarget, setDeleteTarget] = useState<ContractWithDetails | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [affectedItems, setAffectedItems] = useState<any[]>([]);

    useEffect(() => {
        fetchContracts();
    }, []);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        const contractId = searchParams.get('id');
        if (contractId && contracts.length > 0) {
            const target = contracts.find(c => c.id === contractId);
            if (target) {
                handleView(target);
            }
        }
    }, [contracts, searchParams]);

    async function fetchContracts() {
        const cached = get<ContractWithDetails[]>(CACHE_KEY);
        if (cached) {
            setContracts(cached);
            setLoading(false);
        }

        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    properties (address, city),
                    tenants (name)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching contracts:', error);
            } else if (data) {
                const contractsData = data as any;
                setContracts(contractsData);
                set(CACHE_KEY, contractsData);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredContracts = contracts.filter(contract => {
        const isExpired = new Date(contract.end_date) < new Date(new Date().setHours(0, 0, 0, 0));

        if (filter === 'all') return true;

        if (filter === 'active') {
            return contract.status === 'active' && !isExpired;
        }

        if (filter === 'archived') {
            return contract.status === 'archived' || isExpired;
        }

        return false;
    });

    const handleView = (contract: ContractWithDetails) => {
        setSelectedContract(contract);
        setIsReadOnly(true);
        setIsDetailsModalOpen(true);
    };

    const handleEdit = (contract: ContractWithDetails) => {
        setSelectedContract(contract);
        setIsReadOnly(false);
        setIsDetailsModalOpen(true);
    };

    const handleDelete = async (contract: ContractWithDetails) => {
        setDeleteTarget(contract);
        setAffectedItems([]);

        try {
            const { count: paymentCount } = await supabase
                .from('payments')
                .select('*', { count: 'exact', head: true })
                .eq('contract_id', contract.id);

            const items = [];

            if (contract.tenants?.name) {
                items.push({
                    label: t('tenantDisconnectedWarning'),
                    items: [contract.tenants.name],
                    type: 'info'
                });
            }

            if (paymentCount && paymentCount > 0) {
                items.push({
                    label: t('paymentsDeletedWarning'),
                    count: paymentCount,
                    type: 'critical'
                });
            }

            setAffectedItems(items);
            setIsDeleteModalOpen(true);
        } catch (err) {
            console.error('Error checking contract relations:', err);
            setIsDeleteModalOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            // Optional: delete payments explicitly if CASCADE is not set, 
            // but relying on CASCADE is better usually. Assuming manual cleanup here as per previous logic.
            await supabase.from('payments').delete().eq('contract_id', deleteTarget.id);
            const { error } = await supabase.from('contracts').delete().eq('id', deleteTarget.id);

            if (error) throw error;

            setContracts(prev => prev.filter(c => c.id !== deleteTarget.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting contract:', error);
            alert(`${t('error')}: ${error.message || 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleCalculatePayments = async (contract: ContractWithDetails) => {
        navigate('/calculator', {
            state: {
                contractData: {
                    baseRent: contract.base_rent,
                    linkageType: contract.linkage_type,
                    baseIndexDate: contract.base_index_date,
                    startDate: contract.start_date
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 pt-6">
            <PageHeader
                title={t('contractsTitle')}
                subtitle={t('contractsSubtitle')}
                action={
                    <Button
                        onClick={() => navigate('/contracts/new')}
                        size="icon"
                        className="rounded-full w-12 h-12 shadow-lg"
                        leftIcon={<Plus className="w-6 h-6" />}
                        aria-label={t('newContract')}
                    />
                }
            />

            {/* Tabs */}
            <div className="flex bg-muted/50 p-1 rounded-2xl w-fit">
                {(['active', 'archived', 'all'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            filter === f
                                ? "bg-white dark:bg-neutral-900 text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {f === 'active' ? t('active') : f === 'archived' ? t('archived') : t('all')}
                    </button>
                ))}
            </div>

            {/* List */}
            {filteredContracts.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-20 border-dashed border-2 bg-muted/20">
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-black text-foreground mb-2">{t('noActiveContracts')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto font-medium text-center">
                        {t('noActiveContractsDesc')}
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredContracts.map((contract) => {
                        const isExpired = new Date(contract.end_date) < new Date(new Date().setHours(0, 0, 0, 0));
                        return (
                            <Card
                                key={contract.id}
                                onClick={() => handleView(contract)}
                                hoverEffect
                                className={cn(
                                    "p-5 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group gap-4 md:gap-0",
                                    isExpired && "opacity-60 grayscale"
                                )}
                            >
                                <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className="w-14 h-14 rounded-2xl bg-muted text-foreground flex items-center justify-center border border-border group-hover:scale-105 transition-transform shrink-0">
                                        <FileText className="w-7 h-7" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <h3 className="font-black text-foreground text-lg tracking-tight truncate">
                                            {contract.properties?.city}{contract.properties?.address ? `, ${contract.properties.address}` : ''}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-xs font-bold text-muted-foreground truncate max-w-[150px]">{contract.tenants?.name}</span>
                                            <span className="hidden md:inline w-1 h-1 rounded-full bg-border" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                {(() => {
                                                    const start = new Date(contract.start_date);
                                                    const end = new Date(contract.end_date);
                                                    const diffTime = Math.abs(end.getTime() - start.getTime());
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                                    const months = Math.floor(diffDays / 30);
                                                    const years = Math.floor(months / 12);
                                                    const remainingMonths = months % 12;

                                                    let duration = '';
                                                    if (years > 0) duration = `${years}y${remainingMonths > 0 ? ` ${remainingMonths}m` : ''}`;
                                                    else if (months > 0) duration = `${months}m`;
                                                    else duration = `${diffDays}d`;

                                                    return `${duration} (${formatDate(contract.end_date)})`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full md:w-auto gap-6 pl-20 md:pl-0">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm",
                                        contract.status === 'active' && !isExpired
                                            ? "bg-green-50 dark:bg-green-950 text-green-600 border-green-100 dark:border-green-900"
                                            : "bg-muted text-muted-foreground border-border"
                                    )}>
                                        {contract.status === 'active' && !isExpired ? t('active') : t('archived')}
                                    </span>
                                    <div onClick={(e) => e.stopPropagation()} className="border-l pl-4 border-border">
                                        <ActionMenu
                                            align={lang === 'he' ? 'left' : 'right'}
                                            onView={() => handleView(contract)}
                                            onEdit={() => handleEdit(contract)}
                                            onDelete={() => handleDelete(contract)}
                                            onCalculate={() => handleCalculatePayments(contract)}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <ContractDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                onSuccess={fetchContracts}
                contract={selectedContract}
                initialReadOnly={isReadOnly}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('deleteContractTitle')}
                message={t('deleteContractMessage')}
                isDeleting={isDeleting}
                affectedItems={affectedItems}
                requireDoubleConfirm={affectedItems.length > 0}
            />
        </div>
    );
}
