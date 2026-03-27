import { Calculator, Home, ArrowUpRight, Minus } from 'lucide-react';

export type LinkageType = 'none' | 'cpi' | 'housing' | 'construction';

export interface LinkageTypeConfig {
    id: LinkageType;
    labelKey: string;
    shortLabelKey?: string;
    linkedLabelKey?: string;
    fallbackHe: string;
    fallbackEn: string;
    linkedFallbackHe: string;
    linkedFallbackEn: string;
    icon: any;        // Lucide icon component
    color: string;    // Tailwind text color class
    bg: string;       // Tailwind background class
}

export const LINKAGE_TYPES: LinkageTypeConfig[] = [
    {
        id: 'none',
        labelKey: 'noLinkage',
        fallbackHe: 'ללא הצמדה',
        fallbackEn: 'No Linkage',
        linkedFallbackHe: 'לא צמוד',
        linkedFallbackEn: 'Not linked',
        icon: Minus,
        color: 'text-slate-500',
        bg: 'bg-slate-100 dark:bg-slate-800'
    },
    {
        id: 'cpi',
        labelKey: 'cpi',
        shortLabelKey: 'cpiAbbr',
        linkedLabelKey: 'linkedToCpi',
        fallbackHe: 'מדד המחירים לצרכן',
        fallbackEn: 'Consumer Price Index (CPI)',
        linkedFallbackHe: 'צמוד למדד',
        linkedFallbackEn: 'Linked to CPI',
        icon: Calculator,
        color: 'text-blue-500',
        bg: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
        id: 'housing',
        labelKey: 'housing',
        shortLabelKey: 'housingAbbr',
        linkedLabelKey: 'linkedToHousing',
        fallbackHe: 'מדד שירותי דיור',
        fallbackEn: 'Housing Index',
        linkedFallbackHe: 'צמוד למחירי הדיור',
        linkedFallbackEn: 'Linked to Housing',
        icon: Home,
        color: 'text-indigo-500',
        bg: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
        id: 'construction',
        labelKey: 'construction',
        linkedLabelKey: 'linkedToConstruction',
        fallbackHe: 'מדד תשומות הבנייה',
        fallbackEn: 'Construction Inputs Index',
        linkedFallbackHe: 'צמוד למדד תשומות הבנייה',
        linkedFallbackEn: 'Linked to Construction',
        icon: ArrowUpRight,
        color: 'text-amber-500',
        bg: 'bg-amber-100 dark:bg-amber-900/30'
    }
];

export const getLinkageConfig = (id: string | null | undefined): LinkageTypeConfig => {
    return LINKAGE_TYPES.find(l => l.id === id) || LINKAGE_TYPES[0]; // defaults to 'none'
};

export type LinkageSubType = 'known' | 'base' | 'respect_of';

export interface LinkageSubTypeConfig {
    id: LinkageSubType;
    labelKey: string;
}

export const LINKAGE_SUB_TYPES: LinkageSubTypeConfig[] = [
    {
        id: 'known',
        labelKey: 'knownIndex'
    },
    {
        id: 'base',
        labelKey: 'determiningIndex'
    },
    {
        id: 'respect_of',
        labelKey: 'inRespectOf'
    }
];
