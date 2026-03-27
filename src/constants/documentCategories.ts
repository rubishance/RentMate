import { FileText, Image as ImageIcon, FileStack, Banknote, Folder as FolderIcon } from 'lucide-react';
import type { DocumentCategory } from '../types/database';

export type CategoryTabType = 'media' | 'utilities' | 'documents' | 'checks' | 'protocols' | 'receipts';

export interface CategoryConfig {
    id: CategoryTabType;
    icon: any; // Lucide icon
    color: string;
    bg: string;
    labelKey: string;    // Used for translation mapping if needed
    fallbackHe: string;
    fallbackEn: string;
    descFallbackHe: string;
    descFallbackEn: string;
    allowManualUpload: boolean; // Tells the Global Upload Modal whether this is a standard selectable category
}

export const DOCUMENT_CATEGORIES: CategoryConfig[] = [
    {
        id: 'receipts', // Note: in DB it's 'receipt', but tab is 'receipts'. 
        // We will map 'receipts' to 'receipt' for upload, or just keep 'receipt' as ID
        icon: Banknote,
        color: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        labelKey: 'receipts',
        fallbackHe: 'אסמכתאות',
        fallbackEn: 'Receipts',
        descFallbackHe: 'קבלות, אישורי העברה ואסמכתאות',
        descFallbackEn: 'Receipts and transfer confirmations',
        allowManualUpload: true,
    },
    {
        id: 'utilities',
        icon: FileText,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        labelKey: 'utilitiesStorage',
        fallbackHe: 'חשבונות חשמל, מים, ארנונה', // Short: חשבונות
        fallbackEn: 'Utilities',
        descFallbackHe: 'חשבונות חשמל, מים, ראויות, גז ועוד',
        descFallbackEn: 'Electricity, water, tax bills',
        allowManualUpload: true,
    },
    {
        id: 'media',
        icon: ImageIcon,
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        labelKey: 'mediaStorage',
        fallbackHe: 'מדיה',
        fallbackEn: 'Media',
        descFallbackHe: 'תמונות וסרטונים מהנכס',
        descFallbackEn: 'Photos and videos',
        allowManualUpload: true,
    },
    {
        id: 'documents',
        icon: FileStack,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        labelKey: 'documentsStorage',
        fallbackHe: 'מסמכים',
        fallbackEn: 'Documents',
        descFallbackHe: 'ביטוחים, נסח טאבו, שונות',
        descFallbackEn: 'Insurance, deeds, misc',
        allowManualUpload: true,
    },
    {
        id: 'checks',
        icon: Banknote,
        color: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        labelKey: 'checksStorage',
        fallbackHe: 'צ\'קים',
        fallbackEn: 'Checks',
        descFallbackHe: 'צילומי צ\'קים לשכירות וביטחון',
        descFallbackEn: 'Rent & security checks',
        allowManualUpload: true,
    },
    {
        id: 'protocols',
        icon: FolderIcon,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-900/20',
        labelKey: 'protocols',
        fallbackHe: 'פרוטוקולי מסירה',
        fallbackEn: 'Protocols & Handovers',
        descFallbackHe: 'פרוטוקולים חתומים ומאושרים',
        descFallbackEn: 'Signed delivery protocols',
        allowManualUpload: false, // Generated via the Protocol Builder
    }
];

export const getCategoryConfig = (id: string): CategoryConfig | undefined => {
    // Safely map DB standard 'receipt' to 'receipts' config
    const normalizedId = id === 'receipt' ? 'receipts' : id;
    return DOCUMENT_CATEGORIES.find(c => c.id === normalizedId);
};
