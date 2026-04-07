import { useState, useEffect } from 'react';

export function useIndexedPayments(payments: any[]) {
    const [indexedAmounts, setIndexedAmounts] = useState<Record<string, number | null>>({});
    const [loading, setLoading] = useState(false);

    // TODO: Port index-data.service.ts to use React Native secure env vars
    // For now, return base amounts to prevent Metro Bundler crashes from Vite env vars.

    return { indexedAmounts, loading };
}
