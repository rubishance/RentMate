import { FileText, Plus } from 'lucide-react';

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
        <div className="space-y-6 px-4 pt-6">
            <PageHeader
                title={t('contractsTitle')}
                subtitle={t('contractsSubtitle')}
                action={
                    <button
                        onClick={() => navigate('/contracts/new')}
                        className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2.5 rounded-xl hover:bg-brand-navy-light transition-all shadow-lg shadow-brand-navy/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">{t('newContract')}</span>
                    </button>
                }
            />

            {/* Tabs - Scrollable on mobile */}
            <div className="flex border-b border-gray-200 gap-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide">
                <button
                    onClick={() => setFilter('all')}
                    className={`pb-2.5 text-sm font-semibold transition-all relative whitespace-nowrap ${filter === 'all' ? 'text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {t('all')}
                    {filter === 'all' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-navy rounded-t-full shadow-[0_-2px_6px_rgba(15,23,42,0.2)]" />
                    )}
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`pb-2.5 text-sm font-semibold transition-all relative whitespace-nowrap ${filter === 'active' ? 'text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {t('active')}
                    {filter === 'active' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-navy rounded-t-full shadow-[0_-2px_6px_rgba(15,23,42,0.2)]" />
                    )}
                </button>
                <button
                    onClick={() => setFilter('archived')}
                    className={`pb-2.5 text-sm font-semibold transition-all relative whitespace-nowrap ${filter === 'archived' ? 'text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {t('archived')}
                    {filter === 'archived' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-navy rounded-t-full shadow-[0_-2px_6px_rgba(15,23,42,0.2)]" />
                    )}
                </button>
            </div>

            {/* List */}
            {filteredContracts.length === 0 ? (
                <div className="text-center py-12 bg-secondary/10 rounded-xl">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-medium">{t('noActiveContracts')}</h3>
                    <p className="text-muted-foreground text-sm">
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
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-navy flex items-center justify-center border border-blue-100 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg truncate">
                                        {contract.properties?.city}{contract.properties?.address ? `, ${contract.properties.address}` : ''}
                                    </h3>
                                    <div className="text-sm text-gray-500 flex flex-wrap gap-2 items-center mt-1">
                                        <span className="font-medium text-brand-navy truncate max-w-[150px]">{contract.tenants?.name}</span>
                                        <span className="hidden md:inline w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span className="font-mono text-xs whitespace-nowrap">
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
                            <div className="flex items-center justify-between w-full md:w-auto gap-4 pl-16 md:pl-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${contract.status === 'active'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}>
                                    {contract.status === 'active' ? t('active') : t('archived')}
                                </span>
                                <div onClick={(e) => e.stopPropagation()} className="border-l pl-3 border-gray-100">
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
