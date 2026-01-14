import { useState, useRef, MouseEvent, RefObject } from 'react';

export function useDraggableScroll(): {
    ref: RefObject<HTMLDivElement | null>;
    onMouseDown: (e: MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (e: MouseEvent) => void;
    isDragging: boolean;
} {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e: MouseEvent) => {
        if (!ref.current) return;
        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        ref.current.scrollLeft = scrollLeft - walk;
    };

    return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, isDragging };
}
