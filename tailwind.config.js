/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: '#18181b', 2: '#52525b', 3: '#71717a', 4: '#737378' },
        line: { DEFAULT: '#ececef', 2: '#e4e4e7' },
        canvas: '#f4f4f5',
        panel: '#fafafa',
        brand: { 50: '#f1effe', 100: '#e4e0fd', 500: '#6250d6', 600: '#5241c4', 700: '#4434a8' },
        series: { 1: '#2a78d6', 2: '#eb6834', 3: '#1baf7a' },
      },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,0.04)' },
      fontSize: { '2xs': ['11px', '16px'] },
    },
  },
  plugins: [],
};
