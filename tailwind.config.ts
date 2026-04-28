import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#15110e',
        'bg-surface': '#1c1816',
        'bg-elevated': '#221d1a',
        'accent-lemon': '#f5d547',
        'accent-coral': '#d97757',
        'accent-blue': '#8ab4d6',
        'accent-sage': '#a8b89a',
        'accent-rose': '#c97062',
        'text-primary': '#f5ede2',
        'text-secondary': '#c9b9a3',
        'text-tertiary': '#8a7a65',
        'text-muted': '#5a4d3f',
        'border-soft': 'rgba(180,140,100,0.08)',
        'border-medium': 'rgba(180,140,100,0.14)',
        'border-strong': 'rgba(200,160,110,0.22)',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
