/**
 * Performance Utilities
 * Utilities for improving app performance and responsiveness
 */

/**
 * Debounce function to limit how often a function can fire
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to ensure a function is called at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Lazy load images with Intersection Observer
 */
export function lazyLoadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (!src) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                img.src = src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    observer.observe(img);
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
    name: string,
    fn: () => T | Promise<T>
): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
}

/**
 * Cache data in memory with expiration
 */
class MemoryCache<T> {
    private cache = new Map<string, { data: T; expiry: number }>();

    set(key: string, data: T, ttlMs: number = 5 * 60 * 1000) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttlMs
        });
    }

    get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear() {
        this.cache.clear();
    }

    delete(key: string) {
        this.cache.delete(key);
    }
}

export const memoryCache = new MemoryCache();

/**
 * Batch multiple async operations
 */
export async function batchAsync<T>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<void>
): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await processor(batch);
    }
}

/**
 * Request idle callback wrapper with fallback
 */
export function requestIdleCallback(callback: () => void, timeout = 2000) {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, { timeout });
    } else {
        return setTimeout(callback, 1);
    }
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(id: number) {
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        clearTimeout(id);
    }
}
