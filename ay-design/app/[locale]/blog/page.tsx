import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import styles from './blog.module.css';

// This would typically come from reading the filesystem
const posts = [
    {
        slug: 'ai-art-tips',
        title: 'Top 5 AI Art Tips for 2024',
        date: '2024-03-15',
        excerpt: 'Artificial Intelligence is changing the landscape of digital art. Here are my top tips...'
    }
];

export default async function Blog({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Navigation' }); // Minimal translation for now

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Blog</h1>
            <div className={styles.grid}>
                {posts.map(post => (
                    <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className={styles.card}>
                        <h2>{post.title}</h2>
                        <p className={styles.date}>{post.date}</p>
                        <p>{post.excerpt}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
