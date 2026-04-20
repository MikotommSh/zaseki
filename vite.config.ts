import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages デプロイ時は /zaseki/、Capacitor (file://) は ./
  base: process.env.GITHUB_PAGES ? '/zaseki/' : './',
})
