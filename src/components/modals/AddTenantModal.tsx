import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserIcon as User, MailIcon as Mail, PhoneIcon as Phone, AssetsIcon as Building2, CreditCardIcon as CreditCard, EditIcon as Pen, TrashIcon as Trash2 } from '../icons/NavIcons';
import { CloseIcon as X, LoaderIcon as Loader2 } from '../icons/MessageIcons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useSubscription } from '../../hooks/useSubscription';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { FormLabel } from '../ui/FormLabel';
import type { Tenant, Property } from '../../types/database';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantToEdit?: Tenant | null;
    readOnly?: boolean;
    onDelete?: () => void;
}

export function AddTenantModal({ isOpen, onClose, onSuccess, tenantToEdit, readOnly, onDelete }: AddTenantModalProps) {
    const { t, lang } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoadingProperties, setIsLoadingProperties] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Internal read-only state
    const [isReadOnly, setIsReadOnly] = useState(readOnly);

    // Subscription Check
    const { canAddTenant, loading: subLoading, plan } = useSubscription();

    const [formData, setFormData] = useState({
        name: '',
        id_number: '',
        email: '',
        phone: '',
        property_id: ''
    });

    useEffect(() => {
        setIsReadOnly(readOnly);
    }, [readOnly]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchProperties();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && tenantToEdit) {
            setFormData({
                name: tenantToEdit.name,
                id_number: tenantToEdit.id_number || '',
                email: tenantToEdit.email || '',
                phone: tenantToEdit.phone || '',
                property_id: tenantToEdit.property_id || ''
            });
        } else if (isOpen && !tenantToEdit) {
            setFormData({
                name: '',
                id_number: '',
                email: '',
                phone: '',
                property_id: ''
            });
        }
    }, [isOpen, tenantToEdit, readOnly]);

    async function fetchProperties() {
        try {
            setIsLoadingProperties(true);
            const { data, error } = await supabase
                .from('properties')
                .select('*') // Fetch all fields to satisfy Property type
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProperties(data || []);
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setIsLoadingProperties(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) {
            onClose();
            return;
        }

        // Limit Check
        if (!tenantToEdit && !canAddTenant) {
            setError(t('planLimitReachedTenantDesc', { planName: plan?.name || '' }));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error(t('mustBeLoggedIn'));

            // Validation
            if (!formData.name || !formData.phone) {
                throw new Error(t('namePhoneRequired'));
            }
            // Property is now optional


            const payload = {
                name: formData.name,
                id_number: formData.id_number,
                email: formData.email,
                phone: formData.phone,
                property_id: formData.property_id || null,
                user_id: user.id
            };

            let error;

            if (tenantToEdit) {
                const { user_id, ...updatePayload } = payload;
                const { error: updateError } = await supabase
                    .from('tenants')
                    .update(updatePayload)
                    .eq('id', tenantToEdit.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('tenants')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            onSuccess();
            onClose();
            setFormData({
                name: '',
                email: '',
                id_number: '',
                phone: '',
                property_id: ''
            });

        } catch (err: any) {
            console.error('Error saving tenant:', err);
            setError(err.message || 'Failed to save tenant');
        } finally {
            setLoading(false);
        }
    };

    const isEditMode = !!tenantToEdit;

    const getTitle = () => {
        if (isReadOnly) return t('viewTenantDetails');
        if (isEditMode) return t('editTenant');
        return t('addTenant'); // "Add New Tenant" in English, "Add Tenant" in Hebrew
    };

    const getSubtitle = () => {
        if (isReadOnly) return t('viewContactInfo');
        if (isEditMode) return t('updateTenantDetails');
        return t('addTenantToContacts');
    };

    const title = getTitle();
    const subtitle = getSubtitle();

    if (!isOpen) return null;

    const modalFooter = (
        <div className="flex gap-3 w-full">
            {isReadOnly ? (
                <>
                    {onDelete && (
                        <Button
                            variant="destructive"
                            onClick={() => { onClose(); onDelete(); }}
                            leftIcon={<Trash2 className="w-4 h-4" />}
                        >
                            {t('delete')}
                        </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                        variant="secondary"
                        onClick={() => setIsReadOnly(false)}
                        leftIcon={<Pen className="w-4 h-4" />}
                    >
                        {t('edit')}
                    </Button>
                    <Button onClick={onClose}>
                        {t('close')}
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="ghost" className="flex-1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form="add-tenant-form"
                        className="flex-1"
                        isLoading={loading}
                        disabled={!tenantToEdit && !canAddTenant}
                    >
                        {isEditMode ? t('saveChanges') : t('addTenant')}
                    </Button>
                </>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={subtitle}
            footer={modalFooter}
            size="md"
        >
            <div className="space-y-6">
                {!isReadOnly && !tenantToEdit && !canAddTenant && !subLoading && (
                    <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50">
                        <CardContent className="p-4 flex items-start gap-3">
                            <User className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm text-orange-800 dark:text-orange-400">{t('planLimitReached')}</h4>
                                <p className="text-xs text-orange-700 dark:text-orange-500 mt-1">
                                    {t('planLimitReachedTenantDesc', { planName: plan?.name || '' })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/50 font-bold uppercase tracking-tight">
                        <X className="w-4 h-4" /> {error}
                    </div>
                )}

                <form id="add-tenant-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* Property Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('assignedAsset')} ({t('optional')})</label>
                            {properties.length > 0 ? (
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <select
                                        disabled={isReadOnly || isLoadingProperties}
                                        value={formData.property_id}
                                        onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none font-medium text-sm"
                                        aria-label={t('assignedAsset')}
                                    >
                                        <option value="">{t('selectProperty')}</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.address}, {p.city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="p-4 bg-secondary/50 rounded-2xl text-sm flex flex-col gap-2 border border-border">
                                    <p className="text-muted-foreground font-medium">{t('noAssetsFoundDesc')}</p>
                                    {!readOnly && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.location.href = '/properties'}
                                            className="w-fit h-8 text-xs"
                                        >
                                            {t('goToAssetsPage')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('fullName')}</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    required
                                    disabled={isReadOnly}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* ID Number */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('idNumber')}</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    value={formData.id_number}
                                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('phone')}</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="tel"
                                        required
                                        disabled={isReadOnly}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    />
                                </div>
                            </div>
                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        disabled={isReadOnly}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
