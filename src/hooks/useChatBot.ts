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

        // If file or analysis exists, we inject private context for the AI to know about the file
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

    const activateAiMode = () => setIsAiMode(true);
    const deactivateAiMode = () => setIsAiMode(false);

    const openChat = () => setIsOpen(true);
    const closeChat = () => setIsOpen(false);

    return { isOpen, toggleChat, openChat, closeChat, isLoading, messages, sendMessage, uiAction, clearUiAction, isAiMode, activateAiMode, deactivateAiMode };
}
