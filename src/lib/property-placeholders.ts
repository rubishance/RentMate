import placeholderApartment from '../assets/placeholder-apartment.png';
import placeholderPenthouse from '../assets/placeholder-penthouse.png';
import placeholderGarden from '../assets/placeholder-garden.png';
import placeholderHouse from '../assets/placeholder-house.png';
import placeholderGeneric from '../assets/placeholder-generic.png';

export const getPropertyPlaceholder = (type?: string | null) => {
    switch (type) {
        case 'apartment': return placeholderApartment;
        case 'penthouse': return placeholderPenthouse;
        case 'garden': return placeholderGarden;
        case 'house': return placeholderHouse;
        default: return placeholderGeneric;
    }
};
