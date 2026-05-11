/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#f5ecdc',
        sand: '#e7c89a',
        camel: '#d4ad7c',
        wheat: '#ead7b8',
        cocoa: '#3a2f24',
        accent: '#b88a5e',
        'accent-dark': '#4d4035',
        sage: '#6f8a5c',
        'sage-dark': '#5b7a4a',
        'rise': '#a3402a',
        'calor': '#c0392b',
        'frio': '#5b8ba0',
      },
      fontFamily: {
        sans: ["'Manrope'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ["'Fraunces'", 'ui-serif', 'Georgia', 'serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '28px',
        lg: '20px',
        md: '14px',
        sm: '10px',
      },
      boxShadow: {
        glass:
          '0 1px 0 rgba(255,255,255,.6) inset, 0 24px 60px -20px rgba(80,50,30,.22), 0 8px 18px -10px rgba(80,50,30,.12)',
      },
    },
  },
  plugins: [],
}
