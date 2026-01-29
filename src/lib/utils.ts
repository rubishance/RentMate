import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

export function formatBytes(bytes: number, decimals = 2, isRTL = false) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    const unit = sizes[i];

    // For RTL, we want to ensure the number stays to the left of the unit (logical "Value Unit")
    // but without the browser reordering it incorrectly (e.g. "Unit Value")
    // Wrapping in LRI (Left-to-Right Isolate) \u2066 and PDI (Pop Directional Isolate) \u2069
    // ensures the internal ordering is maintained while being part of a larger RTL sentence.
    if (isRTL) {
        return `\u2066${value} ${unit}\u2069`;
    }
    return value + ' ' + unit;
}

export function formatNumber(val: string | number | null | undefined): string {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return String(val);

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
        useGrouping: true
    }).format(num);
}

export function parseNumber(val: string): string {
    return val.replace(/,/g, '');
}
