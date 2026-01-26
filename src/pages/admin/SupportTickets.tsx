import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Ticket,
    MessageSquare,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    Calendar,
    Filter,
    Search,
    Send,
    Loader2,
    XCircle,
    Activity
} from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface SupportTicket {
    id: string;
    user_id: string;
    title: string;
    description: string;
    category: 'technical' | 'billing' | 'feature_request' | 'bug' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
    assigned_to: string | null;
    auto_reply_draft: string | null;
    chat_context: any;
    resolution_notes: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    user?: { email: string; full_name: string };
    assigned_admin?: { email: string; full_name: string };
    ticket_analysis?: {
        sentiment_score: number;
        urgency_level: 'low' | 'medium' | 'high' | 'critical';
        ai_summary: string;
        category: string;
    }[];
}

interface TicketComment {
    id: string;
    ticket_id: string;
    user_id: string;
    comment: string;
    is_admin: boolean;
    created_at: string;
    user?: { email: string; full_name: string };
}

import { Sparkles } from 'lucide-react';
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SupportTickets() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editedDraft, setEditedDraft] = useState<string>('');

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchComments(selectedTicket.id);
            setEditedDraft(selectedTicket.auto_reply_draft || '');
        }
    }, [selectedTicket]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    user:user_profiles!user_id(email, full_name),
                    assigned_admin:user_profiles!assigned_to(email, full_name),
                    ticket_analysis(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (err: any) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async (ticketId: string) => {
        try {
            const { data, error } = await supabase
                .from('ticket_comments')
                .select(`
                    *,
                    user:user_profiles(email, full_name)
                `)
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (err: any) {
            console.error('Error fetching comments:', err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedTicket) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('ticket_comments')
                .insert({
                    ticket_id: selectedTicket.id,
                    user_id: user.id,
                    comment: newComment,
                    is_admin: true
                });

            if (error) throw error;

            setNewComment('');
            await fetchComments(selectedTicket.id);
        } catch (err: any) {
            console.error('Error adding comment:', err);
            alert('Failed to add comment: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
        try {
            const updates: any = { status: newStatus };
            if (newStatus === 'resolved' || newStatus === 'closed') {
                updates.resolved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('support_tickets')
                .update(updates)
                .eq('id', ticketId);

            if (error) throw error;

            await fetchTickets();
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status: newStatus as any });
            }
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert('Failed to update status: ' + err.message);
        }
    };

    const handleApproveDraft = async () => {
        if (!selectedTicket || !editedDraft) return;
        setSubmitting(true);
        try {
            // 1. Resolve ticket
            await supabase
                .from('support_tickets')
                .update({
                    status: 'resolved',
                    auto_reply_draft: editedDraft,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', selectedTicket.id);

            // 2. Log interaction
            await supabase.from('crm_interactions').insert({
                user_id: selectedTicket.user_id,
                type: 'email',
                title: `RE: ${selectedTicket.title}`,
                content: editedDraft,
                status: 'closed',
                metadata: { direction: 'outbound', automated: true }
            });

            // 3. Send email via notification link (logic is actually in handle-inbound-email for auto responses, 
            // but for manual approve we trigger the notification helper)
            await supabase.functions.invoke('send-notification-email', {
                body: {
                    email: selectedTicket.user?.email,
                    notification: {
                        title: `Update on your ticket: ${selectedTicket.title}`,
                        message: editedDraft
                    }
                }
            });

            await fetchTickets();
            setSelectedTicket(null);
        } catch (err) {
            console.error('Failed to approve draft:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignToMe = async (ticketId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('support_tickets')
                .update({ assigned_to: user.id, status: 'in_progress' })
                .eq('id', ticketId);

            if (error) throw error;
            await fetchTickets();
        } catch (err: any) {
            console.error('Error assigning ticket:', err);
            alert('Failed to assign ticket: ' + err.message);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800';
            case 'high': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
            case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
            case 'low': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
            default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800';
            case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
            case 'waiting_user': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
            case 'resolved': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800';
            case 'closed': return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700';
            default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700';
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.user?.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

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
                        <Ticket className="w-8 h-8 text-brand-600" />
                        Support Tickets
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Manage user support requests and escalations from the AI chatbot.
                    </p>
                </div>
                <button
                    onClick={fetchTickets}
                    className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <ArrowPathIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[
                    { label: 'Open', count: tickets.filter(t => t.status === 'open').length, color: 'text-red-600' },
                    { label: 'In Progress', count: tickets.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
                    { label: 'Waiting User', count: tickets.filter(t => t.status === 'waiting_user').length, color: 'text-yellow-600' },
                    { label: 'Resolved', count: tickets.filter(t => t.status === 'resolved').length, color: 'text-green-600' },
                    { label: 'Total', count: tickets.length, color: 'text-gray-600' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className={`text-3xl font-black ${stat.color}`}>{stat.count}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
                    />
                </div>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
                    {['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                filterStatus === status
                                    ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tickets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tickets List */}
                <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 no-scrollbar">
                    {filteredTickets.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-20 text-center">
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
                            <p className="font-black text-gray-400 uppercase tracking-widest">No tickets found</p>
                        </div>
                    ) : (
                        filteredTickets.map((ticket) => {
                            const analysis = ticket.ticket_analysis?.[0];
                            const sentimentEmoji = (analysis?.sentiment_score ?? 0) > 0.3 ? '😊' : (analysis?.sentiment_score ?? 0) < -0.3 ? '😡' : '😐';

                            return (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={cn(
                                        "bg-white dark:bg-gray-800 p-5 rounded-3xl border cursor-pointer transition-all hover:shadow-xl group relative overflow-hidden",
                                        selectedTicket?.id === ticket.id
                                            ? 'border-brand-600 shadow-xl ring-1 ring-brand-600/20'
                                            : 'border-slate-100 dark:border-neutral-800 shadow-minimal'
                                    )}
                                >
                                    {analysis && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-500 to-purple-500 opacity-60" />
                                    )}

                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex gap-2 items-start">
                                            <span className="text-lg">{sentimentEmoji}</span>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-brand-600 transition-colors">{ticket.title}</h3>
                                        </div>
                                        <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border shrink-0", getPriorityColor(ticket.priority))}>
                                            {ticket.priority}
                                        </span>
                                    </div>

                                    {analysis?.ai_summary && (
                                        <p className="text-[10px] font-black uppercase text-brand-600 tracking-widest mb-2 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            AI: {analysis.ai_summary}
                                        </p>
                                    )}

                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{ticket.description}</p>
                                    <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-50 dark:border-neutral-800">
                                        <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", getStatusColor(ticket.status))}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Ticket Detail */}
                <div className="lg:col-span-2">
                    {!selectedTicket ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-neutral-800 p-20 text-center h-[800px] flex items-center justify-center shadow-minimal">
                            <div className="space-y-4">
                                <div className="w-24 h-24 bg-slate-50 dark:bg-neutral-900 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-minimal border border-slate-100 dark:border-neutral-800">
                                    <MessageSquare className="w-10 h-10 text-slate-200" />
                                </div>
                                <p className="font-black text-gray-400 uppercase tracking-[0.3em] text-xs">Select a ticket to reveal intelligence</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-100 dark:border-neutral-800 overflow-hidden flex flex-col h-[800px] shadow-premium relative">
                            {/* AI Background Accent */}
                            {selectedTicket.ticket_analysis?.[0] && (
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                            )}

                            {/* Ticket Header */}
                            <div className="p-8 border-b border-slate-100 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-3xl relative z-10">
                                <div className="flex items-start justify-between gap-6 mb-6">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{selectedTicket.title}</h2>
                                            {selectedTicket.ticket_analysis?.[0] && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100 text-[9px] font-black uppercase tracking-widest">
                                                    <Sparkles className="w-3 h-3" />
                                                    AI Analyzed
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border", getPriorityColor(selectedTicket.priority))}>
                                                {selectedTicket.priority}
                                            </span>
                                            <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border", getStatusColor(selectedTicket.status))}>
                                                {selectedTicket.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Management</p>
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                                            className="px-4 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-500/20 outline-none cursor-pointer"
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="waiting_user">Waiting User</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <blockquote className="p-5 bg-slate-50 dark:bg-neutral-900/50 rounded-2xl border border-slate-100 dark:border-neutral-800 text-sm font-medium text-gray-600 dark:text-gray-400 italic mb-6 leading-relaxed">
                                    "{selectedTicket.description}"
                                </blockquote>

                                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                            <User className="w-3 h-3" />
                                        </div>
                                        {selectedTicket.user?.email || 'Unknown'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                            <Calendar className="w-3 h-3" />
                                        </div>
                                        {new Date(selectedTicket.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Comments & AI Intelligence View */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 dark:bg-black/20 no-scrollbar">
                                {/* AI Intelligence Panel */}
                                {selectedTicket.ticket_analysis?.[0] && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-6 bg-white dark:bg-neutral-900 rounded-[2rem] border border-slate-100 dark:border-neutral-800 shadow-minimal space-y-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-600 flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Insight Details
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sentiment</p>
                                                    <p className="text-xl font-black">{selectedTicket.ticket_analysis[0].sentiment_score > 0 ? 'Positive' : 'Fustrated'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</p>
                                                    <p className="text-xl font-black capitalize">{selectedTicket.ticket_analysis[0].category}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-white dark:bg-neutral-900 rounded-[2rem] border border-slate-100 dark:border-neutral-800 shadow-minimal space-y-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-600 flex items-center gap-2">
                                                <Activity className="w-3.5 h-3.5" />
                                                Intelligence Loop
                                            </h4>
                                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 leading-relaxed italic line-clamp-2">
                                                {selectedTicket.ticket_analysis[0].ai_summary}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Auto Reply Section */}
                                {selectedTicket.auto_reply_draft && (
                                    <div className="p-8 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/10 dark:to-purple-900/10 rounded-[2.5rem] border border-brand-100/50 dark:border-brand-500/10 shadow-premium-dark relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                                            <Sparkles className="w-16 h-16 text-brand-600" />
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-600 flex items-center gap-2">
                                                        <SparklesIcon className="w-4 h-4" />
                                                        Autopilot Draft
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-gray-400 lowercase">this reply was crafted specifically for this user context</p>
                                                </div>
                                                <div className="px-2 py-1 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-lg text-[8px] font-black text-brand-600 uppercase tracking-widest border border-brand-100">
                                                    Optimized
                                                </div>
                                            </div>
                                            <textarea
                                                value={editedDraft}
                                                onChange={(e) => setEditedDraft(e.target.value)}
                                                className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-md border-none focus:ring-0 text-gray-800 dark:text-gray-200 text-sm font-medium italic min-h-[120px] rounded-2xl p-4 leading-relaxed"
                                                placeholder="Crafting perfect response..."
                                            />
                                            <button
                                                onClick={handleApproveDraft}
                                                disabled={submitting}
                                                className="w-full h-14 bg-foreground text-background rounded-full font-black text-[10px] uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-premium-dark"
                                            >
                                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                                                Approve & Send Intelligent Reply
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* History / Comments */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-px flex-1 bg-slate-100 dark:border-neutral-800" />
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Communication History</span>
                                        <div className="h-px flex-1 bg-slate-100 dark:border-neutral-800" />
                                    </div>
                                    {comments.map((comment) => (
                                        <div key={comment.id} className={cn("p-6 rounded-[2rem] shadow-minimal relative group",
                                            comment.is_admin
                                                ? 'bg-white dark:bg-neutral-900 ml-12 border border-slate-100 dark:border-neutral-800'
                                                : 'bg-slate-50 dark:bg-neutral-800/50 mr-12 border-transparent'
                                        )}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", comment.is_admin ? "bg-brand-500" : "bg-slate-400")} />
                                                    {comment.is_admin ? 'RentMate Team' : comment.user?.full_name || 'Client'}
                                                </span>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{comment.comment}</p>
                                        </div>
                                    ))}
                                    {comments.length === 0 && (
                                        <div className="p-10 text-center opacity-40">
                                            <p className="text-[10px] font-black uppercase tracking-widest">No previous correspondence</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Comment */}
                            <div className="p-8 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative z-10">
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                        placeholder="Add to follow-up..."
                                        className="flex-1 px-6 py-4 bg-slate-50 dark:bg-neutral-800 border-none rounded-2xl text-[10px] font-bold tracking-widest focus:ring-2 focus:ring-brand-500/20 outline-none placeholder:uppercase placeholder:text-[9px]"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={submitting || !newComment.trim()}
                                        className="w-14 h-14 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all shadow-premium-dark flex items-center justify-center disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

