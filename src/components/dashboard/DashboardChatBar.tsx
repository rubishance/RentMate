import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { MessageCircle, Mic, MicOff, Paperclip, ArrowRight } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { cn } from '../../lib/utils';
import { chatBus } from '../../events/chatEvents';

interface DashboardChatBarProps {
    className?: string;
}

export function DashboardChatBar({ className }: DashboardChatBarProps) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition(isRtl ? 'he-IL' : 'en-US');

    // Sync transcript to input
    useEffect(() => {
        if (transcript && transcript !== inputValue) {
            setInputValue(transcript);
        }
    }, [transcript]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        chatBus.emit('SEND_MESSAGE', { message: inputValue });
        setInputValue('');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        chatBus.emit('FILE_UPLOADED', { file });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={cn("w-full max-w-3xl mx-auto", className)}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />

                <form
                    onSubmit={handleSubmit}
                    className="relative glass-premium rounded-[1.5rem] shadow-lg border border-white/20 dark:border-white/10 flex items-center p-1.5 bg-white/60 dark:bg-black/60 backdrop-blur-2xl"
                >
                    <div className="pl-4 pr-3 text-indigo-500 shrink-0">
                        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isRtl ? "איך אוכל לעזור לך לנהל את הנכסים היום?" : "How can I help you manage your properties today?"}
                        className="flex-1 bg-transparent border-none outline-none text-sm md:text-base font-medium h-10 md:h-12 placeholder:text-muted-foreground/50 transition-all px-2"
                        dir="auto"
                    />

                    <div className="flex items-center gap-1 md:gap-2 px-2 shrink-0">
                        {hasSupport && (
                            <button
                                type="button"
                                onClick={isListening ? stopListening : startListening}
                                className={cn(
                                    "p-2 rounded-full transition-all",
                                    isListening
                                        ? "bg-rose-100 text-rose-600 animate-pulse"
                                        : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                )}
                                title={isRtl ? "הקלטה קולית" : "Voice Input"}
                            >
                                {isListening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                            title={isRtl ? "צרף קובץ" : "Attach File"}
                        >
                            <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,image/*"
                        />

                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 p-2 md:p-2.5 rounded-full text-white transition-all shadow-md active:scale-95 shrink-0"
                        >
                            <ArrowRight className={cn("w-4 h-4 md:w-5 md:h-5", isRtl && "rotate-180")} />
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
