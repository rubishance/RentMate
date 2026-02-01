import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    persist?: boolean;
}

interface DataCacheContextType {
    get: <T>(key: string) => T | null;
    set: <T>(key: string, data: T, options?: { ttl?: number; persist?: boolean }) => void;
    clear: (key?: string) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const PERSIST_PREFIX = 'rentmate_cache_';

export function DataCacheProvider({ children }: { children: ReactNode }) {
    const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(() => {
        const initialCache = new Map<string, CacheEntry<any>>();
        // Load persisted items from localStorage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(PERSIST_PREFIX)) {
                    const cleanKey = key.replace(PERSIST_PREFIX, '');
                    const value = localStorage.getItem(key);
                    if (value) {
                        const entry = JSON.parse(value);
                        // Check expiry on load
                        if (Date.now() - entry.timestamp < DEFAULT_TTL * 12) { // 1 hour for persisted items
                            initialCache.set(cleanKey, entry);
                        } else {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[DataCache] Failed to load from localStorage:', e);
        }
        return initialCache;
    });

    const get = useCallback(<T,>(key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        const ttl = entry.persist ? DEFAULT_TTL * 12 : DEFAULT_TTL;

        if (now - entry.timestamp > ttl) {
            setCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            if (entry.persist) {
                localStorage.removeItem(PERSIST_PREFIX + key);
            }
            return null;
        }

        return entry.data as T;
    }, [cache]);

    const set = useCallback(<T,>(key: string, data: T, options?: { ttl?: number; persist?: boolean }) => {
        const timestamp = Date.now();
        const entry: CacheEntry<T> = {
            data,
            timestamp,
            persist: options?.persist
        };

        setCache(prev => {
            const newCache = new Map(prev);
            newCache.set(key, entry);
            return newCache;
        });

        if (options?.persist) {
            try {
                localStorage.setItem(PERSIST_PREFIX + key, JSON.stringify(entry));
            } catch (e) {
                console.warn('[DataCache] Failed to persist to localStorage:', e);
            }
        }
    }, []);

    const clear = useCallback((key?: string) => {
        if (key) {
            setCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            localStorage.removeItem(PERSIST_PREFIX + key);
        } else {
            setCache(new Map());
            // Clear all persisted items
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(PERSIST_PREFIX)) {
                    localStorage.removeItem(k);
                }
            });
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
