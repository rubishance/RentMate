import { useState, useEffect } from 'react';
import { StorageUtils } from '../lib/storage-utils';

/**
 * Hook to automatically handle signed URLs for private storage assets
 * @param bucket Storage bucket name
 * @param path File path in bucket
 * @param dependencies Optional dependencies to trigger refresh
 */
export function useSignedUrl(
    bucket: string,
    path: string | null | undefined,
    dependencies: any[] = []
) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(!!path);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!path) {
            setUrl(null);
            setLoading(false);
            return;
        }

        // Optimization: If it's already a public URL or a data URL, just use it
        if (path.startsWith('http') || path.startsWith('data:')) {
            setUrl(path);
            setLoading(false);
            return;
        }

        async function fetchUrl() {
            setLoading(true);
            try {
                const signedUrl = await StorageUtils.getSignedUrl(bucket, path!);
                setUrl(signedUrl);
            } catch (err: any) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        fetchUrl();
    }, [bucket, path, ...dependencies]);

    return { url, loading, error };
}
