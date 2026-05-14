import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Collect prerender HTML shells from en/** and ru/** (see scripts/write-shell-pages.mjs).
function collectShellHtmlInputs() {
  const inputs = {}
  function walkDir(dir, parts) {
    const indexFile = path.join(dir, 'index.html')
    if (parts.length && fs.existsSync(indexFile)) {
      const key = `shell-${parts.join('_')}`
      inputs[key] = indexFile
    }
    if (!fs.existsSync(dir)) {
      return
    }
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue
      walkDir(path.join(dir, ent.name), [...parts, ent.name])
    }
  }
  for (const loc of ['en', 'ru']) {
    const locDir = path.resolve(__dirname, loc)
    if (fs.existsSync(locDir)) {
      walkDir(locDir, [loc])
    }
  }
  return inputs
}

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
  ],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        ...collectShellHtmlInputs(),
      },
    },
  },
})
