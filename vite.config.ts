import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

let commitHash = 'unknown';
let release = '';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  release = execSync('git describe --tags --abbrev=0').toString().trim();
} catch {}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Edificio Elite',
        short_name: 'Edificio Elite',
        description: 'Dashboard de aerotermia y servicios del Edificio Elite',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/images/favicons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/images/favicons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/images/favicons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __VERSION__: JSON.stringify(release),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
