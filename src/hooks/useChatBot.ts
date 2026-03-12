import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
    type?: 'text' | 'action';
    actionData?: {
        title: string;
        description?: string;
        options: { label: string, value: string, variant?: 'default' | 'outline' | 'destructive' }[];
    };
    hiddenContext?: string;
}

export function useChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAiMode, setIsAiMode] = useState(true); // Default to chat mode directly
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    const { info } = useToast();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';

    // Track isOpen to trigger notifications if closed
    const isOpenRef = useRef(isOpen);
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        const initChat = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const isGuest = !session;
            const userId = session?.user?.id;

            if (userId) {
                const storedHistory = localStorage.getItem(`rentmate_chat_history_${userId}`);
                if (storedHistory) {
                    try {
                        const parsedHistory = JSON.parse(storedHistory);
                        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                            setMessages(parsedHistory);
                            return; // Skip default welcome message
                        }
                    } catch (e) {
                        console.error('Failed to parse chat history', e);
                    }
                }
            }

            const welcomeMsg = isGuest
                ? 'שלום! אני רנטי. אני יכול לעזור לך להבין איך RentMate עובד. כדי להשתמש ביכולות המתקדמות (סריקת מסמכים, חישובים והצמדות), עליך להתחבר למערכת.'
                : 'שלום! אני רנטי - בוט ה-AI של RentMate. כיצד אפשר לעזור היום?\n\n(לידיעתך, שיחות אלו נשמרות באופן מאובטח לצרכי שיפור השירות והבטחת איכות).';

            const welcomeMessageObj: Message = {
                role: 'assistant',
                content: welcomeMsg,
                timestamp: new Date().toISOString()
            };

            // Add options for logged in users
            if (!isGuest) {
                welcomeMessageObj.type = 'action';
                welcomeMessageObj.actionData = {
                    title: isRtl ? 'בחר פעולה מהירה:' : 'Quick Actions:',
                    options: [
                        { label: isRtl ? 'הצג את הנכסים שלי' : 'Show my properties', value: isRtl ? 'הצג את כל הנכסים שלי' : 'Show all my properties' },
                        { label: isRtl ? 'דווח על תקלה' : 'Report an issue', value: isRtl ? 'אני רוצה לדווח על תקלה בנכס' : 'I want to report a maintenance issue' },
                        { label: isRtl ? 'חישוב הצמדה למדד' : 'Calculate linkage', value: isRtl ? 'אני צריך עזרה בחישוב הצמדה למדד' : 'I need help calculating rent linkage' }
                    ]
                };
            }

            setMessages([welcomeMessageObj]);
        };
        initChat();
    }, []);

    // Save messages to local storage when they change
    useEffect(() => {
        const saveHistory = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (userId && messages.length > 0) {
                // Keep only last 50 messages to prevent excessive storage usage
                const messagesToSave = messages.slice(-50);
                localStorage.setItem(`rentmate_chat_history_${userId}`, JSON.stringify(messagesToSave));
            }
        };
        saveHistory();
    }, [messages]);

    const [uiAction, setUiAction] = useState<{ action: string, modal: string, data: any } | null>(null);

    const toggleChat = () => setIsOpen(!isOpen);
    const toggleTts = () => setIsTtsEnabled(!isTtsEnabled);

    const clearUiAction = () => setUiAction(null);

    const playTts = async (text: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                info(isRtl ? 'שגיאת שמע' : 'Audio Error', { description: isRtl ? 'יש להתחבר כדי לשמוע קול' : 'Please log in to use voice.' });
                setIsTtsEnabled(false);
                return;
            }

            const projectUrl = import.meta.env.VITE_SUPABASE_URL;
            const functionUrl = `${projectUrl}/functions/v1/text-to-speech`;

            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ text })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                info(isRtl ? 'שגיאת שמע' : 'Audio Error', { description: errData.error || 'Premium feature requirement not met.' });
                setIsTtsEnabled(false);
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (err) {
            console.error('TTS Playback error:', err);
        }
    };

    const sendMessage = async (content: string, fileInfo?: { name: string, path: string }, analysisResults?: any) => {
        if (!content.trim() && !fileInfo) return;

        // Add user message with hidden file context if present
        const displayContent = fileInfo
            ? `${content}\n\n[File Attached: ${fileInfo.name}]`
            : content;

        const userMessage: Message = {
            role: 'user',
            content: displayContent,
            timestamp: new Date().toISOString(),
            hiddenContext: fileInfo ? `SYSTEM CONTEXT: USER UPLOADED FILE: ${fileInfo.name}. Storage Path: ${fileInfo.path}. You must remember this path for the 'organize_document' tool.` : undefined
        };

        // If file or analysis exists, we inject private context for the AI to know about the file
        const apiMessages = [...messages];
        if (fileInfo) {
            let context = `USER UPLOADED FILE: ${fileInfo.name}. Storage Path: ${fileInfo.path}.`;
            if (analysisResults) {
                context += ` ANALYSIS RESULTS: ${JSON.stringify(analysisResults)}.`;
            }
            context += ` MANDATORY INSTRUCTION: You MUST call the 'list_properties' tool to see the user's available properties before trying to organize this document! Help the user organize this file using available tools.`;

            apiMessages.push({
                role: 'system',
                content: context
            });
        }
        apiMessages.push(userMessage);

        const newMessagesForDisplay = [...messages, userMessage];
        setMessages(newMessagesForDisplay);
        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('chat-support', {
                body: {
                    messages: apiMessages,
                    conversationId: conversationId,
                    hasAiConsent: preferences.ai_data_consent === true
                },
                headers: session?.access_token ? {
                    Authorization: `Bearer ${session.access_token}`
                } : {}
            });

            if (error) throw error;

            if (data && data.choices?.[0]) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.choices[0].message.content || "I couldn't get an answer.",
                    timestamp: new Date().toISOString()
                };

                if (data.choices[0].message.type === 'action') {
                    assistantMessage.type = 'action';
                    assistantMessage.actionData = data.choices[0].message.actionData;
                }

                setMessages(prev => [...prev, assistantMessage]);

                if (data.conversationId) {
                    setConversationId(data.conversationId);
                }

                // Handle UI Action
                if (data.uiAction) {
                    setUiAction(data.uiAction);
                }

                // Play audio if TTS is enabled
                if (isTtsEnabled && assistantMessage.content) {
                    // Filter out Markdown formatting for better speech synthesis
                    const cleanText = assistantMessage.content.replace(/[*_#`]/g, '');
                    playTts(cleanText);
                }

                // Show notification if chat is not open
                if (!isOpenRef.current) {
                    info(isRtl ? 'רנטי: הודעה חדשה התקבלה' : 'Renty: New message received', {
                        description: isRtl ? 'פתח את הצ׳אט כדי לקרוא את התגובה.' : 'Open chat to read the response.'
                    });
                }
            }

        } catch (err: any) {
            console.error('Chat error details:', err);

            let errorMessage = err.message || "Unknown connection error";

            // Attempt to extract detailed error from response body if available
            if (err && typeof err === 'object' && 'context' in err) {
                try {
                    const responseBody = await (err as any).context.json();
                    if (responseBody.error) {
                        errorMessage = responseBody.error;
                    }
                } catch (e) {
                    // Ignore JSON parse error
                    console.warn('Failed to parse error context JSON', e);
                }
            } else if (err.message && (err.message.toLowerCase().includes("non-2xx") || err.message.toLowerCase().includes("failed to fetch"))) {
                errorMessage = "שירות ה-AI אינו זמין כרגע. וודא שהגדרת את מפתח ה-API (OpenAI או Gemini) בסודות של Supabase.";
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${errorMessage}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const injectLocalMessage = (userText: string, botText: string, actionData?: any) => {
        const timestamp = new Date().toISOString();
        
        const userMsg: Message = {
            role: 'user',
            content: userText,
            timestamp
        };
        
        const botMsg: Message = {
            role: 'assistant',
            content: botText,
            timestamp,
            ...(actionData ? { type: 'action', actionData } : {})
        };
        
        setMessages(prev => [...prev, userMsg, botMsg]);
    };

    const activateAiMode = () => setIsAiMode(true);
    const deactivateAiMode = () => setIsAiMode(false);

    const openChat = () => setIsOpen(true);
    const closeChat = () => setIsOpen(false);

    return { isOpen, toggleChat, openChat, closeChat, isLoading, messages, sendMessage, injectLocalMessage, uiAction, clearUiAction, isAiMode, activateAiMode, deactivateAiMode, isTtsEnabled, toggleTts };
}
