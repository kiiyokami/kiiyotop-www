import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // In dev, proxy /api/* to the Express server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
