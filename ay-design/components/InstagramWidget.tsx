'use client';

import { useEffect, useState } from 'react';
import { Instagram, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InstagramMedia {
    id: string;
    caption: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    permalink: string;
    thumbnail_url?: string;
}

export default function InstagramWidget() {
    const t = useTranslations('Contact');
    const [posts, setPosts] = useState<InstagramMedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchFeed() {
            try {
                const res = await fetch('/api/instagram');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                if (data.data) {
                    setPosts(data.data);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchFeed();
    }, []);

    // Fallback static view (if API fails or no token)
    const renderFallback = () => (
        <div style={{
            width: '100%',
            maxWidth: '600px',
            height: '500px',
            borderRadius: '20px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.05)',
            position: 'relative',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--accent) transparent'
        }}>
            <style jsx>{`
                div::-webkit-scrollbar { width: 8px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background-color: var(--accent); border-radius: 20px; }
            `}</style>

            <img
                src="/instagram_feed.png"
                alt="Instagram Feed Preview"
                style={{ width: '100%', height: 'auto', display: 'block' }}
            />

            {/* Overlay if error (optional) */}
            {/* <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                Displaying preview. Add API Token to go live.
            </div> */}
        </div>
    );

    return (
        <div style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'var(--accent)',
            marginTop: 'auto',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2rem',
                position: 'relative',
                zIndex: 2
            }}>
                <div>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{t('followHeader')}</h2>
                    <p style={{ opacity: 0.9 }}>@aydesign1996</p>
                </div>

                {loading ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" size={48} />
                    </div>
                ) : error ? (
                    renderFallback()
                ) : (
                    // Live Feed Grid
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '1rem',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '600px',
                        overflowY: 'auto',
                        padding: '1rem',
                        background: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                    }}>
                        {posts.map((post) => (
                            <a
                                key={post.id}
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'block',
                                    aspectRatio: '1',
                                    overflow: 'hidden',
                                    borderRadius: '10px',
                                    position: 'relative'
                                }}
                            >
                                <img
                                    src={post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url}
                                    alt={post.caption || 'Instagram Post'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.3s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                />
                            </a>
                        ))}
                    </div>
                )}

                <a
                    href="https://instagram.com/aydesign1996"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem 2.5rem',
                        background: 'white',
                        color: 'var(--accent)',
                        borderRadius: '50px',
                        fontWeight: '800',
                        fontSize: '1.2rem',
                        transition: 'transform 0.2s',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                    }}
                >
                    <Instagram /> {t('follow')}
                </a>
            </div>
        </div>
    );
}
