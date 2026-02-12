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
                sans: ["Satoshi", "Outfit", "Inter", "Assistant", "sans-serif"],
                heading: ["Anton", "Inter", "Assistant", "sans-serif"],
                display: ["Anton", "sans-serif"], // Explicit display font
            },
            colors: {
                // Dynamic theme using CSS variables
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",

                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },

                // Grayscale palette
                gray: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
                // Admin & Brand Colors
                brand: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    navy: {
                        light: '#1e293b',
                        DEFAULT: '#0f172a',
                        dark: '#020617'
                    }
                },
                // Brutalist-lite Palette
                charcoal: {
                    DEFAULT: '#171e19',
                    50: '#f4f6f5',
                    100: '#e3e8e6',
                    200: '#c5d1ce',
                    300: '#9eb2ad',
                    400: '#75918b',
                    500: '#55736d',
                    600: '#405954',
                    700: '#344743',
                    800: '#2d3b38',
                    900: '#171e19', // Core charcoal
                    950: '#0a0f0d',
                },
                golden: {
                    DEFAULT: '#ffe17c',
                    50: '#fffaeb',
                    100: '#fff2c6',
                    200: '#ffe17c', // Primary
                    300: '#ffcb3d',
                    400: '#ffb00f',
                    500: '#f59600',
                    600: '#d97200',
                    700: '#b05102',
                    800: '#8e3f08',
                    900: '#76340a',
                },
                sage: {
                    DEFAULT: '#b7c6c2',
                    50: '#f5f7f7',
                    100: '#e8eceb',
                    200: '#d0d9d7',
                    300: '#b7c6c2', // Primary Sage
                    400: '#99afa9',
                    500: '#7a948e',
                    600: '#607873',
                    700: '#4e615d',
                    800: '#41504d',
                    900: '#384341',
                },
                // Warm Stone Palette (Neutrals) - Kept for fallback/dark mode depth
                stone: {
                    50: '#fafaf9',
                    100: '#f5f5f4',
                    200: '#e7e5e4',
                    300: '#d6d3d1',
                    400: '#a8a29e',
                    500: '#78716c',
                    600: '#57534e',
                    700: '#44403c',
                    800: '#292524',
                    900: '#1c1917',
                    950: '#0c0a09',
                },
                // Ember Palette (Accent)
                ember: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                // Gold Palette (Premium)
                gold: {
                    DEFAULT: '#D4AF37', // Metallic Gold
                    light: '#FFD700',   // Glowing Gold
                    dark: '#B8860B',    // Dark Goldenrod
                    50: '#FBF8E6',
                    100: '#F6F1CD',
                    200: '#EBE29B',
                    300: '#E0D369',
                    400: '#D5C437',
                    500: '#D4AF37',
                    600: '#AA8C2C',
                    700: '#806921',
                    800: '#554616',
                    900: '#2B230B',
                },
            },
            borderRadius: {
                lg: "0px",
                md: "0px",
                sm: "0px",
                DEFAULT: "0px",
                full: "9999px", // Keep full for avatars/pills if needed, but defaults are strict
            },
            boxShadow: {
                'sm': '1px 1px 0px 0px rgba(0,0,0,1)',
                'DEFAULT': '3px 3px 0px 0px rgba(0,0,0,1)',
                'md': '5px 5px 0px 0px rgba(0,0,0,1)',
                'lg': '8px 8px 0px 0px rgba(0,0,0,1)',
                'xl': '12px 12px 0px 0px rgba(0,0,0,1)',
                '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // Keep specific large drop for modals if needed, or replace
                'none': 'none',
                'brutal': '4px 4px 0px 0px #000000', // Specialized hard shadow
            },
        },
    },
    plugins: [],
}
