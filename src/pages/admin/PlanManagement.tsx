import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TagIcon,
    PencilSquareIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    PlusIcon,
    TrashIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

const PlanManagement = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const defaultPlan: any = {
        name: 'New Plan',
        price_monthly: 0,
        price_yearly: 0,
        max_properties: 1,
        max_tenants: 1,
        max_contracts: 1,
        max_sessions: 10,
        max_storage_mb: 100,
        max_media_mb: 50,
        max_utilities_mb: 20,
        max_maintenance_mb: 20,
        max_documents_mb: 10,
        max_file_size_mb: 5,
        features: {
            export_data: false,
            ai_analysis: false,
            priority_support: false,
            custom_reports: false
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price_monthly', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
            alert('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (plan: any) => {
        setIsCreating(false);
        setEditingId(plan.id);
        // Ensure features is an object
        const features = typeof plan.features === 'string'
            ? JSON.parse(plan.features)
            : (plan.features || defaultPlan.features);
        setEditForm({ ...plan, features });
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setEditingId('new');
        setEditForm({ ...defaultPlan });
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreating(false);
        setEditForm({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const planData = {
                name: editForm.name,
                price_monthly: parseFloat(editForm.price_monthly) || 0,
                price_yearly: parseFloat(editForm.price_yearly) || 0,
                max_properties: parseInt(editForm.max_properties) || 0,
                max_tenants: parseInt(editForm.max_tenants) || 0,
                max_contracts: parseInt(editForm.max_contracts) || 0,
                max_sessions: parseInt(editForm.max_sessions) || 0,
                max_storage_mb: parseInt(editForm.max_storage_mb) || 0,
                max_media_mb: parseInt(editForm.max_media_mb) || 0,
                max_utilities_mb: parseInt(editForm.max_utilities_mb) || 0,
                max_maintenance_mb: parseInt(editForm.max_maintenance_mb) || 0,
                max_documents_mb: parseInt(editForm.max_documents_mb) || 0,
                max_file_size_mb: parseInt(editForm.max_file_size_mb) || 0,
                features: editForm.features || defaultPlan.features
            };

            if (isCreating) {
                const { data, error } = await supabase
                    .from('subscription_plans')
                    .insert([planData])
                    .select();

                if (error) throw error;
                if (data) setPlans(prev => [...prev, data[0]]);
                setIsCreating(false);
                setEditingId(null);
                alert('Plan created successfully!');
            } else {
                const { error } = await supabase
                    .from('subscription_plans')
                    .update(planData)
                    .eq('id', editingId);

                if (error) throw error;
                setPlans(prev => prev.map(p => p.id === editingId ? { ...p, ...planData } : p));
                setEditingId(null);
                alert('Plan updated successfully!');
            }
        } catch (error: any) {
            console.error('Error saving plan:', error);
            alert('Save failed: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (planId: string, planName: string) => {
        if (!window.confirm(`Are you sure you want to delete the "${planName}" plan? This may affect users subscribed to it.`)) return;

        try {
            const { error } = await supabase
                .from('subscription_plans')
                .delete()
                .eq('id', planId);

            if (error) throw error;
            setPlans(prev => prev.filter(p => p.id !== planId));
            alert('Plan deleted successfully');
        } catch (error: any) {
            console.error('Error deleting plan:', error);
            alert('Delete failed: ' + error.message);
        }
    };

    const handleChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const toggleFeature = (featureKey: string) => {
        const currentFeatures = editForm.features || {};
        setEditForm((prev: any) => ({
            ...prev,
            features: {
                ...currentFeatures,
                [featureKey]: !currentFeatures[featureKey]
            }
        }));
    };

    const renderPriceField = (label: string, field: string) => (
        <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₪</span>
                <input
                    type="number"
                    value={editForm[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    className="pl-8 block w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-bold text-gray-900 dark:text-white sm:text-sm"
                />
            </div>
        </div>
    );

    const renderLimitField = (label: string, field: string, suffix: string = '') => (
        <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
            <div className="relative">
                <input
                    type="number"
                    value={editForm[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    className="block w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-bold text-gray-900 dark:text-white sm:text-sm"
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">{suffix}</span>
                )}
            </div>
        </div>
    );

    const FeatureToggle = ({ featureKey, label }: { featureKey: string, label: string }) => {
        const isActive = editForm.features?.[featureKey];
        return (
            <button
                onClick={() => toggleFeature(featureKey)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isActive
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                    }`}
            >
                <span className={`text-xs font-black uppercase tracking-tight ${isActive ? 'text-brand-700 dark:text-brand-400' : 'text-gray-400'}`}>
                    {label}
                </span>
                {isActive ? (
                    <CheckCircleIcon className="w-5 h-5 text-brand-600" />
                ) : (
                    <XCircleIcon className="w-5 h-5 text-gray-300" />
                )}
            </button>
        );
    };

    if (loading) return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <TagIcon className="w-8 h-8 text-brand-600" />
                        Plan Management
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Configure pricing, limits, and features for each subscription tier.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateNew}
                        disabled={isCreating}
                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50"
                    >
                        <PlusIcon className="w-5 h-5" />
                        New Plan
                    </button>
                    <button
                        onClick={fetchPlans}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                        title="Refresh Plans"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Editing / Creating Card */}
            {(isCreating || editingId) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-500 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-brand-50/50 dark:bg-brand-900/10 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {isCreating ? '📦 Create New Plan' : '✏️ Edit Subscription Plan'}
                            </h2>
                            <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-1">
                                {isCreating ? 'Define a new tier for your users' : `Modifying settings for ${editForm.name}`}
                            </p>
                        </div>
                        <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <XCircleIcon className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="p-8 space-y-10">
                        {/* Basic Info Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Display Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-black text-lg text-gray-900 dark:text-white"
                                    placeholder="e.g. ULTIMATE"
                                />
                            </div>
                            {renderPriceField('Monthly Billing', 'price_monthly')}
                            {renderPriceField('Yearly Billing', 'price_yearly')}
                        </div>

                        {/* Limits Section */}
                        <div>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="h-px bg-gray-100 dark:bg-gray-700 flex-1"></span>
                                Usage Quotas & Limits
                                <span className="h-px bg-gray-100 dark:bg-gray-700 flex-1"></span>
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {renderLimitField('Max Assets', 'max_properties')}
                                {renderLimitField('Max Tenants', 'max_tenants')}
                                {renderLimitField('Max Contracts', 'max_contracts')}
                                {renderLimitField('Max AI Sessions', 'max_sessions')}
                                {renderLimitField('Cloud Storage', 'max_storage_mb', 'MB')}
                                {renderLimitField('Media Limit', 'max_media_mb', 'MB')}
                                {renderLimitField('Utility Docs', 'max_utilities_mb', 'MB')}
                                {renderLimitField('Maint. Records', 'max_maintenance_mb', 'MB')}
                                {renderLimitField('Misc Docs', 'max_documents_mb', 'MB')}
                                {renderLimitField('Single File Size', 'max_file_size_mb', 'MB')}
                            </div>
                        </div>

                        {/* Features Section */}
                        <div>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="h-px bg-gray-100 dark:bg-gray-700 flex-1"></span>
                                Premium Features
                                <span className="h-px bg-gray-100 dark:bg-gray-700 flex-1"></span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FeatureToggle featureKey="export_data" label="Data Export" />
                                <FeatureToggle featureKey="ai_analysis" label="AI Analysis" />
                                <FeatureToggle featureKey="priority_support" label="Priority Support" />
                                <FeatureToggle featureKey="custom_reports" label="Custom Reports" />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={handleCancel}
                                className="px-8 py-3 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-all"
                            >
                                Discard Changes
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-3 px-10 py-3 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-brand-600/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                {isCreating ? 'Publish Plan' : 'Update Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plans List */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {plans.length === 0 ? (
                    <div className="lg:col-span-3 py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
                        <TagIcon className="w-16 h-16 mx-auto mb-4 text-gray-100 dark:text-gray-700" />
                        <p className="font-black text-gray-400 uppercase tracking-widest">No subscription plans defined yet.</p>
                    </div>
                ) : (
                    plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`
                                relative flex flex-col rounded-3xl border-2 p-8 transition-all duration-300
                                ${editingId === plan.id
                                    ? 'bg-brand-50/20 dark:bg-brand-900/10 border-brand-500 shadow-2xl opacity-50 scale-95 pointer-events-none'
                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-900 hover:shadow-xl'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{plan.name}</h3>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-gray-900 dark:text-white">₪{plan.price_monthly}</span>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/ Month</span>
                                    </div>
                                    <div className="text-[10px] font-black text-brand-600 mt-1 uppercase tracking-widest">
                                        ₪{plan.price_yearly} Yearly Billing
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(plan)}
                                        className="p-3 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all"
                                        title="Edit Plan"
                                    >
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan.id, plan.name)}
                                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all"
                                        title="Delete Plan"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assets</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_properties === -1 ? 'Unlimited' : plan.max_properties}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tenants</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_tenants === -1 ? 'Unlimited' : plan.max_tenants}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cloud</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_storage_mb === -1 ? 'Unlimited' : `${(plan.max_storage_mb / 1024).toFixed(1)}GB`}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Help</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_sessions} SESS</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {Object.entries(plan.features || {}).map(([key, value]) => value ? (
                                        <div key={key} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            {key.replace('_', ' ')}
                                        </div>
                                    ) : null)}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 -mx-8 -mb-8 px-8 py-6 rounded-b-3xl">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Integrity</div>
                                <div className="text-[10px] font-mono font-bold text-gray-500">ID: {plan.id.slice(0, 8)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PlanManagement;
