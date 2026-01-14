import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EnvelopeIcon
} from '@heroicons/react/24/outline';

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('admin_notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'admin_notifications'
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_notifications')
                .select(`
                    *,
                    user:user_profiles (
                        email,
                        first_name,
                        last_name,
                        plan:subscription_plans (name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (notification: any) => {
        if (!confirm(`Are you sure you want to upgrade ${notification.user?.email || 'this user'} to PRO?`)) return;

        setProcessingId(notification.id);
        try {
            // 1. Update User Profile to Pro (plan_id 'pro')
            // Note: In a real app, you might want to look up the ID for 'pro' dynamically
            const { error: upgradeError } = await supabase
                .from('user_profiles')
                .update({ plan_id: 'pro' })
                .eq('id', notification.user_id);

            if (upgradeError) throw upgradeError;

            // 2. Mark notification as resolved
            const { error: updateError } = await supabase
                .from('admin_notifications')
                .update({ status: 'resolved' })
                .eq('id', notification.id);

            if (updateError) throw updateError;

            // Update local state
            setNotifications(prev => prev.map(n =>
                n.id === notification.id ? { ...n, status: 'resolved' } : n
            ));

            alert('User upgraded successfully!');

        } catch (error: any) {
            console.error('Error approving request:', error);
            alert('Failed to approve: ' + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDismiss = async (id: string) => {
        if (!confirm('Dismiss this request? User will not be upgraded.')) return;

        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('admin_notifications')
                .update({ status: 'dismissed' })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, status: 'dismissed' } : n
            ));

        } catch (error) {
            console.error('Error dismissing:', error);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="px-4 pt-6 pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Center</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage upgrade requests and alerts</p>
                </div>
                <button
                    onClick={fetchNotifications}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    title="Refresh"
                >
                    <ClockIcon className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="mt-1 text-sm text-gray-500">No pending notifications.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification) => (
                            <li key={notification.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {notification.type === 'upgrade_request' ? 'Upgrade Request' : notification.type}
                                            </p>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    notification.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {notification.status}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                                                {notification.user?.email || 'Unknown User'}
                                            </p>
                                            {notification.content?.requested_plan && (
                                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                                    Requested Plan: <span className="font-semibold text-blue-600 uppercase">{notification.content.requested_plan}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {notification.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(notification)}
                                                    disabled={!!processingId}
                                                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                                                >
                                                    {processingId === notification.id ? '...' : (
                                                        <>
                                                            <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                                            Approve
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDismiss(notification.id)}
                                                    disabled={!!processingId}
                                                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    <XCircleIcon className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </>
                                        )}
                                        {notification.status === 'resolved' && (
                                            <span className="text-sm text-green-600 flex items-center gap-1">
                                                <CheckCircleIcon className="w-5 h-5" /> Done
                                            </span>
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
