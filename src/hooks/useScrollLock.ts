import { useEffect } from 'react';

/**
 * Global counter to keep track of how many items are requesting a scroll lock.
 * This ensures that if we have nested modals, closing one won't unlock the
 * scroll if another is still open.
 */
let lockCount = 0;

export function useScrollLock(isEnabled: boolean) {
    useEffect(() => {
        if (!isEnabled) return;

        lockCount++;

        // Apply lock immediately
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;

        // Prevent layout shift by adding padding equivalent to scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        if (lockCount === 1) {
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        }

        return () => {
            lockCount--;
            if (lockCount === 0) {
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }
        };
    }, [isEnabled]);
}
