import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TagIcon,
    PencilSquareIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

const PlanManagement = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

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
        setEditingId(plan.id);
        setEditForm({ ...plan });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('subscription_plans')
                .update({
                    name: editForm.name,
                    price_monthly: parseFloat(editForm.price_monthly),
                    price_yearly: parseFloat(editForm.price_yearly),
                    max_properties: parseInt(editForm.max_properties),
                    max_tenants: parseInt(editForm.max_tenants),
                    features: editForm.features // Ensure this JSON matches your structure
                })
                .eq('id', editingId);

            if (error) throw error;

            setPlans(prev => prev.map(p => p.id === editingId ? { ...editForm } : p));
            setEditingId(null);
            alert('Plan updated successfully!');
        } catch (error: any) {
            console.error('Error updating plan:', error);
            alert('Update failed: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    // Helper to toggle a boolean feature in the JSON blob
    const toggleFeature = (featureKey: string) => {
        const currentFeatures = editForm.features || {};
        const newVal = !currentFeatures[featureKey];
        setEditForm((prev: any) => ({
            ...prev,
            features: {
                ...prev.features,
                [featureKey]: newVal
            }
        }));
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="px-4 pt-6 pb-20">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TagIcon className="w-6 h-6 text-brand-600" />
                        Plan Management
                    </h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
                        Adjust pricing, limits, and feature sets for subscription tiers.
                    </p>
                </div>
                <button
                    onClick={fetchPlans}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="Refresh Plans"
                >
                    <ArrowPathIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`
                            relative flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md
                            ${editingId === plan.id
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                                : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}
                        `}
                    >
                        {editingId === plan.id ? (
                            // EDIT MODE
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Plan Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Monthly ($)</label>
                                        <input
                                            type="number"
                                            value={editForm.price_monthly}
                                            onChange={e => handleChange('price_monthly', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Yearly ($)</label>
                                        <input
                                            type="number"
                                            value={editForm.price_yearly}
                                            onChange={e => handleChange('price_yearly', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Max Props (-1 = ∞)</label>
                                        <input
                                            type="number"
                                            value={editForm.max_properties}
                                            onChange={e => handleChange('max_properties', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Max Tenants</label>
                                        <input
                                            type="number"
                                            value={editForm.max_tenants}
                                            onChange={e => handleChange('max_tenants', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Features</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-white rounded border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Export Data</span>
                                            <input
                                                type="checkbox"
                                                checked={editForm.features?.export_data || false}
                                                onChange={() => toggleFeature('export_data')}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                        </div>
                                        {/* Add more feature toggles here as needed */}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={handleCancel}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                                        title="Cancel"
                                    >
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50"
                                        title="Save Changes"
                                    >
                                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircleIcon className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // VIEW MODE
                            <>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{plan.name}</h3>
                                    <button
                                        onClick={() => handleEdit(plan)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">${plan.price_monthly}</span>
                                    <span className="text-sm font-semibold text-gray-500">/mo</span>
                                </div>

                                <ul role="list" className="mt-6 space-y-4 text-sm text-gray-500 dark:text-gray-300 flex-1">
                                    <li className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        <span>{plan.max_properties === -1 ? 'Unlimited' : plan.max_properties} Properties</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        <span>{plan.max_tenants === -1 ? 'Unlimited' : plan.max_tenants} Tenants</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        {plan.features?.export_data ? (
                                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircleIcon className="h-5 w-5 text-gray-300" />
                                        )}
                                        <span className={!plan.features?.export_data ? 'text-gray-400 line-through' : ''}>Data Export</span>
                                    </li>
                                </ul>
                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 text-center">
                                    ID: {plan.id}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlanManagement;
