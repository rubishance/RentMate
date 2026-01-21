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

export const MessageIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z' />
    </svg>
);

export const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <rect x='9' y='9' width='13' height='13' rx='2' ry='2' />
        <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </svg>
);

export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <path d='M20 6L9 17l-5-5' />
    </svg>
);

export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <line x1='18' y1='6' x2='6' y2='18' />
        <line x1='6' y1='6' x2='18' y2='18' />
    </svg>
);

export const LoaderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props} className={`${baseProps.className} animate-spin`}>
        <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
    </svg>
);

export const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...baseProps} {...props}>
        <path d='M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7' />
        <polyline points='16 6 12 2 8 6' />
        <line x1='12' y1='2' x2='12' y2='15' />
    </svg>
);
