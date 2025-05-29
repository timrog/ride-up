import { heroui } from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
    content: [
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)'],
            },
            colors: {
                primary: {
                    DEFAULT: '#2563eb',   // Tailwind blue-600
                    light: '#3b82f6',
                    dark: '#1e40af',
                },
                secondary: {
                    DEFAULT: '#f59e0b',
                    light: '#fbbf24',
                    dark: '#b45309',
                },
                neutral: {
                    DEFAULT: '#6b7280',
                    light: '#d1d5db',
                    dark: '#374151',
                },
            },
            borderRadius: {
                lg: '0.5rem',
            },
            spacing: {
                '128': '32rem',
            },
        },
    },
    darkMode: "class",
    plugins: [heroui()],
}

module.exports = config;