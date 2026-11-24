/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      colors: {
        space:     '#0A0A0F',
        ivory:     '#F4EDE0',
        brass:     '#B89968',
        emerald:   '#1F4D3F',
        earthblue: '#7BA3C7',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.5em',
        wide2: '0.3em',
      },
    },
  },
  plugins: [],
};
