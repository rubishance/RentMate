import * as React from 'react';
import { cn } from '../../lib/utils';
import { format, getDaysInMonth } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useTranslation } from '../../hooks/useTranslation';

interface MobileDatePickerProps {
    value?: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
    maxDate?: Date;
}

const ITEM_HEIGHT = 48; // h-12
const VISIBLE_ITEMS = 5;
const CENTER_OFFSET = Math.floor(VISIBLE_ITEMS / 2);

export function MobileDatePicker({ value, onChange, minDate, maxDate }: MobileDatePickerProps) {
    const { t, lang } = useTranslation();
    const defaultDate = value || new Date();
    
    // Internal state to hold current selections before they are committed
    const [currentDay, setCurrentDay] = React.useState(defaultDate.getDate());
    const [currentMonth, setCurrentMonth] = React.useState(defaultDate.getMonth());
    const [currentYear, setCurrentYear] = React.useState(defaultDate.getFullYear());

    // Generate lists
    const currentYearNum = new Date().getFullYear();
    const minD = minDate || new Date(currentYearNum - 10, 0, 1);
    const maxD = maxDate || new Date(currentYearNum + 40, 11, 31);

    const years = React.useMemo(() => {
        const arr = [];
        for (let y = minD.getFullYear(); y <= maxD.getFullYear(); y++) {
            arr.push(y);
        }
        return arr;
    }, [minD, maxD]);

    const months = React.useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => i);
    }, []);

    const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth));
    const days = React.useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }, [daysInMonth]);

    // Ensure currentDay stays valid if month changes to one with fewer days
    React.useEffect(() => {
        if (currentDay > daysInMonth) {
            setCurrentDay(daysInMonth);
            updateExternalDate(currentYear, currentMonth, daysInMonth);
        }
    }, [currentMonth, currentYear, daysInMonth]);

    const updateExternalDate = (y: number, m: number, d: number) => {
        onChange(new Date(y, m, d));
    };

    return (
        <div className="relative w-full bg-white dark:bg-neutral-900 rounded-2xl flex flex-col font-sans">
            <div className="relative flex justify-between h-[240px] overflow-hidden rounded-2xl bg-white dark:bg-neutral-800/10">
                {/* Center Highlight */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-12 bg-slate-50 dark:bg-neutral-800/50 shadow-sm pointer-events-none z-0 backdrop-blur-md rounded-2xl" />
                
                {/* Wheels Wrapper */}
                <div className={cn("flex w-full z-10 font-bold", lang === 'he' ? 'flex-row-reverse' : 'flex-row')} dir="ltr">
                    <ScrollColumn 
                        items={months.map(m => format(new Date(2020, m, 1), 'MMMM', { locale: lang === 'he' ? he : enUS }))}
                        values={months}
                        selectedValue={currentMonth}
                        onChange={(v) => { setCurrentMonth(v); updateExternalDate(currentYear, v, currentDay); }}
                        alignment="center"
                        width="w-[45%]"
                    />
                    <ScrollColumn 
                        items={days.map(d => String(d))}
                        values={days}
                        selectedValue={currentDay}
                        onChange={(v) => { setCurrentDay(v); updateExternalDate(currentYear, currentMonth, v); }}
                        alignment="center"
                        width="w-[25%]"
                    />
                    <ScrollColumn 
                        items={years.map(y => String(y))}
                        values={years}
                        selectedValue={currentYear}
                        onChange={(v) => { setCurrentYear(v); updateExternalDate(v, currentMonth, currentDay); }}
                        alignment="center"
                        width="w-[30%]"
                    />
                </div>
            </div>
            
            {/* The Done button can be rendered outside by DatePicker, but having one here is nice */}
        </div>
    );
}

interface ScrollColumnProps {
    items: string[];
    values: any[];
    selectedValue: any;
    onChange: (val: any) => void;
    alignment?: 'left' | 'center' | 'right';
    width?: string;
}

function ScrollColumn({ items, values, selectedValue, onChange, alignment = 'center', width = 'w-1/3' }: ScrollColumnProps) {
    const listRef = React.useRef<HTMLUListElement>(null);
    const scrollTimeout = React.useRef<any>(null);

    // Initial scroll setup
    React.useEffect(() => {
        const index = values.indexOf(selectedValue);
        if (index !== -1 && listRef.current) {
            listRef.current.scrollTop = index * ITEM_HEIGHT;
        }
    }, [selectedValue, values]);

    const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
        const container = e.currentTarget;
        clearTimeout(scrollTimeout.current);
        
        scrollTimeout.current = setTimeout(() => {
            const index = Math.round(container.scrollTop / ITEM_HEIGHT);
            // Snap to item
            container.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
            
            // Only fire onChange if value actually changed to prevent loops
            if (values[index] !== selectedValue) {
                onChange(values[index]);
            }
        }, 150);
    };

    const emptyItems = Array(CENTER_OFFSET).fill(null);
    const allItems = [...emptyItems, ...items, ...emptyItems];

    return (
        <ul 
            ref={listRef}
            onScroll={handleScroll}
            className={cn(
                "h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none outline-none mask-image-y",
                width
            )}
            style={{ 
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
                maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}
        >
            {allItems.map((item, i) => {
                const isItemEmpty = item === null;
                const actualIndex = i - CENTER_OFFSET;
                const isSelected = !isItemEmpty && values[actualIndex] === selectedValue;
                
                return (
                    <li 
                        key={`${i}-${item}`}
                        className={cn(
                            "h-12 flex items-center snap-center text-lg md:text-xl transition-all duration-200 justify-center select-none",
                            isSelected 
                                ? "text-foreground font-black scale-110 opacity-100" 
                                : "text-muted-foreground/40 font-bold opacity-70 scale-90",
                            isItemEmpty && "text-transparent pointer-events-none"
                        )}
                        onClick={() => {
                            if (!isItemEmpty) {
                                listRef.current?.scrollTo({ top: actualIndex * ITEM_HEIGHT, behavior: 'smooth' });
                                onChange(values[actualIndex]);
                            }
                        }}
                    >
                        {item || ' '}
                    </li>
                );
            })}
        </ul>
    );
}
