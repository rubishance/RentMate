import LZString from 'lz-string';

// Minification Map
const KEY_MAP: Record<string, string> = {
    // Common
    type: 't',

    // Standard
    baseRent: 'br',
    linkageType: 'lt',
    baseDate: 'bd',
    targetDate: 'td',
    partialLinkage: 'pl',
    isIndexBaseMinimum: 'ibm',

    // Reconciliation
    contractStartDate: 'csd', // Base Index Date
    periodStart: 'ps',
    periodEnd: 'pe',
    actualPaid: 'ap',
    monthlyActuals: 'ma',
    // monthlyBaseRent: 'mbr', // Not currently used in UI state but good to have
    linkageSubType: 'lst',
    updateFrequency: 'uf',
    maxIncrease: 'mix', // maxIncreasePercentage
    recIndexBaseMinimum: 'ribm',

    // Lists
    expectedHistory: 'eh',
    actualPayments: 'pay'
};

// Reverse Map
const REV_KEY_MAP: Record<string, string> = Object.entries(KEY_MAP).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {});

// Helper to minify an object
function minifyObject(obj: any): any {
    if (Array.isArray(obj)) return obj.map(minifyObject);
    if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            const newKey = KEY_MAP[key] || key;
            newObj[newKey] = minifyObject(obj[key]);
        }
        return newObj;
    }
    return obj;
}

// Helper to unminify an object
function unminifyObject(obj: any): any {
    if (Array.isArray(obj)) return obj.map(unminifyObject);
    if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            const newKey = REV_KEY_MAP[key] || key;
            newObj[newKey] = unminifyObject(obj[key]);
        }
        return newObj;
    }
    return obj;
}

export const UrlCompression = {
    /**
     * Compresses calculation data into a short URL-safe string
     * STRIPS the result object to save space (auto-calculate on load)
     */
    compress: (data: { input: any, result?: any }): string => {
        // We only compress the INPUT. The result can be recalculated.
        // This saves massive space (~90% reduction for reconciliation).
        const payload = {
            i: minifyObject(data.input)
        };
        const json = JSON.stringify(payload);
        return LZString.compressToEncodedURIComponent(json);
    },

    /**
     * Decompresses the string back into data
     */
    decompress: (compressed: string): { input: any, result?: any } | null => {
        try {
            // Try new format
            const json = LZString.decompressFromEncodedURIComponent(compressed);
            if (!json) return null; // Or try legacy fallbacks in component

            const payload = JSON.parse(json);

            // If payload has 'i' (minified input), restore it
            if (payload.i) {
                return {
                    input: unminifyObject(payload.i),
                    result: null // Result must be recalculated
                };
            }

            // Legacy handling (if we had full objects compressed)
            return unminifyObject(payload);
        } catch (e) {
            console.error('Decompression error', e);
            return null;
        }
    }
};
