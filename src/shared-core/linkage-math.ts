/**
 * Linkage Math Pure Core
 * Agnostic mathematical operations for calculating index linkage and rent changes.
 * No external dependencies (no date-fns, no Supabase APIs).
 * Safe to import in both browser (Vite) and backend (Deno / Supabase Edge Functions).
 */

export function calculateProratedCeiling(annualCeiling: number, startDate: string, endDate: string): number {
    // Expected format "YYYY-MM" or "YYYY-MM-DD"
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    
    // Use UTC to prevent Local Timezone DST shifts from adding/removing hours
    const start = new Date(Date.UTC(Number(startParts[0]), Number(startParts[1]) - 1, 1));
    const end = new Date(Date.UTC(Number(endParts[0]), Number(endParts[1]) - 1, 1));
    
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
    const years = days / 365.25;
    
    return (annualCeiling / 100) * years;
}

export function calculateEffectiveChange(params: {
    linkageCoefficient: number;
    partialLinkage: number;
    isIndexBaseMinimum: boolean;
    proratedCeiling?: number;
}): number {
    let effectiveChange = (params.linkageCoefficient / 100) * (params.partialLinkage / 100);

    if (params.proratedCeiling !== undefined && params.proratedCeiling !== null) {
        effectiveChange = Math.min(effectiveChange, params.proratedCeiling);
    }

    if (params.isIndexBaseMinimum && effectiveChange < 0) {
        effectiveChange = 0;
    }

    return effectiveChange;
}

export function determineTargetIndexMonth(targetDate: string, linkageSubType?: 'known' | 'respect_of' | null): string {
    if (linkageSubType === 'respect_of') {
        return targetDate.slice(0, 7);
    }
    
    // 'known' logic (Day 15 rule fallback)
    const parts = targetDate.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = parts.length >= 3 ? Number(parts[2]) : 1; 
    
    const d = new Date(Date.UTC(year, month, 1));
    if (day < 15) {
        d.setUTCMonth(d.getUTCMonth() - 2);
    } else {
        d.setUTCMonth(d.getUTCMonth() - 1);
    }
    
    const yStr = d.getUTCFullYear().toString();
    const mStr = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${yStr}-${mStr}`;
}
