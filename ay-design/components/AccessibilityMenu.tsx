'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Type, Eye } from 'lucide-react';
import styles from './AccessibilityMenu.module.css';

export default function AccessibilityMenu() {
    const t = useTranslations('Accessibility');
    const [isOpen, setIsOpen] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [highContrast, setHighContrast] = useState(false);

    useEffect(() => {
        document.documentElement.style.fontSize = `${fontSize}px`;
    }, [fontSize]);

    useEffect(() => {
        if (highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }, [highContrast]);

    return (
        <div className={`${styles.container} ${isOpen ? styles.open : ''}`}>
            <button
                className={styles.toggle}
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('toggleMenu')}
                aria-expanded={isOpen}
            >
                <Settings size={24} />
            </button>

            {isOpen && (
                <div className={styles.menu}>
                    <h3>{t('toggleMenu')}</h3>

                    <div className={styles.control}>
                        <span><Type size={18} /> {t('increaseText')}</span>
                        <div className={styles.buttons}>
                            <button aria-label={t('decreaseText')} onClick={() => setFontSize(s => Math.max(12, s - 2))}>-</button>
                            <button aria-label={t('increaseText')} onClick={() => setFontSize(s => Math.min(24, s + 2))}>+</button>
                        </div>
                    </div>

                    <div className={styles.control}>
                        <button
                            className={`${styles.contrastBtn} ${highContrast ? styles.active : ''}`}
                            onClick={() => setHighContrast(!highContrast)}
                        >
                            <Eye size={18} /> {t('highContrast')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
