/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: '#090D16',
        slatecard: '#111827',
        steel: '#1F2937',
        indigoquant: '#6366F1',
        emeraldquant: '#10B981',
        crimsonquant: '#EF4444',
        amberquant: '#F59E0B',
      },
    },
  },
  plugins: [],
};
