import { Building2, Home, Trees, Box, Building } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Property } from '../../types/database';

import apartmentImg from '../../assets/property-types/apartment.png';
import penthouseImg from '../../assets/property-types/penthouse.png';
import gardenImg from '../../assets/property-types/garden.png';
import houseImg from '../../assets/property-types/house.png';
import otherImg from '../../assets/property-types/other.png';

interface PropertyIconProps {
    type?: Property['property_type'];
    className?: string;
}

export function PropertyIcon({ type, className }: PropertyIconProps) {
    const getImage = () => {
        switch (type) {
            case 'apartment': return apartmentImg;
            case 'penthouse': return penthouseImg;
            case 'garden': return gardenImg;
            case 'house': return houseImg;
            case 'other': return otherImg;
            default: return apartmentImg;
        }
    };

    return (
        <div className={cn("relative flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-neutral-800 shadow-sm", className)}>
            <img
                src={getImage()}
                alt={type || 'property'}
                className="w-full h-full object-cover"
            />
        </div>
    );
}
