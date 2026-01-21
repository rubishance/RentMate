import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';

export const ShortenerService = {
    /**
     * Generates a short link for the given URL
     * @param originalUrl The full URL to shorten
     * @returns The short URL (e.g. /s/AbCd12)
     */
    generateShortLink: async (originalUrl: string): Promise<string> => {
        // Generate a 6-character secure random slug
        const slug = nanoid(6);

        // Insert into Supabase
        const { error } = await supabase
            .from('short_links')
            .insert({
                slug,
                original_url: originalUrl
            });

        if (error) {
            console.error('Shortener error:', error);
            throw new Error('Failed to generate short link');
        }

        // Return the constructed URL
        return `${window.location.origin}/s/${slug}`;
    },

    /**
     * Retrieves the original URL for a given slug
     * @param slug The short code
     * @returns The original URL or null if not found/expired
     */
    getOriginalUrl: async (slug: string): Promise<string | null> => {
        const { data, error } = await supabase
            .from('short_links')
            .select('original_url, expires_at')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            return null;
        }

        // Check expiration
        if (new Date(data.expires_at) < new Date()) {
            return null;
        }

        return data.original_url;
    }
};
