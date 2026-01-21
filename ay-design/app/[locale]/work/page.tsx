'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

// Dummy data
const projects = [
    { id: 1, category: 'ai', title: 'Neon Dreams', image: 'https://picsum.photos/seed/1/600/800' },
    { id: 2, category: 'web', title: 'Tech Startup', image: 'https://picsum.photos/seed/2/800/600' },
    { id: 3, category: 'graphic', title: 'Brand Identity', image: 'https://picsum.photos/seed/3/600/600' },
    { id: 4, category: 'ai', title: 'Cyberpunk City', image: 'https://picsum.photos/seed/4/600/900' },
    { id: 5, category: 'web', title: 'E-commerce', image: 'https://picsum.photos/seed/5/800/500' },
    { id: 6, category: 'graphic', title: 'Poster Design', image: 'https://picsum.photos/seed/6/600/700' },
];

export default function Portfolio() {
    const t = useTranslations('Portfolio');
    const [filter, setFilter] = useState('all');

    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter(p => p.category === filter);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{t('title')}</h1>
                <div className={styles.filters}>
                    {['all', 'ai', 'graphic', 'web'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}
                        >
                            {t(cat)}
                        </button>
                    ))}
                </div>
            </header>

            <motion.div layout className={styles.grid}>
                <AnimatePresence>
                    {filteredProjects.map((project) => (
                        <motion.div
                            layout
                            key={project.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className={styles.card}
                        >
                            <div className={styles.imageWrapper}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={project.image} alt={project.title} className={styles.image} />
                                <div className={styles.overlay}>
                                    <h3>{project.title}</h3>
                                    <button className={styles.viewBtn}>{t('viewProject')}</button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
