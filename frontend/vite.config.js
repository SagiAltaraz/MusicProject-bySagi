import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
<<<<<<< HEAD
  plugins: [react(), tailwindcss()],
=======
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:${process.env.PORT}',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
>>>>>>> main
})
