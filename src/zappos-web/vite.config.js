import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: React runs on http://localhost:5173 and forwards /api calls to the ASP.NET Core API.
// Build: output goes into the API's wwwroot so one server hosts everything in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
  build: {
    outDir: '../ZapPos.Api/wwwroot',
    emptyOutDir: true,
  },
})
