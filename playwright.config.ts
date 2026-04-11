import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/screenshots',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173/zaseki/',
    screenshot: 'on',
    video: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/zaseki/',
    reuseExistingServer: true,
  },
})
