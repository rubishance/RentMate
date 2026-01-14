import type { Property } from '../../types/database';
import apartmentIcon from '../../assets/property-types/apartment.png';
import penthouseIcon from '../../assets/property-types/penthouse.png';
import gardenIcon from '../../assets/property-types/garden.png';
import houseIcon from '../../assets/property-types/house.png';
import otherIcon from '../../assets/property-types/other.png';

interface PropertyIconProps {
    type?: Property['property_type'];
    className?: string;
}

export function PropertyIcon({ type, className = "w-6 h-6" }: PropertyIconProps) {
    const getIconSrc = () => {
        switch (type) {
            case 'apartment': return apartmentIcon;
            case 'penthouse': return penthouseIcon;
            case 'garden': return gardenIcon;
            case 'house': return houseIcon;
            case 'other': return otherIcon;
            default: return apartmentIcon; // Default fallback
        }
    };

    return (
        <img
            src={getIconSrc()}
            alt={type || 'property'}
            className={`object-contain ${className}`}
        />
    );
}
