import React, { Fragment, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FormLabel } from './FormLabel';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps {
    label?: React.ReactNode;
    error?: string;
    required?: boolean;
    leftIcon?: React.ReactNode;
    options: SelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    required,
    leftIcon,
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    className,
    disabled
}) => {
    useEffect(() => {
        if (options?.length === 1 && value !== options[0].value) {
            onChange(options[0].value);
        }
    }, [options, value, onChange]);

    const selectedOption = options?.find(op => op.value === value);

    return (
        <div className={cn("space-y-2 w-full", className)}>
            {label && (
                <FormLabel label={label} required={required} />
            )}
            <Listbox value={value} onChange={onChange} disabled={disabled}>
                <div className="relative mt-1">
                    <Listbox.Button
                        className={cn(
                            "relative w-full cursor-pointer rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/10 px-4 py-2 text-start shadow-sm focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring sm:text-sm transition-all duration-300 h-12 flex items-center",
                            error ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive" : "hover:border-primary/50",
                            leftIcon ? "ps-11" : "",
                            disabled && "opacity-50 cursor-not-allowed bg-background dark:bg-neutral-800"
                        )}
                    >
                        {leftIcon && (
                            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground group-focus-within:text-primary transition-colors">
                                {leftIcon}
                            </span>
                        )}
                        <span className={cn("block truncate pe-6", !selectedOption && "text-muted-foreground")}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
                            <ChevronDown
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute mt-1 max-h-80 w-full overflow-auto rounded-xl bg-white dark:bg-neutral-900 border border-slate-100 dark:border-white/10 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 glass-premium">
                            {options.map((option, optionIdx) => (
                                <Listbox.Option
                                    key={optionIdx}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-2.5 ps-10 pe-4 text-start transition-colors ${active ? 'bg-primary/10 text-primary-900 dark:text-primary-foreground' : 'text-foreground'
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
                                                <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-primary">
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
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5 text-start w-full">
                    {error}
                </p>
            )}
        </div>
    );
};
