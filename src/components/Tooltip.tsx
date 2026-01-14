import { Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface TooltipProps {
    quote: string;
    className?: string;
}

export function Tooltip({ quote, className }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    if (!quote) return null;

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                className={cn(
                    "p-1 rounded-full hover:bg-blue-100 text-blue-600 transition-colors",
                    className
                )}
                aria-label="View source from contract"
            >
                <Info className="w-4 h-4" />
            </button>

            {isVisible && (
                <div className="absolute z-50 w-64 p-3 bg-white border-2 border-blue-200 rounded-lg shadow-xl left-6 top-0 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="flex items-start gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-blue-900">From Contract:</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed" dir="rtl">
                        "{quote}"
                    </p>
                    {/* Arrow pointer */}
                    <div className="absolute left-0 top-2 -translate-x-1 w-2 h-2 bg-white border-l-2 border-t-2 border-blue-200 rotate-[-45deg]" />
                </div>
            )}
        </div>
    );
}
