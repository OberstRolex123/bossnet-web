import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // 0.0.0.0
    port: 5173,
    strictPort: true,
    allowedHosts: ['bossnet-dev.oberstrolex.synology.me'],
    origin: 'https://bossnet-dev.oberstrolex.synology.me', // wichtig für externen Zugriff (HTTPS hinter Reverse Proxy)
    hmr: {
      host: 'bossnet-dev.oberstrolex.synology.me',
      protocol: 'wss',
      clientPort: 443,
      // path: '/hmr' // nur nutzen, wenn dein Reverse Proxy genau diesen Pfad für WS routet
    },
    // ⬇️ NEU: Proxy für API-Aufrufe
    proxy: {
      '/api': {
        target: 'http://api:5177', // Service-Name aus docker-compose
        changeOrigin: true,
      },
    },
  },
})

