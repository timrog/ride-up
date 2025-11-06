import { heroui } from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
    content: [
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-sans)']
            },
            background: {
                pattern: 'rgb(0,91,156)',
            },
            colors: {
                primary: {
                    DEFAULT: 'rgb(0,91,156)',
                    light: '#3b82f6',
                    dark: '#1e40af',
                },
                secondary: {
                    DEFAULT: '#fe7300'
                },
                warning: {
                    DEFAULT: '#fe7300',
                    light: '#fbbf24',
                    dark: '#b45309',
                },
                neutral: {
                    DEFAULT: '#6b7280',
                    light: '#d1d5db',
                    dark: '#374151',
                },
                background: {
                    DEFAULT: '#005b9c',
                    light: '#fe7300',
                    dark: '#000000',
                }
            },
            borderRadius: {
                lg: '0.5rem',
            },
            spacing: {
                '128': '32rem',
            }
        },
    },
    darkMode: "class",
    plugins: [
        heroui({
            layout: {
                fontSize: {
                }
            },

        })
    ]
}

module.exports = config;