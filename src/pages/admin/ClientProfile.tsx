import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { crmService, CRMInteraction } from '../../services/crm.service';
import { supabase } from '../../lib/supabase';
import { MaskedAdminValue } from '../../components/admin/MaskedAdminValue';
import {
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    ArrowLeftIcon,
    PlusIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Loader2, Table, Activity, MousePointer2 } from 'lucide-react';
import { TimelineItem } from '../../components/crm/TimelineItem';
import { InteractionLogger } from '../../components/crm/InteractionLogger';
import { AdminChatWindow } from '../../components/crm/AdminChatWindow';

interface SubscriptionPlan {
    id: string;
    name: string;
    price_monthly: number;
    max_properties: number;
    max_tenants: number;
    max_contracts: number;
    max_sessions: number;
    features: Record<string, unknown>;
}

interface Invoice {
    id: string;
    amount: number;
    issue_date: string;
    status: 'paid' | 'unpaid' | 'overdue';
}

interface ClientProfileData {
    profile: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        subscription_status: string;
        subscription_plan?: string;
        plan_id?: string;
        created_at: string;
    };
    invoices: Invoice[];
    interactions: CRMInteraction[];
    properties_count?: number;
    contracts_count?: number;
    tenants_count?: number;
}

interface AnalyticsEvent {
    id: string;
    event_name: string;
    metadata: any;
    created_at: string;
    url: string;
}

const ClientProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ClientProfileData | null>(null);
    const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isAddingNote, setIsAddingNote] = useState(false);

    // New Note Form
    const [isExporting, setIsExporting] = useState(false);
    const [selectedBotChat, setSelectedBotChat] = useState<CRMInteraction | null>(null);
    const [feedFilter, setFeedFilter] = useState<'all' | 'ai' | 'human' | 'ticket' | 'usage'>('all');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [usageEvents, setUsageEvents] = useState<AnalyticsEvent[]>([]);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // Plan Editing
    const [isEditingPlan, setIsEditingPlan] = useState(false);
    const [newPlanId, setNewPlanId] = useState('');
    const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

    const fetchClientData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const summary = await crmService.getClientSummary(id);
            setData(summary);
            setInteractions(summary.interactions);
        } catch (err: unknown) {
            console.error('Error fetching client data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load client profile.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchAvailablePlans = useCallback(async () => {
        try {
            const plans = await crmService.getSubscriptionPlans();
            setAvailablePlans(plans || []);
        } catch (err) {
            console.error('Error fetching plans:', err);
        }
    }, []);

    const fetchUsageEvents = useCallback(async () => {
        if (!id) return;
        setLoadingUsage(true);
        try {
            const { data: events, error } = await supabase
                .from('analytics_events')
                .select('*')
                .eq('user_id', id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setUsageEvents(events || []);
        } catch (err) {
            console.error('Error fetching usage events:', err);
        } finally {
            setLoadingUsage(false);
        }
    }, [id]);

    useEffect(() => {
        fetchClientData();
        fetchAvailablePlans();
        fetchUsageEvents();
    }, [fetchClientData, fetchAvailablePlans, fetchUsageEvents]);

    const handleLogSuccess = (newInteraction: CRMInteraction) => {
        setInteractions([newInteraction, ...interactions]);
        setIsAddingNote(false);
    };

    const handleDeleteInteraction = async (interactionId: string | number) => {
        if (!confirm('Are you sure you want to delete this interaction log?')) return;

        try {
            await crmService.deleteInteraction(interactionId);
            setInteractions(interactions.filter(i => i.id !== interactionId));
        } catch (err: unknown) {
            alert('Error deleting: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleReassignInteraction = async (interactionId: string | number, type: string) => {
        const targetEmail = prompt('Enter the email of the user to move this item to:');
        if (!targetEmail) return;

        try {
            await crmService.reassignInteraction(interactionId, type, targetEmail);
            // Remove from current view since it belongs to someone else now
            setInteractions(interactions.filter(i => i.id !== interactionId));
            alert('Item moved successfully!');
        } catch (err: unknown) {
            alert('Failed to reassign: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const filteredInteractions = interactions.filter(i => {
        if (feedFilter === 'usage') return false; // Usage events are handled separately or we could merge them
        if (feedFilter === 'all') return true;
        if (feedFilter === 'ai') return i.type === 'chat';
        if (feedFilter === 'human') return ['note', 'call', 'email', 'human_chat', 'whatsapp'].includes(i.type);
        if (feedFilter === 'ticket') return i.type === 'support_ticket';
        return true;
    });

    const handleExport = async () => {
        setIsExporting(true);
        try {
            if (!data) throw new Error('Client data not loaded');
            const link = await crmService.exportToGoogleSheets(id!, data.profile.full_name);
            window.open(link, '_blank');
        } catch (err: unknown) {
            alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpdatePlan = async () => {
        const plan = availablePlans.find(p => p.id === newPlanId);
        if (!plan) return;

        if (!confirm(`Are you sure you want to change the plan to ${plan.name}?`)) return;
        try {
            await crmService.updateClientPlan(id!, plan.id, plan.name);
            // Optimistic update
            if (data) {
                setData({
                    ...data,
                    profile: {
                        ...data.profile,
                        plan_id: plan.id,
                        subscription_plan: plan.name
                    },
                    invoices: data.invoices || [],
                    interactions: data.interactions || []
                });
            }
            setIsEditingPlan(false);
        } catch (err: unknown) {
            alert('Failed to update plan: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        </div>
    );

    if (error || !data) return (
        <div className="p-8 text-center">
            <ExclamationCircleIcon className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground dark:text-white font-bold">{error || 'Client not found'}</p>
            <button onClick={() => navigate('/admin/users')} className="mt-4 text-primary-600 font-bold hover:underline">
                Back to User Management
            </button>
        </div>
    );

    const { profile, invoices } = data;

    const getEffectivePlanName = () => {
        const plan = availablePlans.find(p => p.id === profile.plan_id);
        if (plan) return plan.name;
        return profile.subscription_plan || 'Free';
    };

    return (
        <div className="space-y-8">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/users')}
                    className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <ArrowLeftIcon className="w-6 h-6 text-muted-foreground" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-foreground dark:text-white tracking-tight flex items-center gap-2">
                        Client Hub: <MaskedAdminValue value={profile.full_name || 'Unnamed Client'} label="Profile Name" userId={id} />
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                        <MaskedAdminValue value={profile.email} label="Profile Email" userId={id} maskType="email" /> • Joined {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg ${isChatOpen ? 'bg-gray-600 hover:bg-gray-700 shadow-gray-600/20' : 'bg-primary hover:bg-primary-700 shadow-primary-600/20'
                            }`}
                    >
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                        {isChatOpen ? 'Close Chat' : 'Live Chat'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-80"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
                        Export to Sheets
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Dashboard Stats & Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Status Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-border dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Account Status</h3>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Plan</span>
                            {isEditingPlan ? (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={newPlanId || profile.plan_id || ''}
                                        onChange={(e) => setNewPlanId(e.target.value)}
                                        className="text-xs p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                    >
                                        <option value="">Select a plan...</option>
                                        {availablePlans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (₪{p.price_monthly})</option>
                                        ))}
                                    </select>
                                    <button onClick={handleUpdatePlan} className="text-xs text-primary-600 font-bold hover:underline">Save</button>
                                    <button onClick={() => setIsEditingPlan(false)} className="text-xs text-muted-foreground hover:text-muted-foreground">Cancel</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="px-2 sm:px-4 py-1 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 rounded-xl text-xs font-black uppercase tracking-widest">
                                        {getEffectivePlanName().replace('_', ' ')}
                                    </span>
                                    <button
                                        onClick={() => { setNewPlanId(profile.plan_id || ''); setIsEditingPlan(true); }}
                                        className="text-xs text-muted-foreground hover:text-primary-600"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Standing</span>
                            <span className={`px-2 sm:px-4 py-1 rounded-xl text-xs font-black uppercase tracking-widest ${profile.subscription_status === 'active'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20'
                                : 'bg-red-50 text-red-700'
                                }`}>
                                {profile.subscription_status}
                            </span>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-border dark:border-gray-700 shadow-sm">
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Financial Records</h3>
                        <div className="space-y-4">
                            {invoices.length === 0 ? (
                                <p className="text-xs text-muted-foreground font-medium italic">No invoices found for this client.</p>
                            ) : (
                                invoices.slice(0, 5).map((inv: Invoice) => (
                                    <div key={inv.id} className="flex items-center justify-between p-2 sm:p-4 rounded-xl bg-blue-50 dark:bg-foreground/50 border border-border dark:border-gray-800">
                                        <div className="flex items-center gap-2 sm:gap-4">
                                            <DocumentTextIcon className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <div className="text-xs font-bold text-foreground dark:text-white">₪{inv.amount}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest ${inv.status === 'paid' ? 'text-blue-600' : 'text-amber-600'}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        {invoices.length > 5 && (
                            <button className="w-full mt-4 text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">
                                View All Invoices
                            </button>
                        )}
                    </div>
                </div>

                {/* Communication & Notes (CRM) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Interactive Timeline</h3>
                            <button
                                onClick={() => setIsAddingNote(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary-600/20"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Log Interaction
                            </button>
                        </div>

                        {/* Add Note Form */}
                        {isAddingNote && (
                            <div className="border-b border-border dark:border-gray-700 bg-primary-50/30 dark:bg-primary-900/10">
                                <InteractionLogger
                                    userId={id!}
                                    onLogSuccess={handleLogSuccess}
                                    onCancel={() => setIsAddingNote(false)}
                                />
                            </div>
                        )}

                        {/* Filters */}
                        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-700 flex gap-2 overflow-x-auto">
                            {['all', 'ai', 'ticket', 'human', 'usage'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFeedFilter(f as any)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${feedFilter === f
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                                        : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300'
                                        }`}
                                >
                                    {f === 'all' ? 'All Activity' :
                                        f === 'ai' ? 'Bot Chats' :
                                            f === 'usage' ? 'Feature Usage' :
                                                f === 'ticket' ? 'Tickets' : 'Human Logs'}
                                </button>
                            ))}
                        </div>

                        <div className="divide-y divide-gray-50 dark:divide-gray-800 p-6 max-h-[800px] overflow-y-auto">
                            {feedFilter === 'usage' ? (
                                usageEvents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Activity className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No usage history recorded</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {usageEvents.map(event => (
                                            <div key={event.id} className="flex items-center justify-between p-4 rounded-2xl bg-background dark:bg-neutral-800/20 border border-slate-100 dark:border-neutral-800">
                                                <div className="flex items-center gap-2 sm:gap-4">
                                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                                        <MousePointer2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-foreground capitalize">
                                                            {event.event_name.replace(/_/g, ' ')}
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            {event.url} • {new Date(event.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                {event.metadata && (
                                                    <div className="text-xs text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                                        {JSON.stringify(event.metadata)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : filteredInteractions.length === 0 ? (
                                <div className="text-center py-12">
                                    <ChatBubbleLeftEllipsisIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No activity found</p>
                                </div>
                            ) : (
                                filteredInteractions.map((interaction) => (
                                    <TimelineItem
                                        key={interaction.id}
                                        interaction={interaction}
                                        onDelete={handleDeleteInteraction}
                                        onReassign={handleReassignInteraction}
                                        onOpenBotChat={setSelectedBotChat}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Transcript Modal */}
            {selectedBotChat && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-foreground w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border dark:border-gray-800">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h3 className="text-lg font-black text-foreground dark:text-white uppercase tracking-tight">AI Conversation Transcript</h3>
                                <p className="text-xs font-bold text-muted-foreground">System context and logs</p>
                            </div>
                            <button
                                onClick={() => setSelectedBotChat(null)}
                                className="p-2 hover:bg-muted dark:hover:bg-gray-700 rounded-xl text-muted-foreground"
                            >
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20 dark:bg-gray-950/20">
                            {selectedBotChat.metadata?.messages?.map((msg: { role: string; content: string; timestamp?: string }, idx: number) => (
                                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{msg.role}</span>
                                        <span className="text-xs text-gray-300">{new Date(msg.timestamp || Date.now()).toLocaleTimeString()}</span>
                                    </div>
                                    <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-medium leading-relaxed ${msg.role === 'user'
                                        ? 'bg-primary-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-border dark:border-gray-700 rounded-tl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-gray-800 border-t border-border dark:border-gray-700 text-center">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">End of Automated Transcript</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Live Chat Window */}
            {isChatOpen && (
                <AdminChatWindow
                    userId={id!}
                    adminId={data?.profile?.id || ''} // Assuming admin is current user - handled in component
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

export default ClientProfile;
