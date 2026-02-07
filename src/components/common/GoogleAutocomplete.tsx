import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GoogleAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    autoFocus?: boolean;
    type?: 'cities' | 'address';
    biasCity?: string;
    error?: boolean;
}

export function GoogleAutocomplete({
    value,
    onChange,
    placeholder,
    className,
    label,
    autoFocus,
    type = 'cities',
    biasCity,
    error: hasError
}: GoogleAutocompleteProps) {
    const { lang } = useTranslation();
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPredictions = async (input: string) => {
        if (!input || input.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        console.log('Autocomplete: Requesting for', input);
        try {
            const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
                body: {
                    action: 'autocomplete',
                    input,
                    types: type
                }
            });

            if (error) {
                console.error('Autocomplete API Error:', error);
                throw error;
            }

            if (data?.predictions) {
                console.log('Autocomplete: Suggestions count', data.predictions.length);
                setSuggestions(data.predictions);
                setIsOpen(true);
            } else {
                setSuggestions([]);
            }
        } catch (err) {
            console.error('Autocomplete Error:', err);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Simple debounce via timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue && inputValue !== value) {
                fetchPredictions(inputValue);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [inputValue, type]);

    const handleSelect = (prediction: any) => {
        const mainText = prediction.structured_formatting?.main_text || prediction.description;
        setInputValue(mainText);
        onChange(mainText);
        setIsOpen(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        onChange(e.target.value);
        if (!e.target.value) {
            setIsOpen(false);
            setSuggestions([]);
        }
    };

    return (
        <div className="space-y-2 w-full text-left rtl:text-right relative" ref={containerRef}>
            {label && (
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">
                    {label}
                </label>
            )}
            <div className="relative group">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInput}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    className={cn(
                        "bg-transparent font-black text-2xl text-foreground w-full outline-none placeholder:opacity-30 transition-all duration-300",
                        hasError && "border-red-500 ring-1 ring-red-500",
                        className
                    )}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                />

                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Suggestions List - Classic Absolute to avoid Portal issues */}
                {isOpen && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-3xl shadow-2xl z-[5000] max-h-[300px] overflow-y-auto overflow-x-hidden p-2 backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 duration-300">
                        {suggestions.map((item) => (
                            <button
                                key={item.place_id}
                                onClick={() => handleSelect(item)}
                                className="w-full text-left rtl:text-right px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-4 group/item border border-transparent hover:border-slate-100 dark:hover:border-white/10"
                            >
                                <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-muted-foreground group-hover/item:text-primary group-hover/item:bg-primary/10 transition-all">
                                    <MapPin className="w-5 h-5 transition-transform group-hover/item:scale-110" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-black text-foreground mb-0.5">
                                        {item.structured_formatting?.main_text || item.description}
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground truncate opacity-40 uppercase tracking-tight">
                                        {item.structured_formatting?.secondary_text}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
