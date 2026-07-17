import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/auth": {
        target: "https://emstrap-finalworking.onrender.com",
        changeOrigin: true,
      },
      "/api": {
        target: "https://emstrap-finalworking.onrender.com",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "https://emstrap-finalworking.onrender.com",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
})
