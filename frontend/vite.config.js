import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ako VITE_API_URL postoji, koristi se direktno iz api.js.
// Ako ga nema (dev), proxy šalje /api/* na localhost:3001.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // proslijedi originalni /api path bez rewrite
      }
    }
  }
})
