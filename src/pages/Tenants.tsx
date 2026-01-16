import { useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';
import { Phone, MessageCircle, Mail, User, Plus } from 'lucide-react';
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
                alert(lang === 'he'
                    ? 'לא ניתן למחוק דייר שיש לו חוזים או תשלומים מקושרים. יש למחוק אותם תחילה.'
                    : 'Cannot delete tenant associated with contracts or payments. Please delete them first.');
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
        <div className="space-y-6 pb-28 px-4 pt-6">
            <PageHeader
                title={lang === 'he' ? 'הדיירים שלי' : 'My Tenants'}
                subtitle={lang === 'he' ? 'ניהול ספר טלפונים ודיירים' : 'Manage your tenants and contacts'}
                icon={User}
                action={
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2.5 rounded-xl hover:bg-brand-navy-light transition-all shadow-lg shadow-brand-navy/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">{lang === 'he' ? 'הוסף דייר' : 'Add Tenant'}</span>
                    </button>
                }
            />

            {tenants.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center py-16 border-dashed border-2 bg-white/50">
                    <div className="p-4 bg-brand-navy/5 rounded-full mb-4">
                        <User className="w-8 h-8 text-brand-navy/40" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{lang === 'he' ? 'אין דיירים ברשימה' : 'No Tenants Found'}</h3>
                    <p className="text-gray-500 text-sm mb-6">{lang === 'he' ? 'הוסף דיירים כדי לנהל אותם בקלות' : 'Add your first tenant to get started'}</p>
                    <button
                        onClick={handleAdd}
                        className="text-brand-navy font-bold hover:underline text-sm">
                        {lang === 'he' ? '+ הוסף דייר חדש' : '+ Add New Tenant'}
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
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 text-brand-navy flex items-center justify-center font-bold text-sm shrink-0 border border-white shadow-sm">
                                    {getInitials(tenant.name)}
                                </div>

                                {/* Info */}
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{tenant.name}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        {tenant.phone || (lang === 'he' ? 'ללא טלפון' : 'No phone')}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {tenant.phone && (
                                    <>
                                        <a href={`tel:${tenant.phone}`} className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors" title="Call">
                                            <Phone className="w-4 h-4" />
                                        </a>
                                        <a href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors" title="WhatsApp">
                                            <MessageCircle className="w-4 h-4" />
                                        </a>
                                    </>
                                )}
                                {tenant.email && (
                                    <a href={`mailto:${tenant.email}`} className="p-2 rounded-full hover:bg-orange-50 text-orange-600 transition-colors" title="Email">
                                        <Mail className="w-4 h-4" />
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
