import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against a production build (with the service worker) on the bundled sample
// recipes. Cloud sync is switched off: VITE_DEXIE_CLOUD_URL from the environment wins over .env.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173/makromenu/',
    locale: 'pl-PL',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173/makromenu/',
    env: { VITE_DEXIE_CLOUD_URL: '' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
