import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Get version and git info
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))
const gitHash = execSync('git rev-parse --short HEAD').toString().trim()
const appVersion = `v${pkg.version.replace('-nightly', '')}+${gitHash}`

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  server: {
    host: '0.0.0.0', // Listen on all interfaces (IPv4 + IPv4)
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:47778',
        changeOrigin: true,
        secure: false, // Accept self-signed cert
        ws: true, // Proxy WebSocket
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Proxy] ${req.method} ${req.url} → ${options.target}${req.url}`);
          });
        }
      }
    }
  }
})
