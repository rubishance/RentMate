import React from 'react';

// Base SVG props for consistency
const baseProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'w-5 h-5',
} as const;

export const NotificationSuccessIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <path d='M9 12l2 2 4-4' />
        <circle cx='12' cy='12' r='10' />
    </svg>
);

export const NotificationWarningIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <path d='M12 9v4' />
        <path d='M12 17h.01' />
        <polygon points='12 2 2 22 22 22 12 2' />
    </svg>
);

export const NotificationErrorIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <line x1='18' y1='6' x2='6' y2='18' />
        <line x1='6' y1='6' x2='18' y2='18' />
        <circle cx='12' cy='12' r='10' />
    </svg>
);

export const NotificationInfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <circle cx='12' cy='12' r='10' />
        <line x1='12' y1='16' x2='12' y2='12' />
        <line x1='12' y1='8' x2='12.01' y2='8' />
    </svg>
);
