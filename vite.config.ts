import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the app from https://<user>.github.io/makromenu/; `vite preview` mirrors that.
  base: command === 'build' || isPreview ? '/makromenu/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions are picked up on the next launch, no "update available" prompt.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Makromenu',
        short_name: 'Makromenu',
        description: 'Jeden plan posiłków, dwie kaloryczności.',
        lang: 'pl',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
}))
