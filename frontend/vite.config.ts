import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['hog-logo.png'],

      manifest: {
        name: 'House of Guidance Chat',
        short_name: 'HoG Chat',
        description:
          'House of Guidance Chat — seeking knowledge for the pleasure of Allah.',
        theme_color: '#041B15',
        background_color: '#041B15',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/hog-logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/hog-logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/hog-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Preserved from the legacy vite.config.js duplicate so API GETs
        // remain NetworkFirst with a short TTL when offline.
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hog-chat-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: true,
    port: 5173,

    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },

      '/sanctum': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },

      '/storage': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },

      '/broadcasting': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
