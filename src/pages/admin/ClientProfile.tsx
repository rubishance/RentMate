import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { crmService, CRMInteraction, CRMInteractionType } from '../../services/crm.service';
import { MaskedAdminValue } from '../../components/admin/MaskedAdminValue';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    ArrowLeftIcon,
    PlusIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    TrashIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Loader2, Table } from 'lucide-react';

const ClientProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isAddingNote, setIsAddingNote] = useState(false);

    // New Note Form
    const [newNoteType, setNewNoteType] = useState<CRMInteractionType>('note');
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (id) {
            fetchClientData();
        }
    }, [id]);

    const fetchClientData = async () => {
        setLoading(true);
        try {
            const summary = await crmService.getClientSummary(id!);
            setData(summary);
            setInteractions(summary.interactions);
        } catch (err: any) {
            console.error('Error fetching client data:', err);
            setError(err.message || 'Failed to load client profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteContent.trim()) return;

        setActionLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const newInteraction = await crmService.addInteraction({
                user_id: id!,
                admin_id: user?.id || null,
                type: newNoteType,
                title: newNoteTitle || null,
                content: newNoteContent,
                status: 'open'
            });

            setInteractions([newInteraction, ...interactions]);
            setIsAddingNote(false);
            setNewNoteTitle('');
            setNewNoteContent('');
            setNewNoteType('note');
        } catch (err: any) {
            alert('Error adding note: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteInteraction = async (interactionId: number) => {
        if (!confirm('Are you sure you want to delete this interaction log?')) return;

        try {
            await crmService.deleteInteraction(interactionId);
            setInteractions(interactions.filter(i => i.id !== interactionId));
        } catch (err: any) {
            alert('Error deleting: ' + err.message);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const link = await crmService.exportToGoogleSheets(id!, data.profile.full_name);
            window.open(link, '_blank');
        } catch (err: any) {
            alert('Export failed: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        </div>
    );

    if (error || !data) return (
        <div className="p-8 text-center">
            <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-bold">{error || 'Client not found'}</p>
            <button onClick={() => navigate('/admin/users')} className="mt-4 text-brand-600 font-bold hover:underline">
                Back to User Management
            </button>
        </div>
    );

    const { profile, invoices } = data;

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/users')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <ArrowLeftIcon className="w-6 h-6 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        Client Hub: <MaskedAdminValue value={profile.full_name || 'Unnamed Client'} label="Profile Name" userId={id} />
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        <MaskedAdminValue value={profile.email} label="Profile Email" userId={id} maskType="email" /> • Joined {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="ml-auto">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
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
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Account Status</h3>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Plan</span>
                            <span className="px-3 py-1 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest">
                                {profile.subscription_plan?.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Standing</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${profile.subscription_status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20'
                                : 'bg-red-50 text-red-700'
                                }`}>
                                {profile.subscription_status}
                            </span>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Financial Records</h3>
                        <div className="space-y-4">
                            {invoices.length === 0 ? (
                                <p className="text-xs text-gray-400 font-medium italic">No invoices found for this client.</p>
                            ) : (
                                invoices.slice(0, 5).map((inv: any) => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">₪{inv.amount}</div>
                                                <div className="text-[10px] text-gray-500">{new Date(inv.issue_date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                        {invoices.length > 5 && (
                            <button className="w-full mt-4 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline">
                                View All Invoices
                            </button>
                        )}
                    </div>
                </div>

                {/* Communication & Notes (CRM) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Communication Logs</h3>
                            <button
                                onClick={() => setIsAddingNote(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-600/20"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Log Interaction
                            </button>
                        </div>

                        {/* Add Note Form */}
                        {isAddingNote && (
                            <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 border-b border-brand-100 dark:border-brand-900/30">
                                <form onSubmit={handleAddNote} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</label>
                                            <select
                                                value={newNoteType}
                                                onChange={(e) => setNewNoteType(e.target.value as CRMInteractionType)}
                                                className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-bold p-2.5 shadow-sm"
                                            >
                                                <option value="note">Internal Note</option>
                                                <option value="email">Email Sent/Received</option>
                                                <option value="call">Phone Call</option>
                                                <option value="support_ticket">Support Ticket</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reference Title (Optional)</label>
                                            <input
                                                type="text"
                                                value={newNoteTitle}
                                                onChange={(e) => setNewNoteTitle(e.target.value)}
                                                placeholder="e.g. Billing Question"
                                                className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-bold p-2.5 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Interaction Content</label>
                                        <textarea
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            rows={3}
                                            required
                                            placeholder="Details of the conversation or internal observation..."
                                            className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium p-3 shadow-sm"
                                        />
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingNote(false)}
                                            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={actionLoading}
                                            className="px-6 py-2 bg-brand-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50"
                                        >
                                            {actionLoading ? 'Saving...' : 'Save Log'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="divide-y divide-gray-50 dark:divide-gray-700 p-6">
                            {interactions.length === 0 ? (
                                <div className="text-center py-12">
                                    <ChatBubbleLeftEllipsisIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No communication history</p>
                                </div>
                            ) : (
                                interactions.map((interaction) => (
                                    <div key={interaction.id} className="py-6 first:pt-0 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`p-1.5 rounded-lg ${interaction.type === 'email' ? 'bg-blue-50 text-blue-600' :
                                                    interaction.type === 'call' ? 'bg-emerald-50 text-emerald-600' :
                                                        interaction.type === 'support_ticket' ? 'bg-amber-50 text-amber-600' :
                                                            interaction.type === 'chat' ? 'bg-purple-50 text-purple-600' :
                                                                'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {interaction.type === 'email' && <EnvelopeIcon className="w-4 h-4" />}
                                                    {interaction.type === 'call' && <PhoneIcon className="w-4 h-4" />}
                                                    {interaction.type === 'support_ticket' && <DocumentTextIcon className="w-4 h-4" />}
                                                    {interaction.type === 'chat' && <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />}
                                                    {interaction.type === 'note' && <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {interaction.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-gray-300">•</span>
                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {new Date(interaction.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteInteraction(interaction.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {interaction.title && (
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">{interaction.title}</h4>
                                        )}
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                            {interaction.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientProfile;
