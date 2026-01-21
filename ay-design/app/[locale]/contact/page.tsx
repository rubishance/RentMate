import { getTranslations } from 'next-intl/server';
import { Mail, MessageSquare } from 'lucide-react';
import styles from './contact.module.css';

export const metadata = {
    title: 'Contact | AYDesign',
    description: 'Get in touch with Avihay Simhi',
};

export default async function Contact({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Contact' });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>
            </header>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <Mail className={styles.icon} />
                    <h2 className={styles.cardTitle}>{t('email')}</h2>
                    <p className={styles.cardText}>{t('emailText')}</p>
                    <a href="mailto:contact@aydesign.com" className={styles.button}>
                        {t('sendEmail')}
                    </a>
                </div>

                <div className={styles.card}>
                    <MessageSquare className={styles.icon} />
                    <h2 className={styles.cardTitle}>{t('instagram')}</h2>
                    <p className={styles.cardText}>{t('instagramText')}</p>
                    <a href="https://instagram.com/aydesign1996" target="_blank" rel="noopener noreferrer" className={styles.button}>
                        {t('follow')}
                    </a>
                </div>

                <div className={styles.card}>
                    <MessageSquare className={styles.icon} />
                    <h2 className={styles.cardTitle}>{t('linkedin')}</h2>
                    <p className={styles.cardText}>{t('linkedinText')}</p>
                    <a href="https://linkedin.com/in/avihaysimhi" target="_blank" rel="noopener noreferrer" className={styles.button}>
                        {t('connect')}
                    </a>
                </div>
            </div>
        </div>

    );
}
