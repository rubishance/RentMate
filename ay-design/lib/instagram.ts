import { NextResponse } from 'next/server';

const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID; // Optional if using 'me' with correct token scope

// Define valid media fields to fetch
const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';

export async function getInstagramFeed() {
    if (!INSTAGRAM_TOKEN) {
        return { error: 'Instagram Access Token is missing in environment variables.' };
    }

    try {
        // Try fetching from the Graph API (for Business/Creator accounts)
        // Endpoint: https://graph.facebook.com/v19.0/{user_id}/media
        // If the token is a Page Access Token, we might need the IG User ID.
        // For simplicity, we assume the user provides a token that allows 'me/media' or equivalent functionality
        // but since Basic Display is dead, we likely need the specific business endpoint.

        // However, without a specific User ID, we can't easily guess.
        // Let's assume the standard Graph API edge for the user connected to the token.
        // A common pattern for newer integration:
        const endpoint = `https://graph.instagram.com/me/media?fields=${FIELDS}&access_token=${INSTAGRAM_TOKEN}&limit=9`;

        // Note: As of 2025, 'graph.instagram.com' might be strictly Basic Display (deprecated).
        // The robust path is 'graph.facebook.com/v19.0/{ig-user-id}/media'.
        // We will try the Graph API URL if User ID is present.

        let url = '';
        if (INSTAGRAM_USER_ID) {
            url = `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media?fields=${FIELDS}&access_token=${INSTAGRAM_TOKEN}&limit=9`;
        } else {
            // Fallback to the old endpoint (might fail if fully deprecated, but worth a shot for legacy tokens)
            // or instruct user to provide ID.
            url = `https://graph.instagram.com/me/media?fields=${FIELDS}&access_token=${INSTAGRAM_TOKEN}&limit=9`;
        }

        const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Instagram API Error:', errorData);
            return { error: 'Failed to fetch from Instagram API' };
        }

        const data = await response.json();
        return { data: data.data };

    } catch (error) {
        console.error('Instagram Fetch Error:', error);
        return { error: 'Network error fetching Instagram feed' };
    }
}
