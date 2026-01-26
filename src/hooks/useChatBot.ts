import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

export function useChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

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

    const sendMessage = async (content: string, fileInfo?: { name: string, path: string }) => {
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

        // If file exists, we inject private context for the AI to know about the file
        const apiMessages = [...messages];
        if (fileInfo) {
            apiMessages.push({
                role: 'system',
                content: `USER UPLOADED FILE: ${fileInfo.name}. Storage Path: ${fileInfo.path}. Help the user organize this file using available tools.`
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
                    conversationId: conversationId
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
                setMessages(prev => [...prev, assistantMessage]);

                if (data.conversationId) {
                    setConversationId(data.conversationId);
                }

                // Handle UI Action
                if (data.uiAction) {
                    setUiAction(data.uiAction);
                }
            }

        } catch (err: any) {
            console.error('Chat error details:', err);
            const errorMessage = err.message || "Unknown connection error";
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${errorMessage}. Please check your OpenAI API key and Supabase Function logs.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return { isOpen, toggleChat, isLoading, messages, sendMessage, uiAction, clearUiAction };
}
