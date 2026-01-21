'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const t = useTranslations('Navigation');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleLangChange = () => {
        const newLocale = locale === 'en' ? 'he' : 'en';
        // Simple replacement for now, improved logic might be needed for sub-paths
        // next-intl usually handles this via middleware/Link but manual switch requires care
        const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
        router.replace(newPath);
    };

    return (
        <nav className={styles.navbar}>
            <Link href={`/${locale}`} className={styles.logo}>
                AYDesign
            </Link>

            <div className={styles.links}>
                <Link href={`/${locale}/work`} className={styles.link}>{t('work')}</Link>
                <Link href={`/${locale}/blog`} className={styles.link}>{t('blog')}</Link>
                <Link href={`/${locale}/about`} className={styles.link}>{t('about')}</Link>
                <Link href={`/${locale}/contact`} className={styles.link}>{t('contact')}</Link>
            </div>

            <div className={styles.actions}>
                <button onClick={handleLangChange} className={styles.langSwitch}>
                    {locale === 'en' ? 'עברית' : 'English'}
                </button>
            </div>
        </nav>
    );
}
