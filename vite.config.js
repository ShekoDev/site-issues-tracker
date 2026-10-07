import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: mode === 'demo'
    ? { alias: [{ find: /^(.*)\/lib\/supabase$/, replacement: path.resolve('demo/supabase.js') }] }
    : {},
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
}))
