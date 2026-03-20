import { useRef, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Send, Paperclip, X, Loader2, MessageCircle, Mic, MicOff, Menu, Smartphone, Bug, Headphones, ChevronRight, ChevronLeft, Volume2, VolumeX, CreditCard, HelpCircle, Trash2 } from 'lucide-react';
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
    const { isOpen, toggleChat, openChat, resetChat, isLoading, messages: botMessages, sendMessage: sendBotMessage, injectLocalMessage, uiAction, clearUiAction, activateAiMode, isTtsEnabled, toggleTts } = useChatBot();
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
    
    // Menu state removed as it is now injected into chat

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
            if (event.type === 'TOGGLE_CHAT') {
                toggleChat();
            } else if (event.type === 'OPEN_CHAT') {
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

    const handleSupportMenuClick = () => {
        injectLocalMessage(
            isRtl ? 'תפריט תמיכה' : 'Support Menu',
            isRtl ? 'בחר נושא לגביו תרצה עזרה:' : 'Choose a help topic:',
            {
                title: isRtl ? 'תמיכה ושירות' : 'Support & Service',
                options: [
                    { label: isRtl ? 'מדריך לאפליקציה' : 'App Guide', value: 'ACTION_APP_GUIDE' },
                    { label: isRtl ? 'חבילות ומנויים' : 'Packages & Subscriptions', value: 'ACTION_PACKAGES' },
                    { label: isRtl ? 'שאלות כלליות' : 'General Questions', value: 'ACTION_GENERAL_QA' },
                    { label: isRtl ? 'נציג אנושי' : 'Human Support', value: 'ACTION_HUMAN_SUPPORT' }
                ]
            }
        );
        setTimeout(scrollToBottom, 100);
    };

    // Dictionary of hardcoded precise answers for sub-menu questions for instant local injection
    const handleAction = async (value: string) => {
        if (value === 'ACTION_APP_GUIDE') {
            injectLocalMessage(
                isRtl ? 'מדריך לאפליקציה' : 'App Guide',
                isRtl ? 'בנושא מה תרצה הדרכה?' : 'What would you like a guide on?',
                {
                    title: isRtl ? 'מדריך לאפליקציה' : 'App Guide',
                    options: [
                        { label: isRtl ? 'איך מוסיפים נכס?' : 'How do I add a property?', value: 'איך מוסיפים נכס?' },
                        { label: isRtl ? 'איך מתעדים תשלום שכירות?' : 'How do I record a rent payment?', value: 'איך מתעדים תשלום שכירות?' },
                        { label: isRtl ? 'איך סורקים חשבון חשמל/מים?' : 'How do I scan a utility bill?', value: 'איך סורקים חשבון חשמל/מים?' }
                    ]
                }
            );
            setTimeout(scrollToBottom, 100);
            return;
        }

        if (value === 'ACTION_GENERAL_QA') {
            injectLocalMessage(
                isRtl ? 'שאלות כלליות' : 'General Questions',
                isRtl ? 'הנה כמה שאלות נפוצות בנושאי נדל״ן וחוקים:' : 'Here are some common questions about real estate and laws:',
                {
                    title: isRtl ? 'שאלות כלליות' : 'General Questions',
                    options: [
                        { label: isRtl ? 'מה זה המדד?' : 'What is the index?', value: 'מה זה המדד?' },
                        { label: isRtl ? 'אילו סוגי מדדים קיימים?' : 'What are the different types of index?', value: 'אילו סוגי מדדים קיימים?' },
                        { label: isRtl ? 'איך מחושב מס שבח?' : 'How is capital gains tax calculated?', value: 'איך מחושב מס שבח?' }
                    ]
                }
            );
            setTimeout(scrollToBottom, 100);
            return;
        }

        if (value === 'ACTION_PACKAGES') {
            injectLocalMessage(
                isRtl ? 'מסלולים ומנויים' : 'Packages & Subscriptions',
                isRtl ? 'איזה מידע תרצה לדעת לגבי המנויים שלנו?' : 'What would you like to know about our subscriptions?',
                {
                    title: isRtl ? 'מסלולים ומנויים' : 'Packages & Subscriptions',
                    options: [
                        { label: isRtl ? 'איזה מסלולים יש לכם?' : 'What plans do you offer?', value: 'איזה מסלולים יש לכם?' },
                        { label: isRtl ? 'איך אני משנה את המנוי שלי?' : 'How do I change my subscription?', value: 'איך אני משנה את המנוי שלי?' }
                    ]
                }
            );
            setTimeout(scrollToBottom, 100);
            return;
        }

        if (value === 'ACTION_HUMAN_SUPPORT') {
            injectLocalMessage(
                isRtl ? 'תמיכה אנושית' : 'Human Support',
                isRtl ? 'כדי לשוחח עם נציג או לפתוח קריאת שירות, ניתן לפנות אלינו במייל: support@rentmate.ai' : 'To chat with a representative or open a support ticket, please contact us at: support@rentmate.ai'
            );
            setTimeout(scrollToBottom, 100);
            return;
        }

        // Hardcoded sub-menu responses
        const hardcodedAnswers: Record<string, string> = {
            'איך מוסיפים נכס?': isRtl ? 'כדי להוסיף נכס, לחץ על הכפתור "הוסף נכס" במסך לוח הבקרה, או הקלד "הוסף נכס" כאן בצ׳אט ואני אפתח עבורך את הטופס מיד!' : 'To add a property, click the "Add Property" button on the Dashboard, or just type "add a property" here in the chat and I will open the form for you!',
            'איך מתעדים תשלום שכירות?': isRtl ? 'כדי לתעד תשלום, היכנס ללשונית "חוזים", לחץ על החוזה הרלוונטי ושם תוכל להוסיף תשלום. אפשר גם פשוט לבקש ממני להוסיף תשלום!' : 'To record a payment, go to the "Contracts" tab, click the relevant contract, and add a payment there. You can also just ask me to record a payment!',
            'איך סורקים חשבון חשמל/מים?': isRtl ? 'פשוט לחץ על האייקון של "אטב הניירות" (📎) פה למטה בתיבת הצ׳אט, ותעלה צילום של החשבונית או קובץ PDF. אני אקרא אותו ואצרף לנכס המתאים.' : 'Simply click the "Paperclip" icon (📎) below in the chat box and upload a photo of the bill or a PDF. I will read it and attach it to the correct property.',
            'איזה מסלולים יש לכם?': isRtl ? 'אנחנו מציעים 3 מסלולים עיקריים: מסלול Free לניהול בסיסי בחינם, מסלול Pro לניהול מתקדם עם אוטומציות, ומסלול Investor למשקיעים כבדים ולריבוי נכסים. איזה מסלול מעניין אותך?' : 'We offer 3 main plans: Free for basic management, Pro for advanced automation, and Investor for heavy investors with multiple properties. Which one interests you?',
            'איך אני משנה את המנוי שלי?': isRtl ? 'כדי לשנות או לשדרג מנוי, גש לעמוד "הגדרות" (Settings) ושם תמצא את ניהול המנוי. בנוסף, תוכל ללחוץ על שם המנוי שלך בחלק העליון של המסך והמערכת תעביר אותך אוטומטית למסך בחירת המסלולים.' : 'To change or upgrade your subscription, go to the "Settings" page. Alternatively, you can click on your subscription name at the top of the screen to be redirected to the plan selection page.',
            'מה זה המדד?': isRtl ? 'מדד המחירים לצרכן (המדד) בישראל משקף את קצב האינפלציה השנתי. חוזי שכירות רבים צמודים למדד, מה שאומר ששכר הדירה עולה או יורד בהתאם לאינפלציה במטרה לשמור על ערך הכסף.' : 'The Consumer Price Index (CPI) in Israel reflects the annual inflation rate. Many rental contracts are linked to the index, meaning rent goes up or down based on inflation to maintain money value.',
            'אילו סוגי מדדים קיימים?': isRtl ? 'מעבר למדד המחירים לצרכן, קיימים מדדים נוספים כמו מדד תשומות הבנייה (שמשפיע לרוב על רכישת דירה מקבלן) ומדדים ענפיים אחרים. ברוב חוזי השכירות משתמשים במדד המחירים לצרכן.' : 'Besides the Consumer Price Index, there are other indices such as the Construction Inputs Index (which usually affects buying an apartment from a contractor). Most rental contracts use the Consumer Price Index.',
            'איך מחושב מס שבח?': isRtl ? 'מס שבח משולם על הרווח בעת מכירת נכס נדל״ן (הפער בין עלות רכישת הנכס למחיר המכירה). הוא עומד לרוב על 25% מהרווח הריאלי, עם זאת, קיימים פטורים בתנאים מסוימים, כמו מכירת דירת מגורים יחידה.' : 'Capital Gains Tax is paid on the profit from selling real estate. It is generally 25% of the real profit. However, there are exemptions under certain conditions, such as selling a single residential apartment.'
        };

        if (hardcodedAnswers[value]) {
            injectLocalMessage(value, hardcodedAnswers[value]);
            setTimeout(scrollToBottom, 100);
            return;
        }

        // Send the selected action as a user message to the AI
        await sendBotMessage(value);
    };

    const activeMessages = botMessages;

    if (isAuthPage) return null;

    return (
        <div className="fixed top-16 md:top-4 left-0 md:left-64 right-0 z-[60] pointer-events-none flex justify-center">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-auto flex flex-col items-center space-y-4 w-full px-4 max-w-[500px]"
            >
                <AnimatePresence>
                    <motion.div
                        drag
                        dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
                        dragElastic={0.1}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ 
                            opacity: isOpen ? 1 : 0, 
                            y: isOpen ? 0 : -20, 
                            scale: isOpen ? 1 : 0.95,
                            pointerEvents: isOpen ? 'auto' : 'none',
                        }}
                        transition={{ duration: 0.2 }}
                        className={`w-full max-w-[400px] h-[540px] bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-border dark:border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden origin-top ${!isOpen ? 'hidden' : ''}`}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border dark:border-white/10 flex justify-between items-center cursor-move transition-colors bg-white dark:bg-black text-foreground dark:text-white">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                <div className="p-1.5 flex items-center justify-center overflow-hidden w-9 h-9">
                                    <RentyMascot size={28} showBackground={false} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground dark:text-white">Renty - תמיכה חכמה</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        if (window.confirm(isRtl ? 'האם אתה בטוח שברצונך לאפס את השיחה?' : 'Are you sure you want to reset the chat?')) {
                                            resetChat();
                                        }
                                    }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors group relative"
                                    title={isRtl ? 'אפס שיחה' : 'Reset Chat'}
                                    aria-label="Reset Chat"
                                >
                                    <Trash2 className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
                                </button>
                                <button
                                    onClick={toggleChat}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA: Messages or Menu */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent bg-slate-50 dark:bg-neutral-900 relative">
                            
                            {/* Support Menu Overlay Removed - Now handled via injected messages */}


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
                                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:grayscale transition-all"
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
                        <form onSubmit={handleSubmit} className="px-5 py-4 bg-white dark:bg-black border-t border-border dark:border-white/10 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isLoading}
                                    className={`p-2 rounded-xl transition-colors shrink-0 bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent text-gray-700 dark:text-white`}
                                    aria-label={isRtl ? 'הוסף קובץ' : 'Attach file'}
                                    title={isRtl ? 'הוסף קובץ' : 'Attach file'}
                                >
                                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    className={`p-2 rounded-xl transition-colors shrink-0 ${isListening
                                        ? 'bg-destructive hover:bg-red-500'
                                        : 'bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent text-gray-700 dark:text-white'
                                        } `}
                                    aria-label={isListening ? 'עצור הקלטה' : 'התחל הקלטה'}
                                    title={isListening ? (isRtl ? 'עצור הקלטה' : 'Stop recording') : (isRtl ? 'התחל הקלטה' : 'Start recording')}
                                >
                                    {isListening ? (
                                        <MicOff className="w-5 h-5 text-white" />
                                    ) : (
                                        <Mic className="w-5 h-5" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleTts}
                                    className={`p-2 rounded-xl transition-colors shrink-0 ${isTtsEnabled 
                                        ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' 
                                        : 'bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent text-gray-700 dark:text-white'}`}
                                    title={isRtl ? 'הקראה קולית' : 'Voice Output'}
                                    aria-label={isRtl ? 'הקראה קולית' : 'Voice Output'}
                                >
                                    {isTtsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-50" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSupportMenuClick}
                                    className="p-2 rounded-xl transition-colors shrink-0 bg-white dark:bg-white/10 hover:bg-muted dark:hover:bg-white/20 border border-border dark:border-transparent text-gray-700 dark:text-white"
                                    title={isRtl ? 'תפריט תמיכה' : 'Support menu'}
                                    aria-label="תפריט תמיכה"
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="p-2 bg-foreground dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                                    aria-label="שלח הודעה"
                                >
                                    <Send className="w-5 h-5 text-white dark:text-black" />
                                </button>
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
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept="image/*,application/pdf" 
                            />
                        </form>
                    </motion.div>
                </AnimatePresence>

                {/* FAB - Horizontal Bar */}
                {!isOpen && (
                    <div className="relative w-full max-w-[500px] group hidden md:block">
                        {/* Ambient Background Glow (from Dashboard) */}
                        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[150%] h-[150px] bg-gradient-to-b from-indigo-500/20 via-blue-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />

                        <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-r from-indigo-500 to-blue-500 blur opacity-20 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />

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
