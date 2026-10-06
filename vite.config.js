import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  // Debug: log whether Vite sends cookies to the backend
  const logCookies = (proxy) => {
    proxy.on('proxyReq', (proxyReq, req) => {
      console.log(
        'PROXY',
        req.method,
        req.url,
        '| cookie sent:',
        proxyReq.getHeader('cookie') ? 'YES' : 'NO'
      )
    })
  }

  // Common backend proxy configuration
  const backendProxy = {
    target: env.BACKEND_URL,
    changeOrigin: true,
    secure: true,
    headers: {
      'X-Tunnel-Skip-AntiPhishing-Page': 'true',
    },
    configure: logCookies,
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },

    server: {
      proxy: {
        '/api': backendProxy,
        '/auth': backendProxy,
        '/business-profile': backendProxy,
        '/selection-videos': backendProxy,
        '/comments': backendProxy, 
        '/ai': backendProxy,
      },
    },
  }
})