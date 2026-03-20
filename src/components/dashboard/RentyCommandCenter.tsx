import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    date?: string;
    actionLabel?: string;
    onAction?: () => void;
}

interface RentyCommandCenterProps {
    firstName: string;
    feedItems: FeedItem[];
    className?: string;
}

export function RentyCommandCenter({ firstName, feedItems, className }: RentyCommandCenterProps) {
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
        <div className={cn("space-y-4 relative", className)}>
            {/* Ambient Background Glow */}
            <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-b from-indigo-500/10 via-blue-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />

            {/* Consolidated Header & Greeting */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left rtl:md:text-right">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2"
                    >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {t('commandCenter')}
                        </span>
                    </motion.div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tighter text-foreground leading-tight">
                        {t('commandCenter')}
                    </h1>
                </div>

                {/* Briefing Stats (Subtle) */}
                <div className="flex gap-4">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('TOGGLE_NOTIFICATIONS'))}
                        className="flex flex-col items-center px-3 py-1.5 bg-white/5 dark:bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group/updates"
                    >
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground group-hover/updates:text-indigo-400 transition-colors">{t('updates')}</span>
                        <span className="text-lg font-black text-foreground">{activeItems.length}</span>
                    </button>
                </div>
            </div>

            {/* Main Input Bar */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full relative group"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className={cn(
                    "absolute inset-0 rounded-[2rem] transition-all duration-300 pointer-events-none",
                    isDragging
                        ? "bg-indigo-500/20 ring-4 ring-indigo-500/30 scale-105"
                        : "bg-gradient-to-r from-indigo-500 to-blue-500 blur opacity-20 group-hover:opacity-30"
                )} />

                <form
                    onSubmit={handleSubmit}
                    className={cn(
                        "relative glass-premium rounded-[1.5rem] shadow-minimal flex items-center p-1.5 pr-1.5 overflow-hidden transition-all duration-500 border-white/10",
                        isDragging && "border-indigo-500 scale-[1.02] ring-4 ring-indigo-500/20"
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
                                "w-full bg-transparent border-none outline-none text-sm font-medium h-10 transition-all",
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
                                    : "text-slate-400 hover:text-indigo-600 hover:bg-background"
                            )}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                    )}

                    {/* File Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mx-1 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-background transition-all shadow-sm"
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
                        className="ml-2 w-10 h-10 button-jewel rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:scale-95 shrink-0"
                    >
                        <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
                    </button>
                </form>
            </motion.div>

            {/* Briefing Cards (List) */}
            {hasItems && (
                <div className="w-full group mt-2 z-10 relative">
                    <div className="flex flex-col gap-4 w-full">
                        {activeItems.map((item, idx) => {
                            const isActionOrInfo = item.type !== 'urgent' && item.type !== 'warning';
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + (idx * 0.1) }}
                                    className="w-full"
                                >
                                    <Card
                                        className={cn(
                                            "w-full rounded-[2rem] border transition-all duration-300 hover:scale-[1.01] cursor-pointer group/card overflow-hidden",
                                            item.type === 'urgent'
                                                ? "bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30"
                                                : item.type === 'warning'
                                                    ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30"
                                                    : "bg-primary border-primary/20 shadow-md text-primary-foreground dark:bg-primary/90"
                                        )}
                                        onClick={() => handleCardClick(item)}
                                    >
                                        <CardContent className="p-5 flex flex-col h-full justify-between relative">
                                            {/* Decorative background circle for blue card */}
                                            {isActionOrInfo && (
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl opacity-50 -mr-10 -mt-10 pointer-events-none" />
                                            )}
                                            
                                            <div className="relative z-10 w-full flex flex-col items-stretch text-right" dir="auto">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className={cn(
                                                        "p-2 rounded-xl shrink-0",
                                                        item.type === 'urgent' ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400" :
                                                            item.type === 'warning' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" :
                                                                "bg-white/20 text-white backdrop-blur-sm"
                                                    )}>
                                                        {item.type === 'urgent' || item.type === 'warning' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs font-bold uppercase tracking-widest opacity-90",
                                                        isActionOrInfo ? "text-primary-foreground/80" : "text-muted-foreground"
                                                    )}>{item.date}</span>
                                                </div>

                                                <h3 className={cn(
                                                    "font-black text-xl md:text-2xl tracking-tight leading-tight mb-2",
                                                    isActionOrInfo ? "text-primary-foreground" : "text-foreground"
                                                )}>
                                                    {item.title}
                                                </h3>
                                                <p className={cn(
                                                    "text-base leading-relaxed font-medium mb-5",
                                                    isActionOrInfo ? "text-primary-foreground/80" : "text-muted-foreground"
                                                )}>
                                                    {item.desc}
                                                </p>
                                                
                                                <div className={cn(
                                                    "flex items-center gap-2 text-base font-bold uppercase tracking-widest group-hover/card:underline decoration-2 underline-offset-4 self-start md:self-auto",
                                                    isActionOrInfo ? "text-primary-foreground decoration-primary-foreground/50" : "text-primary dark:text-primary decoration-primary/30"
                                                )}>
                                                    {isRtl ? (
                                                        <>
                                                            <ArrowRight className="w-4 h-4 transition-transform group-hover/card:-translate-x-1 rotate-180" />
                                                            {t('rentySuggestsAction')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowRight className="w-4 h-4 transition-transform group-hover/card:translate-x-1" />
                                                            {t('rentySuggestsAction')}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
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
