import { useRef, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Send, Paperclip, X, Maximize2, Minimize2, Settings, Sparkles, Bot, User as UserIcon, Trash2, FileIcon, ImageIcon, CheckCircle2, AlertCircle, Mic, MicOff, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionCard } from '../dashboard/ActionCard';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useChatBot } from '../../hooks/useChatBot';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useStack } from '../../contexts/StackContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useDataCache } from '../../contexts/DataCacheContext';
import { BillAnalysisService, ExtractedBillData } from '../../services/bill-analysis.service';
import { propertyDocumentsService } from '../../services/property-documents.service';
import type { DocumentCategory } from '../../types/database';
import { chatBus } from '../../events/chatEvents';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { RentyMascot } from '../common/RentyMascot';

// Modals
import { AddPaymentModal } from '../modals/AddPaymentModal';
import { AddMaintenanceModal } from '../modals/AddMaintenanceModal';

export function ChatWidget() {
    const { t } = useTranslation();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';
    const { isOpen, toggleChat, openChat, isLoading, messages: botMessages, sendMessage: sendBotMessage, uiAction, clearUiAction, activateAiMode } = useChatBot();
    const navigate = useNavigate();
    const location = useLocation();

    // Hide Renty on Auth pages
    const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

    const { push } = useStack();
    const { clear } = useDataCache();
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { isListening, transcript, startListening, stopListening, hasSupport: hasVoiceSupport } = useSpeechRecognition(isRtl ? 'he-IL' : 'en-US');

    // Modal States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any>(null);

    const [user, setUser] = useState<User | null>(null);

    // Bill Scan States
    const [scannedBill, setScannedBill] = useState<(ExtractedBillData & { fileName: string; file: File }) | null>(null);
    const [analyzingBill, setAnalyzingBill] = useState(false);
    const [properties, setProperties] = useState<Array<{ id: string; address: string }>>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

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

                // If Hybrid is OFF, auto-activate AI
                if (!hybridEnabled) {
                    activateAiMode();
                }

                // Fetch properties for bill association
                const { data: props } = await supabase
                    .from('properties')
                    .select('id, address');
                const propertiesList = props || [];
                setProperties(propertiesList);

                // Single Asset Intelligence
                if (propertiesList.length === 1) {
                    setSelectedPropertyId(propertiesList[0].id);
                }
            } catch (err) {
                console.error('Error checking chat settings:', err);
            }
        };

        if (isOpen) checkSettings();
    }, [isOpen, activateAiMode]);

    const processFile = useCallback(async (file: File) => {
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

            // Trigger AI Bill Analysis
            setAnalyzingBill(true);
            let analysisResults: ExtractedBillData | null = null;
            try {
                // Pass properties list to AI for context matching
                analysisResults = await BillAnalysisService.analyzeBill(file, properties);

                if (analysisResults && analysisResults.confidence > 0.6) {
                    setScannedBill({
                        ...analysisResults,
                        fileName: file.name,
                        file: file
                    });

                    // Auto-select property if confidence is high and we have a match
                    if (analysisResults?.propertyId && analysisResults?.confidence > 0.8) {
                        const matchedProp = properties.find(p => p.id === analysisResults?.propertyId);
                        if (matchedProp) {
                            setSelectedPropertyId(matchedProp.id);
                        }
                    }
                }
            } catch (err) {
                console.error('Bill analysis failed:', err);
            } finally {
                setAnalyzingBill(false);
            }

            // Send message with file info AND analysis results
            // This allows Renty to see the results before responding
            await sendBotMessage(`Uploaded file: ${file.name}`, { name: file.name, path }, analysisResults);

            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: unknown) {
            console.error('Upload error:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(`Failed to upload file: ${message}`);
        } finally {
            setIsUploading(false);
        }
    }, [properties, sendBotMessage]);

    // Handle Global Chat Events
    useEffect(() => {
        const unsubscribe = chatBus.subscribe((event) => {
            if (event.type === 'OPEN_CHAT') {
                if (!isOpen) openChat();
                if (event.payload?.message) {
                    sendBotMessage(event.payload.message);
                }
            } else if (event.type === 'SEND_MESSAGE') {
                if (!isOpen) openChat();
                if (event.payload?.message) {
                    sendBotMessage(event.payload.message);
                }
            } else if (event.type === 'FILE_UPLOADED') {
                if (!isOpen) openChat();
                if (event.payload?.file) {
                    processFile(event.payload.file);
                }
            }
        });
        return unsubscribe;
    }, [isOpen, openChat, sendBotMessage, processFile]);

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
                    // Force modal view for form preparation
                    setModalData(uiAction.data);
                    setActiveModal(uiAction.modal);
                } else {
                    setModalData(uiAction.data);
                    setActiveModal(uiAction.modal);
                }

            }
            clearUiAction();
        }
    }, [uiAction, navigate, clearUiAction, push, clear, t]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [botMessages]);

    // Sync transcript to input
    useEffect(() => {
        if (transcript && inputRef.current) {
            inputRef.current.value = transcript;
        }
    }, [transcript]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputRef.current?.value;
        if (!text) return;

        await sendBotMessage(text);

        if (inputRef.current) inputRef.current.value = '';
    };

    const toggleVoiceInput = () => {
        if (!hasVoiceSupport) {
            alert('Voice input is not supported in your browser.');
            return;
        }

        if (isListening) {
            stopListening();
        } else {
            startListening();
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

        await processFile(file);
    };

    const handleSaveBill = async () => {
        if (!scannedBill || !selectedPropertyId) return;

        try {
            // 1. Map category to system category
            const categoryMap: Record<string, string> = {
                'water': 'utility_water',
                'electric': 'utility_electric',
                'gas': 'utility_gas',
                'municipality': 'utility_municipality',
                'management': 'utility_management',
                'internet': 'utility_internet',
                'cable': 'utility_cable',
                'other': 'other'
            };

            const systemCategory: DocumentCategory = (categoryMap[scannedBill.category] || 'other') as DocumentCategory;

            // 2. Upload to property documents (this also handles storage)
            await propertyDocumentsService.uploadDocument(scannedBill.file, {
                propertyId: selectedPropertyId,
                category: systemCategory as DocumentCategory,
                amount: scannedBill.amount,
                documentDate: scannedBill.date,
                vendorName: scannedBill.vendor,
                invoiceNumber: scannedBill.invoiceNumber,
                title: `${scannedBill.vendor} Bill - ${scannedBill.date}`
            });

            // 3. Find active contract for this property to pre-fill ledger
            const { data: contract } = await supabase
                .from('contracts')
                .select('id')
                .eq('property_id', selectedPropertyId)
                .eq('status', 'active')
                .maybeSingle();

            // 4. Open Modal for ledger entry
            setModalData({
                contract_id: contract?.id || '',
                amount: scannedBill.amount,
                due_date: scannedBill.date,
                payment_method: 'bank_transfer',
                status: 'paid'
            });
            setActiveModal('payment');
            setScannedBill(null);
            setSelectedPropertyId('');
        } catch (err: unknown) {
            console.error('Failed to save bill:', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            alert(`Failed to save bill: ${message}`);
        }
    };

    const handleAction = async (value: string) => {
        // Send the selected action as a user message
        await sendBotMessage(value);
    };

    const activeMessages = botMessages;

    if (isAuthPage) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "fixed bottom-36 sm:bottom-32 z-[60] flex flex-col items-end space-y-4",
                isRtl ? "left-6" : "right-6"
            )}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        drag
                        dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
                        dragElastic={0.1}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[350px] h-[540px] bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center cursor-move transition-colors bg-white dark:bg-black text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                <div className="p-1.5 flex items-center justify-center overflow-hidden w-9 h-9">
                                    <RentyMascot size={28} showBackground={false} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Renty - תמיכה חכמה</h3>
                                    <p className="text-xs text-gray-400">{isRtl ? 'העוזר האישי שלך' : 'Your Personal Assistant'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
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
                                            {msg.type === 'action' && msg.actionData ? (
                                                <ActionCard
                                                    title={msg.actionData.title}
                                                    description={msg.actionData.description}
                                                    options={msg.actionData.options}
                                                    onSelect={handleAction}
                                                />
                                            ) : (
                                                msg.content
                                            )}
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

                            {/* Analyzing Bill State */}
                            {analyzingBill && (
                                <div className="flex justify-start">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 p-4 rounded-2xl w-full flex flex-col items-center gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                            {isRtl ? 'מנתח פרטי חשבון...' : 'Analyzing Bill Details...'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Scanned Bill Result */}
                            {scannedBill && (
                                <div className="flex justify-start">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-2xl w-full space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                                                <Paperclip className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-emerald-900 dark:text-emerald-100">{t('billDetected')}</h4>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400">{scannedBill.vendor} - {scannedBill.amount} {scannedBill.currency}</p>
                                            </div>
                                        </div>

                                        {scannedBill.propertyId && selectedPropertyId === scannedBill.propertyId && scannedBill.confidence > 0.8 ? (
                                            <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 mb-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                                                            {isRtl ? 'זוהה אוטומטית' : 'Auto-Detected'}
                                                        </p>
                                                        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 line-clamp-1">
                                                            {scannedBill.propertyAddress || properties.find(p => p.id === selectedPropertyId)?.address}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedPropertyId('')}
                                                        className="text-xs text-emerald-500 underline hover:text-emerald-700 dark:hover:text-emerald-300"
                                                    >
                                                        {isRtl ? 'שנה' : 'Change'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                                    {scannedBill.confidence < 0.8
                                                        ? (isRtl ? 'לא הצלחתי לזהות את הנכס. אנא בחר:' : 'Could not identify property. Please select:')
                                                        : t('associateWithProperty')
                                                    }
                                                </label>
                                                <select
                                                    value={selectedPropertyId}
                                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                                    className="w-full bg-white dark:bg-neutral-800 border-2 border-emerald-100 dark:border-emerald-500/30 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-all"
                                                >
                                                    <option value="">{t('selectProperty')}</option>
                                                    {properties.map(p => (
                                                        <option key={p.id} value={p.id}>{p.address}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setScannedBill(null)}
                                                className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                {t('cancel')}
                                            </button>
                                            <button
                                                disabled={!selectedPropertyId}
                                                onClick={handleSaveBill}
                                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:grayscale transition-all"
                                            >
                                                {t('saveAndRecord')}
                                            </button>
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
                                        // I'll check BotIcon.tsx first to see how it's styled.
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
                    whileHover={{ rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-0 bg-transparent transition-all border-none outline-none focus:outline-none relative group"
                >
                    {/* Soft Hover Aura */}
                    <div className="absolute inset-0 blur-xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-500 opacity-0 group-hover:opacity-100 bg-white/5"></div>

                    <RentyMascot size={64} showBackground={false} className="relative z-10" />
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
