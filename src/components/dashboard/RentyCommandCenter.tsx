import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { Send, Sparkles, ArrowRight, MessageCircle, AlertCircle, CheckCircle2, Mic, MicOff, Paperclip, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { cn } from '../../lib/utils';
import { chatBus } from '../../events/chatEvents';
import { Card, CardContent } from '../ui/Card';

interface FeedItem {
    id: string;
    type: 'warning' | 'info' | 'success' | 'urgent' | 'action';
    title: string;
    desc: string;
    date: string;
    actionLabel?: string;
    onAction?: () => void;
}

interface RentyCommandCenterProps {
    firstName: string;
    feedItems: FeedItem[];
}

export function RentyCommandCenter({ firstName, feedItems }: RentyCommandCenterProps) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition(isRtl ? 'he-IL' : 'en-US');

    // Sync transcript to input
    useEffect(() => {
        if (transcript && transcript !== inputValue) {
            setInputValue(transcript);
        }
    }, [transcript]);

    // Filter out "welcome" if there are other items
    const activeItems = feedItems.filter(item => item.id !== 'welcome');
    const hasItems = activeItems.length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        chatBus.emit('SEND_MESSAGE', { message: inputValue });
        setInputValue('');
    };

    const handleCardClick = (item: FeedItem) => {
        if (item.onAction) {
            item.onAction();
            return;
        }

        // Generate a context-aware prompt based on the item as fallback
        let message = '';
        if (item.type === 'warning' || item.type === 'urgent') {
            message = `I see there is an issue with "${item.title}" at ${item.desc}. How should we handle this?`;
        } else {
            message = `I want to discuss "${item.title}" regarding ${item.desc}.`;
        }

        chatBus.emit('OPEN_CHAT', { message });
    };

    const validateAndUploadFile = (file: File) => {
        // Size check (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Max size is 5MB.');
            return;
        }

        // Emit global event - ChatWidget will pick it up and handle upload/analysis
        chatBus.emit('FILE_UPLOADED', { file });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        validateAndUploadFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        validateAndUploadFile(file);
    };

    const greeting = getTimeBasedGreeting(t);

    return (
        <div className="space-y-6 relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-full h-[400px] bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />

            {/* Consolidated Header & Greeting */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left rtl:md:text-right">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2"
                    >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {t('commandCenter')}
                        </span>
                    </motion.div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {t('commandCenter')}
                    </h1>
                </div>

                {/* Briefing Stats (Subtle) */}
                <div className="flex gap-4">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('TOGGLE_NOTIFICATIONS'))}
                        className="flex flex-col items-center px-4 py-2 bg-white/5 dark:bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group/updates"
                    >
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover/updates:text-indigo-400 transition-colors">{t('updates')}</span>
                        <span className="text-xl font-black text-foreground">{activeItems.length}</span>
                    </button>
                </div>
            </div>

            {/* Main Input Bar */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="max-w-2xl mx-auto w-full relative group"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className={cn(
                    "absolute inset-0 rounded-[2rem] transition-all duration-300 pointer-events-none",
                    isDragging
                        ? "bg-indigo-500/20 ring-4 ring-indigo-500/30 scale-105"
                        : "bg-gradient-to-r from-indigo-500 to-violet-500 blur opacity-20 group-hover:opacity-30"
                )} />

                <form
                    onSubmit={handleSubmit}
                    className={cn(
                        "relative glass-premium rounded-[2rem] shadow-jewel flex items-center p-2 pr-2 overflow-hidden transition-all duration-500",
                        isDragging
                            ? "border-indigo-500 scale-[1.02] ring-4 ring-indigo-500/20"
                            : "border-white/10"
                    )}
                >
                    <div className={cn(
                        "pl-4 pr-3 transition-colors",
                        isDragging ? "text-indigo-600 scale-110" : "text-indigo-500"
                    )}>
                        {isDragging ? <Paperclip className="w-6 h-6 animate-bounce" /> : <MessageCircle className="w-6 h-6" />}
                    </div>

                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isDragging ? (isRtl ? "שחרר את הקובץ לניתוח..." : "Drop file to analyze...") : (isRtl ? "איך אוכל לעזור לך לנהל את הנכסים היום?" : "How can I help you manage your properties today?")}
                            className={cn(
                                "w-full bg-transparent border-none outline-none text-base font-medium h-12 transition-all",
                                isDragging ? "placeholder:text-indigo-600/70" : "placeholder:text-muted-foreground/50"
                            )}
                            dir="auto"
                            disabled={isDragging}
                        />
                        {isDragging && (
                            <div className="absolute inset-0 flex items-center justify-start pointer-events-none text-indigo-600 font-semibold bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
                                {isRtl ? "שחרר את הקובץ לניתוח..." : "Drop file to analyze..."}
                            </div>
                        )}
                    </div>

                    {/* Voice Input Button */}
                    {hasSupport && (
                        <button
                            type="button"
                            onClick={isListening ? stopListening : startListening}
                            className={cn(
                                "mx-1 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                isListening
                                    ? "bg-rose-100 text-rose-600 animate-pulse"
                                    : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                            )}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}

                    {/* File Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mx-1 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Paperclip className="w-5 h-5" />
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
                        className="ml-2 w-12 h-12 button-jewel rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:scale-95 shrink-0"
                    >
                        <ArrowRight className={cn("w-5 h-5", isRtl && "rotate-180")} />
                    </button>
                </form>
            </motion.div>

            {/* Briefing Cards (Carousel) */}
            {hasItems && (
                <div className="max-w-5xl mx-auto px-4 overflow-x-auto pb-4 pt-2 -mx-4 scrollbar-hide flex gap-4 snap-x snap-mandatory justify-start md:justify-center">
                    {activeItems.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + (idx * 0.1) }}
                            className="flex-shrink-0 snap-center"
                        >
                            <Card
                                className={cn(
                                    "w-[280px] h-full rounded-[2rem] border transition-all duration-300 hover:scale-[1.02]",
                                    item.type === 'urgent'
                                        ? "bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30"
                                        : item.type === 'warning'
                                            ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30"
                                            : "bg-card dark:bg-slate-900/50"
                                )}
                                onClick={() => handleCardClick(item)}
                                hoverEffect
                            >
                                <CardContent className="p-6 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={cn(
                                                "p-2 rounded-xl",
                                                item.type === 'urgent' ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" :
                                                    item.type === 'warning' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" :
                                                        "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                                            )}>
                                                {item.type === 'urgent' || item.type === 'warning' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">{item.date}</span>
                                        </div>

                                        <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2 text-foreground">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                                            {item.desc}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest group-hover:underline decoration-2 underline-offset-4 decoration-indigo-200">
                                        {t('rentySuggestsAction')}
                                        <ArrowRight className={cn("w-3 h-3 transition-transform group-hover:translate-x-1", isRtl && "rotate-180 group-hover:-translate-x-1")} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getTimeBasedGreeting(t: (key: string) => string) {
    const hour = new Date().getHours();
    if (hour < 5) return t('goodNight');
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    if (hour < 21) return t('goodEvening');
    return t('goodNight');
}
