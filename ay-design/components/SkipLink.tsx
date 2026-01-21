'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

export default function SkipLink() {
    const t = useTranslations('Accessibility');

    return (
        <a
            href="#main-content"
            style={{
                position: 'absolute',
                top: '-100px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '0.5rem 1rem',
                background: '#000',
                color: '#fff',
                zIndex: 9999,
                transition: 'top 0.2s',
                textDecoration: 'none',
                borderRadius: '0 0 5px 5px',
            }}
            className="skip-link"
            onFocus={(e) => { e.currentTarget.style.top = '0'; }}
            onBlur={(e) => { e.currentTarget.style.top = '-100px'; }}
        >
            {t('skipToContent')}
        </a>
    );
}
