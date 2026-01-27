import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    UserPlusIcon,
    ArrowUpCircleIcon,
    BellIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

interface AdminNotification {
    id: string;
    user_id: string;
    type: 'upgrade_request' | 'system_alert' | 'user_feedback' | string;
    status: 'pending' | 'resolved' | 'dismissed';
    content: {
        requested_plan?: string;
        [key: string]: unknown;
    };
    created_at: string;
    user?: {
        email: string;
        full_name: string;
        plan_id: string;
    };
}

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('admin_notifications_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'admin_notifications'
            }, (payload) => {
                setNotifications(prev => [(payload.new as AdminNotification), ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('admin_notifications')
                .select(`
                    *,
                    user:user_profiles (
                        email,
                        full_name,
                        plan_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setNotifications((data as unknown as AdminNotification[]) || []);
        } catch (err: unknown) {
            console.error('Error fetching notifications:', err);
            setError(err instanceof Error ? err.message : 'Failed to sync with notification server.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (notification: AdminNotification) => {
        const requestedPlan = notification.content?.requested_plan || 'pro';
        if (!confirm(`ACTIVATE UPGRADE? You are about to upgrade ${notification.user?.email} to the ${requestedPlan.toUpperCase()} plan.`)) return;

        setProcessingId(notification.id);
        try {
            // 1. Update User Profile to requested plan
            const { error: upgradeError } = await supabase
                .from('user_profiles')
                .update({
                    plan_id: requestedPlan,
                    subscription_status: 'active'
                })
                .eq('id', notification.user_id);

            if (upgradeError) throw upgradeError;

            // 2. Mark notification as resolved
            const { error: updateError } = await supabase
                .from('admin_notifications')
                .update({ status: 'resolved' })
                .eq('id', notification.id);

            if (updateError) throw updateError;

            setNotifications(prev => prev.map(n =>
                n.id === notification.id ? { ...n, status: 'resolved' as const } : n
            ));

        } catch (err: unknown) {
            console.error('Error approving request:', err);
            alert('Approval failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleDismiss = async (id: string) => {
        if (!confirm('DISMISS REQUEST? This will hide the notification without making changes.')) return;

        setProcessingId(id);
        try {
            const { error: discardError } = await supabase
                .from('admin_notifications')
                .update({ status: 'dismissed' })
                .eq('id', id);

            if (discardError) throw discardError;

            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, status: 'dismissed' as const } : n
            ));

        } catch (err: unknown) {
            console.error('Error dismissing:', err);
            alert('Action failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BellIcon className="w-8 h-8 text-brand-600" />
                        Notification Center
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Respond to system alerts, manual upgrade requests, and administrative actions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchNotifications}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-sm">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    {error}
                </div>
            )}

            {notifications.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-20 text-center shadow-sm">
                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-emerald-100 dark:text-emerald-900/20" />
                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Inbox Zero</h3>
                    <p className="text-xs font-medium text-gray-400 mt-1">Everything is up to date. Check back later for new requests.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Alerts</h2>
                        <p className="text-xs font-medium text-gray-500 mt-1">Real-time status of system-generated notifications.</p>
                    </div>

                    <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.map((n) => (
                            <li key={n.id} className={`p-6 transition-colors ${n.status === 'pending' ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/20 dark:bg-gray-900/20 opacity-60'}`}>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex-1 flex gap-4">
                                        <div className={`p-3 rounded-2xl border shrink-0 ${n.type === 'upgrade_request' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' :
                                            'bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/20 dark:border-brand-800'
                                            }`}>
                                            {n.type === 'upgrade_request' ? <ArrowUpCircleIcon className="w-6 h-6" /> : <BellIcon className="w-6 h-6" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    {n.type === 'upgrade_request' ? 'Plan Upgrade Request' : n.type.replace('_', ' ').toUpperCase()}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${n.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                                    n.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                        'bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-900 dark:border-gray-700'
                                                    }`}>
                                                    {n.status}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <EnvelopeIcon className="w-4 h-4" />
                                                    {n.user?.email || 'Unknown Source'}
                                                </p>
                                                {n.content?.requested_plan && (
                                                    <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">
                                                        <UserPlusIcon className="w-3.5 h-3.5 text-brand-600" />
                                                        Route: <span className="text-brand-600">{n.content.requested_plan}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        <div className="text-right mr-4 hidden md:block">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Received</div>
                                            <div className="text-[11px] font-bold text-gray-900 dark:text-white">
                                                {new Date(n.created_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                        </div>
                                        {n.status === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDismiss(n.id)}
                                                    disabled={!!processingId}
                                                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-gray-200 dark:border-gray-700 transition-all"
                                                    title="Dismiss Request"
                                                >
                                                    <XCircleIcon className="w-6 h-6" />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(n)}
                                                    disabled={!!processingId}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                                >
                                                    {processingId === n.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                                    <span className="hidden sm:inline">Approve Update</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 text-gray-400 rounded-xl border border-gray-100 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                                Process Complete
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;
