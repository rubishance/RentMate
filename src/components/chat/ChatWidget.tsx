import { useRef, useEffect, useState } from 'react';
import { MessageCircle, X, Send, Bot, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatBot } from '../../hooks/useChatBot';

export function ChatWidget() {
    const { isOpen, toggleChat, isLoading, messages, sendMessage } = useChatBot();
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputRef.current?.value) {
            sendMessage(inputRef.current.value);
            inputRef.current.value = '';
        }
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
                        className="w-[350px] h-[540px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-black border-b border-white/10 flex justify-between items-center text-white cursor-move">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                <div className="p-2 bg-white rounded-lg">
                                    <Bot className="w-5 h-5 text-black" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">תמיכת RentMate</h3>
                                    <p className="text-xs text-gray-400">מופעל על ידי AI</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleChat}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-white/5">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-black dark:bg-white text-white dark:text-black border border-white/10 dark:border-black/10 rounded-br-none shadow-sm'
                                            : 'bg-white/90 dark:bg-neutral-800 border border-white/20 dark:border-neutral-700 text-black dark:text-white rounded-bl-none shadow-sm'
                                            }`}
                                        dir="auto"
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isListening && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 border border-white/5 p-3 rounded-2xl rounded-bl-none">
                                        <div className="flex items-center space-x-2 text-white">
                                            <Mic className="w-4 h-4 animate-pulse" />
                                            <span className="text-sm">מקשיב...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 border border-white/5 p-3 rounded-2xl rounded-bl-none">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
                                            <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="px-5 py-4 bg-black border-t border-white/10">
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="p-2 bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                                    aria-label="שלח הודעה"
                                >
                                    <Send className="w-5 h-5 text-black" />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    className={`p-2 rounded-xl transition-colors shrink-0 ${isListening
                                        ? 'bg-red-600 hover:bg-red-500'
                                        : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                    aria-label={isListening ? 'עצור הקלטה' : 'התחל הקלטה'}
                                >
                                    {isListening ? (
                                        <MicOff className="w-5 h-5 text-white" />
                                    ) : (
                                        <Mic className="w-5 h-5 text-white" />
                                    )}
                                </button>
                                <div className="flex-1">
                                    <label htmlFor="chat-input" className="sr-only">שאלה לצ׳אט</label>
                                    <input
                                        id="chat-input"
                                        ref={inputRef}
                                        type="text"
                                        placeholder="שאל שאלה או דבר..."
                                        dir="auto"
                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
                                    />
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB */}
            <motion.button
                onClick={toggleChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-black rounded-full shadow-2xl text-white transition-all hover:bg-gray-800"
            >
                <MessageCircle className="w-5 h-5" />
            </motion.button>
        </motion.div>
    );
}
