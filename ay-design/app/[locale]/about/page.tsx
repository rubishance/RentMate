import { getTranslations } from 'next-intl/server';
import styles from './about.module.css';

export const metadata = {
    title: 'About | AYDesign',
    description: 'Learn more about Avihay Simhi - Graphic Web Designer & AI Artist',
};

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Navigation' });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>About Me</h1>
            </header>

            <div className={styles.content}>
                <div className={styles.bio}>
                    <p>
                        Hello! I'm <strong>Avihay Simhi</strong>, a passionate Graphic Web Designer and AI Artist based in Israel.
                    </p>
                    <p>
                        I bridge the gap between traditional design principles and cutting-edge artificial intelligence.
                        My mission is to explore the boundaries of digital creativity, crafting visual experiences that are not just seen, but felt.
                    </p>
                    <p>
                        With a background in web development and a keen eye for aesthetics, I build websites that are fast, accessible, and visually striking.
                    </p>
                </div>

                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statNumber}>5+</span>
                        <span className={styles.statLabel}>Years Experience</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNumber}>100+</span>
                        <span className={styles.statLabel}>Projects Delivered</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statNumber}>∞</span>
                        <span className={styles.statLabel}>Ideas Generated</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
