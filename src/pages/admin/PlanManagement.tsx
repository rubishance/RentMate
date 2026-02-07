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
} from '@heroicons/react/24/outline';
import { Loader2, Star, Zap, Shield, Check } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { motion } from 'framer-motion';

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string | null;
    subtitle: string | null;
    badge_text: string | null;
    cta_text: string | null;
    sort_order: number;
    price_monthly: number;
    price_yearly: number;
    max_properties: number;
    max_contracts: number;
    max_sessions: number;
    max_whatsapp_messages: number;
    max_storage_mb: number;
    max_media_mb: number;
    max_utilities_mb: number;
    max_maintenance_mb: number;
    max_documents_mb: number;
    max_file_size_mb: number;
    features: Record<string, boolean>;
    is_active: boolean;
    created_at?: string;
}
const PlanManagement = () => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});
    const [saving, setSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const defaultPlan: Omit<SubscriptionPlan, 'id'> = {
        name: 'New Plan',
        description: 'A brief description of the plan value.',
        subtitle: 'Everything in Free plus...',
        badge_text: '',
        cta_text: 'Get Started',
        sort_order: 10,
        price_monthly: 0,
        price_yearly: 0,
        max_properties: 1,
        max_contracts: 1,
        max_sessions: 10,
        max_whatsapp_messages: 50,
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
        },
        is_active: true
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

    const handleEdit = (plan: SubscriptionPlan) => {
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
                name: editForm.name || 'New Plan',
                description: editForm.description || '',
                subtitle: editForm.subtitle || '',
                badge_text: editForm.badge_text || '',
                cta_text: editForm.cta_text || 'Get Started',
                sort_order: parseInt(String(editForm.sort_order || 0)),
                price_monthly: parseFloat(String(editForm.price_monthly || 0)),
                price_yearly: parseFloat(String(editForm.price_yearly || 0)),
                max_properties: parseInt(String(editForm.max_properties || 0)),
                max_contracts: parseInt(String(editForm.max_contracts || 0)),
                max_sessions: parseInt(String(editForm.max_sessions || 0)),
                max_whatsapp_messages: parseInt(String(editForm.max_whatsapp_messages || 0)),
                max_storage_mb: parseInt(String(editForm.max_storage_mb || 0)),
                max_media_mb: parseInt(String(editForm.max_media_mb || 0)),
                max_utilities_mb: parseInt(String(editForm.max_utilities_mb || 0)),
                max_maintenance_mb: parseInt(String(editForm.max_maintenance_mb || 0)),
                max_documents_mb: parseInt(String(editForm.max_documents_mb || 0)),
                max_file_size_mb: parseInt(String(editForm.max_file_size_mb || 0)),
                features: editForm.features || defaultPlan.features,
                id: editForm.id || (isCreating ? (editForm.name || 'new-plan').toLowerCase().replace(/\s+/g, '-') : undefined),
                is_active: editForm.is_active !== undefined ? editForm.is_active : true
            };

            if (isCreating) {
                if (!planData.id) throw new Error('Plan ID is required');

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
                setPlans(prev => prev.map(p => p.id === editingId ? { ...p, ...planData } as SubscriptionPlan : p));
                setEditingId(null);
                alert('Plan updated successfully!');
            }
        } catch (error: any) {
            console.error('Error saving plan:', error);
            const message = error.message || error.details || (typeof error === 'string' ? error : 'Unknown error');
            alert('Save failed: ' + message);
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
        } catch (error: unknown) {
            console.error('Error deleting plan:', error);
            alert('Delete failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleChange = (field: keyof SubscriptionPlan, value: string | number | boolean | Record<string, boolean>) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const toggleFeature = (featureKey: string) => {
        const currentFeatures = editForm.features || {};
        setEditForm((prev) => ({
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
                    value={editForm[field as keyof SubscriptionPlan] as number}
                    onChange={e => handleChange(field as keyof SubscriptionPlan, e.target.value)}
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
                    value={editForm[field as keyof SubscriptionPlan] as number}
                    onChange={e => handleChange(field as keyof SubscriptionPlan, e.target.value)}
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

    const PlanPreview = ({ plan }: { plan: Partial<SubscriptionPlan> }) => {
        const id = (plan.id || '').toLowerCase();
        const baseId = id.includes('solo') || id.includes('free') ? 'solo' :
            id.includes('mate') || id.includes('pro') ? 'mate' :
                id.includes('master') || id.includes('enterprise') ? 'master' : 'unlimited';

        const ICON_MAP: Record<string, any> = { 'solo': Star, 'mate': Zap, 'master': Shield, 'unlimited': Lock };
        const COLOR_MAP: Record<string, string> = { 'solo': 'text-slate-500', 'mate': 'text-blue-500', 'master': 'text-amber-500', 'unlimited': 'text-purple-500' };
        const BG_MAP: Record<string, string> = { 'solo': 'bg-slate-50 dark:bg-slate-900/50', 'mate': 'bg-blue-50/50 dark:bg-blue-900/20', 'master': 'bg-amber-50/50 dark:bg-amber-900/20', 'unlimited': 'bg-purple-50/50 dark:bg-purple-900/20' };

        const Icon = ICON_MAP[baseId] || Star;

        return (
            <div className="sticky top-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Live Preview (Mobile/Desktop Card)</p>
                <div className="max-w-sm mx-auto">
                    <GlassCard
                        className={`p-8 relative flex flex-col ${plan.id === 'mate' ? 'border-blue-500/50 ring-4 ring-blue-500/10' : ''} ${BG_MAP[baseId] || 'bg-white dark:bg-slate-800'}`}
                        hoverEffect
                    >
                        {plan.badge_text && (
                            <div className="absolute -top-4 inset-x-0 flex justify-center">
                                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase">
                                    {plan.badge_text}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-3 rounded-xl bg-white dark:bg-black/40 shadow-sm ${COLOR_MAP[baseId] || 'text-blue-500'}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold font-mono tracking-tight dark:text-white uppercase">{plan.name || 'Plan Name'}</h3>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black dark:text-white">₪{plan.price_monthly || 0}</span>
                                <span className="text-slate-500 font-medium">/ unit</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">billed monthly</p>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 font-medium mb-8 text-sm leading-relaxed">
                            {plan.description || 'No description provided.'}
                        </p>

                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                                    <Check className="w-3 h-3" />
                                </div>
                                <span className="text-slate-700 dark:text-slate-300 font-bold">{plan.max_properties === -1 ? 'Unlimited' : plan.max_properties} Property Units</span>
                            </div>
                            {Object.entries(plan.features || {}).map(([key, value]) => value ? (
                                <div key={key} className="flex items-center gap-3 text-sm">
                                    <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-300 capitalize">{key.replace('_', ' ')}</span>
                                </div>
                            ) : null)}
                        </div>

                        <button className={`w-full mt-8 py-3 rounded-xl font-bold transition-all ${plan.id === 'mate' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'}`}>
                            {plan.cta_text || 'Start Free Trial'}
                        </button>
                    </GlassCard>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <TagIcon className="w-8 h-8 text-brand-600" />
                        Plan Management <span className="text-xs bg-brand-100 text-brand-600 px-2 py-1 rounded-md ml-2 uppercase tracking-widest">v2.0</span>
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Configure pricing, marketing content, and resource limits.
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

            {/* Editing / Creating Area */}
            {(isCreating || editingId) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Left: Editor Form */}
                    <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {isCreating ? '📦 New Tier' : '✏️ Edit Tier'}
                                </h2>
                            </div>
                            <button onClick={handleCancel} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-12">
                            {/* Marketing Section */}
                            <section>
                                <h3 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                                    Marketing & Content
                                    <div className="h-px bg-brand-100 dark:bg-brand-900/30 flex-1"></div>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Internal Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name || ''}
                                            onChange={e => handleChange('name', e.target.value)}
                                            className="block w-full rounded-2xl border-gray-100 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-bold text-gray-900 dark:text-white"
                                            placeholder="e.g. ULTIMATE"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Marketing Description</label>
                                        <textarea
                                            rows={2}
                                            value={editForm.description || ''}
                                            onChange={e => handleChange('description', e.target.value)}
                                            className="block w-full rounded-2xl border-gray-100 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-medium text-gray-800 dark:text-gray-200"
                                            placeholder="Catchy value proposition..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Badge Text</label>
                                        <input
                                            type="text"
                                            value={editForm.badge_text || ''}
                                            onChange={e => handleChange('badge_text', e.target.value)}
                                            className="block w-full rounded-2xl border-gray-100 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-bold text-gray-900 dark:text-white"
                                            placeholder="e.g. MOST POPULAR"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Button CTA</label>
                                        <input
                                            type="text"
                                            value={editForm.cta_text || ''}
                                            onChange={e => handleChange('cta_text', e.target.value)}
                                            className="block w-full rounded-2xl border-gray-100 dark:border-gray-700 dark:bg-gray-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 font-bold text-gray-900 dark:text-white"
                                            placeholder="Default: Start Free Trial"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Economics Section */}
                            <section>
                                <h3 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                                    Economics & Position
                                    <div className="h-px bg-brand-100 dark:bg-brand-900/30 flex-1"></div>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {renderPriceField('Monthly Price', 'price_monthly')}
                                    {renderPriceField('Yearly Total', 'price_yearly')}
                                    {renderLimitField('Sort Order', 'sort_order')}
                                </div>
                            </section>

                            {/* Limits & Quotas */}
                            <section>
                                <h3 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                                    Quotas & Feature Set
                                    <div className="h-px bg-brand-100 dark:bg-brand-900/30 flex-1"></div>
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                    {renderLimitField('Max Asset Units', 'max_properties')}
                                    {renderLimitField('Max Contracts', 'max_contracts')}
                                    {renderLimitField('AI Help (Sessions)', 'max_sessions')}
                                    {renderLimitField('WhatsApp msgs', 'max_whatsapp_messages')}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FeatureToggle featureKey="ai_analysis" label="AI Analysis" />
                                    <FeatureToggle featureKey="export_data" label="Data Export" />
                                    <FeatureToggle featureKey="custom_reports" label="Reports" />
                                    <FeatureToggle featureKey="priority_support" label="Priority" />
                                </div>
                            </section>

                            {/* Status */}
                            <div className="pt-8 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${editForm.is_active ? 'bg-brand-600' : 'bg-gray-300'}`} onClick={() => handleChange('is_active', !editForm.is_active)}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${editForm.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        {editForm.is_active ? 'Active' : 'Paused (Hidden from users)'}
                                    </span>
                                </label>

                                <div className="flex gap-4">
                                    <button onClick={handleCancel} className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Cancel</button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all font-black uppercase tracking-widest shadow-lg shadow-brand-600/20"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview Pane */}
                    <div className="lg:col-span-4 lg:block hidden">
                        <PlanPreview plan={editForm} />
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
                                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${plan.is_active
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20'
                                        : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        {plan.is_active ? 'Active' : 'Paused'}
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
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cloud</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_storage_mb === -1 ? 'Unlimited' : `${(plan.max_storage_mb / 1024).toFixed(1)}GB`}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Help</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_sessions} SESS</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">WhatsApp</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{plan.max_whatsapp_messages === -1 ? '∞' : plan.max_whatsapp_messages} MSG</div>
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
