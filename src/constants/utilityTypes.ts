import { Zap, Landmark, Flame, Building2, Droplets, Wifi, Tv, Home as HomeIcon, FileText } from 'lucide-react';

export type UtilityType = 'water' | 'electric' | 'gas' | 'internet' | 'municipality' | 'management' | 'tv' | 'mortgage' | 'other';

export interface UtilityTypeConfig {
    id: UtilityType;
    labelKey: string;
    fallbackHe: string;
    fallbackEn: string;
    icon: any;        // Lucide icon component
    color: string;    // Tailwind text color class
    bg: string;       // Tailwind background class
}

export const UTILITY_TYPES: UtilityTypeConfig[] = [
    {
        id: 'electric',
        labelKey: 'utilityElectric',
        fallbackHe: 'חשמל',
        fallbackEn: 'Electricity',
        icon: Zap,
        color: 'text-yellow-500',
        bg: 'bg-warning/10'
    },
    {
        id: 'municipality',
        labelKey: 'utilityMunicipality',
        fallbackHe: 'ארנונה',
        fallbackEn: 'Municipality',
        icon: Landmark,
        color: 'text-muted-foreground',
        bg: 'bg-muted dark:bg-gray-700/50'
    },
    {
        id: 'gas',
        labelKey: 'utilityGas',
        fallbackHe: 'גז',
        fallbackEn: 'Gas',
        icon: Flame,
        color: 'text-orange-500',
        bg: 'bg-warning/10'
    },
    {
        id: 'management',
        labelKey: 'utilityManagement',
        fallbackHe: 'ועד בית',
        fallbackEn: 'Building Management',
        icon: Building2,
        color: 'text-primary',
        bg: 'bg-primary/10'
    },
    {
        id: 'water',
        labelKey: 'utilityWater',
        fallbackHe: 'מים',
        fallbackEn: 'Water',
        icon: Droplets,
        color: 'text-primary',
        bg: 'bg-primary/10 dark:bg-blue-900/30'
    },
    {
        id: 'internet',
        labelKey: 'utilityInternet',
        fallbackHe: 'אינטרנט',
        fallbackEn: 'Internet',
        icon: Wifi,
        color: 'text-indigo-500',
        bg: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
        id: 'tv',
        labelKey: 'utilityCable',
        fallbackHe: 'כבלים / טלוויזיה',
        fallbackEn: 'TV / Cable',
        icon: Tv,
        color: 'text-rose-500',
        bg: 'bg-rose-100 dark:bg-rose-900/30'
    },
    {
        id: 'mortgage',
        labelKey: 'utilityMortgage',
        fallbackHe: 'משכנתא',
        fallbackEn: 'Mortgage',
        icon: HomeIcon,
        color: 'text-emerald-500',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
        id: 'other',
        labelKey: 'utilityOther',
        fallbackHe: 'אחר',
        fallbackEn: 'Other',
        icon: FileText,
        color: 'text-muted-foreground',
        bg: 'bg-muted dark:bg-gray-800/30'
    }
];

export const getUtilityTypeConfig = (id: string): UtilityTypeConfig | undefined => {
    return UTILITY_TYPES.find(u => u.id === id);
};
