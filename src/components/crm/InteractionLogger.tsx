import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { crmService, CRMInteractionType } from '../../services/crm.service';
import {
    Loader2
} from 'lucide-react';
import {
    DocumentTextIcon,
    EnvelopeIcon,
    PhoneIcon,
    ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';

interface InteractionLoggerProps {
    userId: string;
    onLogSuccess: (newInteraction: any) => void;
    onCancel: () => void;
}

export function InteractionLogger({ userId, onLogSuccess, onCancel }: InteractionLoggerProps) {
    const [type, setType] = useState<CRMInteractionType>('note');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<'open' | 'closed' | 'needs_follow_up'>('closed');
    const [actionLoading, setActionLoading] = useState(false);

    // Specific Fields
    const [callOutcome, setCallOutcome] = useState('answered');
    const [callDuration, setCallDuration] = useState('');
    const [emailDirection, setEmailDirection] = useState('sent');
    const [externalLink, setExternalLink] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setActionLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Construct Metadata
            const metadata: any = {};
            if (externalLink) metadata.external_link = externalLink;

            if (type === 'call') {
                metadata.outcome = callOutcome;
                if (callDuration) metadata.duration_minutes = parseInt(callDuration);
            }

            if (type === 'email') {
                metadata.direction = emailDirection;
            }

            // For emails, Title is Subject
            const finalTitle = title || (
                type === 'call' ? `Phone Call (${callOutcome})` :
                    type === 'email' ? `${emailDirection === 'sent' ? 'Sent' : 'Received'} Email` :
                        null
            );

            const newInteraction = await crmService.addInteraction({
                user_id: userId,
                admin_id: user?.id || null,
                type,
                title: finalTitle,
                content,
                status, // New status field
                metadata: Object.keys(metadata).length > 0 ? metadata : undefined
            });

            onLogSuccess(newInteraction);
        } catch (err: any) {
            alert('Error adding log: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Log New Interaction</h3>
                <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    Close
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Selection */}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto">
                    {[
                        { id: 'note', icon: DocumentTextIcon, label: 'Note' },
                        { id: 'call', icon: PhoneIcon, label: 'Call' },
                        { id: 'email', icon: EnvelopeIcon, label: 'Email' },
                        { id: 'whatsapp', icon: ChatBubbleLeftEllipsisIcon, label: 'WhatsApp' },
                    ].map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setType(t.id as CRMInteractionType)}
                            className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg flex flex-col items-center gap-1 transition-all ${type === t.id
                                    ? 'bg-white dark:bg-gray-800 shadow-sm text-brand-600 dark:text-brand-400 font-bold'
                                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <t.icon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Dynamic Fields based on Type */}
                    {type === 'call' && (
                        <>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Outcome</label>
                                <select
                                    value={callOutcome}
                                    onChange={(e) => setCallOutcome(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                                >
                                    <option value="answered">Answered</option>
                                    <option value="voicemail">Voicemail</option>
                                    <option value="busy">Busy / No Answer</option>
                                    <option value="wrong_number">Wrong Number</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Duration (min)</label>
                                <input
                                    type="number"
                                    value={callDuration}
                                    onChange={(e) => setCallDuration(e.target.value)}
                                    placeholder="e.g. 5"
                                    className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>
                        </>
                    )}

                    {type === 'email' && (
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Direction</label>
                            <select
                                value={emailDirection}
                                onChange={(e) => setEmailDirection(e.target.value)}
                                className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                            >
                                <option value="sent">Sent (Outbound)</option>
                                <option value="received">Received (Inbound)</option>
                            </select>
                        </div>
                    )}

                    {/* Common Fields */}
                    <div className={type === 'call' || type === 'email' ? "" : "col-span-2"}>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                            {type === 'email' ? 'Subject' : 'Title (Optional)'}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={type === 'email' ? 'Re: Invoice #123' : 'Summary of interaction...'}
                            className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    <div className={type === 'call' ? "col-span-2" : ""}>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Interaction Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                        >
                            <option value="open">Open / In Progress</option>
                            <option value="needs_follow_up">Needs Follow-up</option>
                            <option value="closed">Closed / Resolved</option>
                        </select>
                    </div>

                    {type !== 'call' && (
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">External Link</label>
                            <input
                                type="url"
                                value={externalLink}
                                onChange={(e) => setExternalLink(e.target.value)}
                                placeholder="https://..."
                                className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-medium p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes / Content</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        required
                        placeholder="Detailed notes about what happened..."
                        className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-medium p-3 outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                    />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-6 py-2 bg-brand-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20 flex items-center gap-2"
                    >
                        {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Log
                    </button>
                </div>
            </form>
        </div>
    );
}
