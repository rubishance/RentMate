import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    CheckCircleIcon,
    XCircleIcon,
    SparklesIcon,
    TicketIcon,
    CalendarIcon,
    ArrowRightIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface ProposedAction {
    id: string;
    type: 'ticket_reply' | 'lease_warning' | 'extension_check' | 'sales_lead';
    title: string;
    description: string;
    draftContent?: string;
    updatedAt: string;
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
                .select('id, title, description, auto_reply_draft, user_id, updated_at, user_profiles(full_name), metadata')
                .not('auto_reply_draft', 'is', null)
                .eq('status', 'open')
                .limit(5);

            const ticketActions: ProposedAction[] = (tickets || []).map(t => {
                const metadata = t.metadata as any || {};
                const isLead = metadata.is_lead === true;
                const isSales = t.title?.includes('[SALE]');

                return {
                    id: `ticket-${t.id}`,
                    type: isSales ? 'sales_lead' as any : 'ticket_reply',
                    title: isSales ? t.title.replace('[SALE] ', '') : `Reply to: ${t.title}`,
                    description: isLead
                        ? `New inquiry from ${metadata.original_sender || 'Potential Lead'}`
                        : `AI generated a response for ${(t.user_profiles as any)?.full_name || 'User'}`,
                    draftContent: t.auto_reply_draft,
                    updatedAt: t.updated_at,
                    metadata: { ...metadata, ticket_id: t.id, user_id: t.user_id, is_lead: isLead }
                };
            });

            // 2. Fetch Rent Updates from Autopilot (notifications with link to contracts)
            const { data: autopilotProposals } = await supabase
                .from('notifications')
                .select('id, title, message, metadata, created_at, user_profiles(full_name)')
                .eq('metadata->>action', 'update_rent')
                .is('read_at', null)
                .limit(5);

            const rentActions: ProposedAction[] = (autopilotProposals || []).map(n => ({
                id: `autopilot-${n.id}`,
                type: 'lease_warning' as any, // We'll map this icon
                title: n.title,
                description: n.message,
                draftContent: `Hi ${(n.user_profiles as any)?.full_name || 'there'},\n\nBased on the latest CPI index, your rent for ${n.metadata?.property_address || 'the property'} has been updated to ${n.metadata?.new_rent} ILS.`,
                updatedAt: n.created_at,
                metadata: { notification_id: n.id, contract_id: n.metadata?.contract_id, ...n.metadata }
            }));

            setActions([...ticketActions, ...rentActions]);
        } catch (err) {
            console.error('Error fetching actions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (action: ProposedAction) => {
        if (action.type === 'ticket_reply' || action.type === 'sales_lead') {
            await supabase
                .from('support_tickets')
                .update({
                    status: 'resolved',
                    auto_reply_draft: action.draftContent
                })
                .eq('id', action.metadata.ticket_id);

            // Log interaction
            await supabase.from('crm_interactions').insert({
                user_id: action.metadata.user_id,
                type: 'email',
                title: `RE: ${action.title}`,
                content: action.draftContent,
                status: 'closed',
                metadata: {
                    direction: 'outbound',
                    automated: true,
                    is_lead: action.metadata.is_lead,
                    original_sender: action.metadata.original_sender
                }
            });
        } else if (action.id.startsWith('autopilot-')) {
            // Mark notification as read (effectively resolving it from the inbox)
            await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', action.metadata.notification_id);

            // Here we could also update the contract price if we wanted to be super bold
            // but for now, just logging is safer.
            await supabase.from('crm_interactions').insert({
                user_id: action.metadata.user_id,
                type: 'email',
                title: action.title,
                content: action.draftContent,
                status: 'open',
                metadata: { type: 'autopilot_execution', action: 'rent_update' }
            });
        }

        setActions(prev => prev.filter(a => a.id !== action.id));
    };

    const handleUpdateDraft = (id: string, newContent: string) => {
        setActions(prev => prev.map(a => a.id === id ? { ...a, draftContent: newContent } : a));
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
                                <div className={`mt-1 p-2 rounded-xl border ${action.type === 'sales_lead' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    action.type === 'ticket_reply' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                    {action.type === 'sales_lead' ? <CurrencyDollarIcon className="w-4 h-4" /> : <TicketIcon className="w-4 h-4" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white">{action.title}</h4>
                                            {action.metadata.is_lead && (
                                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase tracking-widest">
                                                    LEAD
                                                </span>
                                            )}
                                            {action.type === 'sales_lead' && (
                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase tracking-widest">
                                                    SALE
                                                </span>
                                            )}
                                            {new Date(action.updatedAt) < new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                                                <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">
                                                    Stagnant
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 flex items-center gap-1 uppercase">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(action.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">{action.description}</p>

                                    {action.draftContent && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-4">
                                            <textarea
                                                value={action.draftContent}
                                                onChange={(e) => handleUpdateDraft(action.id, e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 text-xs font-semibold text-gray-700 dark:text-gray-300 italic resize-none p-0"
                                                rows={3}
                                            />
                                            <div className="mt-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
                                                AI Draft - Editable
                                            </div>
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
