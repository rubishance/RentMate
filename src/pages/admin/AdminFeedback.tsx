import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { Loader2, MessageSquare, Image as ImageIcon, ExternalLink, CheckCircle, Smartphone } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

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
    const { lang } = useTranslation();
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            // Join with profiles if possible, but user_id is in auth.users which is restricted
            // Helper query to get feedback
            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFeedback(data || []);
        } catch (error) {
            console.error('Error fetching feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('feedback')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
        } catch (err) {
            alert('Failed to update status');
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Feedback Manager"
                subtitle="User bug reports and feature requests"
            />

            <div className="grid gap-4">
                {feedback.map((item) => (
                    <GlassCard key={item.id} className="p-4 flex flex-col md:flex-row gap-4">
                        {/* Status Stripe */}
                        <div className={`w-2 rounded-full shrink-0 ${item.status === 'new' ? 'bg-blue-500' :
                                item.status === 'in_progress' ? 'bg-amber-500' : 'bg-green-500'
                            }`} />

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${item.type === 'bug' ? 'bg-red-100 text-red-700' :
                                        item.type === 'feature' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {item.type}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500 font-mono text-xs">{item.user_id || 'Anonymous'}</span>
                            </div>

                            <p className="text-gray-900 font-medium whitespace-pre-wrap">{item.message}</p>

                            {/* Meta Info */}
                            {item.device_info && (
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <Smartphone className="w-3 h-3" />
                                    <span>
                                        {item.device_info.screen?.width}x{item.device_info.screen?.height}
                                        {' • '}
                                        {((item.device_info.userAgent || '').match(/\(([^)]+)\)/) || [])[1] || 'Unknown Device'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Actions / Media */}
                        <div className="flex flex-col gap-2 items-end shrink-0 min-w-[150px]">
                            <select
                                value={item.status}
                                onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg p-1 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-navy/20"
                            >
                                <option value="new">New</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                            </select>

                            {item.screenshot_url && (
                                <a
                                    href={item.screenshot_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
                                >
                                    <ImageIcon className="w-4 h-4" /> View Screenshot <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </GlassCard>
                ))}

                {feedback.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No feedback details yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
