import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    
    // Hardcoded HE defaults since we're in Israel (RentMate)
    const isRtl = true;

    useEffect(() => {
        const initChat = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const isGuest = !session;
            const userId = session?.user?.id;

            if (userId) {
                const storedHistory = await AsyncStorage.getItem(`rentmate_chat_history_${userId}`);
                if (storedHistory) {
                    try {
                        const parsedHistory = JSON.parse(storedHistory);
                        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                            setMessages(parsedHistory);
                            return; 
                        }
                    } catch (e) {
                        console.error('Failed to parse chat history', e);
                    }
                }
            }

            const welcomeMsg = isGuest
                ? 'שלום! אני רנטי. אני יכול לעזור לך להבין איך RentMate עובד. כדי להשתמש ביכולות המתקדמות עליך להתחבר למערכת.'
                : 'שלום! אני רנטי - בוט ה-AI של RentMate. כיצד אפשר לעזור היום?';

            const welcomeMessageObj: Message = {
                role: 'assistant',
                content: welcomeMsg,
                timestamp: new Date().toISOString()
            };

            setMessages([welcomeMessageObj]);
        };
        initChat();
    }, []);

    // Save messages to async storage when they change
    useEffect(() => {
        const saveHistory = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (userId && messages.length > 0) {
                const messagesToSave = messages.slice(-50);
                await AsyncStorage.setItem(`rentmate_chat_history_${userId}`, JSON.stringify(messagesToSave));
            }
        };
        saveHistory();
    }, [messages]);

    const sendMessage = async (content: string, fileInfo?: { name: string, path: string }, analysisResults?: any) => {
        if (!content.trim() && !fileInfo) return;

        const displayContent = fileInfo
            ? `${content}\n\n[קובץ מצורף: ${fileInfo.name}]`
            : content;

        const userMessage: Message = {
            role: 'user',
            content: displayContent,
            timestamp: new Date().toISOString(),
            hiddenContext: fileInfo ? `SYSTEM CONTEXT: USER UPLOADED FILE: ${fileInfo.name}. Storage Path: ${fileInfo.path}.` : undefined
        };

        const apiMessages = [...messages];
        if (fileInfo) {
            let context = `USER UPLOADED FILE: ${fileInfo.name}. Storage Path: ${fileInfo.path}.`;
            if (analysisResults) {
                context += ` ANALYSIS RESULTS: ${JSON.stringify(analysisResults)}.`;
            }
            apiMessages.push({
                role: 'system',
                content: context
            });
        }
        apiMessages.push(userMessage);

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('chat-support', {
                body: {
                    messages: apiMessages,
                    conversationId: conversationId,
                    hasAiConsent: true // Assuming consent granted for this MVP
                },
                headers: session?.access_token ? {
                    Authorization: `Bearer ${session.access_token}`
                } : {}
            });

            if (error) throw error;

            if (data && data.choices?.[0]) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.choices[0].message.content || "לא הצלחתי להבין. אפשר לנסות שוב?",
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
            }

        } catch (err: any) {
            console.error('Chat error details:', err);
            let errorMessage = err.message || "שגיאת תקשורת";
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `שגיאה: ${errorMessage}`,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const resetChat = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (userId) {
            await AsyncStorage.removeItem(`rentmate_chat_history_${userId}`);
        }

        const welcomeMessageObj: Message = {
            role: 'assistant',
            content: 'שלום! אני רנטי - בוט ה-AI של RentMate. כיצד אפשר לעזור היום?',
            timestamp: new Date().toISOString()
        };

        setMessages([welcomeMessageObj]);
    };

    return { isLoading, messages, sendMessage, resetChat };
}
