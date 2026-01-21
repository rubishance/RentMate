'use client';

import { useTranslations } from 'next-intl';
import { Instagram, Linkedin } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
    const t = useTranslations('Footer');

    return (
        <footer className={styles.footer}>
            <div className={styles.content}>
                <div className={styles.socials}>
                    <a href="https://instagram.com/aydesign1996" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                        <Instagram size={24} />
                        <span>Instagram</span>
                    </a>
                    <a href="https://linkedin.com/in/avihaysimhi" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                        <Linkedin size={24} />
                        <span>LinkedIn</span>
                    </a>
                </div>
                <p className={styles.copyright}>{t('copyright')}</p>
            </div>
        </footer>
    );
}
