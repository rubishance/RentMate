import { supabase } from './supabase';

/**
 * Utility to handle secure file access via Signed URLs
 * This allows us to keep storage buckets private while still
 * providing access to specific files for logged-in users.
 */
export const StorageUtils = {
    /**
     * Generates a temporary signed URL for a file in a private bucket
     * @param bucket The name of the storage bucket ('contracts', 'property_images', etc.)
     * @param path The full path to the file within the bucket
     * @param expiresIn Duration in seconds (default 1 hour)
     */
    getSignedUrl: async (
        bucket: 'contracts' | 'property_images' | 'secure_documents' | string,
        path: string,
        expiresIn: number = 3600
    ): Promise<string | null> => {
        if (!path) return null;

        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
                return null;
            }

            return data.signedUrl;
        } catch (err) {
            console.error('Failed to generate signed URL:', err);
            return null;
        }
    },

    /**
     * Bulk conversion of multiple paths to signed URLs
     */
    getSignedUrls: async (
        bucket: string,
        paths: string[],
        expiresIn: number = 3600
    ): Promise<Record<string, string>> => {
        if (!paths.length) return {};

        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrls(paths, expiresIn);

            if (error) {
                console.error(`Error creating bulk signed URLs for ${bucket}:`, error);
                return {};
            }

            return data.reduce((acc, item) => {
                if (item.signedUrl && item.path) {
                    acc[item.path] = item.signedUrl;
                }
                return acc;
            }, {} as Record<string, string>);
        } catch (err) {
            console.error('Failed to generate bulk signed URLs:', err);
            return {};
        }
    },

    /**
     * Helper to determine if a path requires a signed URL
     * (Standard public URLs in Supabase follow a specific pattern)
     */
    isSignedUrlRequired: (url: string): boolean => {
        return !url.includes('/public/');
    }
};
