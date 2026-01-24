import { useState, useEffect, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    fallback?: string;
    lazy?: boolean;
}

/**
 * Optimized Image Component with lazy loading and error handling
 */
export function OptimizedImage({
    src,
    alt,
    fallback = '/placeholder.png',
    lazy = true,
    className = '',
    ...props
}: OptimizedImageProps) {
    const [imageSrc, setImageSrc] = useState<string>(lazy ? fallback : src);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!lazy) return;

        const img = new Image();
        img.src = src;

        img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
        };

        img.onerror = () => {
            setHasError(true);
            setImageSrc(fallback);
        };

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src, lazy, fallback]);

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={`${className} ${!isLoaded && lazy ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
            loading={lazy ? 'lazy' : 'eager'}
            onError={() => {
                if (!hasError) {
                    setHasError(true);
                    setImageSrc(fallback);
                }
            }}
            {...props}
        />
    );
}
