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
    XCircle
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
    chat_context: any;
    resolution_notes: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    user?: { email: string; full_name: string };
    assigned_admin?: { email: string; full_name: string };
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

export default function SupportTickets() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchComments(selectedTicket.id);
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
                    assigned_admin:user_profiles!assigned_to(email, full_name)
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
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    {['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
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
                <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto">
                    {filteredTickets.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-20 text-center">
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
                            <p className="font-black text-gray-400 uppercase tracking-widest">No tickets found</p>
                        </div>
                    ) : (
                        filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={cn(
                                    "bg-white dark:bg-gray-800 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md",
                                    selectedTicket?.id === ticket.id
                                        ? 'border-brand-600 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700'
                                )}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">{ticket.title}</h3>
                                    <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0", getPriorityColor(ticket.priority))}>
                                        {ticket.priority}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{ticket.description}</p>
                                <div className="flex items-center justify-between gap-2">
                                    <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", getStatusColor(ticket.status))}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ticket Detail */}
                <div className="lg:col-span-2">
                    {!selectedTicket ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-20 text-center h-full flex items-center justify-center">
                            <div>
                                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
                                <p className="font-black text-gray-400 uppercase tracking-widest">Select a ticket to view details</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[800px]">
                            {/* Ticket Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedTicket.title}</h2>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", getPriorityColor(selectedTicket.priority))}>
                                                {selectedTicket.priority}
                                            </span>
                                            <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border", getStatusColor(selectedTicket.status))}>
                                                {selectedTicket.status.replace('_', ' ')}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-400">
                                                {selectedTicket.category}
                                            </span>
                                        </div>
                                    </div>
                                    <select
                                        value={selectedTicket.status}
                                        onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                                        className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="waiting_user">Waiting User</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{selectedTicket.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <User className="w-4 h-4" />
                                        {selectedTicket.user?.email || 'Unknown'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(selectedTicket.created_at).toLocaleString()}
                                    </div>
                                </div>
                                {!selectedTicket.assigned_to && (
                                    <button
                                        onClick={() => handleAssignToMe(selectedTicket.id)}
                                        className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition-all"
                                    >
                                        Assign to Me
                                    </button>
                                )}
                            </div>

                            {/* Comments */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className={cn("p-4 rounded-xl", comment.is_admin ? 'bg-brand-50 dark:bg-brand-900/20 ml-8' : 'bg-gray-50 dark:bg-gray-900 mr-8')}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{comment.user?.email || 'Unknown'}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.comment}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Add Comment */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                        placeholder="Add a comment..."
                                        className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={submitting || !newComment.trim()}
                                        className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50 flex items-center gap-2"
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
