import { NextResponse } from 'next/server';
import { getInstagramFeed } from '@/lib/instagram';

export async function GET() {
    const feed = await getInstagramFeed();

    // If error, return 500 but with JSON payload so client can handle fallback
    if (feed.error) {
        return NextResponse.json(feed, { status: 500 });
    }

    return NextResponse.json(feed);
}
