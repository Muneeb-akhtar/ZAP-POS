import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Three pages: the public landing page (index.html), the admin panel (admin/index.html → /admin)
// and the customer account page (account/index.html → /account).
// Dev: http://localhost:5173 (admin at http://localhost:5173/admin/). Build: dist/ (Vercel serves it).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        account: resolve(__dirname, 'account/index.html'),
      },
    },
  },
})
