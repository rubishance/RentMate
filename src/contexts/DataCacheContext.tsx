import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface DataCacheContextType {
    get: <T>(key: string) => T | null;
    set: <T>(key: string, data: T, ttl?: number) => void;
    clear: (key?: string) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function DataCacheProvider({ children }: { children: ReactNode }) {
    const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map());

    const get = useCallback(<T,>(key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;

        // Check if expired
        const now = Date.now();
        if (now - entry.timestamp > DEFAULT_TTL) {
            // Remove expired entry
            setCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            return null;
        }

        return entry.data as T;
    }, [cache]);

    const set = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
        setCache(prev => {
            const newCache = new Map(prev);
            newCache.set(key, {
                data,
                timestamp: Date.now()
            });
            return newCache;
        });
    }, []);

    const clear = useCallback((key?: string) => {
        if (key) {
            setCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
        } else {
            setCache(new Map());
        }
    }, []);

    return (
        <DataCacheContext.Provider value={{ get, set, clear }}>
            {children}
        </DataCacheContext.Provider>
    );
}

export function useDataCache() {
    const context = useContext(DataCacheContext);
    if (!context) {
        throw new Error('useDataCache must be used within DataCacheProvider');
    }
    return context;
}
