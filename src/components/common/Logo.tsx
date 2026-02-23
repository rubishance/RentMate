import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
    theme?: 'light' | 'dark';
    goldAccent?: boolean;
    onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
    className,
    iconOnly = false,
    theme = 'light',
    goldAccent = true,
    onClick
}) => {
    const isDark = theme === 'dark';
    const mainColor = isDark ? '#F5F5F7' : '#121212';
    const accentColor = goldAccent ? '#459367' : mainColor;

    return (
        <div
            className={cn("flex items-center gap-3 select-none", className)}
            onClick={onClick}
        >
            <svg
                viewBox="0 0 100 100"
                className="h-full w-auto"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* House Roof - Ultra Thin */}
                <path
                    d="M20 45L50 20L80 45"
                    stroke={mainColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* 'R' Letter */}
                <path
                    d="M35 45V70M35 45H48C51.3137 45 54 47.6863 54 51C54 54.3137 51.3137 57 48 57H35M54 70L46 57"
                    stroke={mainColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* 'M' Letter */}
                <path
                    d="M60 70V45L70 55L80 45V70"
                    stroke={mainColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Growth Arrow - Champagne Gold */}
                <path
                    d="M50 65L72 38M72 38H62M72 38V48"
                    stroke={accentColor}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>

            {!iconOnly && (
                <div className="flex flex-col">
                    <span
                        className={cn(
                            "text-lg tracking-[0.2em] uppercase font-light leading-tight",
                            isDark ? "text-[#F5F5F7]" : "text-[#121212]"
                        )}
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        RentMate
                    </span>
                </div>
            )}
        </div>
    );
};
