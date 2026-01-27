import { ChevronDown } from 'lucide-react';
import { PropertyIcon } from './PropertyIcon';
import type { Property } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';

interface PropertyTypeSelectProps {
    value: NonNullable<Property['property_type']>;
    onChange: (value: NonNullable<Property['property_type']>) => void;
    disabled?: boolean;
}

// We use a function to get formatted types because we need the t() function
const getPropertyTypes = (t: any): { value: NonNullable<Property['property_type']>; label: string }[] => [
    { value: 'apartment', label: t('apartment') },
    { value: 'penthouse', label: t('penthouse') },
    { value: 'garden', label: t('garden') },
    { value: 'house', label: t('house') },
    { value: 'other', label: t('other') }
];

export function PropertyTypeSelect({ value, onChange, disabled }: PropertyTypeSelectProps) {
    const { t } = useTranslation();

    return (
        <div className="relative">
            <div className="relative w-full">
                {/* Visual Custom Trigger overlay */}
                <div className="absolute inset-0 flex items-center px-4 pointer-events-none z-10">
                    <PropertyIcon type={value} className="w-5 h-5 mr-3 flex-shrink-0" />
                    {/* Label is rendered by select, but we can't easily style options. 
                        Actually, best way to have custom options with images is a DIV dropdown 
                        or just overlay the current value's icon. 
                        
                        The user asked for "assets type should include the images you generated". 
                        If we stick to native select, we can only show icon for the selected value (overlay).
                        To show images IN the list, we MUST use a custom dropdown.
                    */}
                </div>

                {/* We will implement a custom dropdown because standard select cannot show images in options */}
                <CustomDropdown value={value} onChange={onChange} disabled={disabled} t={t} />
            </div>
        </div>
    );
}

// Internal Custom Dropdown implementation
import { useState, useRef, useEffect } from 'react';

function CustomDropdown({ value, onChange, disabled, t }: PropertyTypeSelectProps & { t: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const propertyTypes = getPropertyTypes(t);
    const selectedOption = propertyTypes.find(p => p.value === value) || propertyTypes[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (newValue: NonNullable<Property['property_type']>) => {
        onChange(newValue);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg bg-white dark:bg-foreground transition-all ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border dark:border-gray-700'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
                <div className="flex items-center gap-3">
                    <PropertyIcon type={value} className="w-10 h-10" />
                    <span className="font-medium text-foreground dark:text-gray-100">{selectedOption.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {propertyTypes.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => handleSelect(type.value)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${value === type.value
                                ? 'bg-primary/10 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-secondary dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <PropertyIcon type={type.value} className="w-10 h-10" />
                            <span className="font-medium">{type.label}</span>
                            {value === type.value && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
