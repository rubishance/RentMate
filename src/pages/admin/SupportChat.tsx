import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Paperclip, Search, MoreVertical,
    Bot, User as UserIcon, Check, CheckCheck,
    RefreshCw, Zap, Reply, X, Loader2
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
    const [replyingTo, setReplyingTo] = useState<{ id: string, text: string, whatsappId: string } | null>(null);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);



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

        // Mark as read when messages are loaded
        await WhatsAppInternalService.markAsRead(id);
        await loadConversations(); // Refresh sidebar to remove badge
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (16MB max)
        if (file.size > 16 * 1024 * 1024) {
            setError('File is too large. Max size is 16MB.');
            return;
        }

        setAttachment(file);
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !attachment) || !selectedId) return;

        const originalText = inputText;
        const currentReply = replyingTo;
        const currentAttachment = attachment;
        
        setInputText(''); // Optimistic clear
        setReplyingTo(null);
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            if (currentAttachment) setIsUploading(true);

            // Optimistic update
            const tempMsg: any = {
                id: 'temp-' + Date.now(),
                content: { 
                    text: originalText, 
                    media: currentAttachment ? { filename: currentAttachment.name } : undefined 
                },
                direction: 'outbound',
                status: 'sent',
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMsg]);

            await WhatsAppInternalService.sendMessage(selectedId, originalText, currentReply?.whatsappId, currentAttachment || undefined);
            
            if (currentAttachment) setIsUploading(false);

            await loadMessages(selectedId); // Refresh for real ID
        } catch (err: any) {
            if (currentAttachment) setIsUploading(false);
            console.error('Failed to send', err);
            setInputText(originalText); // Revert
            setReplyingTo(currentReply);
            setAttachment(currentAttachment);
            setMessages(prev => prev.filter(m => !String(m.id).startsWith('temp-'))); // Remove optimistic msg

            if (err.code === 'LIMIT_EXCEEDED') {
                setError(`WhatsApp limit reached for this user (${err.details.current_usage}/${err.details.limit}). Increase limit in Plan Settings.`);
            } else {
                setError(err.message || 'Failed to send message');
            }
        }
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

                        <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400">
                            <RefreshCw className="w-4 h-4" onClick={() => loadConversations()} />
                        </button>
                    </div>
                </div>

                {/* Sub-header Search */}
                <div className="p-2 sm:p-4">
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
                                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center">
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




                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 z-0">
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center justify-between gap-2 sm:gap-4 text-red-700 dark:text-red-400 font-bold text-sm mb-4">
                                    <div className="flex items-center gap-2 sm:gap-4">
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
                                        className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {!isMe && (
                                            <button
                                                onClick={() => setReplyingTo({ id: msg.id, text: (msg.content as any).text, whatsappId: (msg.metadata as any)?.whatsapp_id })}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-primary mr-1 flex items-center justify-center self-center disabled:opacity-0"
                                                disabled={!(msg.metadata as any)?.whatsapp_id}
                                                title="Reply"
                                            >
                                                <Reply className="w-5 h-5 -scale-x-100" />
                                            </button>
                                        )}
                                        <div
                                            className={`max-w-[70%] rounded-xl px-4 py-2 shadow-sm relative ${isMe
                                                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-none'
                                                : 'bg-card text-foreground rounded-tl-none'
                                                }`}
                                        >
                                            {/* Media Rendering for Outbound */}
                                            {(msg.content as any).media && (
                                                <div className="mb-2 w-full p-2 bg-black/10 dark:bg-black/20 rounded border border-black/5 dark:border-white/10 flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 opacity-70 shrink-0" />
                                                    <span className="text-xs truncate font-medium max-w-[150px]">
                                                        {(msg.content as any).media.filename || 'Attachment'}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {(msg.content as any).text || ''}
                                                {!(msg.content as any).text && !(msg.content as any).media && JSON.stringify(msg.content)}
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
                                        {isMe && (
                                            <button
                                                onClick={() => setReplyingTo({ id: msg.id, text: (msg.content as any).text, whatsappId: (msg.metadata as any)?.whatsapp_id })}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-primary ml-1 flex items-center justify-center self-center disabled:opacity-0"
                                                disabled={!(msg.metadata as any)?.whatsapp_id}
                                                title="Reply"
                                            >
                                                <Reply className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-muted border-t border-border z-10 pb-6 md:pb-4 relative">
                            <AnimatePresence>
                                {attachment && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute bottom-[calc(100%-8px)] left-4 right-4 bg-background/95 backdrop-blur shadow-[0_-4px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_15px_rgba(0,0,0,0.3)] rounded-t-xl border border-b-0 border-border px-4 py-2 sm:py-4 flex items-center justify-between z-20"
                                    >
                                        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                {attachment.type.startsWith('image/') ? (
                                                    <img src={URL.createObjectURL(attachment)} alt="Preview" className="w-full h-full object-cover rounded opacity-80" />
                                                ) : (
                                                    <Paperclip className="w-5 h-5 text-primary" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <p className="text-xs font-bold text-foreground truncate">{attachment.name}</p>
                                                <p className="text-xs text-muted-foreground">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setAttachment(null)} className="ml-2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors" disabled={isUploading}>
                                            <X className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                )}
                                {replyingTo && !attachment && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute bottom-[calc(100%-8px)] left-4 right-4 bg-background/95 backdrop-blur shadow-[0_-4px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_15px_rgba(0,0,0,0.3)] rounded-t-xl border border-b-0 border-border px-4 py-2 sm:py-4 flex items-start justify-between z-20"
                                    >
                                        <div className="flex-1 overflow-hidden border-l-4 border-l-primary pl-3 bg-muted/40 rounded-r-lg py-1 pr-2">
                                            <p className="text-xs font-bold text-primary mb-0.5">Replying to message</p>
                                            <p className="text-sm text-foreground/80 truncate">{replyingTo.text}</p>
                                        </div>
                                        <button onClick={() => setReplyingTo(null)} className="ml-2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="max-w-4xl mx-auto flex items-end gap-2 relative z-30">
                                <button
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="p-2 sm:p-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 transition-colors"
                                >
                                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept=".pdf,image/*"
                                />

                                <div className="flex-1 bg-card rounded-2xl border border-border px-4 py-2 sm:py-4 flex items-center shadow-sm focus-within:ring-2 focus-within:ring-primary/50">
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
                                    disabled={(!inputText.trim() && !attachment) || isUploading}
                                    className="p-2 sm:p-4 bg-green-500 hover:bg-blue-50 text-white rounded-full shadow-lg disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
                                >
                                    {isUploading ? <Loader2 className="w-5 h-5 ml-0.5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
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
