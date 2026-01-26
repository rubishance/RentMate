import {
    EnvelopeIcon,
    PhoneIcon,
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    ClockIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    TicketIcon
} from '@heroicons/react/24/outline';
import { CRMInteraction } from '../../services/crm.service';

interface TimelineItemProps {
    interaction: CRMInteraction;
    onDelete: (id: number | string) => void;
    onOpenBotChat: (metadata: any) => void;
}

export function TimelineItem({ interaction, onDelete, onOpenBotChat }: TimelineItemProps) {
    const isBot = interaction.type === 'chat';
    const isTicket = interaction.type === 'support_ticket';

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'email': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'call': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'support_ticket': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'chat': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'human_chat': return 'bg-brand-50 text-brand-600 border-brand-100';
            case 'whatsapp': return 'bg-green-50 text-green-600 border-green-100';
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
            default: return <DocumentTextIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="py-6 first:pt-0 group relative pl-8 border-l-2 border-slate-100 dark:border-slate-800 ml-3">
            {/* Timeline Dot */}
            <div className={`absolute -left-[9px] top-6 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${isBot ? 'bg-purple-400' : isTicket ? 'bg-amber-400' : interaction.type === 'human_chat' ? 'bg-brand-400' : 'bg-gray-300'
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
                    {!isBot && !isTicket && interaction.type !== 'human_chat' && (
                        <button
                            onClick={() => onDelete(interaction.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
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

                {isTicket && interaction.metadata?.resolution_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Resolution Notes</span>
                        <p className="text-gray-800 dark:text-gray-200">{interaction.metadata.resolution_notes}</p>
                    </div>
                )}
            </div>

            {(isBot || interaction.type === 'human_chat') && (
                <button
                    onClick={() => onOpenBotChat(interaction.metadata)}
                    className={`mt-3 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 group/btn ${isBot ? 'text-purple-600' : 'text-brand-600'}`}
                >
                    <ChatBubbleLeftEllipsisIcon className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    Open Transcript
                </button>
            )}
        </div>
    );
}
