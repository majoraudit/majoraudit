import { defineConfig, loadEnv } from 'vite'
// import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_INTERNAL_URL || 'https://localhost:8000'

  return {
    plugins: [basicSsl(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': proxyTo(backendUrl),
        '/admin': proxyTo(backendUrl),
        '/static': proxyTo(backendUrl),
      },
    },
  }
})

function proxyTo(target: string) {
  return {
    target,
    changeOrigin: false,
    secure: false,
    headers: {
      'X-Forwarded-Proto': 'https',
    },
  }
}
