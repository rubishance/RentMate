import { useRef, useEffect, useState } from 'react';
import { MessageCircle, X, Send, Bot, Mic, MicOff, Paperclip, Loader2, Headphones, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatBot } from '../../hooks/useChatBot';
import { BotIcon } from './BotIcon';
import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { crmService } from '../../services/crm.service';
import { useStack } from '../../contexts/StackContext';
import { useTranslation } from '../../hooks/useTranslation';

// Modals
import { AddPaymentModal } from '../modals/AddPaymentModal';
import { AddMaintenanceModal } from '../modals/AddMaintenanceModal';

export function ChatWidget() {
    const { t } = useTranslation();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';
    const { isOpen, toggleChat, isLoading, messages: botMessages, sendMessage: sendBotMessage, uiAction, clearUiAction, isAiMode, activateAiMode, deactivateAiMode } = useChatBot();
    const navigate = useNavigate();
    const { push } = useStack();
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isListening, setIsListening] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    // Hybrid Mode State
    const [isHybridEnabled, setIsHybridEnabled] = useState(true); // Default to true (safe)
    const [checkingHybrid, setCheckingHybrid] = useState(true);

    // Human Chat State
    const [mode, setMode] = useState<'ai' | 'human'>('ai');
    const [humanMessages, setHumanMessages] = useState<any[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isHumanChatEnabled, setIsHumanChatEnabled] = useState(false);
    const [checkingSettings, setCheckingSettings] = useState(true);

    // Modal States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);

    const [user, setUser] = useState<any>(null);

    // Check System Settings & Human Chat Status
    useEffect(() => {
        const checkSettings = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                setUser(authUser);

                // 1. Check Global Chat Settings
                const { data: humanSetting } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'live_chat_enabled')
                    .single();

                const isHumanEnabled = (humanSetting?.value === true || humanSetting?.value === 'true') && !!authUser;
                setIsHumanChatEnabled(isHumanEnabled);

                // 2. Check Hybrid Mode Setting
                const { data: hybridSetting } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'hybrid_chat_mode')
                    .single();

                // If setting exists, use it. If not, default to TRUE (Menu Mode)
                const hybridEnabled = hybridSetting ? (hybridSetting.value === true || hybridSetting.value === 'true') : true;
                setIsHybridEnabled(hybridEnabled);

                // If Hybrid is OFF, auto-activate AI
                if (!hybridEnabled) {
                    activateAiMode();
                }

                // 3. Check for active conversation to auto-switch
                if (authUser) {
                    const activeChat = await crmService.getActiveHumanChat(authUser.id);
                    if (activeChat) {
                        setConversationId(activeChat.id);
                        setMode('human');
                        loadHumanMessages(activeChat.id);
                    }
                }
            } catch (err) {
                console.error('Error checking chat settings:', err);
            } finally {
                setCheckingSettings(false);
                setCheckingHybrid(false);
            }
        };

        if (isOpen) checkSettings();
    }, [isOpen]);

    // Real-time Human Messages
    useEffect(() => {
        if (!conversationId || mode !== 'human') return;

        const channel = supabase
            .channel('human_chat_user')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'human_messages' },
                (payload) => {
                    if (payload.new.conversation_id === conversationId) {
                        setHumanMessages((prev) => [...prev, payload.new]);
                        setTimeout(scrollToBottom, 100);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [conversationId, mode]);

    const loadHumanMessages = async (convId: string) => {
        const msgs = await crmService.getHumanMessages(convId);
        setHumanMessages(msgs || []);
    };

    const startHumanChat = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return alert('Please log in to contact support.');

            const conv = await crmService.startHumanChat(user.id, 'system'); // Admin ID handled by backend trigger usually, or allows null
            setConversationId(conv.id);
            setMode('human');
            loadHumanMessages(conv.id);
        } catch (err) {
            console.error('Failed to start human chat', err);
            alert('Unable to connect to support right now.');
        }
    };

    // Handle UI Actions from Bot
    useEffect(() => {
        if (uiAction) {
            if (uiAction.action === 'OPEN_MODAL') {
                if (uiAction.modal === 'contract' || uiAction.modal === 'tenant' || uiAction.modal === 'add_tenant') {
                    // Contracts and Tenants now handled by the contract wizard
                    navigate('/contracts/new', { state: { prefill: uiAction.data } });
                } else if (uiAction.modal === 'property' || uiAction.modal === 'add_property') {
                    push('wizard', { initialData: uiAction.data }, { title: t('addProperty'), isExpanded: true });
                } else if (uiAction.modal === 'maintenance' || uiAction.modal === 'add_maintenance') {
                    push('maintenance_chat', { propertyAddress: uiAction.data?.address }, { title: t('maintenance'), isExpanded: true });
                } else {
                    setModalData(uiAction.data);
                    setActiveModal(uiAction.modal);
                }
            } else if (uiAction.action === 'TRIGGER_HUMAN') {
                startHumanChat();
            }
            clearUiAction();
        }
    }, [uiAction, navigate, clearUiAction, push]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [botMessages, humanMessages, mode]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = false;
            recognitionInstance.lang = 'he-IL'; // Hebrew by default

            recognitionInstance.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (inputRef.current) {
                    inputRef.current.value = transcript;
                }
                setIsListening(false);
            };

            recognitionInstance.onerror = () => {
                setIsListening(false);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputRef.current?.value;
        if (!text) return;

        if (mode === 'ai') {
            await sendBotMessage(text);
        } else {
            // Send Human Message
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && conversationId) {
                    await crmService.sendHumanMessage(conversationId, user.id, text, 'user');
                }
            } catch (err) {
                console.error('Failed to send message', err);
            }
        }

        if (inputRef.current) inputRef.current.value = '';
    };

    const toggleVoiceInput = () => {
        if (!recognition) {
            alert('Voice input is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size check (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Max size is 5MB.');
            return;
        }

        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
            const path = `${user.id}/chat-temp/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('secure_documents')
                .upload(path, file);

            if (uploadError) throw uploadError;

            // Send message with file info
            if (mode === 'ai') {
                await sendBotMessage(`Uploaded file: ${file.name}`, { name: file.name, path });
            } else {
                await crmService.sendHumanMessage(conversationId!, user.id, `[Attached File: ${file.name}]`, 'user');
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            console.error('Upload error:', err);
            alert(`Failed to upload file: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const activeMessages = mode === 'ai' ? botMessages : humanMessages;

    return (
        <motion.div
            drag
            dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
            dragElastic={0.1}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            className="fixed bottom-24 right-6 z-[60] flex flex-col items-end space-y-4"
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[350px] h-[540px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className={`p-4 border-b border-white/10 flex justify-between items-center text-white cursor-move transition-colors ${mode === 'human' ? 'bg-brand-900/90' : 'bg-black'
                            }`}>
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                <div className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg flex items-center justify-center overflow-hidden w-9 h-9 border border-white/20">
                                    {mode === 'human' ? (
                                        <Headphones className="w-5 h-5 text-brand-600" />
                                    ) : (
                                        <BotIcon size={24} className="relative z-10" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{mode === 'human' ? 'תמיכה אנושית' : 'Renty - תמיכה חכמה'}</h3>
                                    <p className="text-xs text-gray-400">{mode === 'human' ? 'מחובר לנציג שירות' : (isRtl ? 'העוזר האישי שלך' : 'Your Personal Assistant')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {isHumanChatEnabled && mode === 'ai' && (
                                    <button
                                        onClick={startHumanChat}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold text-brand-300"
                                        title="Speak to Human"
                                    >
                                        <Headphones className="w-4 h-4" />
                                    </button>
                                )}
                                {mode === 'human' && (
                                    <button
                                        onClick={() => setMode('ai')}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300"
                                        title="Back to Bot"
                                    >
                                        <Bot className="w-4 h-4" />
                                    </button>
                                )}
                                {/* Exit AI Mode Button (Back to Menu) */}
                                {mode === 'ai' && isAiMode && isHybridEnabled && (
                                    <button
                                        onClick={deactivateAiMode}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300"
                                        title="Back to Menu"
                                    >
                                        <div className="grid grid-cols-2 gap-[2px] w-3.5 h-3.5">
                                            <div className="bg-white rounded-[1px]"></div>
                                            <div className="bg-white rounded-[1px]"></div>
                                            <div className="bg-white rounded-[1px]"></div>
                                            <div className="bg-white rounded-[1px]"></div>
                                        </div>
                                    </button>
                                )}
                                <button
                                    onClick={toggleChat}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA: Menu OR Messages */}
                        {!isAiMode && mode === 'ai' ? (
                            // --- MAIN MENU ---
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/5">
                                <div className="text-center mb-6 mt-4">
                                    <p className="text-white text-lg font-bold">
                                        {isRtl ? 'שלום! איך אני יכול לעזור?' : 'Hello! How can I help?'}
                                    </p>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {isRtl ? 'בחר אפשרות מהתפריט:' : 'Choose an option:'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => navigate('/add-property')}
                                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-right flex items-center justify-between group transition-all border border-white/5 hover:border-white/20"
                                    >
                                        <span className="text-white font-medium text-sm">📝 {isRtl ? 'הוספת נכס חדש' : 'Add Property'}</span>
                                    </button>

                                    <button
                                        onClick={() => navigate('/calculator')}
                                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-right flex items-center justify-between group transition-all border border-white/5 hover:border-white/20"
                                    >
                                        <span className="text-white font-medium text-sm">🧮 {isRtl ? 'מחשבון שכר דירה' : 'Rent Calculator'}</span>
                                    </button>

                                    <button
                                        onClick={() => navigate('/contracts')}
                                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-right flex items-center justify-between group transition-all border border-white/5 hover:border-white/20"
                                    >
                                        <span className="text-white font-medium text-sm">📂 {isRtl ? 'החוזים שלי' : 'My Contracts'}</span>
                                    </button>

                                    <button
                                        onClick={() => window.open('https://wa.me/972501234567', '_blank')}
                                        className="bg-white/10 hover:bg-white/20 p-4 rounded-xl text-right flex items-center justify-between group transition-all border border-white/5 hover:border-white/20"
                                    >
                                        <span className="text-white font-medium text-sm">💬 {isRtl ? 'תמיכה בווצאפ' : 'WhatsApp Support'}</span>
                                    </button>

                                    <div className="my-2 border-t border-white/10"></div>

                                    <button
                                        onClick={activateAiMode}
                                        className="bg-brand-600 hover:bg-brand-500 p-4 rounded-xl text-right flex items-center justify-center gap-2 group transition-all shadow-lg shadow-brand-900/50"
                                    >
                                        <Bot className="w-5 h-5 text-white animate-pulse" />
                                        <span className="text-white font-bold text-sm">{isRtl ? 'לצ׳אט עם נציג AI' : 'Chat with AI Agent'}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // --- MESSAGES ---
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-white/5">
                                {activeMessages.map((msg, idx) => {
                                    const isUser = msg.role === 'user';
                                    const isAdmin = mode === 'human' && msg.role === 'admin';

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isUser
                                                    ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none border border-white/10"
                                                    : isAdmin
                                                        ? "bg-brand-600 text-white rounded-bl-none"
                                                        : "bg-white/90 dark:bg-neutral-800 text-black dark:text-white rounded-bl-none border border-white/20"
                                                    }`}
                                                dir="auto"
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isListening && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/10 border border-white/5 p-3 rounded-2xl rounded-bl-none">
                                            <div className="flex items-center space-x-2 text-white">
                                                <Mic className="w-4 h-4 animate-pulse" />
                                                <span className="text-sm">מקשיב...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isLoading && mode === 'ai' && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/10 border border-white/5 p-3 rounded-2xl rounded-bl-none">
                                            <div className="flex space-x-2">
                                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                                                <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
                                                <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        {/* Input - Only show in AI Mode or Human Mode */}
                        {(isAiMode || mode === 'human') && (
                            <form onSubmit={handleSubmit} className="px-5 py-4 bg-black border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="p-2 bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                                        aria-label="שלח הודעה"
                                    >
                                        <Send className="w-5 h-5 text-black" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleVoiceInput}
                                        className={`p-2 rounded-xl transition-colors shrink-0 ${isListening
                                            ? 'bg-red-600 hover:bg-red-500'
                                            : 'bg-white/10 hover:bg-white/20'
                                            } `}
                                        aria-label={isListening ? 'עצור הקלטה' : 'התחל הקלטה'}
                                    >
                                        {isListening ? (
                                            <MicOff className="w-5 h-5 text-white" />
                                        ) : (
                                            <Mic className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || isLoading || !user}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0 disabled:opacity-20"
                                        aria-label="צרף קובץ"
                                    >
                                        {isUploading ? (
                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        ) : (
                                            <Paperclip className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        accept=".pdf,image/*"
                                    />
                                    <div className="flex-1">
                                        <label htmlFor="chat-input" className="sr-only">שאלה לצ׳אט</label>
                                        <input
                                            id="chat-input"
                                            ref={inputRef}
                                            type="text"
                                            placeholder={
                                                mode === 'human'
                                                    ? (isRtl ? "שלח הודעה לנציג..." : "Message agent...")
                                                    : (!user
                                                        ? (isRtl ? "שאל על RentMate..." : "Ask about RentMate...")
                                                        : (isRtl ? "שאל שאלה או דבר..." : "Ask or tell me something...")
                                                    )
                                            }
                                            dir="auto"
                                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
                                        />
                                    </div>
                                </div>
                            </form>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB - Just the Head */}
            <motion.button
                onClick={toggleChat}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="p-0 bg-transparent transition-all border-none outline-none focus:outline-none relative group"
            >
                {/* Aura Glow */}
                <div className={`absolute inset-0 blur-xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-500 opacity-0 group-hover:opacity-100 ${mode === 'human' ? 'bg-brand-500/40' : 'bg-gold/20'
                    }`}></div>

                {mode === 'human' ? (
                    <div className="bg-brand-600 p-4 rounded-full shadow-lg border-2 border-white/20">
                        <Headphones className="w-8 h-8 text-white" />
                    </div>
                ) : (
                    <BotIcon size={64} className="relative z-10" />
                )}
            </motion.button>

            {/* AI-Triggered Modals */}
            <AddPaymentModal
                isOpen={activeModal === 'payment' || activeModal === 'add_payment'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
                initialData={modalData}
            />
            <AddMaintenanceModal
                isOpen={activeModal === 'maintenance' || activeModal === 'add_maintenance'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
                initialData={modalData}
            />
        </motion.div>
    );
}
