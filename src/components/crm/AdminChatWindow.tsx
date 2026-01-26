import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { crmService } from '../../services/crm.service';
import {
    PaperAirplaneIcon,
    XMarkIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

interface AdminChatWindowProps {
    userId: string;
    adminId: string;
    onClose: () => void;
}

export function AdminChatWindow({ userId, adminId, onClose }: AdminChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [conversation, setConversation] = useState<any>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initializeChat();

        // Real-time subscription
        const channel = supabase
            .channel('human_chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'human_messages' },
                (payload) => {
                    if (payload.new.conversation_id === conversation?.id) {
                        setMessages((prev) => [...prev, payload.new]);
                        scrollToBottom();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initializeChat = async () => {
        setLoading(true);
        try {
            // 1. Get or Create active conversation
            let activeConv = await crmService.getActiveHumanChat(userId);
            if (!activeConv) {
                activeConv = await crmService.startHumanChat(userId, adminId);
            }
            setConversation(activeConv);

            // 2. Load History
            const history = await crmService.getHumanMessages(activeConv.id);
            setMessages(history || []);
        } catch (err) {
            console.error('Failed to init chat', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversation) return;

        setSending(true);
        try {
            await crmService.sendHumanMessage(
                conversation.id,
                adminId,
                newMessage,
                'admin' // Role is explicitly admin here
            );
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send', err);
        } finally {
            setSending(false);
        }
    };

    const handleEndChat = async () => {
        if (!confirm('End this live chat session?')) return;
        try {
            await crmService.closeHumanChat(conversation.id);
            onClose();
        } catch (err) {
            console.error('Failed to close chat', err);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="p-4 bg-brand-600 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    <h3 className="font-black text-sm uppercase tracking-widest">Live Support</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEndChat}
                        className="text-[10px] font-bold bg-brand-700 hover:bg-brand-800 px-2 py-1 rounded transition-colors"
                    >
                        End Chat
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-brand-500 rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <>
                        {messages.length === 0 && (
                            <p className="text-center text-xs text-gray-400 font-medium italic mt-10">
                                This is the start of the live conversation.
                            </p>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.role === 'admin' ? 'items-end' : 'items-start'}`}
                            >
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium ${msg.role === 'admin'
                                        ? 'bg-brand-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[9px] text-gray-400 mt-1 px-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-brand-500 rounded-xl text-sm outline-none transition-all"
                        disabled={loading || sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:bg-gray-400 transition-all"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
