/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // True black / charcoal palette — replaces dark navy
        slate: {
          50:  '#f4f1ea',
          100: '#e8e3d8',
          200: '#cdc8bb',
          300: '#a8a299',
          400: '#807a72',
          500: '#5e5952',
          600: '#46413b',
          700: '#322e29',
          800: '#222019',   // borders
          850: '#1a1815',
          900: '#111009',   // card surfaces
          950: '#080705',   // page background
        },
        gold: {
          50:  '#faf6ed',
          100: '#f3ebce',
          200: '#e8d9a5',
          300: '#dcc47a',
          400: '#c9a96e',   // primary accent — champagne gold
          500: '#b38d4f',
          600: '#8f6e35',
          700: '#6b511e',
          800: '#4a380f',
          900: '#2c2106',
        },
      },
      fontFamily: {
        serif:   ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"Josefin Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        widest: '0.25em',
        deco:   '0.15em',
      },
      borderWidth: {
        '0.5': '0.5px',
      },
    },
  },
  plugins: [],
}
