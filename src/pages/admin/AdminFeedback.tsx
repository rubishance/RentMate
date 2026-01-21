import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Loader2,
    MessageSquare
} from 'lucide-react';
import {
    PhotoIcon,
    ArrowTopRightOnSquareIcon,
    CheckBadgeIcon,
    DevicePhoneMobileIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';

interface FeedbackItem {
    id: string;
    created_at: string;
    message: string;
    type: string;
    status: string;
    screenshot_url: string | null;
    device_info: any;
    user_id: string | null;
    user?: { email: string };
}

export default function AdminFeedback() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setFeedback(data || []);
        } catch (err: any) {
            console.error('Error fetching feedback:', err);
            setError(err.message || 'Failed to load user feedback.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error: updateError } = await supabase
                .from('feedback')
                .update({ status: newStatus })
                .eq('id', id);

            if (updateError) throw updateError;
            setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
        } catch (err: any) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const filteredFeedback = filterStatus === 'all'
        ? feedback
        : feedback.filter(f => f.status === filterStatus);

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
                        <MessageSquare className="w-8 h-8 text-brand-600" />
                        Feedback Manager
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Manage bug reports, feature requests, and general user sentiments.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchFeedback}
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

            {/* Filters */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl w-fit border border-gray-200 dark:border-gray-700">
                {(['all', 'new', 'in_progress', 'resolved'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status
                            ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div className="grid gap-6">
                {filteredFeedback.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-20 text-center shadow-sm">
                        <CheckBadgeIcon className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
                        <p className="font-black text-gray-400 uppercase tracking-widest">Inbox is clear. No feedback to display.</p>
                    </div>
                ) : (
                    filteredFeedback.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col md:flex-row gap-6 p-6 hover:shadow-md transition-shadow">
                            {/* Left Info Bar */}
                            <div className={`w-1.5 md:w-2 rounded-full h-auto self-stretch shrink-0 ${item.status === 'new' ? 'bg-brand-600' :
                                item.status === 'in_progress' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} />

                            {/* Main Content */}
                            <div className="flex-1 space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${item.type === 'bug' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800' :
                                        item.type === 'feature' ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' :
                                            'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'
                                        }`}>
                                        {item.type}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600 font-light">|</span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(item.created_at).toLocaleString('he-IL')}</span>
                                    <span className="text-gray-300 dark:text-gray-600 font-light">|</span>
                                    <span className="text-[10px] font-mono text-gray-500 tracking-tighter bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                        ID: {item.user_id ? item.user_id.split('-')[0] : 'ANON'}
                                    </span>
                                </div>

                                <p className="text-gray-900 dark:text-white font-bold leading-relaxed whitespace-pre-wrap text-sm lg:text-base">
                                    {item.message}
                                </p>

                                {/* Device Metadata */}
                                {item.device_info && (
                                    <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700">
                                        <DevicePhoneMobileIcon className="w-4 h-4 text-brand-600" />
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                            {item.device_info.screen?.width}x{item.device_info.screen?.height} Resolution
                                            <span className="mx-2 text-gray-300">/</span>
                                            {((item.device_info.userAgent || '').match(/\(([^)]+)\)/) || [])[1] || 'Web Agent'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions Column */}
                            <div className="flex flex-col gap-4 items-end shrink-0 md:min-w-[180px] border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                                <div className="w-full">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Update Status</label>
                                    <select
                                        value={item.status}
                                        onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                                        className="w-full text-xs font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none"
                                    >
                                        <option value="new">🟢 NEW ENTRY</option>
                                        <option value="in_progress">🟡 IN PROGRESS</option>
                                        <option value="resolved">⚪ RESOLVED</option>
                                    </select>
                                </div>

                                {item.screenshot_url && (
                                    <a
                                        href={item.screenshot_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors bg-brand-50 dark:bg-brand-900/20 px-3 py-2 rounded-xl border border-brand-100 dark:border-brand-800"
                                    >
                                        <PhotoIcon className="w-4 h-4" />
                                        Screenshot
                                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
