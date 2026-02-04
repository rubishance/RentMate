declare global {
    interface Window {
        google: any;
    }
}
declare const google: any;

import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

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
    const { loaded, error: mapError } = useGoogleMaps();
    const { lang } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const onChangeRef = useRef(onChange);

    // Keep onChangeRef updated
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (loaded && inputRef.current && !autocompleteRef.current) {
            // @ts-ignore
            const options: google.maps.places.AutocompleteOptions = {
                types: type === 'cities' ? ['(cities)'] : ['address'],
                componentRestrictions: { country: 'il' },
                // Use a more standard fields list for reliability
                fields: ['address_components', 'formatted_address', 'geometry', 'name']
            };

            // @ts-ignore
            autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, options);

            const listener = autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current?.getPlace();
                if (place?.formatted_address || place?.name) {
                    const value = type === 'address'
                        ? (place.formatted_address || place.name)
                        : (place.address_components?.find((c: any) => c.types.includes('locality'))?.long_name || place.name);
                    onChangeRef.current(value);
                }
            });

            return () => {
                if (google && google.maps && google.maps.event && autocompleteRef.current) {
                    google.maps.event.removeListener(listener);
                    // No direct 'destroy' for Autocomplete, but we can clear the pac-container
                    const containers = document.querySelectorAll('.pac-container');
                    containers.forEach(container => container.remove());
                    autocompleteRef.current = null;
                }
            };
        }
    }, [loaded, type]);

    // Update bounds if biasCity changes
    useEffect(() => {
        if (loaded && autocompleteRef.current && biasCity && type === 'address') {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: `${biasCity}, Israel` }, (results: any, status: any) => {
                if (status === 'OK' && results[0] && autocompleteRef.current) {
                    autocompleteRef.current.setBounds(results[0].geometry.viewport);
                }
            });
        }
    }, [loaded, biasCity, type]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className="space-y-2 w-full text-left rtl:text-right">
            {label && (
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">
                    {label}
                </label>
            )}
            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck="false"
                    className={cn(
                        "bg-transparent font-black text-2xl text-foreground w-full outline-none placeholder:opacity-30 transition-all duration-300",
                        hasError && "border-red-500 ring-1 ring-red-500",
                        className
                    )}
                />
                {!loaded && !mapError && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
        </div>
    );
}
