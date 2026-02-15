/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ["Inter", "Outfit", "Satoshi", "Assistant", "sans-serif"],
                heading: ["Outfit", "Inter", "Assistant", "sans-serif"],
                display: ["Outfit", "sans-serif"],
            },
            // Mid-Century Financial Palette
            colors: {
                canvas: {
                    DEFAULT: '#F5F2EB', // Almond Milk
                    50: '#FCFBF9',
                    100: '#F5F2EB',
                    200: '#EBE6DA',
                    300: '#D6CDB8',
                    900: '#1A1917',
                },
                primary: {
                    DEFAULT: '#0F5156', // Deep Teal
                    foreground: '#FFFFFF',
                    50: '#F0F9FA',
                    100: '#DFF1F2',
                    200: '#BFE0E3',
                    300: '#90C6CB',
                    400: '#5BA5AC',
                    500: '#34868D',
                    600: '#236C73',
                    700: '#0F5156',
                    800: '#0E4348',
                    900: '#10383C',
                    950: '#062326',
                },
                secondary: {
                    DEFAULT: '#E0A458', // Harvest Gold
                    foreground: '#1A1A1A',
                    50: '#FDF9F3',
                    100: '#FBF2E5',
                    200: '#F6E0C5',
                    300: '#EFCA9F',
                    400: '#E7B073',
                    500: '#E0A458',
                    600: '#C4843D',
                    700: '#A36832',
                    800: '#85532E',
                    900: '#6C4529',
                    950: '#3E2413',
                },
                success: {
                    DEFAULT: '#4B5F43', // Olive Drab
                    foreground: '#FFFFFF',
                    50: '#F4F7F4',
                    100: '#E6EBE5',
                    500: '#4B5F43',
                    900: '#1A2317',
                },
                warning: {
                    DEFAULT: '#E0A458',
                    foreground: '#1A1A1A',
                },
                destructive: {
                    DEFAULT: '#C05746', // Terracotta
                    foreground: '#FFFFFF',
                    50: '#FEF2F2',
                    500: '#C05746',
                    900: '#451510',
                },
                neutral: {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                    950: '#030712',
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                window: "hsl(var(--window-background))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                'soft': '0 2px 10px rgba(0, 0, 0, 0.03)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "slide-in-from-bottom": {
                    from: { transform: "translateY(20px)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.3s ease-out",
                "slide-up": "slide-in-from-bottom 0.4s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
