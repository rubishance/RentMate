import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    CheckCircleIcon,
    XCircleIcon,
    SparklesIcon,
    TicketIcon,
    CalendarIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

interface ProposedAction {
    id: string;
    type: 'ticket_reply' | 'lease_warning' | 'extension_check';
    title: string;
    description: string;
    draftContent?: string;
    metadata: any;
}

export function ActionInbox() {
    const [actions, setActions] = useState<ProposedAction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        setLoading(true);
        try {
            // 1. Fetch tickets with AI drafts
            const { data: tickets } = await supabase
                .from('support_tickets')
                .select('id, title, description, auto_reply_draft, user_id, user_profiles(full_name)')
                .not('auto_reply_draft', 'is', null)
                .eq('status', 'open')
                .limit(5);

            const ticketActions: ProposedAction[] = (tickets || []).map(t => ({
                id: t.id,
                type: 'ticket_reply',
                title: `Reply to: ${t.title}`,
                description: `AI generated a response for ${(t.user_profiles as any)?.full_name || 'User'}`,
                draftContent: t.auto_reply_draft,
                metadata: { ticket_id: t.id }
            }));

            // 2. Fetch pending automations from logs that need manual review? 
            // For now, let's just show tickets.
            setActions(ticketActions);
        } catch (err) {
            console.error('Error fetching actions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (action: ProposedAction) => {
        // Mocking approval logic
        if (action.type === 'ticket_reply') {
            alert(`Sending response for ticket ${action.metadata.ticket_id}`);
            // In real app: Update ticket status and insert crm_interaction
            await supabase
                .from('support_tickets')
                .update({ status: 'resolved' }) // Or just keep open but log reply
                .eq('id', action.metadata.ticket_id);

            setActions(prev => prev.filter(a => a.id !== action.id));
        }
    };

    if (loading) return <div className="animate-pulse h-40 bg-gray-50 dark:bg-gray-800/50 rounded-2xl" />;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-minimal overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-brand-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">AI Action Inbox</h3>
                </div>
                <span className="px-2 py-0.5 bg-brand-100 text-brand-600 rounded text-[10px] font-black">{actions.length} PENDING</span>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {actions.length === 0 ? (
                    <div className="p-10 text-center">
                        <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inbox Zero. Autopilot is running smoothly.</p>
                    </div>
                ) : (
                    actions.map(action => (
                        <div key={action.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                            <div className="flex gap-4">
                                <div className={`mt-1 p-2 rounded-xl border ${action.type === 'ticket_reply' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                    <TicketIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white">{action.title}</h4>
                                        <span className="text-[10px] font-black text-gray-400 flex items-center gap-1 uppercase">
                                            <CalendarIcon className="w-3 h-3" /> Just now
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">{action.description}</p>

                                    {action.draftContent && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-4">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 italic">"{action.draftContent}"</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleApprove(action)}
                                            className="px-4 py-2 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-brand-700 transition-all flex items-center gap-2"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Approve & Send
                                        </button>
                                        <button className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2">
                                            <XCircleIcon className="w-4 h-4" />
                                            Dismiss
                                        </button>
                                        <button className="ml-auto text-gray-400 group-hover:text-brand-600 transition-all">
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
