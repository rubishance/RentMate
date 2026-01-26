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
                    properties (address, city)
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

            if (contract.tenants && contract.tenants.length > 0) {
                items.push({
                    label: t('tenantDisconnectedWarning'),
                    items: contract.tenants.map(t => t.name),
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
        <div className="pb-40 pt-16 space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800 shadow-minimal">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t('activeAgreements')}</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-foreground lowercase">
                        {t('contracts')}
                    </h1>
                </div>

                <button
                    onClick={() => navigate('/contracts/new')}
                    className="h-16 px-10 bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-premium-dark flex items-center justify-center gap-4"
                >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    {t('addContract')}
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-full w-fit mx-8 shadow-minimal overflow-x-auto hide-scrollbar">
                {(['active', 'all', 'archived'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all duration-500 whitespace-nowrap",
                            filter === f
                                ? "bg-white dark:bg-neutral-800 text-foreground shadow-premium"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t(f)}
                    </button>
                ))}
            </div>

            {/* Contracts List */}
            <div className="grid grid-cols-1 gap-6 px-8">
                {filteredContracts.length === 0 ? (
                    <div className="py-40 text-center space-y-10 animate-in fade-in duration-1000">
                        <div className="w-32 h-32 bg-slate-50 dark:bg-neutral-900 rounded-[3rem] flex items-center justify-center mx-auto shadow-minimal">
                            <FileText className="w-12 h-12 text-slate-200" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noContractsFound')}</h3>
                            <button
                                onClick={() => navigate('/contracts/new')}
                                className="px-10 py-4 bg-foreground text-background font-black text-[10px] uppercase tracking-widest rounded-full shadow-premium-dark hover:scale-105 transition-all"
                            >
                                {t('createFirstContract')}
                            </button>
                        </div>
                    </div>
                ) : (
                    filteredContracts.map((contract) => {
                        const isExpired = new Date(contract.end_date) < new Date(new Date().setHours(0, 0, 0, 0));
                        const tenantNames = Array.isArray(contract.tenants) ? contract.tenants.map(t => t.name).join(' & ') : '';

                        return (
                            <div
                                key={contract.id}
                                className={cn(
                                    "group p-10 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] shadow-minimal hover:shadow-premium transition-all duration-700 flex flex-col lg:flex-row items-center justify-between gap-10 cursor-pointer overflow-hidden relative",
                                    isExpired && "opacity-60 saturate-50 hover:opacity-100 hover:saturate-100"
                                )}
                                onClick={() => handleView(contract)}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-neutral-800/30 rounded-bl-[4rem] -translate-y-full group-hover:translate-y-0 transition-transform duration-1000 pointer-events-none" />

                                <div className="flex flex-col md:flex-row items-center gap-10 min-w-0 w-full lg:w-auto">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-neutral-800 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 border border-slate-100 dark:border-neutral-700">
                                        <FileText className="w-9 h-9 text-foreground" />
                                    </div>
                                    <div className="text-center md:text-left rtl:md:text-right min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                            <h3 className="text-3xl font-black tracking-tighter text-foreground lowercase truncate">{tenantNames || t('unnamedTenant')}</h3>
                                            {isExpired && (
                                                <span className="px-4 py-1 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 text-[9px] font-black uppercase tracking-widest rounded-full">{t('expired')}</span>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-base font-medium opacity-60 truncate">
                                            {contract.properties?.address}, {contract.properties?.city}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-16 w-full lg:w-auto">
                                    <div className="text-center md:text-right space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 block">{t('monthlyRent')}</span>
                                        <span className="text-2xl font-black tracking-tighter text-foreground">
                                            ₪{contract.base_rent?.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="text-center md:text-right space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 block">{t('endDate')}</span>
                                        <span className="text-xl font-black tracking-tight text-foreground lowercase">
                                            {formatDate(contract.end_date)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                                        <div className="h-12 w-[1px] bg-slate-100 dark:bg-neutral-800 hidden md:block mx-2" />
                                        <ActionMenu
                                            onView={() => handleView(contract)}
                                            onEdit={() => handleEdit(contract)}
                                            onDelete={() => handleDelete(contract)}
                                            onCalculate={() => handleCalculatePayments(contract)}
                                            align={lang === 'he' ? 'left' : 'right'}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ContractDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                contract={selectedContract}
                initialReadOnly={isReadOnly}
                onSuccess={fetchContracts}
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
