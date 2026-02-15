import React, { useState, useMemo } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    label?: string;
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    error?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    label,
    options,
    selected,
    onChange,
    placeholder = 'Select options...',
    className,
    error
}) => {
    const selectedOptions = useMemo(() =>
        options.filter(op => selected.includes(op.value)),
        [options, selected]);

    const handleRemove = (e: React.MouseEvent, valueToRemove: string) => {
        e.stopPropagation();
        onChange(selected.filter(v => v !== valueToRemove));
    };

    return (
        <div className={cn("space-y-2 w-full", className)}>
            {label && (
                <label className="text-sm font-medium text-foreground ml-1">
                    {label}
                </label>
            )}
            <Listbox value={selected} onChange={onChange} multiple>
                <div className="relative mt-1">
                    <Listbox.Button className={cn(
                        "relative w-full cursor-pointer rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 py-3 pl-3 pr-10 text-left shadow-sm focus:outline-none focus-visible:border-primary sm:text-sm transition-all duration-300 min-h-[48px]",
                        error ? "border-destructive" : "hover:border-primary/50"
                    )}>
                        <div className="flex flex-wrap gap-2">
                            {selectedOptions.length === 0 ? (
                                <span className="block truncate text-muted-foreground ml-1">{placeholder}</span>
                            ) : (
                                selectedOptions.map((option) => (
                                    <span
                                        key={option.value}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground animate-in fade-in zoom-in duration-200"
                                    >
                                        {option.label}
                                        <div
                                            role="button"
                                            onClick={(e) => handleRemove(e, option.value)}
                                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </div>
                                    </span>
                                ))
                            )}
                        </div>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDown
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={React.Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-neutral-900 border border-slate-100 dark:border-white/10 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 glass-premium">
                            {options.map((option, optionIdx) => (
                                <Listbox.Option
                                    key={optionIdx}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2.5 pl-10 pr-4 transition-colors ${active ? 'bg-primary/10 text-primary-900 dark:text-primary-foreground' : 'text-foreground'
                                        }`
                                    }
                                    value={option.value}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                {option.label}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
            {error && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5 ml-1">
                    {error}
                </p>
            )}
        </div>
    );
};
