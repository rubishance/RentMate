import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Paperclip, Search, MoreVertical,
    Bot, User as UserIcon, Check, CheckCheck,
    RefreshCw, Zap
} from 'lucide-react';
import { WhatsAppInternalService } from '../../services/whatsapp-internal.service';
import { WhatsAppConversation, WhatsAppMessage } from '../../types/database';

export default function SupportChat() {
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dev Tools State
    const [showDevTools, setShowDevTools] = useState(false);
    const [simText, setSimText] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        loadConversations();

        // Auto-refresh for "Offline Mode" (since Realtime relies on DB triggers)
        const interval = setInterval(loadConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    // Load Messages on Select
    useEffect(() => {
        if (selectedId) {
            loadMessages(selectedId);
        }
    }, [selectedId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        const data = await WhatsAppInternalService.getConversations();
        if (data) setConversations(data as any);
        setLoading(false);
    };

    const loadMessages = async (id: string) => {
        const data = await WhatsAppInternalService.getMessages(id);
        if (data) setMessages(data);
    };

    const handleSend = async () => {
        if (!inputText.trim() || !selectedId) return;

        const originalText = inputText;
        setInputText(''); // Optimistic clear

        try {
            // Optimistic update
            const tempMsg: any = {
                id: 'temp-' + Date.now(),
                content: { text: originalText },
                direction: 'outbound',
                status: 'sent',
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMsg]);

            await WhatsAppInternalService.sendMessage(selectedId, originalText);
            await loadMessages(selectedId); // Refresh for real ID
        } catch (err: any) {
            console.error('Failed to send', err);
            setInputText(originalText); // Revert
            setMessages(prev => prev.filter(m => !String(m.id).startsWith('temp-'))); // Remove optimistic msg

            if (err.code === 'LIMIT_EXCEEDED') {
                setError(`WhatsApp limit reached for this user (${err.details.current_usage}/${err.details.limit}). Increase limit in Plan Settings.`);
            } else {
                setError(err.message || 'Failed to send message');
            }
        }
    };

    const handleSimulateReply = async () => {
        if (!simText.trim() || !selectedId) return;
        await WhatsAppInternalService.simulateIncomingReply(selectedId, simText);
        setSimText('');
        await loadMessages(selectedId);
        await loadConversations();
    };

    const activeConversation = conversations.find(c => c.id === selectedId);

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">

            {/* LEFT SIDEBAR: Conversations */}
            <div className="w-80 border-r border-border flex flex-col bg-background/50">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold text-lg">Chats</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDevTools(!showDevTools)}
                            className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${showDevTools ? 'text-primary bg-primary/5' : 'text-slate-400'}`}
                            title="Toggle Dev Simulator"
                        >
                            <Zap className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
                            <RefreshCw className="w-4 h-4" onClick={() => loadConversations()} />
                        </button>
                    </div>
                </div>

                {/* Sub-header Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center">
                            <p className="text-slate-400 text-sm mb-4">No active chats</p>
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    await WhatsAppInternalService.createMockConversation('+972500000000', 'Test User');
                                    await loadConversations();
                                }}
                                className="text-xs bg-primary/10 text-primary px-3 py-2 rounded-lg font-bold hover:opacity-80 transition-opacity"
                            >
                                + Create Test Chat
                            </button>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedId(conv.id)}
                                className={`p-4 border-b border-border/50/50 cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-800 transition-colors ${selectedId === conv.id ? 'bg-primary/5 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-foreground truncate">
                                        {(conv as any).user_profiles?.full_name || conv.phone_number}
                                    </span>
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground truncate max-w-[140px]">
                                        {/* Preview logic would go here */}
                                        Click to view...
                                    </p>
                                    {conv.unread_count > 0 && (
                                        <span className="bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative">
                {/* Chat Background Pattern (Optional CSS) */}
                <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                </div>

                {selectedId && activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="h-16 bg-muted border-b border-border flex items-center justify-between px-6 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground leading-none mb-1">
                                        {(activeConversation as any).user_profiles?.full_name || activeConversation.phone_number}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {activeConversation.phone_number} • {activeConversation.status}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                                    <Search className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* DEV SIMULATOR PANEL */}
                        <AnimatePresence>
                            {showDevTools && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-2 z-10"
                                >
                                    <div className="flex gap-2 items-center text-sm px-4">
                                        <Zap className="w-4 h-4 text-amber-600" />
                                        <span className="font-bold text-amber-800 dark:text-amber-200 uppercase text-xs tracking-wider">Simulator:</span>
                                        <input
                                            value={simText}
                                            onChange={(e) => setSimText(e.target.value)}
                                            placeholder="Simulate user reply..."
                                            className="flex-1 px-3 py-1 text-xs border border-amber-300 rounded bg-white dark:bg-black/50"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSimulateReply()}
                                        />
                                        <button
                                            onClick={handleSimulateReply}
                                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-xs font-bold"
                                        >
                                            Inbound
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>


                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 z-0">
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center justify-between gap-3 text-red-700 dark:text-red-400 font-bold text-sm mb-4">
                                    <div className="flex items-center gap-3">
                                        <RefreshCw className="w-5 h-5 animate-spin hidden" />
                                        <span>{error}</span>
                                    </div>
                                    <button onClick={() => setError(null)} className="text-xs uppercase hover:underline">Dismiss</button>
                                </div>
                            )}
                            {messages.map((msg) => {
                                const isMe = msg.direction === 'outbound';
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm relative ${isMe
                                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-none'
                                                : 'bg-card text-foreground rounded-tl-none'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {(msg.content as any).text || JSON.stringify(msg.content)}
                                            </p>
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                <span className="text-xs">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-primary" /> : <Check className="w-3 h-3" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-muted border-t border-border z-10 pb-6 md:pb-4">
                            <div className="max-w-4xl mx-auto flex items-end gap-2">
                                <button className="p-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                    <Paperclip className="w-6 h-6" />
                                </button>

                                <div className="flex-1 bg-card rounded-2xl border border-border px-4 py-3 flex items-center shadow-sm focus-within:ring-2 focus-within:ring-primary/50">
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        className="w-full bg-transparent border-none outline-none resize-none max-h-32 text-sm"
                                        rows={1}
                                    />
                                </div>

                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim()}
                                    className="p-3 bg-green-500 hover:bg-secondary text-white rounded-full shadow-lg disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
                                >
                                    <Send className="w-5 h-5 ml-0.5" />
                                </button>
                            </div>
                            <div className="text-center mt-2">
                                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                                    WhatsApp Business • Secure End-to-End
                                </span>
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Bot className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-muted-foreground mb-2">WhatsApp for RentMate</h3>
                        <p className="max-w-xs text-center text-sm">
                            Select a conversation to start chatting or simulating messages.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
