import { useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';
import { PhoneIcon as Phone, MailIcon as Mail, UserIcon as User, PlusIcon as Plus } from '../components/icons/NavIcons';
import { MessageIcon as MessageCircle } from '../components/icons/MessageIcons';
import { supabase } from '../lib/supabase';
import type { Tenant } from '../types/database';
import { AddTenantModal } from '../components/modals/AddTenantModal';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';
import { useTranslation } from '../hooks/useTranslation';
import { PageHeader } from '../components/common/PageHeader';
import { GlassCard } from '../components/common/GlassCard';

export function Tenants() {
    const { t, lang } = useTranslation();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Delete State
    const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAdd = () => {
        setEditingTenant(null);
        setIsReadOnly(false);
        setIsAddModalOpen(true);
    };

    const handleView = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setIsReadOnly(true);
        setIsAddModalOpen(true);
    };

    const handleEdit = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setIsReadOnly(false);
        setIsAddModalOpen(true);
    };

    const handleDelete = (tenant: Tenant) => {
        setDeleteTarget(tenant);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('tenants')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;

            setTenants(prev => prev.filter(t => t.id !== deleteTarget.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting tenant:', error);
            if (error.code === '23503') {
                alert(t('deleteTenantError'));
            } else {
                alert(`${t('error')}: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        const tenantId = searchParams.get('id');
        if (tenantId && tenants.length > 0) {
            const target = tenants.find(t => t.id === tenantId);
            if (target) {
                handleView(target);
            }
        }
    }, [tenants, searchParams]);

    async function fetchTenants() {
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
            } else if (data) {
                setTenants(data as Tenant[]);
            }
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const getInitials = (name: string) => {
        return (name || 'Unknown')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="space-y-6 px-2 pt-6">
            <PageHeader
                title={t('myTenants')}
                subtitle={t('manageTenantsDesc')}
                action={
                    <button
                        onClick={handleAdd}
                        className="bg-black dark:bg-white text-white dark:text-black p-3.5 rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center"
                        aria-label={t('addTenant')}
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                }
            />

            {tenants.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center py-16 border-dashed border-2 bg-white/50">
                    <div className="p-4 bg-brand-navy/5 rounded-full mb-4">
                        <User className="w-8 h-8 text-brand-navy/40" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{t('noTenantsFound')}</h3>
                    <p className="text-muted-foreground text-sm mb-6">{t('addFirstTenantDesc')}</p>
                    <button
                        onClick={handleAdd}
                        className="text-brand-navy font-bold hover:underline text-sm">
                        {t('addNewTenant')}
                    </button>
                </GlassCard>
            ) : (
                <div className="grid gap-3">
                    {tenants.map((tenant) => (
                        <GlassCard
                            key={tenant.id}
                            onClick={() => handleView(tenant)}
                            hoverEffect
                            className="p-4 flex items-center justify-between cursor-pointer group"
                        >
                            <div className="flex items-center gap-6">
                                {/* Avatar */}
                                <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-black text-sm shrink-0 border border-gray-100 dark:border-neutral-700 shadow-sm transition-all group-hover:scale-105">
                                    {getInitials(tenant.name)}
                                </div>

                                {/* Info */}
                                <div className="space-y-1">
                                    <h3 className="font-black text-black dark:text-white text-lg tracking-tight">{tenant.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                        {tenant.phone || t('noPhone')}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                {tenant.phone && (
                                    <>
                                        <a href={`tel:${tenant.phone}`} className="p-3 rounded-2xl bg-gray-50 dark:bg-neutral-800 text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm" title="Call">
                                            <Phone className="w-5 h-5" />
                                        </a>
                                        <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm font-bold flex items-center justify-center" title="WhatsApp">
                                            <MessageCircle className="w-5 h-5" />
                                        </a>
                                    </>
                                )}
                                {tenant.email && (
                                    <a href={`mailto:${tenant.email}`} className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm font-bold flex items-center justify-center" title="Email">
                                        <Mail className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            <AddTenantModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchTenants}
                tenantToEdit={editingTenant}
                readOnly={isReadOnly}
                onDelete={() => editingTenant && handleDelete(editingTenant)}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('delete') + ' ' + t('tenants')}
                message={t('deleteConfirmation') || "Are you sure you want to delete this tenant?"}
                isDeleting={isDeleting}
            />
        </div>
    );
}
