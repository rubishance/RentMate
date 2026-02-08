import {
    EnvelopeIcon,
    PhoneIcon,
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    ClockIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    ArrowRightOnRectangleIcon,
    TicketIcon,
    BugAntIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CRMInteraction } from '../../services/crm.service';

interface TimelineItemProps {
    interaction: CRMInteraction;
    onDelete: (id: number | string) => void;
    onReassign: (id: number | string, type: string) => void;
    onOpenBotChat: (metadata: any) => void;
}

export function TimelineItem({ interaction, onDelete, onReassign, onOpenBotChat }: TimelineItemProps) {
    const isBot = interaction.type === 'chat';
    const isTicket = interaction.type === 'support_ticket';
    const isWhatsApp = interaction.type === 'whatsapp';

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'email': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'call': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'support_ticket': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'chat': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'human_chat': return 'bg-brand-50 text-brand-600 border-brand-100';
            case 'whatsapp': return 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20';
            case 'error_report': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'email': return <EnvelopeIcon className="w-4 h-4" />;
            case 'call': return <PhoneIcon className="w-4 h-4" />;
            case 'support_ticket': return <TicketIcon className="w-4 h-4" />;
            case 'chat': return <span className="text-[10px] font-black">AI</span>;
            case 'human_chat': return <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />;
            case 'whatsapp': return <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />;
            case 'error_report': return <BugAntIcon className="w-4 h-4" />;
            default: return <DocumentTextIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="py-6 first:pt-0 group relative pl-8 border-l-2 border-slate-100 dark:border-slate-800 ml-3">
            {/* Timeline Dot */}
            <div className={`absolute -left-[9px] top-6 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${isBot ? 'bg-purple-400' :
                isTicket ? 'bg-amber-400' :
                    interaction.type === 'human_chat' ? 'bg-brand-400' :
                        isWhatsApp ? 'bg-[#25D366]' :
                            interaction.type === 'error_report' ? 'bg-red-500' :
                                'bg-gray-300'
                }`} />

            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border ${getTypeStyles(interaction.type)}`}>
                        {getTypeIcon(interaction.type)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {interaction.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {new Date(interaction.created_at).toLocaleString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {interaction.metadata?.external_link && (
                        <a
                            href={interaction.metadata.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 px-2 flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            <ArrowDownTrayIcon className="w-3 h-3 rotate-180" />
                            LINK
                        </a>
                    )}
                    {/* Only allow deleting manual notes/logs */}
                    {!isBot && !isTicket && interaction.type !== 'human_chat' && !isWhatsApp && (
                        <button
                            onClick={() => onDelete(interaction.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                            title="Delete Item"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}

                    {/* Allow Reassigning for most types */}
                    <button
                        onClick={() => onReassign(interaction.id, interaction.type)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-500 transition-all"
                        title="Move to another user"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {interaction.title && (
                <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                    {interaction.title}
                    {(isBot || interaction.type === 'human_chat') && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isBot ? 'bg-purple-50 text-purple-600' : 'bg-brand-50 text-brand-600'}`}>
                            {interaction.metadata?.messages?.length || 0} msgs
                        </span>
                    )}
                    {isTicket && interaction.status && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${interaction.status === 'open' ? 'bg-red-50 text-red-600 border-red-100' :
                            interaction.status === 'resolved' ? 'bg-green-50 text-green-600 border-green-100' :
                                'bg-gray-50 text-gray-600 border-gray-100'
                            }`}>
                            {interaction.status.replace('_', ' ')}
                        </span>
                    )}
                    {!isBot && !isTicket && interaction.type !== 'human_chat' && interaction.status && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${interaction.status === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            interaction.status === 'needs_follow_up' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                            {interaction.status.replace('_', ' ')}
                        </span>
                    )}
                </h4>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                {interaction.content}

                {isTicket && interaction.metadata?.ai_analysis && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${interaction.metadata.ai_analysis.urgency_level === 'critical' ? 'bg-red-500 text-white border-red-600' :
                                interaction.metadata.ai_analysis.urgency_level === 'high' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                    'bg-blue-50 text-blue-600 border-blue-200'
                                }`}>
                                AI Priority: {interaction.metadata.ai_analysis.urgency_level}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                AI Category: {interaction.metadata.ai_analysis.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${interaction.metadata.ai_analysis.sentiment_score < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                }`}>
                                Sentiment: {interaction.metadata.ai_analysis.sentiment_score?.toFixed(2)}
                            </span>
                        </div>

                        {interaction.metadata.ai_analysis.ai_summary && (
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">AI Summary</span>
                                <p className="text-xs italic text-gray-500">{interaction.metadata.ai_analysis.ai_summary}</p>
                            </div>
                        )}

                        {interaction.metadata?.auto_reply_draft && (
                            <div className="bg-brand-50/30 dark:bg-brand-500/5 p-4 rounded-xl border border-brand-100 dark:border-brand-500/20">
                                <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest block mb-2">AI Proposed Response</span>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{interaction.metadata.auto_reply_draft}</p>
                                <button className="px-4 py-2 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-brand-700 transition-all shadow-minimal">
                                    Approve & Send
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isTicket && interaction.metadata?.resolution_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Resolution Notes</span>
                        <p className="text-gray-800 dark:text-gray-200">{interaction.metadata.resolution_notes}</p>
                    </div>
                )}
            </div>

            {interaction.type === 'error_report' && (
                <div className="mt-3 p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100/50 dark:border-red-900/20">
                    <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                        <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="font-bold">Error Context</p>
                            <p className="font-mono text-[10px] bg-white/50 dark:bg-black/20 p-1.5 rounded border border-red-100/30">
                                Route: {interaction.metadata?.route || 'N/A'}
                            </p>
                            {interaction.metadata?.stack && (
                                <details className="cursor-pointer">
                                    <summary className="hover:underline font-bold">View Stack Trace</summary>
                                    <pre className="mt-2 text-[8px] overflow-x-auto p-2 bg-black/5 rounded text-gray-500 max-h-40">
                                        {interaction.metadata.stack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {(isBot || interaction.type === 'human_chat' || isWhatsApp) && (
                <button
                    onClick={() => onOpenBotChat(interaction.metadata)}
                    className={`mt-3 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 group/btn ${isBot ? 'text-purple-600' :
                        isWhatsApp ? 'text-[#25D366]' :
                            'text-brand-600'
                        }`}
                >
                    <ChatBubbleLeftEllipsisIcon className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    Open Transcript
                </button>
            )}
        </div>
    );
}
