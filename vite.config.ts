import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  root: 'web',
  build: {
    // dist/ stays at the repo root so the nginx root does not change.
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    // Vitest otherwise resolves svelte's "worker"/"default" export condition
    // (server-side, no mount()) instead of the browser build.
    conditions: process.env.VITEST ? ['browser'] : undefined,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/setup-tests.ts'],
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
