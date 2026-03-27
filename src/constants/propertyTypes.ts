import type { Property } from '../types/database';

export interface PropertyTypeConfig {
    id: NonNullable<Property['property_type']>;
    labelKey: string;
}

export const PROPERTY_TYPES: PropertyTypeConfig[] = [
    { id: 'apartment', labelKey: 'apartment' },
    { id: 'penthouse', labelKey: 'penthouse' },
    { id: 'garden', labelKey: 'garden' },
    { id: 'house', labelKey: 'house' },
    { id: 'other', labelKey: 'other' }
];

export const getPropertyTypeConfig = (id: string | null | undefined): PropertyTypeConfig => {
    return PROPERTY_TYPES.find(p => p.id === id) || PROPERTY_TYPES[0];
};
