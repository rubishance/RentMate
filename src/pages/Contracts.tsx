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
import { GlassCard } from '../components/common/GlassCard';

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
                setContracts(data as any);
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
        <div className="space-y-6 px-2 pt-6">
            <PageHeader
                title={t('contractsTitle')}
                subtitle={t('contractsSubtitle')}
                action={
                    <button
                        onClick={() => navigate('/contracts/new')}
                        className="bg-black dark:bg-white text-white dark:text-black p-3.5 rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center"
                        aria-label={t('newContract')}
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                }
            />

            {/* Tabs - Scrollable on mobile */}
            <div className="flex border-b border-gray-100 dark:border-neutral-800 gap-8 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide">
                <button
                    onClick={() => setFilter('all')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${filter === 'all' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'}`}
                >
                    {t('all')}
                    {filter === 'all' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${filter === 'active' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'}`}
                >
                    {t('active')}
                    {filter === 'active' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setFilter('archived')}
                    className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${filter === 'archived' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white'}`}
                >
                    {t('archived')}
                    {filter === 'archived' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-t-full" />
                    )}
                </button>
            </div>

            {/* List */}
            {filteredContracts.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2rem]">
                    <div className="w-20 h-20 bg-white dark:bg-neutral-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white mb-2">{t('noActiveContracts')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto font-medium">
                        {t('noActiveContractsDesc')}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredContracts.map((contract) => (
                        <GlassCard
                            key={contract.id}
                            onClick={() => handleView(contract)}
                            hoverEffect
                            className="bg-white/60 p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer group gap-4 md:gap-0"
                        >
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="w-14 h-14 rounded-[1.25rem] bg-gray-50 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center border border-gray-100 dark:border-neutral-700 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h3 className="font-black text-black dark:text-white text-lg tracking-tight truncate">
                                        {contract.properties?.city}{contract.properties?.address ? `, ${contract.properties.address}` : ''}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{contract.tenants?.name}</span>
                                        <span className="hidden md:inline w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-700"></span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
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

                                                return `${duration} (${new Date(contract.end_date).toLocaleDateString()})`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between w-full md:w-auto gap-6 pl-20 md:pl-0">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${contract.status === 'active'
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-100 dark:border-green-900/40'
                                    : 'bg-gray-50 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-neutral-700'
                                    }`}>
                                    {contract.status === 'active' ? t('active') : t('archived')}
                                </span>
                                <div onClick={(e) => e.stopPropagation()} className="border-l pl-4 border-gray-100 dark:border-neutral-800">
                                    <ActionMenu
                                        align={lang === 'he' ? 'left' : 'right'}
                                        onView={() => handleView(contract)}
                                        onEdit={() => handleEdit(contract)}
                                        onDelete={() => handleDelete(contract)}
                                        onCalculate={() => handleCalculatePayments(contract)}
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    ))}
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
