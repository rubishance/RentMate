import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { chatBus } from '../events/chatEvents';

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
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAiMode, setIsAiMode] = useState(true); // Default to chat mode directly
    const [isTtsEnabled, setIsTtsEnabled] = useState(() => {
        const savedPrefs = localStorage.getItem('rentyTtsEnabled');
        return savedPrefs ? JSON.parse(savedPrefs) : false;
    });
    const { info } = useToast();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';

    // Track isOpen to trigger notifications if closed
    const isOpenRef = useRef(isOpen);
    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) {
            setUnreadCount(0);
            chatBus.emit('UNREAD_COUNT_CHANGED', 0);
        }
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
                            // Legacy cache upgrade: Ensure the first menu matches the latest 3-lines menu (Image 2)
                            if (parsedHistory[0] && parsedHistory[0].type === 'action' && parsedHistory[0].actionData && parsedHistory[0].actionData.title) {
                                parsedHistory[0].actionData = {
                                    title: isRtl ? 'תמיכה ושירות' : 'Support & Service',
                                    options: [
                                        { label: isRtl ? 'מדריך לאפליקציה' : 'App Guide', value: 'ACTION_APP_GUIDE' },
                                        { label: isRtl ? 'חבילות ומנויים' : 'Packages & Subscriptions', value: 'ACTION_PACKAGES' },
                                        { label: isRtl ? 'שאלות כלליות' : 'General Questions', value: 'ACTION_GENERAL_QA' },
                                        { label: isRtl ? 'נציג אנושי' : 'Human Support', value: 'ACTION_HUMAN_SUPPORT' }
                                    ]
                                };
                            }
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

            if (!isGuest) {
                welcomeMessageObj.type = 'action';
                welcomeMessageObj.actionData = {
                    title: isRtl ? 'תמיכה ושירות' : 'Support & Service',
                    options: [
                        { label: isRtl ? 'מדריך לאפליקציה' : 'App Guide', value: 'ACTION_APP_GUIDE' },
                        { label: isRtl ? 'חבילות ומנויים' : 'Packages & Subscriptions', value: 'ACTION_PACKAGES' },
                        { label: isRtl ? 'שאלות כלליות' : 'General Questions', value: 'ACTION_GENERAL_QA' },
                        { label: isRtl ? 'נציג אנושי' : 'Human Support', value: 'ACTION_HUMAN_SUPPORT' }
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

    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext lazily
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
        }
    }, []);

    const toggleChat = () => setIsOpen(!isOpen);
    
    const toggleTts = () => {
        setIsTtsEnabled((prev: boolean) => {
            const newValue = !prev;
            localStorage.setItem('rentyTtsEnabled', JSON.stringify(newValue));
            
            // Unlock Web Audio context on user interaction
            if (newValue && audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            return newValue;
        });
    };

    const clearUiAction = () => setUiAction(null);

    const playTts = async (text: string) => {
        console.log('--- TTS Triggered ---', { isTtsEnabled, text });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('TTS Session check:', !!session);
            if (!session) {
                info(isRtl ? 'שגיאת שמע' : 'Audio Error', { description: isRtl ? 'יש להתחבר כדי לשמוע קול' : 'Please log in to use voice.' });
                setIsTtsEnabled(false);
                return;
            }

            const projectUrl = import.meta.env.VITE_SUPABASE_URL;
            const functionUrl = `${projectUrl}/functions/v1/text-to-speech`;
            console.log('TTS Fetching:', functionUrl);

            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ text })
            });

            console.log('TTS Fetch completed. OK:', res.ok, 'Status:', res.status);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('TTS Fetch failed:', errData);
                info(isRtl ? 'שגיאת שמע' : 'Audio Error', { description: errData.error || 'Premium feature requirement not met.' });
                // We no longer turn off TTS here, user can manually toggle it if desired
                return;
            }

            if (!res.body) throw new Error('ReadableStream not yet supported in this browser.');
            console.log('TTS Streaming Audio started...');

            // We must use MediaSource to play standard mp3 streams cleanly in real-time
            const mediaSource = new MediaSource();
            const url = URL.createObjectURL(mediaSource);
            const audio = new Audio(url);

            mediaSource.addEventListener('sourceopen', async () => {
                // OpenAI returns mp3 format by default
                const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
                const reader = res.body!.getReader();
                
                // Keep track of whether we are actively appending
                let isAppending = false;
                let queue: Uint8Array[] = [];

                const appendNext = () => {
                    if (!sourceBuffer.updating && queue.length > 0) {
                        isAppending = true;
                        const chunk = queue.shift()!;
                        // Fix for TypeScript: Explicitly convert to an ArrayBuffer
                        sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer);
                    }
                };

                sourceBuffer.addEventListener('updateend', () => {
                    isAppending = false;
                    appendNext();
                });

                audio.play().then(() => console.log('TTS Playback started immediately!'))
                           .catch(e => console.error('Audio play error:', e));

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        queue.push(value);
                        if (!isAppending) appendNext();
                    }
                    
                    // Wait for queue to drain before ending the stream
                    const finishInterval = setInterval(() => {
                        if (!isAppending && queue.length === 0 && !sourceBuffer.updating) {
                            clearInterval(finishInterval);
                            mediaSource.endOfStream();
                        }
                    }, 50);

                } catch (e) {
                    console.error('Error reading stream:', e);
                    mediaSource.endOfStream('network');
                }
            });
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

                setMessages(prev => {
                    const updated = [...prev, assistantMessage];
                    
                    // Track unread if chat is closed
                    if (!isOpenRef.current) {
                        setUnreadCount(c => {
                            const newCount = c + 1;
                            chatBus.emit('UNREAD_COUNT_CHANGED', newCount);
                            return newCount;
                        });
                    }
                    
                    return updated;
                });

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

                info(isRtl ? 'קיבלת הודעה חדשה מ-Renty' : 'New message from Renty', {
                    description: isRtl ? 'פתח את הצ׳אט כדי לקרוא.' : 'Open chat to read.',
                });
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

    const resetChat = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const isGuest = !session;
        const userId = session?.user?.id;

        if (userId) {
            localStorage.removeItem(`rentmate_chat_history_${userId}`);
        }

        const welcomeMsg = isGuest
            ? 'שלום! אני רנטי. אני יכול לעזור לך להבין איך RentMate עובד. כדי להשתמש ביכולות המתקדמות (סריקת מסמכים, חישובים והצמדות), עליך להתחבר למערכת.'
            : 'שלום! אני רנטי - בוט ה-AI של RentMate. כיצד אפשר לעזור היום?\n\n(לידיעתך, שיחות אלו נשמרות באופן מאובטח לצרכי שיפור השירות והבטחת איכות).';

        const welcomeMessageObj: Message = {
            role: 'assistant',
            content: welcomeMsg,
            timestamp: new Date().toISOString()
        };

        if (!isGuest) {
            welcomeMessageObj.type = 'action';
            welcomeMessageObj.actionData = {
                title: isRtl ? 'תמיכה ושירות' : 'Support & Service',
                options: [
                    { label: isRtl ? 'מדריך לאפליקציה' : 'App Guide', value: 'ACTION_APP_GUIDE' },
                    { label: isRtl ? 'חבילות ומנויים' : 'Packages & Subscriptions', value: 'ACTION_PACKAGES' },
                    { label: isRtl ? 'שאלות כלליות' : 'General Questions', value: 'ACTION_GENERAL_QA' },
                    { label: isRtl ? 'נציג אנושי' : 'Human Support', value: 'ACTION_HUMAN_SUPPORT' }
                ]
            };
        }

        setMessages([welcomeMessageObj]);
        info(isRtl ? 'היסטוריית הצ׳אט אופסה' : 'Chat history reset', { icon: '🧹' });
    };

    return { isOpen, toggleChat, openChat, closeChat, resetChat, isLoading, messages, sendMessage, injectLocalMessage, uiAction, clearUiAction, isAiMode, activateAiMode, deactivateAiMode, isTtsEnabled, toggleTts };
}
