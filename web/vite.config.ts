import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves from /repo-name/ — set GITHUB_PAGES=true in CI.
const base = process.env.GITHUB_PAGES === 'true' ? '/dog-facetime/' : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
