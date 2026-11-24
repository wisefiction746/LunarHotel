import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://wisefiction746.github.io',
  base: '/LunarHotel/',
  integrations: [tailwind()],
  vite: {
    optimizeDeps: {
      include: ['gsap', 'lenis'],
    },
  },
});
