import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
}

export function useChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAiMode, setIsAiMode] = useState(true); // Default to chat mode directly

    useEffect(() => {
        const initChat = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const isGuest = !session;

            const welcomeMsg = isGuest
                ? 'שלום! אני רנטי. אני יכול לעזור לך להבין איך RentMate עובד. כדי להשתמש ביכולות המתקדמות (סריקת מסמכים, חישובים והצמדות), עליך להתחבר למערכת.'
                : 'שלום! אני רנטי - בוט ה-AI של RentMate. כיצד אפשר לעזור היום?';

            setMessages([{
                role: 'assistant',
                content: welcomeMsg,
                timestamp: new Date().toISOString()
            }]);
        };
        initChat();
    }, []);

    const [uiAction, setUiAction] = useState<{ action: string, modal: string, data: any } | null>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const clearUiAction = () => setUiAction(null);

    const sendMessage = async (content: string, fileInfo?: { name: string, path: string }, analysisResults?: any) => {
        if (!content.trim() && !fileInfo) return;

        // Add user message with hidden file context if present
        const displayContent = fileInfo
            ? `${content}\n\n[File Attached: ${fileInfo.name}]`
            : content;

        const userMessage: Message = {
            role: 'user',
            content: displayContent,
            timestamp: new Date().toISOString()
        };

        const apiMessages = [...messages];
        if (fileInfo) {
            let context = `USER UPLOADED FILE: ${fileInfo.name}. Storage Path: ${fileInfo.path}.`;
            if (analysisResults) {
                context += ` ANALYSIS RESULTS: ${JSON.stringify(analysisResults)}.`;
            }
            context += ` Help the user organize this file using available tools.`;

            apiMessages.push({
                role: 'system',
                content: context
            });
        }
        apiMessages.push(userMessage);

        const newMessagesForDisplay = [...messages, userMessage];
        setMessages(newMessagesForDisplay);
        setIsLoading(true);

        // Add an empty assistant message to be populated by the stream
        const assistantPlaceholder: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantPlaceholder]);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/chat-support`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    conversationId: conversationId
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response reader available");

            const decoder = new TextDecoder();
            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            if (data.t === 'text') {
                                accumulatedContent += data.v;
                                setMessages(prev => {
                                    const next = [...prev];
                                    if (next.length > 0) {
                                        next[next.length - 1] = {
                                            ...next[next.length - 1],
                                            content: accumulatedContent
                                        };
                                    }
                                    return next;
                                });
                            } else if (data.t === 'meta' && data.v.conversationId) {
                                setConversationId(data.v.conversationId);
                            } else if (data.t === 'ui') {
                                setUiAction(data.v);
                            } else if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            // Partial JSON or heartbeat
                        }
                    }
                }
            }

        } catch (err: any) {
            console.error('Chat error:', err);
            const errorMessage = err.message || "Unknown error";

            setMessages(prev => {
                const next = [...prev];
                if (next.length > 0 && next[next.length - 1].role === 'assistant') {
                    next[next.length - 1].content = `Error: ${errorMessage}. Please try again.`;
                }
                return next;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const activateAiMode = () => setIsAiMode(true);
    const deactivateAiMode = () => setIsAiMode(false);

    const openChat = () => setIsOpen(true);
    const closeChat = () => setIsOpen(false);

    return { isOpen, toggleChat, openChat, closeChat, isLoading, messages, sendMessage, uiAction, clearUiAction, isAiMode, activateAiMode, deactivateAiMode };
}
