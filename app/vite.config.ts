import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // 0.0.0.0
    port: 5173,
    strictPort: true,
    allowedHosts: ['bossnet-dev.oberstrolex.synology.me'],
    origin: 'https://bossnet-dev.oberstrolex.synology.me', // wichtig!
    hmr: {
      host: 'bossnet-dev.oberstrolex.synology.me',
      protocol: 'wss',
      clientPort: 443,
      // path: '/hmr' // nur nutzen, wenn du im Reverse Proxy exakt diesen Pfad für WS routest
    }
  }
})

