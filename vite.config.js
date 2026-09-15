import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { copyFileSync, existsSync } from 'fs'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    {
      name: 'spa-404',
      closeBundle() {
        const index = path.resolve('dist/index.html')
        if (existsSync(index)) copyFileSync(index, path.resolve('dist/404.html'))
      },
    },
  ],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
