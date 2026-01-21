import { notFound } from 'next/navigation';
import styles from '../blog.module.css';

// In a real app, use fs/path to read MDX files or a library like contentlayer/next-mdx-remote
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        // Dynamic import for MDX content
        const Post = (await import(`@/content/blog/${slug}.mdx`)).default;

        return (
            <article className={styles.container}>
                <div className={styles.card}>
                    <Post />
                </div>
            </article>
        );
    } catch (error) {
        notFound();
    }
}
