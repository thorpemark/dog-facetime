import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves from /repo-name/ — set GITHUB_PAGES=true in CI.
const base = process.env.GITHUB_PAGES === 'true' ? '/dog-facetime-clips/' : '/'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'github-pages-spa-fallback',
      closeBundle() {
        if (process.env.GITHUB_PAGES !== 'true') return
        const distDir = resolve(import.meta.dirname, 'dist')
        copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'))
      },
    },
  ],
  base,
})
