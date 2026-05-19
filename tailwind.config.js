/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFFBF5',
        sand: '#EDE0CC',
        camel: '#C9A87C',
        wheat: '#E8D5C0',
        cocoa: '#1E140A',
        accent: '#A6754B',
        'accent-dark': '#8C5E3A',
        'accent-2': '#4A5F7A',
        sage: '#5D7A4A',
        'sage-dark': '#4A6338',
        rise: '#8A2A1E',
        calor: '#B53228',
        frio: '#4A7A8C',
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
          '0 1px 0 rgba(255,255,255,.5) inset, 0 12px 32px -16px rgba(30,20,10,.12), 0 4px 12px -6px rgba(30,20,10,.08)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
