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
                hebrew: ["Assistant", "sans-serif"],
                english: ["IBM Plex Sans", "sans-serif"],
                sans: ["Assistant", "Inter", "sans-serif"],
                heading: ["Assistant", "Outfit", "sans-serif"],
            },
            // Modern Real Estate Palette
            colors: {
                canvas: {
                    DEFAULT: '#F2F5F9', // Off-White
                    50: '#F9FBFE',
                    100: '#F2F5F9',
                    200: '#E5EAF2',
                    300: '#D1DAE6',
                    900: '#0C131D',
                },
                primary: {
                    DEFAULT: '#14284B', // Deep Navy
                    foreground: '#FFFFFF',
                    50: '#F0F4FA',
                    100: '#DEE7F4',
                    200: '#BFCEE6',
                    300: '#90ACD4',
                    400: '#5B86BD',
                    500: '#34619C',
                    600: '#234676',
                    700: '#14284B',
                    800: '#0E1D38',
                    900: '#0B152A',
                    950: '#060B18',
                },
                secondary: {
                    DEFAULT: '#459367', // Sage Green
                    foreground: '#FFFFFF',
                    50: '#F4FAF6',
                    100: '#E9F5ED',
                    200: '#C7E6D3',
                    300: '#97CEAD',
                    400: '#64AE82',
                    500: '#459367',
                    600: '#347552',
                    700: '#26573E',
                    800: '#1B402E',
                    900: '#142F22',
                    950: '#0A1811',
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
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
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
