import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' — сборку можно открыть из любой папки или подпути хостинга
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
