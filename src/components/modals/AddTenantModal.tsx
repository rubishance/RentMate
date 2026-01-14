import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, Loader2, Building2, CreditCard, Pen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useSubscription } from '../../hooks/useSubscription';
import { FormLabel } from '../ui/FormLabel';
import type { Tenant, Property } from '../../types/database';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantToEdit?: Tenant | null;
    readOnly?: boolean;
}

export function AddTenantModal({ isOpen, onClose, onSuccess, tenantToEdit, readOnly }: AddTenantModalProps) {
    const { lang } = useTranslation();
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
            setError(`You have reached the maximum number of tenants for your plan (${plan?.name}). Upgrade to add more.`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in to add a tenant');

            // Validation
            if (!formData.name || !formData.phone) {
                throw new Error('Name and Phone are required');
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
    const title = isReadOnly ? (lang === 'he' ? 'פרטי דייר' : 'View Tenant Details') : (isEditMode ? (lang === 'he' ? 'ערוך דייר' : 'Edit Tenant') : (lang === 'he' ? 'הוסף דייר' : 'Add New Tenant'));
    const subtitle = isReadOnly ? (lang === 'he' ? 'צפה בפרטי הקשר' : 'View contact information') : (isEditMode ? (lang === 'he' ? 'עדכן פרטי דייר' : 'Update tenant details') : (lang === 'he' ? 'הוסף דייר חדש לאנשי הקשר' : 'Add a new tenant to your contacts'));

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            {title}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isReadOnly && (
                            <button
                                onClick={() => setIsReadOnly(false)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors flex items-center gap-2 px-3 bg-blue-50/50"
                            >
                                <Pen className="w-4 h-4" />
                                <span className="text-sm font-medium">{lang === 'he' ? 'ערוך' : 'Edit'}</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {!isReadOnly && !tenantToEdit && !canAddTenant && !subLoading && (
                        <div className="p-4 mb-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg flex items-start gap-3">
                            <div className="p-1 bg-orange-100 rounded-full shrink-0">
                                <User className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Plan Limit Reached</h4>
                                <p className="text-xs mt-1">
                                    You have reached the maximum number of tenants for your <b>{plan?.name}</b> plan.
                                    Please upgrade your subscription.
                                </p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                            <X className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Property Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Asset (Optional)</label>
                            {properties.length > 0 ? (
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        disabled={isReadOnly || isLoadingProperties}
                                        value={formData.property_id}
                                        onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                                    >
                                        <option value="">Select Property</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.address}, {p.city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm flex flex-col gap-2">
                                    <p>No assets found. You must create an asset before adding a tenant.</p>
                                    {!readOnly && (
                                        <a href="/properties" className="font-medium underline hover:text-yellow-900 dark:hover:text-yellow-100 w-fit">
                                            Go to Assets Page
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Name */}
                        <div className="space-y-2">
                            <FormLabel label="Full Name" required readOnly={isReadOnly} />
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    disabled={isReadOnly}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* ID Number */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ID Number</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    value={formData.id_number}
                                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    disabled={isReadOnly}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <FormLabel label="Phone Number" required readOnly={isReadOnly} />
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="tel"
                                    required
                                    disabled={isReadOnly}
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white dark:bg-gray-800 z-10 pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-700 -mx-6 px-6 -mb-6 pb-6 mt-6">
                        {isReadOnly ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
                            >
                                {lang === 'he' ? 'סגור' : 'Close'}
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                                >
                                    {lang === 'he' ? 'ביטול' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (!tenantToEdit && !canAddTenant)}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {loading ? (isEditMode ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'מוסיף...' : 'Adding...')) : (isEditMode ? (lang === 'he' ? 'שמור שינויים' : 'Save Changes') : (lang === 'he' ? 'הוסף דייר' : 'Add Tenant'))}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
        , document.body);
}
