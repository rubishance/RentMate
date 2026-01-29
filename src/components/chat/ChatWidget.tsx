import { useRef, useEffect, useState } from 'react';
import { MessageCircle, X, Send, Bot, Mic, MicOff, Paperclip, Loader2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatBot } from '../../hooks/useChatBot';
import { BotIcon } from './BotIcon';
import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { crmService } from '../../services/crm.service';
import { useStack } from '../../contexts/StackContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useDataCache } from '../../contexts/DataCacheContext';

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
    const { clear } = useDataCache();
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isListening, setIsListening] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    // Hybrid Mode State
    const [isHybridEnabled, setIsHybridEnabled] = useState(true); // Default to true (safe)
    const [checkingHybrid, setCheckingHybrid] = useState(true);

    // AI Chat State
    const [conversationId, setConversationId] = useState<string | null>(null);
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
            } catch (err) {
                console.error('Error checking chat settings:', err);
            } finally {
                setCheckingSettings(false);
                setCheckingHybrid(false);
            }
        };

        if (isOpen) checkSettings();
    }, [isOpen]);



    // Handle UI Actions from Bot
    useEffect(() => {
        if (uiAction) {
            if (uiAction.action === 'OPEN_MODAL') {
                if (uiAction.modal === 'contract' || uiAction.modal === 'tenant' || uiAction.modal === 'add_tenant') {
                    // Contracts and Tenants now handled by the contract wizard
                    navigate('/contracts/new', { state: { prefill: uiAction.data } });
                } else if (uiAction.modal === 'property' || uiAction.modal === 'add_property') {
                    push('wizard', {
                        initialData: uiAction.data,
                        onSuccess: () => clear()
                    }, { title: t('addProperty'), isExpanded: true });
                } else if (uiAction.modal === 'maintenance' || uiAction.modal === 'add_maintenance') {
                    push('maintenance_chat', { propertyAddress: uiAction.data?.address }, { title: t('maintenance'), isExpanded: true });
                } else {
                    setModalData(uiAction.data);
                    setActiveModal(uiAction.modal);
                }

            }
            clearUiAction();
        }
    }, [uiAction, navigate, clearUiAction, push]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [botMessages]);

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

        await sendBotMessage(text);

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
            await sendBotMessage(`Uploaded file: ${file.name}`, { name: file.name, path });

            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            console.error('Upload error:', err);
            alert(`Failed to upload file: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const activeMessages = botMessages;

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
                        className="w-[350px] h-[540px] bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center cursor-move transition-colors bg-white dark:bg-black text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                <div className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg flex items-center justify-center overflow-hidden w-9 h-9 border border-white/20">
                                    <BotIcon size={24} className="relative z-10" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Renty - תמיכה חכמה</h3>
                                    <p className="text-xs text-gray-400">{isRtl ? 'העוזר האישי שלך' : 'Your Personal Assistant'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">

                                {/* Exit AI Mode Button (Back to Menu) */}

                                <button
                                    onClick={toggleChat}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA: Messages only */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent bg-gray-50 dark:bg-white/5">
                            {activeMessages.map((msg, idx) => {
                                const isUser = msg.role === 'user';

                                return (
                                    <div
                                        key={idx}
                                        className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${isUser
                                                ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none border border-gray-700 dark:border-white/10"
                                                : "bg-white dark:bg-neutral-800 text-black dark:text-white rounded-bl-none border border-gray-200 dark:border-white/20"
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
                                    <div className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 p-3 rounded-2xl rounded-bl-none">
                                        <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                                            <Mic className="w-4 h-4 animate-pulse text-brand-500" />
                                            <span className="text-sm">מקשיב...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 p-3 rounded-2xl rounded-bl-none">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-gray-400 dark:bg-white rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-gray-400 dark:bg-white rounded-full animate-bounce delay-100" />
                                            <div className="w-2 h-2 bg-gray-400 dark:bg-white rounded-full animate-bounce delay-200" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="px-5 py-4 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="p-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                                    aria-label="שלח הודעה"
                                >
                                    <Send className="w-5 h-5 text-white dark:text-black" />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    className={`p-2 rounded-xl transition-colors shrink-0 ${isListening
                                        ? 'bg-red-600 hover:bg-red-500'
                                        : 'bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-200 dark:border-transparent'
                                        } `}
                                    aria-label={isListening ? 'עצור הקלטה' : 'התחל הקלטה'}
                                >
                                    {isListening ? (
                                        <MicOff className="w-5 h-5 text-white" />
                                    ) : (
                                        <Mic className="w-5 h-5 text-gray-700 dark:text-white" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isLoading || !user}
                                    className="p-2 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-200 dark:border-transparent rounded-xl transition-colors shrink-0 disabled:opacity-20"
                                    aria-label="צרף קובץ"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-5 h-5 text-brand-600 dark:text-white animate-spin" />
                                    ) : (
                                        <Paperclip className="w-5 h-5 text-gray-700 dark:text-white" />
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
                                            !user
                                                ? (isRtl ? "שאל על RentMate..." : "Ask about RentMate...")
                                                : (isRtl ? "שאל שאלה או דבר..." : "Ask or tell me something...")
                                        }
                                        dir="auto"
                                        className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-white/30 text-sm"
                                    />
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB - Just the Head */}
            {!isOpen && (
                <motion.button
                    onClick={toggleChat}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="p-0 bg-transparent transition-all border-none outline-none focus:outline-none relative group"
                >
                    {/* Aura Glow */}
                    <div className="absolute inset-0 blur-xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-500 opacity-0 group-hover:opacity-100 bg-gold/20"></div>

                    <BotIcon size={64} className="relative z-10" />
                </motion.button>
            )}

            {/* AI-Triggered Modals */}
            <AddPaymentModal
                isOpen={activeModal === 'payment' || activeModal === 'add_payment'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => {
                    clear();
                    setActiveModal(null);
                }}
                initialData={modalData}
            />
            <AddMaintenanceModal
                isOpen={activeModal === 'maintenance' || activeModal === 'add_maintenance'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => {
                    clear();
                    setActiveModal(null);
                }}
                initialData={modalData}
            />
        </motion.div>
    );
}
