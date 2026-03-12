import { useRef, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Send, Paperclip, X, Loader2, MessageCircle, Mic, MicOff, Menu, Smartphone, Bug, Headphones, ChevronRight, ChevronLeft, Volume2, VolumeX } from 'lucide-react';
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
import { useToast } from '../../hooks/useToast';
import { BillAnalysisService, ExtractedBillData } from '../../services/bill-analysis.service';
import { propertyDocumentsService } from '../../services/property-documents.service';
import type { DocumentCategory } from '../../types/database';
import { chatBus } from '../../events/chatEvents';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { RentyMascot } from '../common/RentyMascot';

// Modals
import { AddPaymentModal } from '../modals/AddPaymentModal';
import { AddMaintenanceModal } from '../modals/AddMaintenanceModal';

type ModalData = {
    contract_id?: string;
    amount?: number | string;
    due_date?: string;
    status?: 'pending' | 'paid' | 'overdue';
    payment_method?: string;
    property_id?: string;
    description?: string;
    vendor_name?: string;
    issue_type?: string;
    date?: string;
};

export function ChatWidget() {
    const { t } = useTranslation();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';
    const { isOpen, toggleChat, openChat, isLoading, messages: botMessages, sendMessage: sendBotMessage, injectLocalMessage, uiAction, clearUiAction, activateAiMode, isTtsEnabled, toggleTts } = useChatBot();
    const navigate = useNavigate();
    const location = useLocation();

    // Hide Renty on Auth pages
    const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

    const { push } = useStack();
    const { clear } = useDataCache();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { isListening, transcript, startListening, stopListening, hasSupport: hasVoiceSupport } = useSpeechRecognition(isRtl ? 'he-IL' : 'en-US');
    const { success, error: showError } = useToast();

    // Track isOpen state in a ref for background callbacks
    const isOpenRef = useRef(isOpen);
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    // Modal States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [modalData, setModalData] = useState<ModalData | null>(null);
    
    // Support Menu State
    const [activeMenuView, setActiveMenuView] = useState<'none' | 'main' | 'navigation' | 'tech_support'>('none');

    const [user, setUser] = useState<User | null>(null);
    const [inputText, setInputText] = useState('');

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

            // Trigger AI Bill Analysis (Background task)
            setAnalyzingBill(true);
            setIsUploading(false); // File uploaded, allow new inputs while AI thinks
            if (fileInputRef.current) fileInputRef.current.value = '';

            const runAnalysis = async () => {
                let analysisResults: ExtractedBillData | null = null;
                try {
                    // Pass properties list to AI for context matching
                    analysisResults = await BillAnalysisService.analyzeBill(file, properties);

                    if (analysisResults && (analysisResults.confidence ?? 1) > 0.6) {
                        setScannedBill({
                            ...analysisResults,
                            fileName: file.name,
                            file: file
                        });

                        // Auto-select property if confidence is high and we have a match
                        if (analysisResults?.propertyId && (analysisResults.confidence ?? 1) > 0.8) {
                            const matchedProp = properties.find(p => p.id === analysisResults?.propertyId);
                            if (matchedProp) {
                                setSelectedPropertyId(matchedProp.id);
                            }
                        }

                        // Notify user if chat is closed
                        if (!isOpenRef.current) {
                            success(isRtl ? 'ניתוח החשבונית הסתיים. פתח את הצ׳אט לצפייה בתוצאות.' : 'Bill analysis complete. Open chat to view results.');
                        }
                    } else if (!isOpenRef.current) {
                        showError(isRtl ? 'ניסיון ניתוח החשבונית נכשל. פתח את הצ׳אט וננסה שוב.' : 'Bill analysis failed. Open chat to try again.');
                    }
                } catch (err) {
                    console.error('Bill analysis failed:', err);
                    if (!isOpenRef.current) {
                        showError(isRtl ? 'שגיאה בניתוח החשבונית.' : 'Error analyzing bill.');
                    }
                } finally {
                    setAnalyzingBill(false);
                }

                // Send message with file info AND analysis results
                // This allows Renty to see the results before responding
                await sendBotMessage(`Uploaded file: ${file.name}`, { name: file.name, path }, analysisResults);
            };

            // Fire and forget: do not await it here so the UI unblocks
            runAnalysis();

        } catch (err: unknown) {
            console.error('Upload error:', err);
            setIsUploading(false);
            const message = err instanceof Error ? err.message : 'Unknown error';
            showError(`Failed to upload file: ${message}`);
        }
    }, [properties, sendBotMessage, success, showError, isRtl]);

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
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputText.trim();
        if (!text) return;

        // Clear immediately for better UX
        setInputText('');

        await sendBotMessage(text);
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
                payment_method: 'transfer',
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

    // Support Menu Handlers
    const handleMenuClick = (userQuestionHe: string, userQuestionEn: string, botAnswerHe: string, botAnswerEn: string) => {
        const userQ = isRtl ? userQuestionHe : userQuestionEn;
        const botA = isRtl ? botAnswerHe : botAnswerEn;
        injectLocalMessage(userQ, botA);
        setActiveMenuView('none');
        setTimeout(scrollToBottom, 100);
    };

    if (isAuthPage) return null;

    return (
        <div className="fixed top-16 md:top-4 left-0 md:left-64 right-0 z-[60] pointer-events-none flex justify-center">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-auto flex flex-col items-center space-y-4 w-full px-4 max-w-[500px]"
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            drag
                            dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
                            dragElastic={0.1}
                            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="w-full max-w-[400px] h-[540px] bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-border dark:border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden origin-top"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-border dark:border-white/10 flex justify-between items-center cursor-move transition-colors bg-white dark:bg-black text-foreground dark:text-white">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <div className="p-1.5 flex items-center justify-center overflow-hidden w-9 h-9">
                                        <RentyMascot size={28} showBackground={false} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground dark:text-white">Renty - תמיכה חכמה</h3>
                                        <p className="text-xs text-muted-foreground">{isRtl ? 'העוזר האישי שלך' : 'Your Personal Assistant'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleChat}
                                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT AREA: Messages or Menu */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent bg-secondary dark:bg-white/5 relative">
                                
                                {/* Support Menu Overlay */}
                                <AnimatePresence>
                                    {activeMenuView !== 'none' && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute inset-x-0 bottom-0 bg-white dark:bg-black border-t border-border dark:border-white/10 p-4 z-20 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-foreground dark:text-white flex items-center gap-2">
                                                    {activeMenuView !== 'main' && (
                                                        <button 
                                                            onClick={() => setActiveMenuView('main')}
                                                            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                        >
                                                            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {isRtl ? 'תמיכה ושירות' : 'Support & Service'}
                                                </h3>
                                                <button onClick={() => setActiveMenuView('none')} className="p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Main Menu */}
                                            {activeMenuView === 'main' && (
                                                <div className="space-y-2">
                                                    <button onClick={() => setActiveMenuView('navigation')} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-800 transition-colors">
                                                        <span className="flex items-center gap-3 text-sm font-medium text-foreground dark:text-white"><Smartphone className="w-4 h-4 text-brand-500" /> {isRtl ? 'מדריך לאפליקציה' : 'App Guide'}</span>
                                                        {isRtl ? <ChevronLeft className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                    </button>
                                                    <button onClick={() => setActiveMenuView('tech_support')} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-800 transition-colors">
                                                        <span className="flex items-center gap-3 text-sm font-medium text-foreground dark:text-white"><Bug className="w-4 h-4 text-orange-500" /> {isRtl ? 'דיווח על תקלה' : 'Report an Issue'}</span>
                                                        {isRtl ? <ChevronLeft className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                    </button>
                                                    <button onClick={() => window.open('mailto:support@rentmate.co.il', '_blank')} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-800 transition-colors">
                                                        <span className="flex items-center gap-3 text-sm font-medium text-foreground dark:text-white"><Headphones className="w-4 h-4 text-blue-500" /> {isRtl ? 'צור קשר עם נציג' : 'Contact Support Agent'}</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* App Guide Sub-Menu */}
                                            {activeMenuView === 'navigation' && (
                                                <div className="space-y-2">
                                                    <button onClick={() => handleMenuClick(
                                                        'איך מוסיפים נכס?', 'How do I add a property?',
                                                        'כדי להוסיף נכס, לחץ על הכפתור "הוסף נכס" במסך לוח הבקרה, או הקלד "הוסף נכס" כאן בצ׳אט ואני אפתח עבורך את הטופס מיד!',
                                                        'To add a property, click the "Add Property" button on the Dashboard, or just type "add a property" here in the chat and I will open the form for you!'
                                                    )} className="w-full text-start p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors border border-transparent">
                                                        {isRtl ? 'איך מוסיפים נכס?' : 'How do I add a property?'}
                                                    </button>
                                                    <button onClick={() => handleMenuClick(
                                                        'איך מתעדים תשלום שכירות?', 'How do I record a rent payment?',
                                                        'כדי לתעד תשלום, היכנס ללשונית "חוזים", לחץ על החוזה הרלוונטי ושם תוכל להוסיף תשלום. אפשר גם פשוט לבקש ממני להוסיף תשלום!',
                                                        'To record a payment, go to the "Contracts" tab, click the relevant contract, and add a payment there. You can also just ask me to record a payment!'
                                                    )} className="w-full text-start p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors border border-transparent">
                                                        {isRtl ? 'איך מתעדים תשלום שכירות?' : 'How do I record a rent payment?'}
                                                    </button>
                                                    <button onClick={() => handleMenuClick(
                                                        'איך סורקים חשבון חשמל/מים?', 'How do I scan a utility bill?',
                                                        'פשוט לחץ על האייקון של "אטב הניירות" (📎) פה למטה בתיבת הצ׳אט, ותעלה צילום של החשבונית או קובץ PDF. אני אקרא אותו ואצרף לנכס המתאים.',
                                                        'Simply click the "Paperclip" icon (📎) below in the chat box and upload a photo of the bill or a PDF. I will read it and attach it to the correct property.'
                                                    )} className="w-full text-start p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors border border-transparent">
                                                        {isRtl ? 'איך סורקים חשבון חשמל/מים?' : 'How do I scan a utility bill?'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Tech Support Sub-Menu */}
                                            {activeMenuView === 'tech_support' && (
                                                <div className="space-y-2">
                                                    <button onClick={() => handleMenuClick(
                                                        'האפליקציה נתקעת או איטית', 'The app is freezing or slow',
                                                        'מצטער לשמוע. נסה לרענן את העמוד, לנקות קאש (Cache) בדפדפן, או להתנתק ולהתחבר מחדש. אם זה לא עוזר, אנא שלח הודעה ל-support@rentmate.co.il',
                                                        'Sorry to hear that. Try refreshing the page, clearing your browser cache, or logging out and back in. If it persists, please email support@rentmate.co.il'
                                                    )} className="w-full text-start p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors border border-transparent">
                                                        {isRtl ? 'האפליקציה נתקעת או איטית' : 'The app is freezing or slow'}
                                                    </button>
                                                    <button onClick={() => handleMenuClick(
                                                        'אני לא רואה נכס שהוספתי', 'I cannot see a property I added',
                                                        'וודא שאתה מחובר לחשבון הנכון. לעיתים לוקח כמה שניות לרענן את הרשימה (נסה לרענן את העמוד). אם עדיין חסר, צור קשר עם התמיכה.',
                                                        'Make sure you are logged into the correct account. Sometimes it takes a few seconds to refresh (try reloading the page). If it is still missing, contact support.'
                                                    )} className="w-full text-start p-3 bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors border border-transparent">
                                                        {isRtl ? 'אני לא רואה נכס שהוספתי' : 'I cannot see a property I added'}
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

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
                                                    : "bg-white dark:bg-neutral-800 text-black dark:text-white rounded-bl-none border border-border dark:border-white/20"
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
                                        <div className="bg-white dark:bg-white/10 border border-border dark:border-white/5 p-3 rounded-2xl rounded-bl-none">
                                            <div className="flex items-center space-x-2 text-foreground dark:text-white">
                                                <Mic className="w-4 h-4 animate-pulse text-brand-500" />
                                                <span className="text-sm">מקשיב...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-white/10 border border-border dark:border-white/5 p-3 rounded-2xl rounded-bl-none">
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
                                                    <Paperclip className="w-5 h-5 text-secondary" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100">{t('billDetected')}</h4>
                                                    <p className="text-xs text-secondary">{scannedBill.vendor} - {scannedBill.amount} {scannedBill.currency}</p>
                                                </div>
                                            </div>

                                            {(scannedBill.propertyId && selectedPropertyId === scannedBill.propertyId && (scannedBill.confidence ?? 1) > 0.8) ? (
                                                <div className="bg-emerald-100/50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 mb-2">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-1">
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
                                                    <label className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                                        {(scannedBill.confidence ?? 1) < 0.8
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
                                                    className="flex-1 py-2 text-xs font-bold text-muted-foreground hover:text-gray-700 transition-colors"
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
                            <form onSubmit={handleSubmit} className="px-5 py-4 bg-secondary dark:bg-black border-t border-border dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="p-2 bg-foreground dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                                        aria-label="שלח הודעה"
                                    >
                                        <Send className="w-5 h-5 text-white dark:text-black" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleVoiceInput}
                                        className={`p-2 rounded-xl transition-colors shrink-0 ${isListening
                                            ? 'bg-destructive hover:bg-red-500'
                                            : 'bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent'
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
                                        onClick={toggleTts}
                                        className={`p-2 rounded-xl transition-colors shrink-0 ${isTtsEnabled 
                                            ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' 
                                            : 'bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent text-gray-700 dark:text-white'}`}
                                        title={isRtl ? 'הקראה קולית' : 'Voice Output'}
                                    >
                                        {isTtsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-50" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveMenuView(prev => prev === 'none' ? 'main' : 'none')}
                                        className={`p-2 rounded-xl transition-colors shrink-0 ${activeMenuView !== 'none' 
                                            ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' 
                                            : 'bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent text-gray-700 dark:text-white'}`}
                                        aria-label="תפריט תמיכה"
                                    >
                                        <Menu className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || isLoading || !user}
                                        className="p-2 bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent rounded-xl transition-colors shrink-0 disabled:opacity-20"
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
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder={
                                                !user
                                                    ? (isRtl ? "שאל על RentMate..." : "Ask about RentMate...")
                                                    : (isRtl ? "שאל שאלה או דבר..." : "Ask or tell me something...")
                                            }
                                            dir="auto"
                                            className="w-full bg-white dark:bg-white/10 border border-border dark:border-white/20 rounded-xl px-3 py-2 text-foreground dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:ring-white/30 text-sm"
                                        />
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FAB - Horizontal Bar */}
                {!isOpen && (
                    <div className="relative w-full max-w-[500px] group">
                        {/* Ambient Background Glow (from Dashboard) */}
                        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[150%] h-[150px] bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />

                        <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-r from-indigo-500 to-violet-500 blur opacity-20 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />

                        <motion.button
                            onClick={toggleChat}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="relative glass-premium rounded-[1.5rem] shadow-minimal flex items-center p-1.5 pr-1.5 w-full overflow-hidden transition-all duration-500 border-white/10 group-hover:border-indigo-500/30 ring-1 ring-white/20"
                            dir="ltr"
                        >
                            <div className="pl-4 pr-3 text-indigo-500 transition-colors">
                                <MessageCircle className="w-6 h-6" />
                            </div>

                            <div className="flex-1 relative" dir="rtl">
                                <p className="text-muted-foreground/50 text-sm font-medium text-right truncate pl-2">
                                    {isRtl ? 'איך אוכל לעזור לך לנהל את הנכסים היום?' : 'How can I help you manage your properties today?'}
                                </p>
                            </div>

                            <div className="mx-1 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-background transition-all">
                                <Mic className="w-5 h-5 cursor-pointer" />
                            </div>

                            <div className="mx-1 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-background transition-all shadow-sm">
                                <Paperclip className="w-5 h-5 cursor-pointer" />
                            </div>

                            <div className="ml-2 w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0">
                                <RentyMascot size={32} showBackground={false} />
                            </div>
                        </motion.button>
                    </div>
                )}

                {/* AI-Triggered Modals */}
                <AddPaymentModal
                    isOpen={activeModal === 'payment' || activeModal === 'add_payment'}
                    onClose={() => setActiveModal(null)}
                    onSuccess={() => {
                        clear();
                        setActiveModal(null);
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialData={modalData as any}
                />
                <AddMaintenanceModal
                    isOpen={activeModal === 'maintenance' || activeModal === 'add_maintenance'}
                    onClose={() => setActiveModal(null)}
                    onSuccess={() => {
                        clear();
                        setActiveModal(null);
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialData={modalData as any}
                />
            </motion.div>
        </div>
    );
}
