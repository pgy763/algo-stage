import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: { host: '0.0.0.0', port: 5175, strictPort: true },
  worker: { format: 'es' },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 }
})
