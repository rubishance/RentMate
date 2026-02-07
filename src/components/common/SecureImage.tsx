import React from 'react';
import { useSignedUrl } from '../../hooks/useSignedUrl';
import { cn } from '../../lib/utils';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    bucket: string;
    path: string | null | undefined;
    placeholder?: string;
}

export function SecureImage({
    bucket,
    path,
    placeholder,
    className,
    onError,
    ...props
}: SecureImageProps) {
    const { url, loading } = useSignedUrl(bucket, path);

    // If path is a full URL (like Google Maps), use it directly
    const displayUrl = url || (path?.startsWith('http') ? path : placeholder);

    return (
        <img
            {...props}
            src={displayUrl || placeholder}
            className={cn(
                className,
                loading && "animate-pulse opacity-50 bg-slate-200 dark:bg-neutral-800"
            )}
            onError={(e) => {
                if (placeholder && (e.target as HTMLImageElement).src !== placeholder) {
                    (e.target as HTMLImageElement).src = placeholder;
                }
                if (onError) onError(e);
            }}
        />
    );
}
